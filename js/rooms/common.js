// Shared builders for rooms
export function shell(api, { w, d, h, floor, wall, wallN, wallS, wallE, wallW, ceil, trim = '#ffffff', trimH = 0.12 }) {
  const { THREE, mat, box, TX } = api;
  const G = api.group;
  // real-surface floor: derive a normal map from the floor's own texture
  if (floor.map && !floor.normalMap) { const nm = TX.normalFrom(floor.map); if (nm) { floor.normalMap = nm; floor.normalScale = new THREE.Vector2(0.7, 0.7); } }
  // fake ambient occlusion: soft dark bands where walls meet the floor and ceiling
  const em = new THREE.MeshBasicMaterial({ map: TX.edgeTex(), transparent: true, depthWrite: false, toneMapped: false });
  const em2 = em.clone(); em2.opacity = 0.45;
  for (const [len, x, z, ry] of [[w, 0, -d / 2 + 0.3, 0], [w, 0, d / 2 - 0.3, Math.PI], [d, w / 2 - 0.3, 0, -Math.PI / 2], [d, -w / 2 + 0.3, 0, Math.PI / 2]]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.6), em); a.rotation.set(-Math.PI / 2, ry, 0, 'YXZ'); a.position.set(x, 0.008, z); a.renderOrder = 1; G.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.5), em2); b.rotation.set(Math.PI / 2, ry + Math.PI, 0, 'YXZ'); b.position.set(x * 0.985, h - 0.008, z * 0.985); b.userData.cut = 'ceil'; b.renderOrder = 1; G.add(b);
  }
  const f = box(w, 0.1, d, floor); f.position.y = -0.05; f.castShadow = false; G.add(f);
  const c = box(w, 0.1, d, ceil); c.position.y = h + 0.05; c.castShadow = false; c.userData.cut = 'ceil'; G.add(c);
  // each wall knows its outward direction so Table mode can cut away the side you look through
  const walls = [
    [w, h, 0.1, 0, h / 2, -d / 2 - 0.05, wallN || wall, [0, -1]],
    [w, h, 0.1, 0, h / 2, d / 2 + 0.05, wallS || wall, [0, 1]],
    [0.1, h, d, w / 2 + 0.05, h / 2, 0, wallE || wall, [1, 0]],
    [0.1, h, d, -w / 2 - 0.05, h / 2, 0, wallW || wall, [-1, 0]],
  ];
  for (const [a, b, cc, x, y, z, m, n] of walls) { const m2 = box(a, b, cc, m); m2.position.set(x, y, z); m2.castShadow = false; m2.userData.cut = 'wall'; m2.userData.n = n; G.add(m2); }
  const tm = mat(trim, { rough: 0.5 });
  for (const [a, cc, x, z, n] of [[w, 0.04, 0, -d / 2 + 0.02, [0, -1]], [w, 0.04, 0, d / 2 - 0.02, [0, 1]], [0.04, d, w / 2 - 0.02, 0, [1, 0]], [0.04, d, -w / 2 + 0.02, 0, [-1, 0]]]) {
    const b = box(a, trimH, cc, tm); b.position.set(x, trimH / 2, z); b.castShadow = false; b.userData.cut = 'wall'; b.userData.n = n; G.add(b);
  }
}

export function starShape(THREE, R = 0.1, r = 0.045) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}
export function moonShape(THREE, R = 0.1) {
  const s = new THREE.Shape();
  s.absarc(0, 0, R, Math.PI * 0.3, Math.PI * 1.7, false);
  s.absarc(R * 0.45, 0, R * 0.8, Math.PI * 1.62, Math.PI * 0.38, true);
  return s;
}
export function triShape(THREE, R = 0.11) {
  const s = new THREE.Shape();
  s.moveTo(0, R); s.lineTo(R * 0.95, -R * 0.65); s.lineTo(-R * 0.95, -R * 0.65); s.closePath();
  return s;
}
export function extrude(THREE, shape, depth = 0.04, bevel = 0.01) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 24 });
  g.center();
  return g;
}
export function archShape(THREE, w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h);
  s.absarc(0, h, r, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return s;
}

// Exit portal behind a door — returns the swirl mesh
export function exitPortal(api, w, h, c1, c2) {
  const { THREE } = api;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), api.portalMat(c1, c2));
  return m;
}
