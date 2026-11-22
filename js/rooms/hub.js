// The Lobby — a floating village. Every escape room is its own building.
import { starShape, extrude, archShape } from './common.js?v=3';

let introDone = false;
const DOORS = [
  { id: 'kids', kind: 'cottage', c1: '#ff7ab8', c2: '#ffd54a' },
  { id: 'teens', kind: 'dome', c1: '#3b7bff', c2: '#7df9ff' },
  { id: 'mind', kind: 'prism', c1: '#b48cff', c2: '#5ef2ff' },
  { id: 'flood', kind: 'lab', c1: '#12b5c9', c2: '#9dfff0' },
  { id: 'adults', kind: 'library', c1: '#ff8a3d', c2: '#ffe0a3' },
  { id: 'theater', kind: 'theater', c1: '#e0284e', c2: '#ffd54a' },
  { id: 'expert', kind: 'bunker', c1: '#ff2050', c2: '#ffb0c0' },
];

export const hub = {
  id: 'hub', title: 'The Lobby', color: '#5ef2ff', tableScale: 16,
  intro: 'Welcome! Look at a building for a moment to go inside. Look down at the glowing ring by your chest to open your menu.',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    // surreal dream sky painted by the illusion library (falls back to plain stars)
    const skyTex = () => {
      if (!api.ill || !api.ill.drawSurrealSky) return TX.sky('hub', 255);
      try {
        const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
        api.ill.drawSurrealSky(c.getContext('2d'), 2048, 1024, 7);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      } catch (e) { return TX.sky('hub', 255); }
    };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 40, 20), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, toneMapped: false, fog: false }));
    sky.userData.cut = 'sky'; sky.renderOrder = 5; G.add(sky);
    api.setScene({ bg: new THREE.Color('#04040b'), fog: new THREE.FogExp2('#070818', 0.012) });
    G.add(new THREE.HemisphereLight('#aebfff', '#1a1030', 0.85));
    const key = new THREE.DirectionalLight('#ffffff', 1.5);
    key.position.set(4, 10, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 26 });
    G.add(key);

    // platform
    const top = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.3, 72), mat('#1a2036', { rough: 0.25, metal: 0.5, map: TX.rep(TX.tiles('#27304e', '#1c2238', 12, 'hub'), 5, 5) }));
    top.position.y = -0.15; top.receiveShadow = true; G.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(10, 7, 48, 1, true), mat('#141829', { rough: 0.5, metal: 0.3, side: THREE.DoubleSide }));
    under.rotation.x = Math.PI; under.position.y = -3.8; G.add(under);
    for (const [r, c, o] of [[9.95, '#5ef2ff', 0.9], [4.4, '#c9a0ff', 0.5], [1.3, '#5ef2ff', 0.4]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r, 96), glowMat(c, o, false));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006; G.add(ring);
    }

    const title = TX.label('SEATBREAK', { w: 5.2, size: 140, weight: 900, color: '#e9fbff', glow: '#5ef2ff' });
    title.position.set(0, 6.3, -8.2); G.add(title);
    const sub = TX.label('Seven rooms · Real science · Play from your chair', { w: 3.6, size: 64, weight: 600, color: '#bcd6ff' });
    sub.position.set(0, 5.7, -8.1); G.add(sub);

    // ---------- building kits (each returns how far its front wall sticks out) ----------
    const stone = mat('#cfc8ba', { rough: 0.85 }), goldM = mat('#c9a24a', { metal: 0.9, rough: 0.25 });
    const kits = {
      cottage(g) {
        const b = box(2.4, 1.9, 2.0, mat('#ffffff', { map: TX.rep(TX.wallpaper('#ffc9e0', '#fff0f7', 'dot', 'cot'), 2, 1) })); b.position.y = 0.95; g.add(b);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.3, 4), mat('#ffd23f', { rough: 0.5, flat: true })); roof.rotation.y = Math.PI / 4; roof.position.y = 2.55; roof.castShadow = true; g.add(roof);
        const ch = box(0.3, 0.8, 0.3, mat('#ff5a7a')); ch.position.set(0.6, 2.7, -0.3); g.add(ch);
        for (const x of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glowMat('#fff3b0', 0.95, false)); w.position.set(x, 1.4, 1.01); g.add(w); const p = cyl(0.06, 0.06, 1.9, mat(x < 0 ? '#3ec1ff' : '#7be37b')); p.position.set(x * 1.45, 0.95, 1.05); g.add(p); }
        return 1.0;
      },
      dome(g) {
        const t = cyl(1.25, 1.35, 2.1, mat('#ffffff', { map: TX.rep(TX.brick('#5a6488', 'obs'), 3, 1), rough: 0.8 }), 32); t.position.y = 1.05; g.add(t);
        const dm = new THREE.Mesh(new THREE.SphereGeometry(1.28, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#2a3f8a', { metal: 0.8, rough: 0.25 })); dm.position.y = 2.1; dm.castShadow = true; g.add(dm);
        const slit = box(0.3, 1.0, 0.1, glowMat('#7df9ff', 0.8, false)); slit.position.set(0, 2.95, 0.75); slit.rotation.x = -0.9; g.add(slit);
        const sc = cyl(0.1, 0.14, 1.2, goldM, 16); sc.position.set(0, 3.2, 0.9); sc.rotation.x = 0.9; g.add(sc);
        return 1.3;
      },
      lab(g) {
        const b = cyl(1.3, 1.4, 0.9, mat('#1d3b46', { metal: 0.7, rough: 0.35 }), 32); b.position.y = 0.45; g.add(b);
        const tank = cyl(1.22, 1.22, 1.3, new THREE.MeshStandardMaterial({ color: '#1fb6d6', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.1, emissive: '#0a6a86', emissiveIntensity: 0.6 }), 32, { cast: false }); tank.position.y = 1.55; g.add(tank);
        const cap = cyl(1.35, 1.3, 0.25, mat('#1d3b46', { metal: 0.7, rough: 0.35 }), 32); cap.position.y = 2.32; g.add(cap);
        const dm = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#9dfff0', { transparent: true, opacity: 0.4, rough: 0.05 })); dm.position.y = 2.44; g.add(dm);
        const bub = [];
        for (let i = 0; i < 9; i++) { const s = sph(0.05 + (i % 3) * 0.02, glowMat('#d9fffb', 0.7), 8, { cast: false }); s.userData = { a: i * 0.7, r: 0.5 + (i % 4) * 0.2, o: i * 0.37 }; g.add(s); bub.push(s); }
        api.onUpdate((dt, t) => bub.forEach((s) => { const u = s.userData; s.position.set(Math.sin(u.a) * u.r, 1.0 + ((t * 0.25 + u.o) % 1) * 1.1, Math.cos(u.a) * u.r); }));
        return 1.42;
      },
      library(g) {
        const b = box(2.9, 2.3, 1.8, stone); b.position.set(0, 1.15, -0.1); g.add(b);
        for (const x of [-1.2, -0.75, 0.75, 1.2]) { const c = cyl(0.12, 0.14, 2.2, mat('#f1ece0', { rough: 0.6 }), 16); c.position.set(x, 1.1, 1.0); g.add(c); }
        const tri = new THREE.Shape(); tri.moveTo(-1.6, 0); tri.lineTo(1.6, 0); tri.lineTo(0, 0.8); tri.closePath();
        const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 2.3, bevelEnabled: false }), mat('#e5dece', { rough: 0.7 })); ped.position.set(0, 2.3, -1.1); ped.castShadow = true; g.add(ped);
        const st = box(3.1, 0.14, 0.5, stone); st.position.set(0, 0.07, 1.25); g.add(st);
        return 0.82;
      },
      theater(g) {
        const b = box(2.9, 2.7, 1.8, mat('#7a1024', { rough: 0.6 })); b.position.set(0, 1.35, -0.1); g.add(b);
        const mq = box(2.5, 0.55, 0.7, mat('#1a1420', { rough: 0.4 })); mq.position.set(0, 2.35, 0.95); g.add(mq);
        const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), glowMat('#ffe9a8', 1, false), 26);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < 13; i++) { m4.makeTranslation(-1.14 + i * 0.19, 2.6, 1.31); bulbs.setMatrixAt(i, m4); m4.makeTranslation(-1.14 + i * 0.19, 2.1, 1.31); bulbs.setMatrixAt(13 + i, m4); }
        g.add(bulbs);
        const star = new THREE.Mesh(extrude(THREE, starShape(THREE, 0.42, 0.18), 0.1, 0.02), mat('#ffd23f', { metal: 0.9, rough: 0.2, emissive: '#ffb000', ei: 0.4 })); star.position.set(0, 3.25, 0); g.add(star);
        api.onUpdate((dt) => { star.rotation.y += dt * 0.5; });
        for (const x of [-0.95, 0.95]) { const cu = cyl(0.28, 0.28, 1.95, mat('#c0183a', { rough: 0.9 }), 12); cu.position.set(x, 0.98, 0.8); g.add(cu); }
        return 0.82;
      },
      prism(g) { // a stack of cubes, each twisted a little more than the last
        const cs = ['#8a7dff', '#5ef2ff', '#ff7ab8', '#ffd54a'];
        for (let i = 0; i < 4; i++) { const sz = 2.0 - i * 0.38; const b = box(sz, 0.78, sz, mat(cs[i], { rough: 0.25, metal: 0.5, emissive: cs[i], ei: 0.18 })); b.position.y = 0.39 + i * 0.78; b.rotation.y = i * 0.32; g.add(b); }
        const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), mat('#ffffff', { metal: 0.9, rough: 0.1, emissive: '#b48cff', ei: 0.6 })); eye.position.y = 3.6; g.add(eye);
        api.onUpdate((dt) => { eye.rotation.y += dt * 0.8; });
        return 1.02;
      },
      bunker(g) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.9, 2.3, 4), mat('#262b36', { metal: 0.8, rough: 0.35, flat: true })); b.rotation.y = Math.PI / 4; b.position.y = 1.15; b.castShadow = true; g.add(b);
        for (const y of [0.5, 1.2, 1.9]) { const n = box(2.3 - y * 0.42, 0.04, 0.04, glowMat('#ff2050', 0.9, false)); n.position.set(0, y, 1.36 - y * 0.185); g.add(n); }
        const vr = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 12, 40), mat('#8a93a6', { metal: 0.95, rough: 0.22 })); vr.position.set(0, 1.0, 1.2); g.add(vr);
        return 1.22;
      },
    };

    // ---------- place buildings on an arc ----------
    const R = 7.8, angs = [-72, -48, -24, 0, 24, 48, 72].map((a) => a * Math.PI / 180);
    const rise = [];
    DOORS.forEach((d, i) => {
      const def = api.rooms[d.id];
      if (!def) return;
      const a = angs[i];
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R);
      g.rotation.y = -a;
      const front = kits[d.kind](g);
      const dw = 1.0, dh = 1.25, rr = dw / 2;
      const outer = archShape(THREE, dw + 0.24, dh, rr + 0.12); outer.holes.push(archShape(THREE, dw, dh, rr));
      const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.14, bevelEnabled: false, curveSegments: 24 }), mat('#e6e9f2', { metal: 0.85, rough: 0.25 }));
      frame.position.z = front; g.add(frame);
      const sg = new THREE.ShapeGeometry(archShape(THREE, dw, dh, rr), 24);
      const uv = sg.attributes.uv, pos = sg.attributes.position, Hh = dh + rr;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (pos.getX(k) + dw / 2) / dw, pos.getY(k) / Hh);
      const swirl = new THREE.Mesh(sg, api.portalMat(d.c1, d.c2)); swirl.position.z = front + 0.05; g.add(swirl);
      const b = api.best(d.id);
      const stars = b ? '★'.repeat(b.stars) + '☆'.repeat(3 - b.stars) : 'not escaped yet';
      const sign = TX.label([def.tier, def.title, def.ages || '', stars], { w: 1.7, size: 64, weight: 800, colors: [d.c1, '#ffffff', '#bcd6ff', '#ffd54a'], bg: 'rgba(8,10,24,0.88)', border: d.c1, radius: 30, lineHeight: 1.25 });
      sign.position.set(0, 4.35, 0.6); g.add(sign);
      G.add(g);
      api.addIA(g, { label: `Enter: ${def.title}`, dwell: 1.4, hoverScale: 1.03, onActivate: () => api.loadRoom(d.id) });
      rise.push(g);
    });
    if (!introDone) { // grand opening: the village rises out of the platform
      introDone = true;
      rise.forEach((g, i) => { g.scale.y = 0.001; setTimeout(() => { api.sfx.place(); api.anim(0.9, (k) => { g.scale.y = Math.max(0.001, k); api.shadowsDirty(); }); }, 500 + i * 320); });
      title.material.opacity = 0; api.anim(2.2, (k) => { title.material.opacity = k; });
    }

    // ---------- how to play ----------
    const how = TX.label([
      'HOW TO PLAY',
      '👁  Look at something for a moment to use it',
      '🤏  Or point + pinch / pull the trigger',
      '🔵  Look at a glowing floor ring to glide there',
      '☰  Look down at the ring by your chest: menu, hints, exit',
      '🛋  Menu ▸ More: Chair, Recliner or Table mode',
      '🤖  Look at Bolt the drone to ask for tips, facts or jokes',
      '💡  Every room has a light switch… and a glowing secret',
      '★  No hints + fast = 3 stars. Stars unlock skins!',
    ], { w: 2.5, size: 50, weight: 600, align: 'left', bg: 'rgba(8,10,24,0.88)', border: '#5ef2ff', radius: 30, pad: 40, colors: ['#5ef2ff'] });
    how.position.set(-3.5, 1.55, 1.3); how.rotation.y = Math.PI / 2.05; G.add(how);

    // ---------- skin shop ----------
    const shop = new THREE.Group(); shop.position.set(3.5, 1.5, 1.3); shop.rotation.y = -Math.PI / 2.05; G.add(shop);
    const head = api.screen(1024, 150, 2.1, (g, w, h) => {
      g.fillStyle = 'rgba(8,10,24,0.9)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 26); g.fill(); g.strokeStyle = '#ffd54a'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#ffd54a'; g.font = '900 62px system-ui'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('SKIN SHOP', 36, h / 2 + 2);
      g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '800 52px system-ui'; g.fillText(`★ ${api.stars()}   ·   secrets ${api.secretCount()}/7`, w - 36, h / 2 + 2);
    });
    head.position.y = 0.74; shop.add(head);
    const cards = [];
    api.skins.forEach((sk, i) => {
      const card = api.screen(360, 300, 0.5, (g, w, h) => {
        const have = !sk.premium && api.stars() >= sk.need, on = api.state.skin === sk.id;
        g.fillStyle = 'rgba(12,16,34,0.94)'; g.beginPath(); g.roundRect(5, 5, w - 10, h - 10, 22); g.fill();
        g.strokeStyle = on ? '#7dffb0' : have ? sk.a : '#4a5068'; g.lineWidth = on ? 12 : 6; g.stroke();
        const gr = g.createLinearGradient(60, 30, 300, 170); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, sk.c); gr.addColorStop(1, '#000000');
        g.fillStyle = gr; g.beginPath(); g.roundRect(110, 28, 140, 120, 60); g.fill();
        g.fillStyle = sk.a; g.beginPath(); g.arc(180, 100, 20, 0, Math.PI * 2); g.fill();
        g.textAlign = 'center';
        if (!have) { g.fillStyle = 'rgba(5,6,14,0.6)'; g.fillRect(8, 8, w - 16, 150); g.fillStyle = '#fff'; g.font = '700 64px system-ui'; g.fillText('🔒', w / 2, 112); }
        g.fillStyle = '#fff'; g.font = '800 40px system-ui'; g.fillText(sk.name, w / 2, 208, w - 24);
        g.font = '700 32px system-ui';
        g.fillStyle = on ? '#7dffb0' : sk.premium ? '#c9a0ff' : have ? '#bcd6ff' : '#ffd54a';
        g.fillText(on ? 'WEARING' : sk.premium ? 'PREMIUM · coming soon' : have ? 'look to wear' : `earn ★ ${sk.need}`, w / 2, 258, w - 24);
      });
      card.position.set(-0.81 + (i % 4) * 0.54, 0.36 - Math.floor(i / 4) * 0.46, 0);
      shop.add(card); cards.push(card);
      api.addIA(card, {
        label: sk.name, hoverScale: 1.06, dwell: 1.0,
        onActivate: () => {
          if (sk.premium) { api.sfx.wrong(); return api.msg('Premium skins are coming soon.', '#c9a0ff'); }
          if (api.stars() < sk.need) { api.sfx.wrong(); return api.msg(`${sk.name} unlocks at ★ ${sk.need}. You have ★ ${api.stars()}. Escape rooms with fewer hints to earn more!`, '#ffd54a'); }
          api.setSkin(sk.id); api.sfx.pick(); cards.forEach((c) => c.redraw());
          api.msg(`Now wearing ${sk.name}. Look down to see your new body!`, '#7dffb0');
        },
      });
    });

    // floating shapes
    const shapes = [];
    const geos = [new THREE.OctahedronGeometry(0.25), new THREE.IcosahedronGeometry(0.22), new THREE.BoxGeometry(0.3, 0.3, 0.3)];
    const cols = ['#ff7ab8', '#5ef2ff', '#ffd54a', '#c9a0ff', '#7dffb0', '#ff8a3d'];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(geos[i % 3], mat(cols[i % 6], { rough: 0.15, metal: 0.7, emissive: cols[i % 6], ei: 0.35 }));
      m.userData = { ang: (i / 12) * Math.PI * 2, rad: 12 + (i % 3) * 1.6, y: 2 + (i % 4) * 1.2, sp: 0.03 + (i % 5) * 0.008 };
      G.add(m); shapes.push(m);
    }
    api.onUpdate((dt, t) => {
      for (const m of shapes) { const u = m.userData, an = u.ang + t * u.sp; m.position.set(Math.sin(an) * u.rad, u.y + Math.sin(t * 0.7 + u.ang) * 0.25, Math.cos(an) * u.rad); m.rotation.x += dt * 0.4; m.rotation.y += dt * 0.6; }
    });
    api.dust(220, [18, 6, 18], '#9fdcff', [0, 3, -2]);
    api.addSeat(new THREE.Vector3(0, 0, 1.2), 0);

    return {
      hint: () => 'Pick a building. EASY is made for kids, MEDIUM for teens, HARD for adults, EXPERT is a timed spy mission. Look at a building for a moment (or point and pinch) to go inside.',
      answer: () => 'Nothing to solve here. Look at any building to start a room, or look at a skin in the Skin Shop on your right.',
      idle: () => 'Look at a building to begin. Stars you earn unlock new skins.',
    };
  },
};
