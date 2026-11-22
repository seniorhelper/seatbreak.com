// MEDIUM — Star Observatory (teens & up)
// Real facts only: order from the Sun and one true fact per planet (NASA).
const ORDER = ['MERCURY', 'VENUS', 'EARTH', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE'];
const PCOL = { MERCURY: '#9a9a9a', VENUS: '#e8c88a', EARTH: '#3f7fe0', MARS: '#d2552c', JUPITER: '#d9a878', SATURN: '#e3cf9a', URANUS: '#9fe3e6', NEPTUNE: '#3355d6' };
const SCOPE = [
  { key: 'MARS', fact: 'Red because its dust is full of rust (iron oxide).' },
  { key: 'NEPTUNE', fact: 'Has the fastest winds in the solar system.' },
  { key: 'EARTH', fact: 'The only world we know of with life.' },
  { key: 'SATURN', fact: 'So light for its size it would float in water.' },
];
const CODE = '6483'; // Saturn, Mars, Neptune, Earth = 6th, 4th, 8th, 3rd from the Sun
function drawPlanet(g, key, cx, cy, r) {
  const c = PCOL[key];
  if (key === 'SATURN') { g.strokeStyle = 'rgba(227,207,154,0.9)'; g.lineWidth = r * 0.16; g.beginPath(); g.ellipse(cx, cy, r * 1.9, r * 0.5, -0.3, Math.PI, Math.PI * 2); g.stroke(); }
  const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, c); gr.addColorStop(1, '#05060c');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  if (key === 'EARTH') { g.fillStyle = 'rgba(70,170,90,0.85)'; for (const [x, y, a, b] of [[-0.3, -0.2, 0.35, 0.25], [0.25, 0.1, 0.3, 0.4], [-0.1, 0.5, 0.25, 0.15]]) { g.beginPath(); g.ellipse(cx + x * r, cy + y * r, a * r, b * r, 0.5, 0, Math.PI * 2); g.fill(); } g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx - r, cy - r * 0.6, r * 2, r * 0.08); g.fillRect(cx - r, cy + r * 0.3, r * 2, r * 0.06); }
  if (key === 'MARS') { g.fillStyle = 'rgba(90,30,15,0.5)'; g.beginPath(); g.ellipse(cx + r * 0.1, cy + r * 0.2, r * 0.5, r * 0.2, 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(cx, cy - r * 0.93, r * 0.35, r * 0.12, 0, 0, Math.PI * 2); g.fill(); }
  if (key === 'NEPTUNE' || key === 'JUPITER' || key === 'SATURN') { g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = -2; i <= 2; i++) g.fillRect(cx - r, cy + i * r * 0.32, r * 2, r * 0.1); }
  g.restore();
  if (key === 'SATURN') { g.strokeStyle = 'rgba(227,207,154,0.95)'; g.lineWidth = r * 0.16; g.beginPath(); g.ellipse(cx, cy, r * 1.9, r * 0.5, -0.3, 0, Math.PI); g.stroke(); }
}

