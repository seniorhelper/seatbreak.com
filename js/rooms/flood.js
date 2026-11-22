// MEDIUM — The Sunken Lab (rising water; density, measuring, pressure)
import { shell } from './common.js?v=3';

export const flood = {
  id: 'flood', title: 'The Sunken Lab', tier: 'MEDIUM', ages: 'Ages 10+ · rising water', color: '#12b5c9', par: 420, limit: 720, tableScale: 8,
  failTitle: 'TANK DRAINED', failReason: 'Your air timer ran out.', failLine: 'The safety system drained the tank. Nobody got wet. Try again!',
  learn: ['Salt makes water denser, so a sinking egg floats', 'Every 10 m of water adds about 1 atmosphere of pressure', 'A 3 L and a 5 L jug can measure exactly 4 L'],
  intro: 'The test tank is filling and you are clamped to the floor on a raft. Your dive helmet has 12 minutes of air. Free the raft and ride the water up to the hatch!',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    const W = 6.4, D = 6.4, H = 4.4;
    const S = { salt: 0, floated: false, wheel: false, a: 0, b: 0, raft: false, open: false, level: 0.12, lift: 0, under: null, surge: false };
    const tmp = new THREE.Vector3();
    shell(api, {
      w: W, d: D, h: H,
      floor: mat('#ffffff', { map: TX.rep(TX.tiles('#3d6470', '#2f525d', 8, 'fl'), 3, 3), rough: 0.35, metal: 0.3 }),
      wall: mat('#ffffff', { map: TX.rep(TX.panel('#2d5560', '#17333b', 'fl'), 4, 2.6), metal: 0.5, rough: 0.45 }),
      ceil: mat('#ffffff', { map: TX.rep(TX.panel('#1f3e47', '#10262c', 'flc'), 4, 4), metal: 0.5, rough: 0.6 }),
      trim: '#ffcc00', trimH: 0.12,
    });
    G.add(new THREE.HemisphereLight('#9fefff', '#0a2c36', 0.8));
    const spot = new THREE.SpotLight('#eaffff', 30, 11, 0.95, 0.7, 1.4);
    spot.position.set(0, H - 0.05, 0.6); spot.target.position.set(0, 0, -0.8); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0008;
    G.add(spot, spot.target);
    const pl = new THREE.PointLight('#3fe0ff', 5, 7, 1.8); pl.position.set(0, 1.6, -2.2); G.add(pl);

    // portholes with the open sea outside
    const sea = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2fc4e8'); gr.addColorStop(1, '#03263d'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(60 + i * 80, 0); g.lineTo(100 + i * 80, 0); g.lineTo(20 + i * 90, 512); g.lineTo(-30 + i * 90, 512); g.fill(); }
      g.fillStyle = 'rgba(2,25,40,0.75)';
      for (const [x, y, s] of [[150, 200, 1], [330, 150, 0.7], [280, 330, 1.3], [110, 380, 0.6]]) { g.beginPath(); g.ellipse(x, y, 34 * s, 13 * s, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x - 30 * s, y); g.lineTo(x - 52 * s, y - 14 * s); g.lineTo(x - 52 * s, y + 14 * s); g.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshBasicMaterial({ map: sea, toneMapped: false }));
      p.position.set(s * (W / 2 - 0.02), 2.0, 0.4); p.rotation.y = -s * Math.PI / 2; G.add(p);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 10, 40), mat('#c9a24a', { metal: 0.9, rough: 0.3 })); r.position.copy(p.position); r.rotation.y = p.rotation.y; G.add(r);
    }

    // ---------- water ----------
    const wm = api.timeMat(new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float t; varying vec2 vUv;
        void main(){ vec2 p=vUv*14.0; float w=sin(p.x+t*0.9)*sin(p.y*1.3-t*0.7)+sin((p.x+p.y)*0.7+t*0.5);
          float c=smoothstep(0.9,1.7,w); vec3 col=mix(vec3(0.04,0.42,0.58),vec3(0.75,0.97,1.0),c*0.6);
          gl_FragColor=vec4(col,0.5+c*0.2); }`,
    }));
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W, D), wm); water.rotation.x = -Math.PI / 2; water.renderOrder = 1; G.add(water);
    const N = 60, bg = new THREE.BufferGeometry(), bp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { bp[i * 3] = (Math.random() - 0.5) * W * 0.9; bp[i * 3 + 1] = Math.random() * 3; bp[i * 3 + 2] = (Math.random() - 0.5) * D * 0.9; }
    bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    const bubbles = new THREE.Points(bg, new THREE.PointsMaterial({ color: '#dffcff', size: 0.06, map: api.dotTex, transparent: true, opacity: 0.8, depthWrite: false }));
    bubbles.frustumCulled = false; bubbles.userData.cut = 'fx'; G.add(bubbles);
    const AIR = new THREE.Color('#041318'), DEEP = new THREE.Color('#0a5a74');

    // ---------- raft ----------
    const raft = new THREE.Group(); raft.position.set(0, 0, 1.4); G.add(raft);
    const deck = cyl(0.95, 0.95, 0.1, mat('#ff7a1a', { rough: 0.6 }), 36); deck.position.y = -0.07; raft.add(deck);
    const tube = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 12, 40), mat('#ffd23f', { rough: 0.5 })); tube.rotation.x = Math.PI / 2; tube.position.y = 0.02; tube.castShadow = true; raft.add(tube);
    const clamps = [];
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const c = box(0.22, 0.3, 0.14, mat('#d0162c', { metal: 0.6, rough: 0.4 })); c.position.set(Math.sin(a) * 1.1, 0.15, 1.4 + Math.cos(a) * 1.1); c.rotation.y = a; G.add(c); clamps.push(c); }

    // ---------- Station A: float the capsule ----------
    const steel = mat('#8fa3ad', { metal: 0.85, rough: 0.3 });
    const benchA = box(2.3, 0.9, 0.6, steel); benchA.position.set(-1.75, 0.45, -2.8); G.add(benchA);
    const glassM = new THREE.MeshStandardMaterial({ color: '#dff8ff', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false });
    const tubeA = cyl(0.2, 0.2, 1.3, glassM, 28, { cast: false }); tubeA.position.set(-2.5, 1.55, -2.8); G.add(tubeA);
    const wA = cyl(0.185, 0.185, 1, new THREE.MeshStandardMaterial({ color: '#39c6e6', transparent: true, opacity: 0.55, roughness: 0.1 }), 24, { cast: false }); G.add(wA);
    let tubeH = 0.95;
    const setTube = () => { wA.scale.y = tubeH; wA.position.set(-2.5, 0.9 + tubeH / 2, -2.8); };
    setTube();
    const egg = sph(0.085, mat('#ffd23f', { metal: 0.9, rough: 0.2, emissive: '#b8860b', ei: 0.3 }), 20); egg.scale.y = 1.3; egg.position.set(-2.5, 1.02, -2.8); G.add(egg);
    const junk = new THREE.Group(); G.add(junk);
    const jars = [
      { k: 'SALT', c: '#f4f6f8', x: -1.75 },
      { k: 'SAND', c: '#d9b877', x: -1.3 },
      { k: 'PEBBLES', c: '#7d858c', x: -0.85 },
    ];
    jars.forEach((j) => {
      const g = new THREE.Group(); g.position.set(j.x, 0.9, -2.75); G.add(g);
      const jar = cyl(0.13, 0.13, 0.32, glassM, 20, { cast: false }); jar.position.y = 0.16; g.add(jar);
      const fill = cyl(0.115, 0.115, 0.22, mat(j.c, { rough: 0.9 }), 16); fill.position.y = 0.12; g.add(fill);
      const lid = cyl(0.135, 0.135, 0.04, mat('#c9a24a', { metal: 0.9, rough: 0.3 }), 20); lid.position.y = 0.34; g.add(lid);
      const lb = TX.label(j.k, { w: 0.36, size: 70, weight: 900, color: '#102a33', bg: '#ffffff', radius: 14, depthWrite: true }); lb.position.set(0, 0.52, 0); g.add(lb);
      api.addIA(g, {
        label: `Pour ${j.k.toLowerCase()} into the tube`, hoverScale: 1.1, repeat: true, enabled: () => !S.floated,
        onActivate: () => {
          api.sfx.place();
          if (j.k === 'SALT') {
            S.salt++;
            if (S.salt < 2) return api.msg('The salt dissolves. The capsule wobbles off the bottom… the water needs to be even denser. More salt!', '#ffd54a');
            S.floated = true; api.sfx.solve();
            api.anim(1.6, (k) => { egg.position.y = 1.02 + (0.9 + tubeH - 0.1 - 1.02) * k; });
            api.msg('The salty water is now DENSER than the capsule, so it floats to the top! Look at the capsule to take it.', '#7dffb0', 12);
          } else if (j.k === 'SAND') {
            const s = cyl(0.17, 0.17, 0.05, mat('#d9b877', { rough: 1 }), 16); s.position.set(-2.5, 0.93 + junk.children.length * 0.02, -2.8); junk.add(s);
            api.msg('Sand does not dissolve. It just sinks, so the water is no denser. The capsule stays down.', '#ff9d9d', 10);
          } else {
            tubeH = Math.min(1.2, tubeH + 0.08); setTube();
            api.msg('The pebbles push the water level UP (that is displacement). But the capsule is still denser than the water, so it stays down.', '#ff9d9d', 11);
          }
        },
      });
    });
    api.addIA(egg, { label: 'Take the capsule', hoverScale: 1.3, enabled: () => S.floated && !S.wheel && !api.inv.has('wheel'), onActivate: () => { egg.visible = false; api.inv.add('wheel', 'Valve Wheel', '☸'); setTimeout(() => api.msg('Inside the capsule: a VALVE WHEEL. The pump on the right is missing one.', '#7dffb0'), 1300); } });
    const postA = TX.label(['FLOAT OR SINK?', 'A thing floats when the liquid', 'is DENSER than it is.', 'The capsule sinks in fresh water.', 'How could you make water denser?'], { w: 1.7, size: 56, weight: 700, colors: ['#9dfff0'], color: '#eafcff', bg: 'rgba(4,24,32,0.9)', border: '#12b5c9', radius: 18, depthWrite: true });
    postA.position.set(-1.75, 2.35, -3.14); G.add(postA);

    // ---------- Station B: measure exactly 4 litres ----------
    const benchB = box(2.3, 0.9, 0.6, steel); benchB.position.set(1.75, 0.45, -2.8); G.add(benchB);
    const jugW = new THREE.MeshStandardMaterial({ color: '#39c6e6', transparent: true, opacity: 0.6, roughness: 0.1 });
    const mkJug = (x, cap) => {
      const h = cap * 0.19;
      const gl = cyl(0.17, 0.17, h, glassM, 24, { cast: false }); gl.position.set(x, 0.9 + h / 2, -2.8); G.add(gl);
      const w = cyl(0.155, 0.155, 1, jugW, 20, { cast: false }); G.add(w);
      const lb = TX.label(`${cap} L`, { w: 0.3, size: 80, weight: 900, color: '#102a33', bg: '#ffffff', radius: 14, depthWrite: true }); lb.position.set(x, 0.9 + h + 0.14, -2.8); G.add(lb);
      return { set(v) { w.visible = v > 0; w.scale.y = Math.max(0.001, v * 0.19); w.position.set(x, 0.9 + v * 0.095, -2.8); } };
    };
    const jugA = mkJug(1.2, 3), jugB = mkJug(1.75, 5);
    const pump = new THREE.Group(); pump.position.set(2.55, 0.9, -2.8); G.add(pump);
    const pb = box(0.5, 0.7, 0.4, mat('#1d3b46', { metal: 0.7, rough: 0.35 })); pb.position.y = 0.35; pump.add(pb);
    const sock = cyl(0.05, 0.05, 0.08, mat('#111'), 12); sock.rotation.x = Math.PI / 2; sock.position.set(0, 0.42, 0.22); pump.add(sock);
    const wheel = new THREE.Group(); wheel.position.set(0, 0.42, 0.27); wheel.visible = false; pump.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 24), mat('#ffd23f', { metal: 0.9, rough: 0.2 })));
    for (let i = 0; i < 3; i++) { const sp = box(0.28, 0.025, 0.02, mat('#ffd23f', { metal: 0.9, rough: 0.2 })); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); }
    const read = api.screen(900, 260, 1.5, (g, w, h) => {
      g.fillStyle = '#031419'; g.fillRect(0, 0, w, h); g.strokeStyle = '#12b5c9'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#9dfff0'; g.font = '800 44px ui-monospace, monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('RAFT RELEASE PUMP', 30, 46);
      g.fillStyle = '#fff'; g.font = '800 60px ui-monospace, monospace';
      g.fillText(`3 L jug: ${S.a}    5 L jug: ${S.b}`, 30, 126);
      g.fillStyle = S.b === 4 ? '#7dffb0' : '#ffd54a'; g.font = '700 40px system-ui';
      g.fillText(!S.wheel ? 'NO VALVE WHEEL — pump is offline' : S.b === 4 ? 'EXACTLY 4 L — RAFT RELEASED' : 'GOAL: exactly 4 L in the 5 L jug', 30, 204);
    }, { transparent: false });
    read.position.set(1.75, 2.35, -3.14); G.add(read);
    const refresh = () => {
      jugA.set(S.a); jugB.set(S.b); read.redraw();
      if (S.b === 4 && !S.raft) release();
    };
    refresh();
    api.addIA(pump, {
      label: 'Pump valve', hoverScale: 1.05, enabled: () => !S.wheel,
      onActivate: () => {
        if (!api.inv.has('wheel')) { api.sfx.wrong(); return api.msg('The pump has an empty valve socket. It needs a valve wheel.', '#ffd54a'); }
        api.inv.remove('wheel'); S.wheel = true; wheel.visible = true; api.sfx.mech(); refresh();
        api.anim(0.8, (k) => { wheel.rotation.z = k * Math.PI * 2; });
        api.msg('Pump online! Put EXACTLY 4 litres in the 5 L jug. You only have a 3 L jug and a 5 L jug… think!', '#7dffb0', 12);
      },
    });
    const acts = [
      ['Fill 3 L', () => { S.a = 3; }], ['Empty 3 L', () => { S.a = 0; }], ['Pour 3 ▸ 5', () => { const m = Math.min(S.a, 5 - S.b); S.a -= m; S.b += m; }],
      ['Fill 5 L', () => { S.b = 5; }], ['Empty 5 L', () => { S.b = 0; }], ['Pour 5 ▸ 3', () => { const m = Math.min(S.b, 3 - S.a); S.b -= m; S.a += m; }],
    ];
    acts.forEach(([t, fn], i) => {
      const b = TX.label(t, { w: 0.52, width: 420, height: 130, size: 62, weight: 800, color: '#fff', bg: i < 3 ? '#14606e' : '#155a8a', border: '#9dfff0', borderWidth: 5, radius: 16, depthWrite: true });
      b.position.set(1.12 + (i % 3) * 0.6, i < 3 ? 0.62 : 0.38, -2.49); G.add(b);
      api.addIA(b, { label: t, repeat: true, dwell: 0.8, hoverScale: 1.08, enabled: () => S.wheel && !S.raft, onActivate: () => { fn(); api.sfx.splash(); refresh(); } });
    });
    function release() {
      S.raft = true; api.sfx.solve();
      clamps.forEach((c, i) => api.anim(0.6, (k) => { c.rotation.z = k * 1.3; c.position.y = 0.15 - k * 0.1; }));
      api.msg('CLUNK! The clamps let go. Your raft floats up with the water. Look up: the hatch needs a 3-digit code.', '#7dffb0', 12);
    }

    // ---------- Station C: the hatch code (pressure) ----------
    const chart = TX.label(['DIVE CHART', 'At the surface: 1 atmosphere', '(that is the air above you)', 'Every 10 m of water adds 1 more', '10 m deep  =  2 atmospheres'], { w: 1.8, size: 56, weight: 700, colors: ['#ffd54a'], color: '#eafcff', bg: 'rgba(4,24,32,0.92)', border: '#ffd54a', radius: 18, depthWrite: true });
    chart.position.set(-1.6, 3.5, -3.14); G.add(chart);
    const ask = TX.label(['HATCH CODE', 'Pressure in atmospheres at:', '20 m   ·   40 m   ·   0 m'], { w: 1.5, size: 60, weight: 800, colors: ['#9dfff0'], color: '#ffffff', bg: 'rgba(4,24,32,0.92)', border: '#12b5c9', radius: 18, depthWrite: true });
    ask.position.set(0.35, 3.55, -3.14); G.add(ask);
    const kp = api.keypad({ code: '351', size: 2.0, color: '#9dfff0', title: 'HATCH', bodyColor: '#1d3b46', enabled: () => S.raft, onSolve: openHatch, onWrong: () => api.msg('Wrong code. Read the dive chart: start at 1 for the air, then add 1 for every 10 m.', '#ff9d9d') });
    kp.position.set(2.1, 3.45, -3.1); G.add(kp);
    const hatch = new THREE.Group(); hatch.position.set(0, H - 0.03, 1.4); G.add(hatch);
    const glowD = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), api.portalMat('#12b5c9', '#ffffff')); glowD.rotation.x = Math.PI / 2; glowD.position.y = -0.01; hatch.add(glowD);
    const lid = cyl(0.9, 0.9, 0.08, mat('#8fa3ad', { metal: 0.9, rough: 0.25 }), 36); lid.position.y = -0.05; hatch.add(lid);
    const hw = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 28), mat('#d0162c', { metal: 0.6, rough: 0.4 })); hw.rotation.x = Math.PI / 2; hw.position.y = -0.11; lid.add(hw);
    function openHatch() {
      S.open = true; S.surge = true;
      api.msg('HATCH UNLOCKED! Hold on, here comes the last of the water…', '#7dffb0');
      api.anim(1.4, (k) => { lid.position.x = k * 1.9; hw.rotation.z = k * 4; api.shadowsDirty(); });
    }

    // ---------- simulation ----------
    api.onUpdate((dt, t) => {
      if (api.state.done && !S.open) return;
      S.level = Math.min(S.surge ? 3.75 : 3.3, S.level + dt * (S.surge ? 0.5 : 0.0125));
      water.position.y = S.level;
      const target = S.raft ? Math.max(0, S.level - 0.28) : 0;
      S.lift += Math.max(-dt * 0.6, Math.min(dt * 0.6, target - S.lift));
      raft.position.y = S.lift; api.setLift(S.lift);
      const a = bg.attributes.position;
      for (let i = 0; i < N; i++) { a.array[i * 3 + 1] += dt * (0.25 + (i % 5) * 0.06); if (a.array[i * 3 + 1] > S.level) a.array[i * 3 + 1] = 0.02; }
      a.needsUpdate = true;
      api.camera.getWorldPosition(tmp);
      const under = api.state.mode !== 'table' && tmp.y < S.level;
      if (under !== S.under) { S.under = under; api.setScene({ bg: under ? DEEP : AIR, fog: under ? new THREE.FogExp2('#0a5a74', 0.16) : null }); if (under) api.sfx.splash(); }
      if (S.open && S.lift > 3.3 && !api.state.done) api.escape();
    });

    api.lightSwitch(new THREE.Vector3(0, 1.3, -D / 2 + 0.02));
    api.secret(['★ SECRET ★', 'Sound travels about 4 times', 'faster in water than in air.'], 2.2).position.set(0, 2.9, -D / 2 + 0.03);
    api.blob(-1.75, -2.8, 1.3, 0.3); api.blob(1.75, -2.8, 1.3, 0.3);
    api.addSeat(new THREE.Vector3(0, 0, 1.4), 0, { label: 'Raft' });

    return {
      hint() {
        if (!S.floated) return 'Read the FLOAT OR SINK poster. The capsule in the glass tube must float. Which jar would make the water itself denser?';
        if (!S.wheel) return api.inv.has('wheel') ? 'Fit the valve wheel onto the pump at the right end of the bench.' : 'Take the floating capsule from the top of the glass tube.';
        if (!S.raft) return 'You can only fill, empty and pour. Start by filling the 5 L jug and pouring it into the 3 L jug. What is left in the big one?';
        return 'Dive chart: 1 atmosphere at the surface, plus 1 for every 10 m. Work out 20 m, 40 m and 0 m.';
      },
      answer() {
        if (!S.floated) return 'Pour SALT into the tube twice. Salt water is denser, so the capsule floats.';
        if (!S.wheel) return 'Take the capsule, then look at the pump to fit the valve wheel.';
        if (!S.raft) return 'Fill 5. Pour 5▸3. Empty 3. Pour 5▸3. Fill 5. Pour 5▸3. The 5 L jug now holds exactly 4.';
        return 'The code is 3 5 1. (20 m = 3 atm, 40 m = 5 atm, 0 m = 1 atm.)';
      },
      idle: () => !S.floated ? 'Make the capsule float.' : !S.raft ? 'Measure exactly 4 litres to free the raft.' : 'Crack the hatch code.',
    };
  },
};
