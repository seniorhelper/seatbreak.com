// SeatBreak — core engine (seated, hands-free WebXR)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import * as TX from './textures.js?v=3';
import { sfx, initAudio, ambient, stopAmbient, audioNodes } from './audio.js?v=3';
import { ROOMS } from './rooms/index.js?v=3';
import { createBody, SKINS } from './body.js?v=3';
// Optional libraries: the game still runs if one fails to load
const lib = (f) => import(`./lib/${f}.js?v=3`).catch((e) => { console.warn('lib missing', f, e); return null; });
const [ILL, KBM, MUS, VOX] = await Promise.all([lib('illusions'), lib('guide-kb'), lib('music'), lib('voice')]);

const Q = new URLSearchParams(location.search);
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3();
const QT = new THREE.Quaternion();

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(0.8);
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.03, 300);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
const EYE = 1.2;
camera.position.set(0, EYE, 0);
let roomGroup = new THREE.Group();
scene.add(roomGroup);

fitFov();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

function fitFov() { camera.fov = camera.aspect < 1 ? 82 : 70; camera.updateProjectionMatrix(); }
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  fitFov();
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Helpers ----------
export function mat(color = '#ffffff', o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, map: o.map || null,
    emissive: o.emissive || '#000000', emissiveIntensity: o.ei ?? 1, emissiveMap: o.emissiveMap || null,
    transparent: !!o.transparent, opacity: o.opacity ?? 1, envMapIntensity: o.env ?? 0.8,
    side: o.side ?? THREE.FrontSide, depthWrite: o.depthWrite ?? true, flatShading: !!o.flat,
  });
}
export function glowMat(color = '#66ffff', opacity = 1, additive = true) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, toneMapped: false, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
  });
}
function M(geo, m, o = {}) {
  const x = new THREE.Mesh(geo, m);
  x.castShadow = o.cast ?? true;
  x.receiveShadow = o.receive ?? true;
  return x;
}
const box = (w, h, d, m, o) => M(new THREE.BoxGeometry(w, h, d), m, o);
const cyl = (rt, rb, h, m, seg = 24, o) => M(new THREE.CylinderGeometry(rt, rb, h, seg), m, o);
const sph = (r, m, seg = 24, o) => M(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.66 | 0)), m, o);

// Canvas screen that can be redrawn
function screen(pxW, pxH, wM, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = pxW; c.height = pxH;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: o.transparent ?? true, toneMapped: false, depthWrite: o.depthWrite ?? false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wM, wM * pxH / pxW), m);
  mesh.renderOrder = o.renderOrder ?? 3;
  mesh.redraw = (...a) => { g.clearRect(0, 0, pxW, pxH); draw(g, pxW, pxH, ...a); t.needsUpdate = true; };
  mesh.redraw();
  return mesh;
}