export const teens = {
  id: 'teens', title: 'Star Observatory', tier: 'MEDIUM', ages: 'Ages 9+ · planets', color: '#5ec8ff', par: 420, tableScale: 9,
  learn: ['The planets in order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune', 'Saturn is less dense than water. Mars is red from rust', 'Neptune has the fastest winds in the solar system'],
  intro: 'The observatory lost power and the exit is code-locked. Get the lights back on, then read the stars.',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    api.setScene({ bg: new THREE.Color('#03040a') });
    const R = 4, WH = 2.6;
    const S = { fuse: 'hidden', power: false, scope: -1, seen: new Set(), open: false };
    const tmp = new THREE.Vector3();

    // ---------- Shell ----------
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 72), mat('#ffffff', { map: TX.rep(TX.wood('#5a3b28', 'obs'), 4, 4), rough: 0.5 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
    // compass rose
    const rose = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
      g.translate(512, 512);
      g.strokeStyle = '#c9a24a'; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 470, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 420, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 8; i++) {
        g.save(); g.rotate(i * Math.PI / 4);
        g.fillStyle = i % 2 ? 'rgba(201,162,74,0.55)' : '#e3c06a';
        g.beginPath(); g.moveTo(0, -(i % 2 ? 300 : 400)); g.lineTo(40, 0); g.lineTo(-40, 0); g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = '#e3c06a'; g.font = '900 80px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      [['N', 0, -450], ['E', 450, 0], ['S', 0, 450], ['W', -450, 0]].forEach(([t, x, y]) => g.fillText(t, x, y));
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const roseM = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshStandardMaterial({ map: rose, transparent: true, roughness: 0.4, metalness: 0.6 }));
    roseM.rotation.x = -Math.PI / 2; roseM.position.y = 0.004; roseM.receiveShadow = true; G.add(roseM);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, WH, 72, 1, true), mat('#ffffff', { map: TX.rep(TX.panel('#2b2f45', '#151827', 'obs'), 10, 1.3), side: THREE.BackSide, rough: 0.6, metal: 0.3 }));
    wall.position.y = WH / 2; wall.receiveShadow = true; G.add(wall);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: TX.sky('obsdome', 230), side: THREE.BackSide, toneMapped: false }));
    dome.position.y = WH; G.add(dome);
    for (let i = 0; i < 12; i++) { // dome ribs
      const rib = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.03, 6, 48, Math.PI / 2), mat('#3a3f58', { metal: 0.8, rough: 0.3 }));
      rib.position.y = WH; rib.rotation.y = i * Math.PI / 6; rib.castShadow = false;
      G.add(rib);
    }
    const ringTop = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.08, 10, 96), mat('#c9a24a', { metal: 0.9, rough: 0.25 }));
    ringTop.rotation.x = Math.PI / 2; ringTop.position.y = WH; G.add(ringTop);

    // ---------- Lights ----------
    const hemi = new THREE.HemisphereLight('#a9b8ff', '#1a1220', 0.08); G.add(hemi);
    const lampL = new THREE.PointLight('#ffb86b', 2.2, 4, 2); lampL.position.set(-2.4, 1.15, 1.75); G.add(lampL);
    const sconces = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8;
      const x = Math.sin(a) * (R - 0.12), z = Math.cos(a) * (R - 0.12);
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#fff3d6', { emissive: '#ffd59a', ei: 0.05 }));
      sc.rotation.x = Math.PI; sc.position.set(x, 2.25, z); G.add(sc);
      sconces.push({ sc });
    }
    const ringLights = [0, 1, 2].map((i) => { const a = i / 3 * Math.PI * 2 + 0.4; const pl = new THREE.PointLight('#ffd59a', 0, 7, 1.6); pl.position.set(Math.sin(a) * 2.6, 2.2, Math.cos(a) * 2.6); G.add(pl); return pl; });
    const keyL = new THREE.SpotLight('#dfe8ff', 0, 12, 0.9, 0.7, 1.4);
    keyL.position.set(0, 5.5, 0.5); keyL.target.position.set(0, 0, -0.5); keyL.castShadow = true; keyL.shadow.mapSize.set(1024, 1024); keyL.shadow.bias = -0.0008;
    G.add(keyL, keyL.target);
    api.onUpdate((dt, t) => { if (!S.power) lampL.intensity = 2.2 + Math.sin(t * 1.4) * 0.25; });

    // ---------- Desk + drawer (south-west) ----------
    const desk = new THREE.Group(); desk.position.set(-2.4, 0, 1.6); desk.rotation.y = Math.PI * 0.72; G.add(desk);
    const dw = mat('#ffffff', { map: TX.wood('#6b4226', 'desk'), rough: 0.45 });
    const top = box(1.3, 0.06, 0.65, dw); top.position.y = 0.76; desk.add(top);
    const pedL = box(0.42, 0.73, 0.6, dw); pedL.position.set(-0.42, 0.365, 0); desk.add(pedL);
    for (const x of [0.58]) for (const z of [-0.27, 0.27]) { const l = box(0.06, 0.73, 0.06, dw); l.position.set(x, 0.365, z); desk.add(l); }
    const drawer = new THREE.Group(); drawer.position.set(-0.42, 0.56, 0.02); desk.add(drawer);
    const dfront = box(0.38, 0.17, 0.03, mat('#ffffff', { map: TX.wood('#7a4b2c', 'drw') })); dfront.position.z = 0.3; drawer.add(dfront);
    const dbox = box(0.34, 0.12, 0.5, mat('#4a2e1a')); dbox.position.set(0, -0.01, 0.04); drawer.add(dbox);
    const handle = box(0.12, 0.02, 0.03, mat('#c9a24a', { metal: 0.9, rough: 0.25 })); handle.position.set(0, 0, 0.33); drawer.add(handle);
    function makeFuse() {
      const f = new THREE.Group();
      const fb = cyl(0.025, 0.025, 0.12, glowMat('#9fe8ff', 0.6, false)); fb.rotation.z = Math.PI / 2; f.add(fb);
      for (const x of [-0.07, 0.07]) { const cap = cyl(0.03, 0.03, 0.03, mat('#d0d4dc', { metal: 0.9, rough: 0.2 })); cap.rotation.z = Math.PI / 2; cap.position.x = x; f.add(cap); }
      const wire = cyl(0.003, 0.003, 0.11, glowMat('#ffd27a', 1, false)); wire.rotation.z = Math.PI / 2; f.add(wire);
      return f;
    }
    const fuse = makeFuse(); fuse.position.set(0, 0.07, 0.08); drawer.add(fuse);
    let drawerOpen = false;
    api.addIA(drawer, {
      label: 'Desk drawer', hoverScale: 1.04, enabled: () => !drawerOpen,
      onActivate: () => { drawerOpen = true; S.fuse = 'revealed'; api.sfx.mech(); api.anim(0.6, (k) => { drawer.position.z = 0.02 + k * 0.32; api.shadowsDirty(); }); api.msg('The drawer slides open. A spare FUSE!', '#7dffb0'); },
    });
    api.addIA(fuse, {
      label: 'Take the fuse', hoverScale: 1.25, enabled: () => S.fuse === 'revealed',
      onActivate: () => { S.fuse = 'taken'; fuse.visible = false; api.inv.add('fuse', 'Fuse', '⚡'); },
    });
    const lamp = new THREE.Group(); lamp.position.set(0.4, 0.79, -0.12); desk.add(lamp);
    const lb = cyl(0.08, 0.1, 0.03, mat('#2a2a2a', { metal: 0.6 })); lamp.add(lb);
    const la = cyl(0.012, 0.012, 0.36, mat('#c9a24a', { metal: 0.9 })); la.position.y = 0.18; lamp.add(la);
    const lh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.14, 24, 1, true), mat('#2f6b4a', { side: THREE.DoubleSide, rough: 0.4 })); lh.position.set(0, 0.36, 0); lamp.add(lh);
    const bulb = sph(0.035, mat('#fff', { emissive: '#ffcf8a', ei: 2 }), 12, { cast: false }); bulb.position.y = 0.32; lamp.add(bulb);
    const note = TX.label(['Observatory log —', 'Power tripped AGAIN.', 'Spare fuse: my desk drawer.', '— Prof. Vega'], { w: 0.4, size: 44, weight: 600, color: '#2a2230', bg: '#f4ecd6', radius: 6, family: 'Georgia, serif', depthWrite: true });
    note.rotation.x = -Math.PI / 2; note.rotation.z = 0.15; note.position.set(-0.05, 0.795, 0.05); desk.add(note);
    api.addIA(note, { label: 'Read the note', hoverScale: 1.06, onActivate: () => api.msg('Prof. Vega\'s note: "Power tripped AGAIN. Spare fuse is in my desk drawer."', '#f4ecd6') });

    // ---------- Breaker box + chart (west wall) ----------
    const breaker = new THREE.Group(); breaker.position.set(-R + 0.12, 1.3, -0.3); breaker.rotation.y = Math.PI / 2; G.add(breaker);
    const bb = box(0.5, 0.65, 0.12, mat('#6d7484', { metal: 0.7, rough: 0.4 })); breaker.add(bb);
    const warn = TX.label(['⚡ MAIN POWER'], { w: 0.42, size: 60, weight: 900, color: '#1a1a1a', bg: '#ffd23f', radius: 8, depthWrite: true }); warn.position.set(0, 0.25, 0.062); breaker.add(warn);
    const slotM = box(0.3, 0.08, 0.02, mat('#111')); slotM.position.set(0, 0.02, 0.065); breaker.add(slotM);
    const fuseIn = makeFuse(); fuseIn.position.set(0, 0.02, 0.08); fuseIn.visible = false; breaker.add(fuseIn);
    const leverBase = box(0.1, 0.18, 0.04, mat('#222')); leverBase.position.set(0, -0.18, 0.07); breaker.add(leverBase);
    const lever = box(0.04, 0.16, 0.04, mat('#ff3b30', { rough: 0.4 })); lever.position.set(0, -0.12, 0.1); breaker.add(lever);
    const statusLed = sph(0.02, glowMat('#ff3b30', 1, false), 10, { cast: false }); statusLed.position.set(0.18, -0.26, 0.07); breaker.add(statusLed);
    api.addIA(breaker, {
      label: 'Breaker box', hoverScale: 1.03, enabled: () => !S.power,
      onActivate: () => {
        if (!api.inv.has('fuse')) { api.sfx.wrong(); api.msg('The breaker box has an empty fuse slot. No fuse, no power.', '#ffd54a'); return; }
        api.inv.remove('fuse'); fuseIn.visible = true; api.sfx.place();
        api.anim(0.5, (k) => { lever.position.y = -0.12 - k * 0.12; lever.rotation.x = k * 0.6; }).then(powerOn);
      },
    });
    function powerOn() {
      S.power = true;
      statusLed.material.color.set('#3bff7a');
      api.sfx.solve();
      api.msg('POWER RESTORED! The observatory hums to life. The telescope motor is online.', '#7dffb0');
      sconces.forEach((s, i) => setTimeout(() => { s.sc.material.emissiveIntensity = 2.2; api.sfx.tick(); if (i % 3 === 0) ringLights[i / 3 | 0] && (ringLights[i / 3 | 0].intensity = 7); }, 120 * i));
      api.anim(1.2, (k) => { hemi.intensity = 0.08 + k * 0.42; keyL.intensity = k * 30; lampL.intensity = 1.6; });
      chartLit.visible = true; chartDark.visible = false;
      plaques.forEach((p) => (p.visible = true));
      caseLight.intensity = 3;
      api.shadowsDirty();
    }
    const chartDark = box(1.6, 1.0, 0.03, mat('#1a1c26')); chartDark.position.set(-R + 0.14, 1.55, -1.75); chartDark.rotation.y = Math.PI / 2 - 0.42; G.add(chartDark);
    const chartLit = TX.label(['TONIGHT\'S FOUR WORLDS, IN ORDER', '1 · the one that would float in water', '2 · the rusty one', '3 · the windiest one', '4 · home', 'Each world\'s number is its place from the Sun.'],
      { w: 1.7, size: 54, weight: 800, colors: ['#e3c06a', '#fff', '#fff', '#fff', '#fff', '#a9b8d8'], bg: '#101425', border: '#e3c06a', borderWidth: 8, radius: 16, family: 'Georgia, serif', depthWrite: true });
    chartLit.position.copy(chartDark.position); chartLit.rotation.copy(chartDark.rotation); chartLit.translateZ(0.02); chartLit.visible = false; G.add(chartLit);

    // ---------- Telescope (north) + dome projection ----------
    const scope = new THREE.Group(); scope.position.set(0, 0, -1.7); G.add(scope);
    const brass = mat('#c9a24a', { metal: 0.92, rough: 0.22 });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.5;
      const bot = new THREE.Vector3(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55), topP = new THREE.Vector3(0, 1.2, 0);
      const len = bot.distanceTo(topP);
      const leg = cyl(0.022, 0.03, len, mat('#2b2b33', { metal: 0.6, rough: 0.4 }));
      leg.position.copy(bot).lerp(topP, 0.5);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), topP.clone().sub(bot).normalize());
      scope.add(leg);
    }
    const mount = sph(0.1, brass); mount.position.y = 1.2; scope.add(mount);
    const tube = new THREE.Group(); tube.position.y = 1.25; tube.rotation.x = 0.75; scope.add(tube);
    const tb = cyl(0.09, 0.12, 1.3, mat('#1f2a4a', { metal: 0.6, rough: 0.3 }), 32); tb.rotation.x = Math.PI / 2; tb.position.z = -0.25; tube.add(tb);
    for (const z of [-0.85, -0.3, 0.32]) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 10, 32), brass); band.position.z = z; tube.add(band); }
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), glowMat('#7df9ff', 0.6, false)); lens.position.z = -0.905; lens.rotation.y = Math.PI; tube.add(lens);
    const eyepiece = cyl(0.025, 0.03, 0.12, brass); eyepiece.position.set(0, 0.08, 0.38); eyepiece.rotation.x = 0.6; tube.add(eyepiece);
    const scopeSign = TX.label('TELESCOPE · look to aim', { w: 0.6, size: 46, weight: 700, color: '#bfe9ff', bg: 'rgba(8,10,24,0.8)', radius: 10 }); scopeSign.position.set(0, 0.55, 0.35); scope.add(scopeSign);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.4, 3.2, 24, 1, true), glowMat('#7df9ff', 0.12)); beam.visible = false; G.add(beam);

    const proj = api.screen(1024, 1024, 2.3, (g, w, h, sc = null) => {
      if (!sc) return;
      const rg = g.createRadialGradient(w / 2, 400, 60, w / 2, 400, 480);
      rg.addColorStop(0, 'rgba(60,120,255,0.2)'); rg.addColorStop(1, 'rgba(60,120,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      drawPlanet(g, sc.key, w / 2, 400, 230);
      g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.font = '900 110px Georgia, serif';
      g.fillText(sc.key, w / 2, 800);
      g.font = '700 46px system-ui'; g.fillStyle = '#bfe9ff';
      g.fillText(sc.fact, w / 2, 880, w - 60);
    }, { renderOrder: 4 });
    proj.position.set(0, 3.25, -2.75); proj.lookAt(0, 1.2, 0.9);
    G.add(proj);

    api.addIA(scope, {
      label: 'Telescope', hoverScale: 1.03, repeat: true, dwell: 1.2,
      onActivate: () => {
        if (!S.power) { api.sfx.wrong(); api.msg('The telescope motor is dead. No power.', '#ffd54a'); return; }
        S.scope = (S.scope + 1) % 4;
        const sc = SCOPE[S.scope];
        S.seen.add(sc.key);
        api.sfx.mech();
        const targetX = 0.55 + S.scope * 0.08, targetY = (S.scope - 1.5) * 0.18;
        const fx = tube.rotation.x, fy = tube.rotation.y;
        api.anim(0.6, (k) => { tube.rotation.x = fx + (targetX - fx) * k; tube.rotation.y = fy + (targetY - fy) * k; });
        proj.redraw(sc);
        beam.visible = true;
        api.msg(`The telescope finds ${sc.key}. ${sc.fact} (${S.seen.size}/4 seen. Look again to move it.)`, '#bfe9ff', 12);
      },
    });
    api.onUpdate((dt, t) => {
      if (beam.visible) {
        lens.getWorldPosition(tmp);
        proj.getWorldPosition(beamTo);
        beam.position.copy(tmp).lerp(beamTo, 0.5);
        beam.lookAt(beamTo); beam.rotateX(Math.PI / 2);
        beam.scale.y = tmp.distanceTo(beamTo) / 3.2;
        beam.material.opacity = 0.1 + Math.sin(t * 3) * 0.03;
      }
    });
    const beamTo = new THREE.Vector3();

    // ---------- Solar system model (east): the 8 planets in their real order from the Sun ----------
    const pcase = new THREE.Group(); pcase.position.set(R - 0.6, 0, -0.3); pcase.rotation.y = -Math.PI / 2; G.add(pcase);
    const cab = box(3.1, 0.9, 0.5, mat('#ffffff', { map: TX.wood('#3d2618', 'case'), rough: 0.4 })); cab.position.y = 0.45; pcase.add(cab);
    const caseLight = new THREE.PointLight('#cfe3ff', 0, 3, 2); caseLight.position.set(0, 1.7, 0.5); pcase.add(caseLight);
    const plaques = [];
    const sun = sph(0.17, mat('#ffcf5a', { emissive: '#ffb020', ei: 1.4 }), 24, { cast: false }); sun.position.set(-1.38, 1.2, 0); pcase.add(sun);
    const sunL = TX.label('SUN', { w: 0.24, size: 60, weight: 900, color: '#1a1206', bg: '#e3c06a', radius: 10, depthWrite: true }); sunL.position.set(-1.38, 0.78, 0.26); sunL.visible = false; pcase.add(sunL); plaques.push(sunL);
    const PR = { MERCURY: 0.05, VENUS: 0.075, EARTH: 0.08, MARS: 0.06, JUPITER: 0.15, SATURN: 0.125, URANUS: 0.1, NEPTUNE: 0.1 };
    ORDER.forEach((name, i) => {
      const x = -1.02 + i * 0.335;
      const ped = cyl(0.04, 0.06, 0.2 - PR[name] * 0.3, brass); ped.position.set(x, 1.0, 0); pcase.add(ped);
      const pm = sph(PR[name], mat(PCOL[name], { rough: 0.55, emissive: PCOL[name], ei: 0.12 }), 24); pm.position.set(x, 1.12 + PR[name], 0); pcase.add(pm);
      if (name === 'SATURN') { const rg = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 40), mat('#e8d9a8', { side: THREE.DoubleSide, rough: 0.6 })); rg.rotation.x = -1.25; rg.position.copy(pm.position); pcase.add(rg); }
      api.onUpdate((dt) => { pm.rotation.y += dt * 0.4; });
      const plq = TX.label(name, { w: 0.3, size: 54, weight: 900, color: '#1a1206', bg: '#e3c06a', radius: 10, depthWrite: true });
      plq.position.set(x, 0.78 - (i % 2) * 0.13, 0.26); plq.visible = false; pcase.add(plq); plaques.push(plq);
      api.addIA(pm, { label: 'Planet model', hoverScale: 1.15, onActivate: () => api.msg(S.power ? `${name}. Count along the row from the Sun to find its number.` : 'A model planet. Its name plate is too dark to read.', '#e3c06a') });
    });
    const caseSign = TX.label('THE SOLAR SYSTEM · in order from the Sun (sizes not to scale)', { w: 2.7, size: 50, weight: 800, color: '#e3c06a', family: 'Georgia, serif', depthWrite: true }); caseSign.position.set(0, 0.45, 0.255); pcase.add(caseSign);

    // ---------- Exit (south) ----------
    const exitG = new THREE.Group(); exitG.position.set(0, 0, R - 0.1); exitG.rotation.y = Math.PI; G.add(exitG);
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), api.portalMat('#3b7bff', '#7df9ff')); portal.position.set(0, 1.05, 0.02); exitG.add(portal);
    const frameM = mat('#c9a24a', { metal: 0.9, rough: 0.25 });
    for (const [w, h, x, y] of [[1.4, 0.12, 0, 2.16], [0.12, 2.2, -0.64, 1.1], [0.12, 2.2, 0.64, 1.1]]) { const f = box(w, h, 0.16, frameM); f.position.set(x, y, 0.05); exitG.add(f); }
    const slab = box(1.16, 2.1, 0.08, mat('#ffffff', { map: TX.rep(TX.panel('#384064', '#1b1f33', 'door'), 1, 2), metal: 0.5, rough: 0.35 })); slab.position.set(0, 1.05, 0.1); exitG.add(slab);
    const exitSign = TX.label('EXIT', { w: 0.4, size: 90, weight: 900, color: '#7dffb0', glow: '#3bff7a' }); exitSign.position.set(0, 2.42, 0.1); exitG.add(exitSign);
    const kp = api.keypad({ code: CODE, color: '#7df9ff', title: 'EXIT CODE', onSolve: () => {
      S.open = true; api.msg('ACCESS GRANTED. The exit door slides open!', '#7dffb0');
      api.anim(1.2, (k) => { slab.position.y = 1.05 + k * 2.2; api.shadowsDirty(); }).then(() => setTimeout(() => api.escape(), 600));
    }, onWrong: () => api.msg('Wrong code. The chart gives four clues in order, the telescope tells you which planet each clue means, and the model shows each planet\'s place from the Sun.', '#ff8080') });
    kp.position.set(0.98, 1.3, 0.08); exitG.add(kp);

    api.dust(140, [7, 3, 7], '#cfe3ff', [0, 1.6, 0]);

    const tsw = api.lightSwitch(new THREE.Vector3(-R + 0.1, 1.25, 0.55), Math.PI / 2);
    const tsec = api.secret(['★ SECRET ★', 'The Sun is a star. It only looks', 'big because it is so close.'], 2.2); tsec.position.set(0, 2.3, -R + 0.12);
    for (const [x, z, r] of [[-2.4, 1.6, 0.8], [0, -1.7, 0.6], [R - 0.6, -0.3, 1.2]]) api.blob(x, z, r);
    api.addSeat(new THREE.Vector3(0, 0, 0.9), 0, { label: 'Center' });
    api.addSeat(new THREE.Vector3(-1.9, 0, 0.5), Math.PI / 2 * 1.1, { label: 'Desk & breaker' });
    api.addSeat(new THREE.Vector3(1.3, 0, -0.3), -Math.PI / 2, { label: 'Solar system model' });
    api.addSeat(new THREE.Vector3(0.4, 0, 2.5), Math.PI, { label: 'Exit door' });

    return {
      hint() {
        if (!S.power) {
          if (S.fuse === 'hidden') return 'It is too dark to work. Read Prof. Vega\'s note on the desk, then open the desk drawer.';
          if (S.fuse === 'revealed') return 'There is a fuse in the open desk drawer. Take it.';
          return 'Put the fuse in the breaker box on the west wall (left of the center spot).';
        }
        if (S.seen.size < 4) return `The lit chart by the breaker lists four clues. Use the telescope (look at it again and again) to learn which planet each clue describes. Seen ${S.seen.size}/4.`;
        return 'For each clue, find that planet on the solar system model and count its place from the Sun. Enter the four numbers in the chart\'s order.';
      },
      answer() {
        if (!S.power) return 'Open the desk drawer, take the fuse, and look at the breaker box on the west wall.';
        return 'The code is 6 4 8 3. Floats = Saturn (6th). Rusty = Mars (4th). Windiest = Neptune (8th). Home = Earth (3rd).';
      },
      idle: () => S.power ? 'Clue (chart) → planet (telescope) → place from the Sun (model) → exit keypad.' : 'Find a way to get the power back on.',
    };
  },
};
