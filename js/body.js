// Player body: seated robot in a hover pod. Skins change its materials.
import * as THREE from 'three';

export const SKINS = [
  { id: 'chrome', name: 'Chrome Bot', c: '#dfe6f2', a: '#5ef2ff', metal: 0.95, rough: 0.15, need: 0 },
  { id: 'neon', name: 'Neon Pulse', c: '#1b1f3a', a: '#ff4fd8', metal: 0.6, rough: 0.3, need: 0 },
  { id: 'gold', name: 'Sunset Gold', c: '#ffd23f', a: '#ff8a3d', metal: 1, rough: 0.12, need: 3 },
  { id: 'brick', name: 'Toy Brick', c: '#ff3b5c', a: '#ffd23f', metal: 0, rough: 0.35, need: 6 },
  { id: 'ocean', name: 'Deep Ocean', c: '#0f6fb8', a: '#7dffb0', metal: 0.7, rough: 0.2, need: 9 },
  { id: 'galaxy', name: 'Galaxy', c: '#3a1f7a', a: '#c9a0ff', metal: 0.8, rough: 0.25, need: 12 },
  { id: 'ember', name: 'Ember Knight', c: '#2a2a2e', a: '#ff5a1f', metal: 0.9, rough: 0.3, need: 15 },
  { id: 'prism', name: 'Prism', c: '#ffffff', a: '#7df9ff', metal: 1, rough: 0.05, premium: true },
];