// ---------- Tweens & updaters ----------
let updaters = [];
let tweens = [];
const timeMats = new Set();
function anim(dur, fn, ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2) {
  return new Promise((res) => tweens.push({ t: 0, dur, fn, ease, res }));
}
function stepTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.dur);
    try { tw.fn(tw.ease(k), k); } catch (e) { console.error(e); }
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
function portalMat(c1 = '#5b2cff', c2 = '#00e5ff') {
  const m = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float t; uniform vec3 c1; uniform vec3 c2; varying vec2 vUv;
      void main(){ vec2 p=(vUv-0.5)*vec2(1.0,1.35); float r=length(p)*2.0; float a=atan(p.y,p.x);
        float s=sin(a*5.0+t*1.8-r*9.0)*0.5+0.5; float s2=sin(a*3.0-t*1.2+r*6.0)*0.5+0.5;
        vec3 col=mix(c1,c2,s*s2)*(1.25-r*0.7); col+=pow(max(0.0,1.0-r),4.0)*vec3(1.0);
        gl_FragColor=vec4(col,1.0); }`,
    side: THREE.DoubleSide, toneMapped: false,
  });
  timeMats.add(m);
  return m;
}

// ---------- Interactables ----------
const IAs = new Set();
function addIA(obj, o = {}) {
  const ia = {
    obj, label: o.label || '', onActivate: o.onActivate || (() => {}), enabled: o.enabled || (() => true),
    repeat: !!o.repeat, dwell: o.dwell ?? 1.1, hoverScale: o.hoverScale ?? 1.05, room: !o.global,
    hover: 0, baseScale: obj.scale.clone(), meshes: [], alive: true,
  };
  obj.traverse((m) => { if (m.isMesh) { m.userData.ia = ia; ia.meshes.push(m); } });
  IAs.add(ia);
  return ia;
}
function removeIA(ia) { if (!ia) return; ia.alive = false; IAs.delete(ia); }
function shown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
let TARGETS = [];
function buildTargets() {
  TARGETS = [];
  for (const ia of IAs) {
    if (!ia.alive || !shown(ia.obj)) continue;
    let en = true;
    try { en = ia.enabled(); } catch (e) { en = false; }
    if (!en) continue;
    for (const m of ia.meshes) TARGETS.push(m);
  }
}
const ray = new THREE.Raycaster();
ray.far = 14;
function cast(origin, dir) {
  ray.set(origin, dir);
  const h = ray.intersectObjects(TARGETS, false);
  return h.length ? h[0] : null;
}
function activate(ia) {
  if (!ia || !ia.alive) return;
  let en = true;
  try { en = ia.enabled(); } catch (e) { en = false; }
  if (!en) return;
  ensureAudioLibs();
  sfx.click();
  try { ia.onActivate(ia); } catch (e) { console.error(e); }
}

// ---------- State ----------
const state = { roomId: null, def: null, room: null, elapsed: 0, penalty: 0, hints: 0, running: false, done: false, gaze: true, xr: false, ar: false, mode: 'chair', recline: 0, yawOff: 0, scanOn: false, read: false, skin: 'chrome' };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
if (['chair', 'recliner', 'table'].includes(lsGet('erv-mode'))) state.mode = lsGet('erv-mode');
if (Q.get('mode')) state.mode = Q.get('mode');
state.recline = parseFloat(lsGet('erv-recline')) || 0;
state.read = lsGet('erv-read') === '1';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
state.music = lsGet('erv-music') !== '0';
let secrets = {}; try { secrets = JSON.parse(lsGet('erv-secrets') || '{}'); } catch (e) {}
const BEST_KEY = 'erv-best-v1';
function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch (e) { return {}; } }
function saveBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) {} }
const best = (id) => loadBest()[id] || null;
try { if (localStorage.getItem('erv-gaze') === '0') state.gaze = false; } catch (e) {}

// ---------- Inventory ----------
const inv = {
  items: [],
  has(id) { return this.items.some((i) => i.id === id); },
  add(id, name, icon = '◆') {
    if (this.has(id)) return;
    this.items.push({ id, name, icon });
    sfx.pick();
    setMsg(`Picked up: ${icon} ${name}`, '#7dffb0');
  },
  remove(id) { this.items = this.items.filter((i) => i.id !== id); hudDirty = true; },
};

// ---------- Fade ----------
const fadeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1, side: THREE.BackSide, depthTest: false, depthWrite: false }));
fadeMesh.renderOrder = 10000;
camera.add(fadeMesh);
function fadeTo(target, dur = 0.3) {
  const from = fadeMesh.material.opacity;
  fadeMesh.visible = true;
  return anim(dur, (k) => {
    fadeMesh.material.opacity = from + (target - from) * k;
    fadeMesh.visible = fadeMesh.material.opacity > 0.001;
  }, (k) => k);
}

// ---------- Seats (seated movement) ----------
const seats = [];
let seatIdx = -1;
const seatGeo = { disc: new THREE.CircleGeometry(0.34, 40), ring: new THREE.RingGeometry(0.36, 0.42, 48), hit: new THREE.CylinderGeometry(0.42, 0.42, 1.1, 12) };
function addSeat(pos, yaw, o = {}) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const col = o.color || '#5ef2ff';
  const disc = new THREE.Mesh(seatGeo.disc, glowMat(col, 0.28, false));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.012;
  const ring = new THREE.Mesh(seatGeo.ring, glowMat(col, 0.95, false));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.014;
  const chev = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), glowMat(col, 0.95, false));
  chev.rotation.x = Math.PI; chev.position.y = 0.55;
  const hit = new THREE.Mesh(seatGeo.hit, new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.5;
  g.add(disc, ring, chev, hit);
  roomGroup.add(g);
  const s = { g, pos: pos.clone(), yaw, locked: o.locked || (() => false), ring, chev, disc, name: o.name || 'spot' };
  seats.push(s);
  s.ia = addIA(g, {
    label: o.label || 'Glide here', dwell: 0.9, hoverScale: 1.12,
    onActivate: () => {
      if (s.locked()) { sfx.wrong(); setMsg(o.lockedMsg || 'That spot is blocked.', '#ff8080'); return; }
      goSeat(seats.indexOf(s));
    },
  });
  return s;
}
const QY = new THREE.Quaternion(), QX = new THREE.Quaternion(), QO = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const pose = { pos: new THREE.Vector3(), yaw: 0, lift: 0, tYaw: 0, anchor: null };
let bodyYaw = null;
function placeRig(pos, yaw) {
  pose.pos.copy(pos); pose.yaw = yaw;
  look.yaw = 0; look.pitch = state.mode === 'table' ? 0.5 : 0;
  applyRig();
}
// head position + forward in rig space (rig space = the real room)
function headLocal() {
  const f = new THREE.Vector3(0, 0, -1);
  if (state.xr) f.applyQuaternion(camera.quaternion);
  return { p: state.xr ? camera.position.clone() : new THREE.Vector3(0, EYE, 0), f };
}
function applyRig() {
  hudYaw = null; bodyYaw = null;
  if (state.mode === 'table') return placeTable();
  rig.scale.setScalar(1);
  // Recliner: tilt the whole world so "straight ahead" is where a leaned-back head naturally looks
  const tilt = state.mode === 'recliner' && state.xr ? -state.recline : 0;
  QY.setFromAxisAngle(AY, pose.yaw); QX.setFromAxisAngle(AX, tilt); QO.setFromAxisAngle(AY, state.xr ? state.yawOff : 0);
  rig.quaternion.copy(QY).multiply(QX).multiply(QO);
  rig.position.set(pose.pos.x, pose.lift, pose.pos.z);
  if (state.xr) { // compensate head offset so the HEAD lands on the spot
    rig.updateMatrixWorld(true);
    camera.getWorldPosition(V);
    rig.position.x += pose.pos.x - V.x;
    rig.position.z += pose.pos.z - V.z;
    if (tilt) rig.position.y += EYE + pose.lift - V.y;
  }
}
// Table mode: the room becomes a miniature on the table in front of you
function placeTable() {
  const S = (state.def && state.def.tableScale) || 8;
  if (!pose.anchor) pose.anchor = headLocal();
  const { p, f } = pose.anchor;
  const ff = new THREE.Vector3(f.x, 0, f.z);
  if (ff.lengthSq() < 1e-4) ff.set(0, 0, -1);
  ff.normalize();
  const c = new THREE.Vector3().copy(p).addScaledVector(ff, 0.95); c.y = p.y - 0.5;
  const thF = Math.atan2(-ff.x, -ff.z);
  rig.quaternion.setFromAxisAngle(AY, (seats[0] ? seats[0].yaw : 0) - thF + pose.tYaw);
  rig.scale.setScalar(S);
  c.multiplyScalar(S).applyQuaternion(rig.quaternion);
  rig.position.set(-c.x, -c.y, -c.z);
}
function setMode(m, quiet) {
  state.mode = m; lsSet('erv-mode', m);
  pose.anchor = null; pose.tYaw = 0;
  body.setMode(m);
  if (seats[seatIdx]) placeRig(seats[seatIdx].pos, seats[seatIdx].yaw);
  refreshSeats(); markModes();
  if (modeBtn) modeBtn.redraw(MODE_LABEL[m]);
  if (!quiet) setMsg(m === 'chair' ? 'Chair mode: sit upright. Look at floor rings to glide.' : m === 'recliner' ? 'Recliner mode: lean back, then choose Recenter in the menu so the room tilts to match you.' : 'Table mode: the whole room sits on the table in front of you. Use Turn to spin it.', '#7dffb0');
}
async function recenter() {
  setMsg('Get comfy. Rest your head and look straight ahead… hold still for 3 seconds.', '#7dffb0', 6);
  await anim(3, () => {});
  if (state.xr) {
    const { f } = headLocal();
    state.yawOff = -Math.atan2(-f.x, -f.z);
    if (state.mode === 'recliner') {
      const e = Math.asin(Math.max(-1, Math.min(1, f.y)));
      state.recline = e > 0.1 ? Math.min(e, 1.2) : 0;
      lsSet('erv-recline', String(state.recline));
    }
  }
  pose.anchor = null; pose.tYaw = 0;
  if (seats[seatIdx]) pose.yaw = seats[seatIdx].yaw;
  applyRig();
  setMsg(state.mode === 'recliner' ? `Centered. Room tilted ${Math.round(state.recline * 57.3)}° to match your recline.` : 'Centered.', '#7dffb0', 5);
}
let seatBusy = false;
async function goSeat(i, instant = false) {
  const s = seats[i];
  if (!s || seatBusy) return;
  if (state.mode === 'table' && !instant) return;
  hudYaw = null;
  if (instant) { placeRig(s.pos, s.yaw); seatIdx = i; refreshSeats(); return; }
  seatBusy = true;
  sfx.whoosh();
  await fadeTo(0.92, 0.18);
  placeRig(s.pos, s.yaw);
  seatIdx = i;
  refreshSeats();
  hudYaw = null;
  await fadeTo(0, 0.28);
  seatBusy = false;
}
function refreshSeats() {
  seats.forEach((s, j) => {
    s.g.visible = j !== seatIdx && state.mode !== 'table';
    const lk = s.locked();
    const c = lk ? '#ff4060' : '#5ef2ff';
    s.ring.material.color.set(c); s.chev.material.color.set(c); s.disc.material.color.set(c);
  });
}
function turn(a) {
  if (state.mode === 'table') { pose.tYaw += a; placeTable(); sfx.tick(); return; }
  camera.getWorldPosition(V);
  pose.yaw += a;
  QY.setFromAxisAngle(AY, a);
  rig.quaternion.premultiply(QY);
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(V2);
  rig.position.add(V.sub(V2));
  sfx.tick();
}

// ---------- Particles ----------
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.userData.shared = true; return t;
})();
const bursts = [];
function burst(pos, color = '#ffd54a', n = 70, speed = 1.6) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), v = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
    const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), s = speed * (0.4 + Math.random() * 0.6);
    v[i * 3] = Math.sin(ph) * Math.cos(th) * s; v[i * 3 + 1] = Math.abs(Math.cos(ph)) * s * 1.2; v[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * s;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ color, size: 0.05 / rig.scale.x, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  scene.add(pts);
  bursts.push({ pts, v, life: 0 });
}
function stepBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life += dt;
    const a = b.pts.geometry.attributes.position;
    for (let j = 0; j < a.count; j++) {
      b.v[j * 3 + 1] -= 2.2 * dt;
      a.array[j * 3] += b.v[j * 3] * dt; a.array[j * 3 + 1] += b.v[j * 3 + 1] * dt; a.array[j * 3 + 2] += b.v[j * 3 + 2] * dt;
    }
    a.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 1 - b.life / 1.4);
    if (b.life > 1.4) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
  }
}
function dust(count = 220, size = [6, 3, 6], color = '#fff2cc', center = [0, 1.5, 0]) {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    p[i * 3] = center[0] + (Math.random() - 0.5) * size[0];
    p[i * 3 + 1] = center[1] + (Math.random() - 0.5) * size[1];
    p[i * 3 + 2] = center[2] + (Math.random() - 0.5) * size[2];
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.018, map: dotTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  pts.frustumCulled = false; pts.userData.cut = 'fx';
  roomGroup.add(pts);
  let fr = 0;
  updaters.push((dt, t) => {
    if (++fr % 3) return; // drifting dust only needs ~24 updates a second
    const a = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      a.array[i * 3 + 1] += Math.sin(t * 0.4 + i) * 0.0027;
      a.array[i * 3] += Math.cos(t * 0.3 + i * 1.7) * 0.0018;
    }
    a.needsUpdate = true;
  });
  return pts;
}

// ---------- Gaze reticle + tooltip ----------
const ret = new THREE.Group();
const retBg = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.022, 40, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthTest: false, toneMapped: false }));
const retFill = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.022, 40, 1, Math.PI / 2, -Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0x5ef2ff, depthTest: false, toneMapped: false, side: THREE.DoubleSide }));
const retDot = new THREE.Mesh(new THREE.CircleGeometry(0.004, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, toneMapped: false }));
[retBg, retFill, retDot].forEach((m) => { m.renderOrder = 9000; ret.add(m); });
scene.add(ret);
const tip = screen(512, 112, 0.3, (g, w, h, text = '') => {
  if (!text) return;
  g.font = '700 46px system-ui, sans-serif';
  const tw = Math.min(w - 20, g.measureText(text).width + 50);
  g.fillStyle = 'rgba(8,12,24,0.85)';
  g.beginPath(); g.roundRect((w - tw) / 2, 18, tw, h - 36, 30); g.fill();
  g.strokeStyle = 'rgba(94,242,255,0.9)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2, w - 60);
}, { renderOrder: 9001 });
tip.material.depthTest = false;
scene.add(tip);
let tipText = '';
function setRetFill(k) {
  const segs = 40, n = Math.round(Math.max(0, Math.min(1, k)) * segs);
  retFill.geometry.setDrawRange(0, n * 6);
}

// ---------- Pointers ----------
const look = { yaw: 0, pitch: 0 };
const mouse = { x: 0, y: 0, in: false, down: false, sx: 0, sy: 0, moved: 0, ia: null, hit: null };
const gaze = { ia: null, t: 0, cool: 0, lock: null, hit: null };
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  mouse.down = true; mouse.sx = e.clientX; mouse.sy = e.clientY; mouse.moved = 0;
  setMouse(e); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (mouse.down) {
    const dx = e.clientX - mouse.lx, dy = e.clientY - mouse.ly;
    mouse.moved += Math.abs(dx) + Math.abs(dy);
    look.yaw += dx * 0.0042 * (e.pointerType === 'touch' ? 1.4 : 1);
    look.pitch = Math.max(-1.3, Math.min(1.3, look.pitch + dy * 0.0042));
  }
  setMouse(e);
});
canvas.addEventListener('pointerup', (e) => {
  mouse.down = false;
  setMouse(e);
  if (mouse.moved < 10 && !state.xr) {
    buildTargets();
    const h = mouseHit();
    if (h) activate(h.object.userData.ia);
  }
});
canvas.addEventListener('pointerleave', () => { mouse.in = false; });
function setMouse(e) { mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; mouse.lx = e.clientX; mouse.ly = e.clientY; mouse.in = true; }
const ndc = new THREE.Vector2();
function mouseHit() {
  ndc.set(mouse.x, mouse.y);
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(TARGETS, false);
  return h.length ? h[0] : null;
}
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === 't' || e.key === 'T') { const a = document.getElementById('ask-in'); if (a) { e.preventDefault(); a.focus(); } return; }
  if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') turn(Math.PI / 6);
  if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') turn(-Math.PI / 6);
  if (e.key === 'h' || e.key === 'H') doHint();
  if (e.key === 'm' || e.key === 'M') { moreRow.visible = !moreRow.visible; }
  if (e.key === '1') setMode('chair'); if (e.key === '2') setMode('recliner'); if (e.key === '3') setMode('table');
});

// XR controllers + hands
const handFactory = new XRHandModelFactory();
const ctrls = [0, 1].map((i) => {
  const c = renderer.xr.getController(i);
  rig.add(c);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
    new THREE.LineBasicMaterial({ color: 0x5ef2ff, transparent: true, opacity: 0.75, toneMapped: false }));
  line.visible = false;
  c.add(line);
  const grip = renderer.xr.getControllerGrip(i);
  const body = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 6, 12), mat('#20242c', { rough: 0.35, metal: 0.4 }));
  shell.rotation.x = Math.PI / 2.6;
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 8, 28), glowMat('#5ef2ff', 0.9));
  ringM.position.set(0, 0.02, -0.03); ringM.rotation.x = Math.PI / 3;
  body.add(shell, ringM);
  grip.add(body);
  rig.add(grip);
  const hand = renderer.xr.getHand(i);
  try { hand.add(handFactory.createHandModel(hand, 'spheres')); } catch (e) {}
  rig.add(hand);
  c.userData = { line, hover: null, hit: null, src: null, latch: false, body };
  c.addEventListener('connected', (e) => { c.userData.src = e.data; line.visible = true; body.visible = !e.data.hand; });
  c.addEventListener('disconnected', () => { c.userData.src = null; line.visible = false; c.userData.hover = null; });
  c.addEventListener('selectstart', () => { initAudio(); if (c.userData.hover) activate(c.userData.hover); });
  c.addEventListener('squeezestart', () => openHatch());
  return c;
});

function updatePointers(dt) {
  buildTargets();
  const RS = rig.scale.x;
  ray.far = 14 * RS;
  const hovered = new Set();
  let primary = null, primaryHit = null;

  // Gaze (hands-free)
  const useGaze = state.gaze && (state.xr || Q.has('gaze'));
  if (useGaze) {
    camera.getWorldPosition(V);
    camera.getWorldDirection(V2);
    const h = cast(V, V2);
    const ia = h ? h.object.userData.ia : null;
    if (ia !== gaze.ia) { gaze.ia = ia; gaze.t = 0; if (gaze.lock && ia !== gaze.lock) gaze.lock = null; }
    gaze.cool -= dt;
    if (ia && ia !== gaze.lock && gaze.cool <= 0 && !seatBusy) {
      gaze.t += dt;
      if (gaze.t >= ia.dwell) {
        activate(ia);
        gaze.t = 0;
        if (ia.repeat) gaze.cool = 0.4; else gaze.lock = ia;
      }
    }
    if (ia) { hovered.add(ia); primary = ia; primaryHit = h; }
    ret.visible = true;
    const d = h ? h.distance : 2.2 * RS;
    const p = h ? h.point : V3.copy(V).addScaledVector(V2, 2.2 * RS);
    ret.position.copy(p).addScaledVector(V2, -0.015);
    camera.getWorldQuaternion(QT);
    ret.quaternion.copy(QT);
    ret.scale.setScalar(Math.max(0.3, d * 0.75));
    retBg.visible = retFill.visible = !!ia && ia !== gaze.lock;
    setRetFill(ia ? gaze.t / ia.dwell : 0);
  } else {
    ret.visible = false;
    gaze.ia = null; gaze.t = 0;
  }

  // Controllers / hands (instant select)
  if (state.xr) {
    for (const c of ctrls) {
      const u = c.userData;
      if (!u.src) continue;
      QT.setFromRotationMatrix(c.matrixWorld);
      V.setFromMatrixPosition(c.matrixWorld);
      V2.set(0, 0, -1).applyQuaternion(QT);
      const h = cast(V, V2);
      u.hover = h ? h.object.userData.ia : null;
      u.line.scale.z = h ? h.distance / RS : 3;
      u.line.material.color.set(h ? 0x7dffb0 : 0x5ef2ff);
      if (u.hover) { hovered.add(u.hover); if (!primary || !useGaze) { primary = u.hover; primaryHit = h; } }
      // Thumbstick snap turn
      const gp = u.src.gamepad;
      if (gp && gp.axes && gp.axes.length >= 4) {
        const x = gp.axes[2];
        if (!u.latch && Math.abs(x) > 0.7) { turn(x > 0 ? -Math.PI / 6 : Math.PI / 6); u.latch = true; }
        if (Math.abs(x) < 0.3) u.latch = false;
      }
    }
  } else if (mouse.in && !('ontouchstart' in window && !mouse.down)) {
    const h = mouseHit();
    mouse.ia = h ? h.object.userData.ia : null;
    if (mouse.ia) { hovered.add(mouse.ia); primary = mouse.ia; primaryHit = h; }
    canvas.style.cursor = mouse.ia ? 'pointer' : (mouse.down ? 'grabbing' : 'grab');
  }

  if (primary && !primary.room && primary.obj.parent && (primary.obj.parent === btnRow || primary.obj.parent === moreRow)) hatchUntil = clock.elapsedTime + 5;
  // Hover visuals
  for (const ia of IAs) {
    const target = hovered.has(ia) ? 1 : 0;
    if (ia.hover === target && target === 0) continue;
    ia.hover += (target - ia.hover) * Math.min(1, dt * 12);
    if (Math.abs(ia.hover - target) < 0.01) ia.hover = target;
    if (ia.hoverScale !== 1) ia.obj.scale.copy(ia.baseScale).multiplyScalar(1 + (ia.hoverScale - 1) * ia.hover);
  }

  // Tooltip
  const txt = primary ? primary.label : '';
  if (txt !== tipText) { tipText = txt; tip.redraw(txt); }
  tip.visible = !!txt;
  if (primaryHit) {
    camera.getWorldPosition(V);
    const d = primaryHit.distance;
    tip.position.copy(primaryHit.point).lerp(V, 0.12);
    camera.getWorldQuaternion(QT);
    tip.quaternion.copy(QT);
    tip.position.y += 0.07 * Math.max(0.6, d);
    tip.scale.setScalar(Math.max(0.45, d * 0.55));
  }
}

// ---------- HUD (lazy-follow, hands-free buttons) ----------
const hud = new THREE.Group();
scene.add(hud);
let hudDirty = true, hudYaw = null, msg = { text: 'Welcome! Look at things to use them.', color: '#ffffff', until: 0 };
const hudPanel = screen(1024, 300, 0.52, (g, w, h) => {
  const def = state.def || {};
  const col = def.color || '#5ef2ff';
  g.fillStyle = 'rgba(8,11,22,0.86)';
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.fill();
  g.strokeStyle = col; g.lineWidth = 5; g.stroke();
  g.textBaseline = 'middle';
  g.font = '800 44px system-ui, sans-serif';
  g.fillStyle = '#fff'; g.textAlign = 'left';
  g.fillText(def.title || 'SeatBreak', 34, 52, 600);
  if (def.tier) {
    g.font = '800 26px system-ui, sans-serif';
    const tw = g.measureText(def.tier).width + 28;
    const tx = w - 250 - tw;
    g.fillStyle = col; g.beginPath(); g.roundRect(tx, 34, tw, 38, 8); g.fill();
    g.fillStyle = '#0a0d18'; g.fillText(def.tier, tx + 14, 54);
  }
  g.textAlign = 'right'; g.font = '800 46px ui-monospace, Menlo, Consolas, monospace';
  if (state.roomId && state.roomId !== 'hub') {
    const lim = def.limit;
    const t = lim ? Math.max(0, lim - state.elapsed - state.penalty) : state.elapsed;
    const mm = String(Math.floor(t / 60)).padStart(2, '0'), ss = String(Math.floor(t % 60)).padStart(2, '0');
    g.fillStyle = lim && t < 60 ? '#ff5470' : '#ffffff';
    g.fillText(`${lim ? '⏱ ' : ''}${mm}:${ss}`, w - 34, 52);
  }
  // message
  g.textAlign = 'left'; g.font = '600 34px system-ui, sans-serif'; g.fillStyle = msg.color;
  wrap(g, msg.text, 34, 118, w - 68, 42, 3);
  // inventory
  g.font = '700 30px system-ui, sans-serif';
  let x = 34;
  if (!inv.items.length) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText('Inventory: empty', x, 258); }
  for (const it of inv.items) {
    const s = `${it.icon} ${it.name}`;
    const tw = g.measureText(s).width + 30;
    if (x + tw > w - 20) break;
    g.fillStyle = 'rgba(94,242,255,0.18)'; g.beginPath(); g.roundRect(x, 236, tw, 46, 12); g.fill();
    g.fillStyle = '#e8fbff'; g.fillText(s, x + 15, 260);
    x += tw + 12;
  }
}, { renderOrder: 50 });
function wrap(g, text, x, y, maxW, lh, maxLines) {
  const words = String(text).split(' ');
  let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y + n * lh); n++; line = words[i];
      if (n >= maxLines - 1 && i < words.length - 1) {
        let rest = words.slice(i).join(' ');
        while (g.measureText(rest + '…').width > maxW && rest.length) rest = rest.slice(0, -1);
        g.fillText(rest + (rest.length < words.slice(i).join(' ').length ? '…' : ''), x, y + n * lh);
        return;
      }
    } else line = test;
  }
  g.fillText(line, x, y + n * lh);
}
hudPanel.material.depthTest = false;
hud.add(hudPanel);
const btnRow = new THREE.Group(), moreRow = new THREE.Group();
hud.add(btnRow, moreRow); moreRow.visible = false;
let hatchOpen = false, hatchUntil = 0, msgShow = 0;
function hudButton(text, x, y, fn, o = {}) {
  const b = screen(256, 160, 0.088, (g, w, h, t = text) => {
    g.fillStyle = 'rgba(14,20,38,0.92)';
    g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 16); g.fill();
    g.strokeStyle = o.color || '#5ef2ff'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const [a, bb] = t.split('|');
    g.font = '800 58px system-ui, sans-serif'; g.fillText(a, w / 2, bb ? 62 : h / 2);
    if (bb) { g.font = '700 30px system-ui, sans-serif'; g.fillText(bb, w / 2, 118); }
  }, { renderOrder: 51 });
  b.position.set(x, y, 0.004);
  b.material.depthTest = false;
  (o.row || btnRow).add(b);
  addIA(b, { label: o.tip || text.replace('|', ' '), global: true, dwell: o.dwell ?? 0.9, repeat: !!o.repeat, hoverScale: 1.1, onActivate: fn });
  return b;
}
const Y1 = -0.118, Y2 = -0.2;
hudButton('↺|Turn', -0.212, Y1, () => turn(Math.PI / 6), { repeat: true, tip: 'Turn left' });
hudButton('💡|Hint', -0.106, Y1, () => doHint(), { color: '#ffd54a', tip: 'Get a hint' });
hudButton('🔑|Answer', 0, Y1, () => doAnswer(), { color: '#ff9d5c', tip: 'Show the answer', dwell: 1.5 });
hudButton('☰|More', 0.106, Y1, () => { moreRow.visible = !moreRow.visible; }, { color: '#c9a0ff', tip: 'More options' });
hudButton('↻|Turn', 0.212, Y1, () => turn(-Math.PI / 6), { repeat: true, tip: 'Turn right' });
hudButton('⌂|Lobby', -0.2385, Y2, () => { if (state.roomId !== 'hub') loadRoom('hub'); }, { row: moreRow, color: '#c9a0ff', tip: 'Exit to the lobby', dwell: 1.3 });
const gazeBtn = hudButton('👁|Gaze ON', -0.1431, Y2, () => {
  state.gaze = !state.gaze; lsSet('erv-gaze', state.gaze ? '1' : '0');
  gazeBtn.redraw(state.gaze ? '👁|Gaze ON' : '👁|Gaze OFF');
  setMsg(state.gaze ? 'Hands-free ON: look at anything for a moment to use it.' : 'Gaze OFF: point and pinch / pull the trigger instead.');
}, { row: moreRow, tip: 'Hands-free look-to-use' });
gazeBtn.redraw(state.gaze ? '👁|Gaze ON' : '👁|Gaze OFF');
const MODE_LABEL = { chair: '🪑|Chair', recliner: '🛋|Recliner', table: '🎲|Table' };
const modeBtn = hudButton(MODE_LABEL[state.mode], -0.0477, Y2, () => setMode({ chair: 'recliner', recliner: 'table', table: 'chair' }[state.mode]), { row: moreRow, color: '#7dffb0', tip: 'Change play mode', dwell: 1.2 });
hudButton('🎯|Recenter', 0.0477, Y2, () => recenter(), { row: moreRow, color: '#7dffb0', tip: 'Recenter / set recline' });
hudButton('📐|Scan', 0.1431, Y2, () => toggleScan(), { row: moreRow, color: '#7dffb0', tip: 'Show my real room' });
const readBtn = hudButton(state.read ? '🔊|Read ON' : '🔊|Read OFF', 0.2385, Y2, () => {
  state.read = !state.read; lsSet('erv-read', state.read ? '1' : '0');
  readBtn.redraw(state.read ? '🔊|Read ON' : '🔊|Read OFF');
  setMsg(state.read ? 'Read aloud ON. Messages will be spoken.' : 'Read aloud OFF.');
}, { row: moreRow, color: '#ffd54a', tip: 'Read messages aloud' });

// ---------- Body, skins, chest hatch ----------
const body = createBody();
scene.add(body.group);
body.setMode(state.mode);
function setSkin(id) {
  const sk = SKINS.find((k) => k.id === id) || SKINS[0];
  state.skin = sk.id; body.setSkin(sk); lsSet('erv-skin', sk.id);
}
setSkin(lsGet('erv-skin') || 'chrome');
addIA(body.menuIcon, { label: 'Open menu', global: true, dwell: 0.7, hoverScale: 1.25, onActivate: () => openHatch(true) });
function openHatch(on = !hatchOpen) {
  hatchOpen = on; hatchUntil = clock.elapsedTime + 6;
  body.setHatch(on);
  if (!on) moreRow.visible = false;
  sfx.mech(); hudYaw = null;
}
function updateBody(dt, t) {
  const show = state.mode !== 'table';
  body.group.visible = show;
  if (!show) return;
  camera.getWorldPosition(V); camera.getWorldDirection(V2);
  const yaw = Math.atan2(V2.x, V2.z);
  if (bodyYaw === null) bodyYaw = yaw;
  let d = yaw - bodyYaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) > 0.9) bodyYaw += d * Math.min(1, dt * 3);
  body.group.position.copy(V);
  body.group.rotation.y = bodyYaw;
  body.arms.visible = !state.xr;
  body.menuIcon.visible = state.xr && !hatchOpen;
  body.update(dt, t);
}
function speak(text) { if (state.read && voice) { try { voice.speak(text, { mood: 'calm' }); } catch (e) {} } }

function setMsg(text, color = '#ffffff', dur = 9) {
  msg = { text, color, until: clock.elapsedTime + dur };
  msgShow = clock.elapsedTime + Math.min(dur, 10);
  if (color === '#7dffb0') lastProgress = clock.elapsedTime;
  hudDirty = true;
  speak(text);
}
function updateHUD(dt) {
  camera.getWorldPosition(V);
  camera.getWorldDirection(V2);
  const yaw = Math.atan2(V2.x, V2.z), S = rig.scale.x, now = clock.elapsedTime;
  if (hudYaw === null) hudYaw = yaw;
  let d = yaw - hudYaw;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) > 0.55) hudYaw += d * Math.min(1, dt * 2.5);
  const dist = 0.6;
  let drop = 0.36, sc = 1;
  const table = state.mode === 'table';
  if (!state.xr) {
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    sc = Math.min(1, (halfH * camera.aspect * 2 * 0.96) / 0.58, (halfH * 0.62) / 0.2);
    drop = halfH - (moreRow.visible ? 0.255 : 0.175) * sc;
    if (table) { sc *= 0.8; drop = -0.1; }
    hud.visible = true; btnRow.visible = true;
  } else { // in VR the menu lives in your chest hatch; messages pop up on their own
    if (hatchOpen && now > hatchUntil) openHatch(false);
    hud.visible = table || hatchOpen || now < msgShow;
    btnRow.visible = table || hatchOpen;
    if (!hatchOpen && !table) moreRow.visible = false;
    if (table) drop = -0.12; // the mini room sits low on the table, so the menu floats above it
  }
  hud.scale.setScalar(sc * S);
  hud.position.set(V.x + Math.sin(hudYaw) * dist * S, V.y - drop * S, V.z + Math.cos(hudYaw) * dist * S);
  hud.lookAt(V.x, V.y - (table ? drop : drop * 0.35) * S, V.z);
  if (msg.until && now > msg.until) { msg = { text: state.room?.idle?.() || '', color: '#cfe8ff', until: 0 }; hudDirty = true; }
  if (hudDirty) { hudDirty = false; hudPanel.redraw(); }
}
let lastSec = -1;

function doHint() {
  if (!state.room || !state.room.hint) return;
  if (state.roomId !== 'hub' && !state.done) state.hints++;
  sfx.solve();
  setMsg('💡 ' + state.room.hint(), '#ffd54a', 16);
}
function doAnswer() {
  const r = state.room;
  if (!r) return;
  const a = r.answer ? r.answer() : r.hint ? r.hint() : '';
  if (state.roomId !== 'hub' && !state.done) state.hints += 3;
  sfx.solve();
  setMsg('🔑 ' + a, '#ff9d5c', 22);
}
const totalStars = () => Object.values(loadBest()).reduce((a, b) => a + (b.stars || 0), 0);

// ---------- Result / fail panels ----------
function panelButtons(group, buttons, y) {
  const n = buttons.length, w = 0.34, gap = 0.04;
  buttons.forEach((b, i) => {
    const bt = TX.label(b.label, { w, size: 56, bg: 'rgba(16,24,48,0.95)', border: b.color || '#5ef2ff', radius: 22, pad: 30 });
    bt.position.set((i - (n - 1) / 2) * (w + gap), y, 0.01);
    group.add(bt);
    addIA(bt, { label: b.label, dwell: 1.0, hoverScale: 1.08, onActivate: b.fn });
  });
}
function showPanel({ title, lines = [], facts = [], buttons = [], color = '#5ef2ff', stars = -1 }) {
  const g = new THREE.Group(), S = rig.scale.x;
  camera.getWorldPosition(V); camera.getWorldDirection(V2);
  V2.y = 0; V2.normalize();
  g.position.copy(V).addScaledVector(V2, 1.3 * S); g.position.y = V.y + (state.xr ? 0.05 : 0.2) * S;
  g.lookAt(V.x, g.position.y, V.z);
  g.scale.setScalar(S);
  const px = facts.length ? 1040 : 760, hM = 1.25 * px / 1250;
  const bg = TX.label([''], { w: 1.25, width: 1250, height: px, bg: 'rgba(6,9,20,0.92)', border: color, borderWidth: 10, radius: 50 });
  g.add(bg);
  let y = hM / 2 - 0.13;
  const tl = TX.label(title, { w: 1.1, size: 96, weight: 900, color, glow: color });
  tl.position.set(0, y, 0.01); g.add(tl);
  if (stars >= 0) {
    y -= 0.15;
    const st = TX.label('★'.repeat(stars) + '☆'.repeat(3 - stars), { w: 0.5, size: 120, color: '#ffd54a', glow: '#ffb300' });
    st.position.set(0, y, 0.01); g.add(st);
  }
  if (lines.length) {
    y -= 0.15;
    const ll = TX.label(lines, { w: 1.05, size: 50, weight: 600, color: '#dfe9ff' });
    ll.position.set(0, y, 0.01); g.add(ll);
  }
  if (facts.length) {
    const fl = TX.label(['REAL SCIENCE YOU JUST USED', ...facts.map((f) => '•  ' + f)], { w: 1.12, size: 44, weight: 600, align: 'left', colors: ['#ffd54a'], color: '#eaf2ff', bg: 'rgba(255,255,255,0.06)', radius: 20, pad: 26 });
    fl.position.set(0, y - 0.1 - fl.userData.h / 2, 0.01); g.add(fl);
  }
  panelButtons(g, buttons, -hM / 2 + 0.13);
  roomGroup.add(g);
  return g;
}
function fmt(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }
function escape() {
  if (state.done) return;
  state.done = true; state.running = false;
  const def = state.def;
  const t = state.elapsed + state.penalty;
  let stars = 1;
  if (state.hints === 0 && t <= def.par) stars = 3;
  else if (state.hints <= 2 && t <= def.par * 2) stars = 2;
  const b = loadBest();
  const prev = b[def.id];
  const isBest = !prev || stars > prev.stars || (stars === prev.stars && t < prev.time);
  if (isBest) { b[def.id] = { stars, time: t }; saveBest(b); }
  if (music) music.sting('escape'); else sfx.escape();
  camera.getWorldPosition(V);
  const cols = ['#ffd54a', '#5ef2ff', '#ff6bd6', '#7dffb0'];
  for (let i = 0; i < 4; i++) setTimeout(() => { camera.getWorldPosition(V); burst(V3.set(V.x + (Math.random() - 0.5) * 1.5, V.y + 0.6, V.z - 1), cols[i], 90, 2); }, i * 400);
  const order = ['kids', 'teens', 'mind', 'flood', 'adults', 'theater', 'expert'];
  const next = order[order.indexOf(def.id) + 1];
  const buttons = [{ label: '↻ Replay', fn: () => loadRoom(def.id) }, { label: '⌂ Lobby', fn: () => loadRoom('hub'), color: '#c9a0ff' }];
  if (next) buttons.push({ label: 'Next ▶', fn: () => loadRoom(next), color: '#7dffb0' });
  showPanel({
    title: 'YOU ESCAPED!', color: def.color, stars, facts: def.learn || [],
    lines: [`Time ${fmt(t)}  ·  Hints ${state.hints}${isBest ? '  ·  NEW BEST' : ''}${secrets[def.id] ? '  ·  Secret found ✔' : ''}`, stars < 3 ? `3 stars: no hints & under ${fmt(def.par)}` : 'Perfect run!'],
    buttons,
  });
  setMsg(`Escaped in ${fmt(t)}!`, '#7dffb0', 30);
}
function fail(reason = 'Time is up.') {
  if (state.done) return;
  state.done = true; state.running = false;
  if (music) music.sting('fail'); else sfx.alarm();
  showPanel({ title: state.def.failTitle || 'OUT OF TIME', color: '#ff4060', lines: [reason, state.def.failLine || 'The room resets. Try again!'], buttons: [{ label: '↻ Retry', fn: () => loadRoom(state.def.id), color: '#ff4060' }, { label: '⌂ Lobby', fn: () => loadRoom('hub'), color: '#c9a0ff' }] });
}

// ---------- Keypad (shared puzzle part) ----------
function keypad({ code, onSolve, onWrong, color = '#5ef2ff', size = 1, title = 'ENTER CODE', bodyColor = '#1c2230', enabled = () => true }) {
  const g = new THREE.Group();
  let entry = '', solved = false, flash = 0;
  const body = box(0.32 * size, 0.46 * size, 0.04 * size, mat(bodyColor, { rough: 0.35, metal: 0.6 }));
  g.add(body);
  const disp = screen(512, 160, 0.27 * size, (gg, w, h, mode = 'idle') => {
    gg.fillStyle = mode === 'ok' ? '#0b3d22' : mode === 'bad' ? '#4a0d16' : '#05080f';
    gg.fillRect(0, 0, w, h);
    gg.fillStyle = mode === 'ok' ? '#7dffb0' : mode === 'bad' ? '#ff6b80' : color;
    gg.textAlign = 'center'; gg.textBaseline = 'middle';
    gg.font = '700 28px system-ui, sans-serif'; gg.fillText(mode === 'ok' ? 'UNLOCKED' : mode === 'bad' ? 'WRONG CODE' : title, w / 2, 34);
    gg.font = '800 84px ui-monospace, Menlo, monospace';
    const s = entry.padEnd(code.length, '_').split('').join(' ');
    gg.fillText(s, w / 2, 104);
  }, { transparent: false });
  disp.position.set(0, 0.155 * size, 0.022 * size);
  g.add(disp);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'];
  keys.forEach((k, i) => {
    const kx = ((i % 3) - 1) * 0.088 * size, ky = (0.04 - Math.floor(i / 3) * 0.075) * size;
    const b = TX.label(k, { w: 0.074 * size, width: 150, height: 120, size: 78, bg: k === '✓' ? '#1d6b45' : k === 'C' ? '#6b1d2b' : '#2b3550', radius: 18, depthWrite: true });
    b.position.set(kx, ky, 0.023 * size);
    g.add(b);
    addIA(b, {
      label: k === '✓' ? 'Enter' : k === 'C' ? 'Clear' : k, repeat: true, dwell: 0.75, hoverScale: 1.12,
      enabled: () => !solved && enabled(),
      onActivate: () => {
        if (k === 'C') entry = '';
        else if (k === '✓') {
          if (entry === code) { solved = true; disp.redraw('ok'); sfx.solve(); onSolve && onSolve(); return; }
          sfx.wrong(); disp.redraw('bad'); flash = 1.2; entry = ''; onWrong && onWrong(); return;
        } else if (entry.length < code.length) entry += k;
        disp.redraw();
      },
    });
  });
  updaters.push((dt) => { if (flash > 0) { flash -= dt; if (flash <= 0 && !solved) disp.redraw(); } });
  g.userData.isSolved = () => solved;
  return g;
}

// ---------- Room loading ----------
const clock = new THREE.Clock();
let busy = false;
function disposeTree(o) {
  o.traverse((m) => {
    if (m.geometry && !Object.values(seatGeo).includes(m.geometry)) m.geometry.dispose();
    if (m.material) {
      const ms = Array.isArray(m.material) ? m.material : [m.material];
      for (const x of ms) {
        if (x.map && !x.map.userData.shared) x.map.dispose();
        x.dispose();
      }
    }
  });
}
let pendingRoom = null;
async function loadRoom(id, o = {}) {
  if (!ROOMS[id]) return;
  if (busy) { pendingRoom = id; return; }
  busy = true;
  if (!o.first) await fadeTo(1, 0.35);
  for (const ia of [...IAs]) if (ia.room) removeIA(ia);
  scene.remove(roomGroup);
  disposeTree(roomGroup);
  roomGroup = new THREE.Group();
  scene.add(roomGroup);
  seats.length = 0; seatIdx = -1;
  updaters = []; tweens = tweens.filter((t) => t.keep); timeMats.clear();
  inv.items = [];
  pose.lift = 0; pose.tYaw = 0; body.setChains(0);
  dimT = 1; dimK = 1; halos = []; secretFx = []; lastProgress = clock.elapsedTime; nudged = 0;
  gaze.lock = null; gaze.ia = null;
  scene.fog = null; scene.background = new THREE.Color('#05060c');
  const def = ROOMS[id];
  state.def = def; state.roomId = id;
  state.elapsed = 0; state.penalty = 0; state.hints = 0; state.done = false;
  try { state.room = def.build(api) || {}; } catch (e) { console.error('room build failed', e); state.room = {}; }
  collectCuts();
  state.running = id !== 'hub';
  if (seats.length) goSeat(0, true);
  hudYaw = null;
  renderer.shadowMap.needsUpdate = true;
  playMusic(id);
  setTimeout(() => { if (state.roomId === id) { const r = KBM && KBM.KB && KBM.KB.rooms && KBM.KB.rooms[id]; const fl = r && r.flavor; drone.say(fl && fl.length ? fl[Math.floor(Math.random() * fl.length)] : 'I am Bolt, your guide. Look at me any time you want a tip!', 'happy'); } }, 2200);
  setMsg(def.intro || '', '#ffffff', 14);
  if (location.hash.slice(1) !== id && !o.noHash) history.replaceState(null, '', id === 'hub' ? location.pathname + location.search : '#' + id);
  await fadeTo(0, 0.55);
  busy = false;
  if (pendingRoom) { const p = pendingRoom; pendingRoom = null; if (p !== state.roomId) loadRoom(p); }
}

const api = {
  THREE, TX, mat, glowMat, box, cyl, sph, M, screen, portalMat, keypad,
  get group() { return roomGroup; },
  add: (...o) => roomGroup.add(...o),
  addIA, removeIA, addSeat, inv, sfx, burst, dust, anim,
  msg: setMsg,
  onUpdate: (f) => updaters.push(f),
  escape, fail, showPanel,
  shadowsDirty: () => { renderer.shadowMap.needsUpdate = true; },
  setScene({ bg, fog }) { if (bg) scene.background = bg; scene.fog = fog || null; },
  penalty: (s) => { state.penalty += s; hudDirty = true; },
  state, best, loadRoom, refreshSeats,
  remaining: () => (state.def.limit ? state.def.limit - state.elapsed - state.penalty : Infinity),
  timeMat: (m) => { timeMats.add(m); return m; },
  setLift(y) { if (state.mode !== 'table') rig.position.y += y - pose.lift; pose.lift = y; },
  body, skins: SKINS, setSkin, stars: totalStars, rooms: ROOMS, dotTex, ill: ILL,
  secretCount: () => Object.keys(secrets).length,
  bolt: (text, mood) => drone.say(text, mood),
  // soft round shadow under furniture (keeps objects grounded even when real shadows are switched off)
  blob(x, z, r = 0.6, o = 0.4) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ map: TX.blobTex(), transparent: true, opacity: o, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.011, z); m.renderOrder = 1; roomGroup.add(m); return m; },
  // glow around a lamp
  halo(pos, color = '#ffe9b8', size = 0.6, o = 0.55, parent = roomGroup) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); sp.position.copy(pos); sp.scale.setScalar(size); sp.userData.o = o; parent.add(sp); halos.push(sp); return sp; },
  lightSwitch(pos, rotY = 0) {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rotY;
    g.add(box(0.11, 0.16, 0.012, mat('#f2f2ee', { rough: 0.4 })));
    const rocker = box(0.045, 0.075, 0.018, mat('#ffffff', { rough: 0.3 })); rocker.position.z = 0.012; rocker.rotation.x = -0.25; g.add(rocker);
    const lb = TX.label('LIGHTS', { w: 0.11, size: 44, weight: 800, color: '#1b1b1b', bg: '#f2f2ee', radius: 6, depthWrite: true }); lb.position.set(0, -0.12, 0.002); g.add(lb);
    roomGroup.add(g);
    addIA(g, { label: 'Light switch', hoverScale: 1.2, repeat: true, dwell: 0.9, onActivate: () => {
      dimT = dimT > 0.5 ? 0 : 1; rocker.rotation.x = dimT > 0.5 ? -0.25 : 0.25; sfx.mech();
      setMsg(dimT > 0.5 ? 'Lights on.' : 'Lights off. Look around… does anything glow in the dark?', '#cfe8ff', 6);
    } });
    return g;
  },
  // glow-in-the-dark writing: only visible with the lights off
  secret(lines, w = 2.2) { const m = TX.label(lines, { w, size: 84, weight: 800, color: '#b6ff6a', glow: '#7dff3a', family: 'Georgia, serif' }); m.material.opacity = 0; m.visible = false; secretFx.push(m); roomGroup.add(m); return m; },
  // framed illusion picture; look at it and Bolt explains the science
  poster(key, w = 0.9) {
    if (!ILL) return new THREE.Group();
    const meta = ILL.ILLUSIONS.find((i) => i.id.includes(key)) || ILL.ILLUSIONS[0];
    const g = new THREE.Group();
    const pic = screen(768, 576, w, (gg, cw, ch) => { try { ILL.drawIllusion(meta.id, gg, cw, ch, {}); } catch (e) {} }, { transparent: false, depthWrite: true });
    const fr = box(w + 0.08, w * 0.75 + 0.08, 0.03, mat('#2a1c12', { rough: 0.5 })); fr.position.z = -0.02; g.add(fr, pic);
    g.userData.meta = meta;
    addIA(g, { label: meta.name, hoverScale: 1.04, onActivate: () => drone.say(`${meta.question} ${meta.answer}. ${meta.science}`.slice(0, 320), 'thinking') });
    return g;
  },
  camera,
};

// ---------- XR session ----------
let xrSession = null, arOK = false, sessionScan = false;
async function enterVR() {
  ensureAudioLibs();
  if (!navigator.xr) return;
  sessionScan = lsGet('erv-scan') === '1';
  const opt = ['local-floor', 'hand-tracking', 'bounded-floor'];
  if (sessionScan) opt.push('plane-detection');
  let kind = state.mode === 'table' && arOK ? 'immersive-ar' : 'immersive-vr';
  try {
    let s;
    try { s = await navigator.xr.requestSession(kind, { optionalFeatures: opt }); }
    catch (e) { if (kind === 'immersive-vr') throw e; kind = 'immersive-vr'; s = await navigator.xr.requestSession(kind, { optionalFeatures: opt }); }
    await renderer.xr.setSession(s);
    xrSession = s; state.xr = true; state.ar = kind === 'immersive-ar';
    try { if (s.supportedFrameRates && Array.from(s.supportedFrameRates).includes(72)) s.updateTargetFrameRate(72); } catch (e) {}
    perf.acc = 0; perf.n = 0; perf.bad = 0;
    document.body.classList.add('in-xr');
    pose.anchor = null;
    setTimeout(() => { if (seats[seatIdx]) applyRig(); if (state.mode !== 'chair') recenter(); }, 700);
    s.addEventListener('end', () => {
      xrSession = null; state.xr = false; state.ar = false; state.scanOn = false; clearScan();
      document.body.classList.remove('in-xr');
      camera.position.set(0, EYE, 0);
      camera.quaternion.identity();
      pose.anchor = null;
      if (seats[seatIdx]) applyRig();
    });
  } catch (e) {
    console.error(e);
    alert('Could not start VR here. Open this page in the Meta Quest Browser and tap Enter VR.');
  }
}

// ---------- Table-mode cutaway ----------
let cuts = [], cutsWere = false;
let roomLights = [], roomAmb = [];
function collectCuts() { cuts = []; roomLights = []; roomAmb = []; roomGroup.traverse((o) => { if (o.userData.cut) cuts.push(o); if (o.isPointLight || o.isSpotLight) roomLights.push(o); else if (o.isLight) roomAmb.push(o); }); cutsWere = true; }
function updateCuts() {
  const t = state.mode === 'table';
  if (!t && !cutsWere) return;
  camera.getWorldPosition(V);
  for (const o of cuts) {
    const c = o.userData.cut;
    if (c === 'sky') { o.visible = !(t && state.ar); continue; }
    if (c === 'fx') { o.visible = !t; continue; }
    if (!t) { o.visible = true; continue; }
    if (c === 'ceil') { o.visible = false; continue; }
    o.getWorldPosition(V2);
    const n = o.userData.n;
    o.visible = (V.x - V2.x) * n[0] + (V.z - V2.z) * n[1] < 0;
  }
  cutsWere = t;
}

// ---------- Room Scan: outline the real room (needs Quest space setup) ----------
const scanG = new THREE.Group(); rig.add(scanG);
const scanMat = new THREE.LineBasicMaterial({ color: 0x7dffb0, transparent: true, opacity: 0.4, toneMapped: false, depthTest: false });
const planes = new Map(), M4 = new THREE.Matrix4();
let scanAsked = false, scanT = 0, scanTold = false;
function clearScan() { for (const o of planes.values()) { scanG.remove(o.line); o.line.geometry.dispose(); } planes.clear(); }
function toggleScan() {
  if (!state.xr) return setMsg('Room Scan works inside the headset. Tick "Room Scan" on the start screen, then Enter VR.', '#ffd54a');
  if (!sessionScan) return setMsg('Room Scan was not switched on for this session. Exit VR, tick "Room Scan" on the start screen and enter again.', '#ffd54a');
  state.scanOn = !state.scanOn; scanT = 0; scanTold = false;
  setMsg(state.scanOn ? 'Room Scan ON. Looking for your real walls and furniture…' : 'Room Scan OFF.', '#7dffb0');
}
function updateScan(frame, dt) {
  scanG.visible = state.scanOn && state.xr;
  if (!scanG.visible || !frame) return;
  const dp = frame.detectedPlanes;
  scanT += dt;
  if (!dp) { if (scanT > 3 && !scanTold) { scanTold = true; setMsg('This headset browser did not share room data. Check that Space Setup is done in Quest settings.', '#ffd54a'); } return; }
  const ref = renderer.xr.getReferenceSpace();
  for (const [pl, o] of planes) if (!dp.has(pl)) { scanG.remove(o.line); o.line.geometry.dispose(); planes.delete(pl); }
  let near = 9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0;
  dp.forEach((pl) => {
    let o = planes.get(pl);
    if (!o || o.t !== pl.lastChangedTime) {
      if (o) { scanG.remove(o.line); o.line.geometry.dispose(); }
      const pts = Array.from(pl.polygon).map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), scanMat);
      line.matrixAutoUpdate = false; line.renderOrder = 8000; line.frustumCulled = false;
      o = { line, t: pl.lastChangedTime, pts }; planes.set(pl, o); scanG.add(line);
    }
    const ps = frame.getPose(pl.planeSpace, ref);
    if (!ps) return;
    o.line.matrix.fromArray(ps.transform.matrix);
    n++;
    for (const p of o.pts) { V2.copy(p).applyMatrix4(o.line.matrix); x0 = Math.min(x0, V2.x); x1 = Math.max(x1, V2.x); z0 = Math.min(z0, V2.z); z1 = Math.max(z1, V2.z); }
    if (pl.orientation === 'vertical') { M4.copy(o.line.matrix).invert(); V.copy(camera.position).applyMatrix4(M4); near = Math.min(near, Math.abs(V.y)); }
  });
  scanMat.opacity = 0.25 + 0.75 * clamp01(1 - near / 0.6); // outlines brighten as your head nears a real wall
  if (!n && scanT > 2.5 && !scanAsked && xrSession && xrSession.initiateRoomCapture) { scanAsked = true; xrSession.initiateRoomCapture().catch(() => {}); }
  if (n && !scanTold) {
    scanTold = true;
    const w = x1 - x0, d = z1 - z0;
    setMsg(`Room scan: about ${(w * 3.281).toFixed(1)} × ${(d * 3.281).toFixed(1)} ft (${w.toFixed(1)} × ${d.toFixed(1)} m), ${n} surfaces. Green outlines are your real walls and furniture; they glow brighter as you get close.`, '#7dffb0', 14);
  }
}

// ---------- Lights, secrets, music ----------
let dimK = 1, dimT = 1, halos = [], secretFx = [], lastProgress = 0, nudged = 0, tensionB = -1;
let music = null, voice = null;
function ensureAudioLibs() {
  initAudio();
  const a = audioNodes();
  if (!a.ctx) return;
  try {
    if (MUS && !music) { music = MUS.createMusic(a.ctx, a.master); stopAmbient(); if (state.music && state.roomId) music.play(state.roomId); }
    if (VOX && !voice) voice = VOX.createDroneVoice(a.ctx, a.master);
  } catch (e) { console.warn('audio libs', e); }
}
function playMusic(id) {
  if (music) { if (state.music) { try { music.play(music.tracks.includes(id) ? id : 'hub'); music.setTension(0); } catch (e) {} } }
  else ambient(id);
}
function setMusic(on) {
  state.music = on; lsSet('erv-music', on ? '1' : '0');
  if (music) { if (on) music.play(state.roomId); else music.stop(1); }
}

// ---------- Bolt, the guide drone ----------
const drone = (() => {
  const g = new THREE.Group(); scene.add(g);
  const white = new THREE.MeshStandardMaterial({ color: '#f4f7fb', metalness: 0.6, roughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: '#10141c', metalness: 0.7, roughness: 0.2 });
  const cy = new THREE.MeshBasicMaterial({ color: '#5ef2ff', toneMapped: false });
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  add(new THREE.SphereGeometry(0.07, 24, 16), white);
  const visor = add(new THREE.SphereGeometry(0.0715, 24, 12, Math.PI / 2 - 0.95, 1.9, 1.05, 0.9), dark);
  const eye = add(new THREE.CircleGeometry(0.022, 20), cy, 0, 0.012, 0.0725);
  add(new THREE.CircleGeometry(0.007, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), 0.007, 0.019, 0.0732);
  const rot = [];
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.06, 0.012, 0.02), dark, sx * 0.085, 0.02, 0);
    const r = add(new THREE.TorusGeometry(0.042, 0.006, 8, 24), white, sx * 0.13, 0.025, 0); r.rotation.x = Math.PI / 2;
    const d = add(new THREE.CylinderGeometry(0.038, 0.038, 0.004, 24), new THREE.MeshBasicMaterial({ color: '#bfefff', transparent: true, opacity: 0.35, toneMapped: false }), sx * 0.13, 0.025, 0); rot.push(d);
  }
  add(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 6), dark, 0, 0.095, 0);
  add(new THREE.SphereGeometry(0.012, 10, 8), cy, 0, 0.13, 0);
  const under = add(new THREE.RingGeometry(0.03, 0.045, 24), cy, 0, -0.075, 0); under.rotation.x = Math.PI / 2;
  const hit = add(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  const bubble = screen(960, 340, 0.66, (c, w, h, text = '') => {
    c.fillStyle = 'rgba(8,12,26,0.9)'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 36); c.fill();
    c.strokeStyle = '#5ef2ff'; c.lineWidth = 6; c.stroke();
    c.fillStyle = '#5ef2ff'; c.font = '800 34px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('BOLT', 32, 44);
    c.fillStyle = '#ffffff'; c.font = '600 38px system-ui, sans-serif';
    wrap(c, text, 32, 104, w - 64, 48, 5);
  }, { renderOrder: 60 });
  bubble.material.depthTest = false; bubble.position.set(0.36, -0.2, 0); bubble.scale.setScalar(0.85); bubble.visible = false; g.add(bubble);
  // quick-ask chips (hands-free way to talk to Bolt)
  const chips = new THREE.Group(); chips.position.set(0.36, -0.4, 0); chips.visible = false; g.add(chips);
  const chipDefs = [['💡 Tip', () => askBolt('help')], ['🔑 Answer', () => askBolt('give me the answer')], ['🧠 Fun fact', () => askBolt('tell me a fact')], ['😄 Joke', () => askBolt('tell me a joke')], ['🎵 Music', () => { setMusic(!state.music); say(state.music ? 'Music on!' : 'Music off. Nice and quiet.'); }], ['🤖 Who are you?', () => askBolt('who are you')]];
  chipDefs.forEach(([t, fn], i) => {
    const b = TX.label(t, { w: 0.21, width: 380, height: 110, size: 50, weight: 800, color: '#fff', bg: 'rgba(14,20,38,0.95)', border: '#5ef2ff', borderWidth: 5, radius: 16 });
    b.material.depthTest = false; b.renderOrder = 61;
    b.position.set(((i % 3) - 1) * 0.225, -Math.floor(i / 3) * 0.075, 0); chips.add(b);
    addIA(b, { label: t, global: true, dwell: 0.9, hoverScale: 1.1, onActivate: () => { chipsUntil = clock.elapsedTime + 12; fn(); } });
  });
  let until = 0, chipsUntil = 0, last = '', yaw = null;
  addIA(hit, { label: 'Talk to Bolt', global: true, dwell: 0.9, hoverScale: 1.0, onActivate: () => { chips.visible = !chips.visible; chipsUntil = clock.elapsedTime + 12; if (chips.visible) say('What do you need? Pick one, or type T on a keyboard to chat.', 'happy'); } });
  function say(text, mood = 'happy') {
    if (!text) return;
    last = text; bubble.redraw(text); bubble.visible = true;
    until = clock.elapsedTime + Math.max(3, text.length * 0.065);
    if (voice) { try { voice.speak(text, { mood }); } catch (e) {} }
  }
  return { g, say, get last() { return last; }, update(dt, t) {
    const S = rig.scale.x, table = state.mode === 'table';
    camera.getWorldPosition(V); camera.getWorldDirection(V2);
    const y0 = Math.atan2(V2.x, V2.z);
    if (yaw === null) yaw = y0;
    let d = y0 - yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) > 0.7) yaw += d * Math.min(1, dt * 2);
    const a = yaw + 0.74 * Math.min(1, camera.aspect / 1.5), dist = 1.2 * S;
    V3.set(V.x + Math.sin(a) * dist, V.y + (table ? 0.22 : 0.16) * S + Math.sin(t * 1.3) * 0.02 * S, V.z + Math.cos(a) * dist);
    if (g.position.distanceTo(V3) > 6 * S) g.position.copy(V3); else g.position.lerp(V3, Math.min(1, dt * 2.5));
    g.scale.setScalar(S); g.lookAt(V);
    rot[0].rotation.y += dt * 9; rot[1].rotation.y -= dt * 9;
    const talking = t < until;
    eye.scale.setScalar(talking ? 1 + Math.sin(t * 9) * 0.12 : 1);
    if (!talking && bubble.visible) bubble.visible = false;
    if (chips.visible && t > chipsUntil) chips.visible = false;
    // gentle nudge if the player has been stuck a while
    if (state.running && !state.done && t - lastProgress > 110 && t - nudged > 110) { nudged = t; say('Stuck? No shame in that. Look at me and pick Tip!', 'calm'); }
  }, resetYaw() { yaw = null; } };
})();
function updateDrone(dt, t) { drone.update(dt, t); }
function askBolt(q) {
  ensureAudioLibs();
  if (!KBM) return drone.say('My memory chip is still loading. Open your menu for a Hint!');
  const room = state.room || {};
  let r;
  try { r = KBM.reply(String(q).slice(0, 200), { roomId: state.roomId, hint: room.hint ? room.hint() : '', answer: room.answer ? room.answer() : '', playerSolved: state.done }); } catch (e) { r = { text: 'Bzzt. My circuits hiccupped. Try asking another way!' }; }
  let text = (r && r.text) || '';
  const live = state.running && !state.done;
  switch (r && r.action) {
    case 'hint': if (room.hint) { text += ' ' + room.hint(); if (live) state.hints++; } break;
    case 'answer': if (room.answer) { text += ' ' + room.answer(); if (live) state.hints += 3; } break;
    case 'lobby': if (state.roomId !== 'hub') setTimeout(() => loadRoom('hub'), 2200); break;
    case 'mode-chair': setMode('chair', true); break;
    case 'mode-recliner': setMode('recliner', true); break;
    case 'mode-table': setMode('table', true); break;
    case 'recenter': recenter(); break;
    case 'read-on': state.read = true; lsSet('erv-read', '1'); break;
    case 'read-off': state.read = false; lsSet('erv-read', '0'); break;
    case 'music-on': setMusic(true); break;
    case 'music-off': setMusic(false); break;
    case 'repeat': if (drone.last) text = drone.last; break;
  }
  drone.say(text || 'Beep boop!', 'happy');
  return text;
}

// ---------- 72 FPS governor: steps quality down if the headset can't keep up ----------
const perf = { acc: 0, n: 0, bad: 0, level: 0, fps: 0 };
function perfTick(raw) {
  perf.acc += raw; perf.n++;
  if (perf.n < 90) return;
  const avg = perf.acc / perf.n;
  perf.fps = 1 / avg; perf.acc = 0; perf.n = 0;
  if (!state.xr || busy) { perf.bad = 0; return; }
  perf.bad = avg > (1 / 72) * 1.2 ? perf.bad + 1 : 0;
  if (perf.bad >= 3 && perf.level < 3) {
    perf.level++; perf.bad = 0;
    if (perf.level === 1) {
      renderer.shadowMap.enabled = false;
      // walls and ceilings fill most of the view: give them the cheapest lit material
      for (const o of cuts) if (o.isMesh && o.material && o.material.isMeshStandardMaterial) o.material = new THREE.MeshLambertMaterial({ color: o.material.color, map: o.material.map });
      scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
    } else if (perf.level === 2) renderer.xr.setFoveation(1);
    else { // last resort: keep only the two strongest lamps and lift the ambient light a little
      [...roomLights].sort((a, b) => b.intensity - a.intensity).slice(2).forEach((l) => { l.visible = false; });
      roomAmb.forEach((l) => { l.intensity *= 1.4; });
    }
  }
}

// ---------- Main loop ----------
renderer.setAnimationLoop((time, frame) => {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  const t = clock.elapsedTime;
  if (!state.xr) camera.rotation.set(-look.pitch, -look.yaw, 0, 'YXZ');
  if (state.running && !state.done) {
    state.elapsed += dt;
    const sec = Math.floor(state.elapsed);
    if (sec !== lastSec) { lastSec = sec; hudDirty = true; }
    if (state.def.limit && api.remaining() <= 0) fail(state.def.failReason || 'Time ran out.');
  }
  for (const m of timeMats) m.uniforms.t.value = t;
  for (let i = 0; i < updaters.length; i++) { try { updaters[i](dt, t); } catch (e) { console.error(e); updaters.splice(i, 1); i--; } }
  stepTweens(dt);
  updatePointers(dt);
  updateHUD(dt);
  stepBursts(dt);
  updateBody(dt, t);
  updateCuts();
  updateScan(frame, dt);
  perfTick(raw);
  // Table mode shrinks distances, which would make every lamp far too bright. Rescale lights for this frame only.
  // The light switch dims every lamp through dimK. Both scalings apply for this frame only, then are restored.
  const LS = rig.scale.x;
  dimK += (dimT - dimK) * Math.min(1, dt * 4);
  const scaled = LS !== 1;
  if (scaled) {
    for (const l of roomLights) { l.userData.i0 = l.intensity; l.userData.d0 = l.distance; l.intensity /= LS * LS; l.distance /= LS; }
  }
  renderer.toneMappingExposure = 1.05 * (0.1 + 0.9 * dimK); // one smooth fade for the whole lit world; glowing signs stay bright
  for (const h of halos) h.material.opacity = h.userData.o * (0.2 + 0.8 * dimK);
  const glow = clamp01((0.55 - dimK) / 0.35);
  for (const m of secretFx) { m.material.opacity = glow; m.visible = glow > 0.01; }
  if (glow > 0.9 && secretFx.length && !secrets[state.roomId] && state.roomId !== 'hub') {
    secrets[state.roomId] = 1; lsSet('erv-secrets', JSON.stringify(secrets));
    if (music) music.sting('secret'); else sfx.pick();
    drone.say('Whoa! A glow-in-the-dark secret! You found it. Flip the switch to turn the lights back on.', 'excited');
  }
  updateDrone(dt, t);
  if (state.def && state.def.limit && music && state.running) { const tb = Math.round(clamp01((150 - api.remaining()) / 150) * 10); if (tb !== tensionB) { tensionB = tb; music.setTension(tb / 10); } }
  renderer.render(scene, camera);
  if (scaled) {
    for (const l of roomLights) { l.intensity = l.userData.i0; l.distance = l.userData.d0; }
  }
});

// ---------- Boot / overlay ----------
const start = location.hash.slice(1);
loadRoom(ROOMS[start] ? start : 'hub', { first: true, noHash: true });

const ov = document.getElementById('overlay');
const vrBtn = document.getElementById('btn-vr');
const playBtn = document.getElementById('btn-play');
const vrCorner = document.getElementById('vr-corner');
function hideOverlay() { ov.classList.add('hidden'); document.body.classList.add('playing'); }
playBtn.addEventListener('click', () => { ensureAudioLibs(); hideOverlay(); });
vrBtn.addEventListener('click', () => { hideOverlay(); enterVR(); });
vrCorner.addEventListener('click', () => enterVR());
const askIn = document.getElementById('ask-in'), askGo = document.getElementById('ask-go'), askMic = document.getElementById('ask-mic');
if (askIn) {
  const send = () => { const q = askIn.value.trim(); if (q) { askBolt(q); askIn.value = ''; } askIn.blur(); };
  askGo.addEventListener('click', send);
  askIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); if (e.key === 'Escape') askIn.blur(); });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && askMic) {
    askMic.hidden = false;
    askMic.addEventListener('click', () => { try { const r = new SR(); r.lang = 'en-US'; r.maxAlternatives = 1; r.onresult = (ev) => askBolt(ev.results[0][0].transcript); r.onerror = () => drone.say('I could not hear you. Try typing instead!'); r.start(); drone.say('I am listening…', 'thinking'); } catch (e) {} });
  }
}
const modeChips = document.querySelectorAll('[data-mode]');
function markModes() { modeChips.forEach((b) => b.classList.toggle('on', b.dataset.mode === state.mode)); }
modeChips.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode, true)));
markModes();
const optScan = document.getElementById('opt-scan');
if (optScan) { optScan.checked = lsGet('erv-scan') === '1'; optScan.addEventListener('change', () => lsSet('erv-scan', optScan.checked ? '1' : '0')); }
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-ar').then((ok) => { arOK = ok; }).catch(() => {});
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
    if (ok) { vrBtn.disabled = false; vrBtn.textContent = 'Enter VR'; vrCorner.hidden = false; document.body.classList.add('xr-ok'); }
  }).catch(() => {});
}

// QA hooks (harmless in production)
if (Q.has('qa')) window.__erv = {
  askBolt, drone, setMusic, lib: { ILL, KBM, MUS, VOX }, dim: (v) => { dimT = v; },
  state, inv, loadRoom, IAs,
  use(label, n = 0) { buildTargets(); for (const ia of IAs) if (ia.alive && ia.label === label && shown(ia.obj)) { if (n-- > 0) continue; activate(ia); return true; } return false; },
  labels() { buildTargets(); return [...IAs].filter((i) => i.alive && shown(i.obj)).map((i) => i.label); },
  dbg: () => ({ msg: msg.text.slice(0, 60), msgShow, now: clock.elapsedTime, hatchOpen }), seat(i) { goSeat(i, true); }, turn, look, recenter, openHatch, applyRig, hud, camera, setMode, setSkin, perf, pose, rig, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  ff(sec) { for (let i = 0; i < sec / 0.05; i++) { for (const u of updaters) { try { u(0.05, clock.elapsedTime + i * 0.05); } catch (e) {} } stepTweens(0.05); if (state.running) state.elapsed += 0.05; } },
};