export function createBody() {
  const g = new THREE.Group();
  const main = new THREE.MeshStandardMaterial({ color: '#dfe6f2', metalness: 0.95, roughness: 0.15, envMapIntensity: 1.3 });
  const dark = new THREE.MeshStandardMaterial({ color: '#171b24', metalness: 0.6, roughness: 0.45 });
  const glow = new THREE.MeshBasicMaterial({ color: '#5ef2ff', toneMapped: false });
  const chainM = new THREE.MeshStandardMaterial({ color: '#b9c0cc', metalness: 1, roughness: 0.25 });
  const UP = new THREE.Vector3(0, 1, 0);
  const add = (geo, m, x, y, z, p = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); p.add(o); return o; };
  const limb = (a, b, r, m, p = g) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, A.distanceTo(B), 4, 10), m);
    o.position.copy(A).lerp(B, 0.5);
    o.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
    p.add(o); return o;
  };
  // torso + chest core
  const torso = add(new THREE.CapsuleGeometry(0.15, 0.2, 6, 16), main, 0, -0.5, 0); torso.scale.set(1.2, 1, 0.8);
  add(new THREE.BoxGeometry(0.28, 0.18, 0.05), dark, 0, -0.4, 0.115).rotation.x = -0.2;
  add(new THREE.SphereGeometry(0.04, 16, 12), glow, 0, -0.38, 0.14);
  const coreRing = add(new THREE.TorusGeometry(0.06, 0.008, 8, 28), glow, 0, -0.38, 0.145);
  const doorL = add(new THREE.BoxGeometry(0.06, 0.1, 0.012), main, -0.035, -0.38, 0.16);
  const doorR = add(new THREE.BoxGeometry(0.06, 0.1, 0.012), main, 0.035, -0.38, 0.16);
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.07, 14, 10), main, s * 0.22, -0.25, 0);
  add(new THREE.CylinderGeometry(0.18, 0.2, 0.09, 20), dark, 0, -0.66, 0.02);
  // floating menu handle (looked at to open the chest hatch)
  const menuIcon = new THREE.Group(); menuIcon.position.set(0, -0.36, 0.42); menuIcon.rotation.x = -0.75; g.add(menuIcon);
  add(new THREE.TorusGeometry(0.045, 0.006, 8, 32), glow, 0, 0, 0, menuIcon);
  for (const y of [-0.016, 0, 0.016]) add(new THREE.BoxGeometry(0.045, 0.007, 0.004), glow, 0, y, 0, menuIcon);
  add(new THREE.CircleGeometry(0.075, 20), new THREE.MeshBasicMaterial({ visible: false }), 0, 0, 0, menuIcon);
  // arms (hidden in VR: your real hands / controllers show instead)
  const arms = new THREE.Group(); g.add(arms);
  for (const s of [-1, 1]) {
    limb([s * 0.23, -0.27, 0], [s * 0.28, -0.5, 0.06], 0.045, main, arms);
    limb([s * 0.28, -0.5, 0.08], [s * 0.27, -0.5, 0.36], 0.04, main, arms);
    add(new THREE.SphereGeometry(0.05, 12, 10), dark, s * 0.27, -0.5, 0.41, arms);
  }
  // legs: chair pose and recliner pose
  const legsChair = new THREE.Group(), legsRec = new THREE.Group(); g.add(legsChair, legsRec);
  for (const s of [-1, 1]) {
    limb([s * 0.1, -0.68, 0.06], [s * 0.11, -0.66, 0.5], 0.065, main);
    add(new THREE.SphereGeometry(0.07, 12, 10), dark, s * 0.11, -0.66, 0.52);
    limb([s * 0.11, -0.7, 0.54], [s * 0.11, -1.06, 0.56], 0.055, main, legsChair);
    add(new THREE.BoxGeometry(0.1, 0.06, 0.22), dark, s * 0.11, -1.13, 0.62, legsChair);
    limb([s * 0.11, -0.68, 0.56], [s * 0.11, -0.72, 0.96], 0.055, main, legsRec);
    add(new THREE.BoxGeometry(0.1, 0.2, 0.07), dark, s * 0.11, -0.66, 1.05, legsRec);
  }
  add(new THREE.BoxGeometry(0.44, 0.05, 0.36), dark, 0, -0.8, 0.9, legsRec);
  // hover pod
  add(new THREE.BoxGeometry(0.52, 0.08, 0.52), dark, 0, -0.77, 0.25);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.08, 0.05, 0.44), dark, s * 0.33, -0.56, 0.2);
    add(new THREE.BoxGeometry(0.02, 0.012, 0.4), glow, s * 0.33, -0.532, 0.2);
  }
  const podRing = add(new THREE.TorusGeometry(0.36, 0.012, 8, 40), glow, 0, -0.83, 0.25); podRing.rotation.x = Math.PI / 2;
  // chains (escape-artist room)
  const chains = [];
  const linkGeo = new THREE.TorusGeometry(0.02, 0.006, 6, 12);
  const mkChain = (a, b) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), n = Math.round(A.distanceTo(B) / 0.03);
    const cg = new THREE.Group();
    const im = new THREE.InstancedMesh(linkGeo, chainM, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), B.clone().sub(A).normalize());
    for (let i = 0; i < n; i++) {
      p.copy(A).lerp(B, (i + 0.5) / n);
      q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), i % 2 ? Math.PI / 2 : 0);
      m4.compose(p, q.clone().multiply(q2), one); im.setMatrixAt(i, m4);
    }
    cg.add(im);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.025), new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.2 }));
    lock.position.copy(A).lerp(B, 0.5); lock.position.z += 0.02; cg.add(lock);
    cg.visible = false; g.add(cg); chains.push(cg);
  };
  mkChain([-0.2, -0.27, 0.125], [0.2, -0.55, 0.125]);
  mkChain([0.2, -0.27, 0.125], [-0.2, -0.55, 0.125]);
  mkChain([-0.3, -0.6, 0.3], [0.3, -0.6, 0.3]);

  let hatch = 0, hatchT = 0;
  return {
    group: g, arms, menuIcon,
    setSkin(s) { main.color.set(s.c); main.metalness = s.metal; main.roughness = s.rough; glow.color.set(s.a); },
    setMode(m) { legsChair.visible = m !== 'recliner'; legsRec.visible = m === 'recliner'; },
    setChains(n) { chains.forEach((c, i) => (c.visible = i < n)); },
    setHatch(open) { hatchT = open ? 1 : 0; },
    update(dt, t) {
      hatch += (hatchT - hatch) * Math.min(1, dt * 8);
      doorL.position.x = -0.035 - hatch * 0.05; doorR.position.x = 0.035 + hatch * 0.05;
      coreRing.rotation.z = t * 0.6; menuIcon.position.y = -0.36 + Math.sin(t * 1.2) * 0.006;
    },
  };
}
