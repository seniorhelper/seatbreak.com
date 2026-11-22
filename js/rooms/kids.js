// EASY — Toy Workshop (kids)
import { shell, starShape, moonShape, triShape, extrude, archShape, exitPortal } from './common.js?v=3';

export const kids = {
  id: 'kids', title: 'Toy Workshop', tier: 'EASY', ages: 'Ages 5+ · shapes & counting', color: '#ff7ab8', par: 240, tableScale: 7,
  learn: ['A triangle has 3 sides and 3 corners', 'This star has 5 points', 'The Moon does not make light. It reflects sunlight'],
  intro: 'The toy door is locked! Find the 3 missing shapes: a red star, a blue moon and a yellow triangle. Look at things to poke them!',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    api.setScene({ bg: new THREE.Color('#2a1830') });
    const W = 7, D = 7, H = 3.2;
    shell(api, {
      w: W, d: D, h: H,
      floor: mat('#ffffff', { map: TX.rep(TX.wood('#c98d55', 'kid'), 3, 3), rough: 0.55 }),
      wall: mat('#ffffff', { map: TX.rep(TX.wallpaper('#ffd6e8', '#fff3f8', 'star', 'k1'), 3, 1.4) }),
      wallN: mat('#ffffff', { map: TX.rep(TX.wallpaper('#c9f2e4', '#effff9', 'dot', 'k2'), 3, 1.4) }),
      ceil: mat('#fff6e6', { rough: 0.9 }), trim: '#ffffff', trimH: 0.16,
    });

    // Lighting — warm and bright
    G.add(new THREE.HemisphereLight('#fff1dc', '#7a5a8a', 0.55));
    const spot = new THREE.SpotLight('#fff0d8', 24, 10, 1.05, 0.6, 1.6);
    spot.position.set(0, H - 0.05, 0.3); spot.target.position.set(0, 0, -0.6);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0008;
    G.add(spot, spot.target);
    for (const x of [-1.8, 1.8]) {
      const cord = cyl(0.006, 0.006, 0.6, mat('#333')); cord.position.set(x, H - 0.3, -0.4); G.add(cord);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.26, 32, 1, true), mat(x < 0 ? '#ff7ab8' : '#5ec8ff', { rough: 0.5, side: THREE.DoubleSide }));
      shade.position.set(x, H - 0.68, -0.4); G.add(shade);
      const bulb = sph(0.07, mat('#fff8e0', { emissive: '#fff1c4', ei: 1.2 }), 16, { cast: false }); bulb.position.set(x, H - 0.76, -0.4); G.add(bulb);
      const pl = new THREE.PointLight('#ffd9a0', 4, 7, 2); pl.position.set(x, H - 0.85, -0.4); G.add(pl);
    }
    // Rug
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), mat('#ffffff', { map: TX.carpet('#6ec6ff', '#ffffff', 'kidrug'), rough: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, 0.2); rug.receiveShadow = true; G.add(rug);

    // Bunting
    const bcols = ['#ff5a7a', '#ffd23f', '#3ec1ff', '#7be37b', '#b58bff'];
    const flags = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.22, 3), mat('#ffffff', { rough: 0.8 }), 32);
    const fm4 = new THREE.Matrix4(), fq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), fc = new THREE.Color(), one = new THREE.Vector3(1, 1, 1), fp = new THREE.Vector3();
    for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) {
      const sag = Math.sin((i / 15) * Math.PI) * 0.35;
      fm4.compose(fp.set(-3.2 + i * 0.43, H - 0.25 - sag, row ? 1.5 : -1.5), fq, one);
      flags.setMatrixAt(row * 16 + i, fm4); flags.setColorAt(row * 16 + i, fc.set(bcols[(i + row) % 5]));
    }
    flags.castShadow = false; G.add(flags);

    const state = { star: 'hidden', moon: 'hidden', tri: 'hidden', slots: { star: false, moon: false, tri: false }, asked: false, open: false };

    // ---------- Exit door (north) ----------
    const door = new THREE.Group();
    door.position.set(0, 0, -D / 2 + 0.06);
    G.add(door);
    const frameCols = ['#ff5a7a', '#ffb13f', '#ffe14d', '#6be38a', '#3ec1ff', '#9b7bff'];
    frameCols.forEach((c, i) => {
      const s = archShape(THREE, 1.7 + i * 0.12, 1.55, 0.85 + i * 0.06);
      s.holes.push(archShape(THREE, 1.58 + i * 0.12, 1.55, 0.79 + i * 0.06));
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false, curveSegments: 32 }), mat(c, { rough: 0.45 }));
      m.position.z = 0.01 + i * 0.005; door.add(m);
    });
    const portal = exitPortal(api, 1.55, 2.4, '#ff7ab8', '#ffd54a');
    portal.position.set(0, 1.2, -0.02); portal.visible = false; door.add(portal);
    const hinge = new THREE.Group(); hinge.position.set(-0.78, 0, 0.04); door.add(hinge);
    const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape(THREE, 1.56, 1.55, 0.78), { depth: 0.07, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, curveSegments: 32 }), mat('#3b82f6', { rough: 0.35 }));
    leaf.position.x = 0.78; leaf.castShadow = true; hinge.add(leaf);
    const knob = sph(0.06, mat('#ffd23f', { rough: 0.2, metal: 0.8 })); knob.position.set(1.42, 1.05, 0.12); hinge.add(knob);
    const doorSign = TX.label('TOY DOOR', { w: 0.7, size: 70, weight: 900, color: '#ffffff', bg: '#ff5a7a', radius: 24 });
    doorSign.position.set(0.78, 2.05, 0.095); hinge.add(doorSign);

    const shapes = {
      star: { shape: starShape(THREE, 0.12, 0.055), color: '#ff3b5c', name: 'Red Star', icon: '★', x: -0.42 },
      moon: { shape: moonShape(THREE, 0.12), color: '#3e7bff', name: 'Blue Moon', icon: '☾', x: 0 },
      tri: { shape: triShape(THREE, 0.13), color: '#ffd23f', name: 'Yellow Triangle', icon: '▲', x: 0.42 },
    };
    const slotMeshes = {};
    for (const [k, s] of Object.entries(shapes)) {
      const plate = cyl(0.17, 0.17, 0.03, mat('#ffffff', { rough: 0.4 }), 32);
      plate.rotation.x = Math.PI / 2; plate.position.set(0.78 + s.x, 1.35, 0.1);
      hinge.add(plate);
      const hole = new THREE.Mesh(extrude(THREE, s.shape, 0.01, 0.002), mat('#2a2140', { rough: 0.9 }));
      hole.position.set(0.78 + s.x, 1.35, 0.118); hinge.add(hole);
      const fill = new THREE.Mesh(extrude(THREE, s.shape, 0.04, 0.01), mat(s.color, { rough: 0.25, emissive: s.color, ei: 0.25 }));
      fill.position.set(0.78 + s.x, 1.35, 0.14); fill.visible = false; hinge.add(fill);
      slotMeshes[k] = fill;
      api.addIA(plate, {
        label: `${s.name} hole`, hoverScale: 1.08,
        enabled: () => !state.slots[k],
        onActivate: () => {
          if (api.inv.has(k)) {
            api.inv.remove(k); state.slots[k] = true; fill.visible = true;
            api.sfx.place();
            fill.getWorldPosition(tmp); api.burst(tmp, s.color, 40, 1);
            const left = Object.values(state.slots).filter((v) => !v).length;
            api.msg(left ? `The ${s.name} fits! ${left} more to go.` : 'All three shapes fit! Now the door has a question for you…', '#7dffb0');
            if (!left) askQuestion();
          } else {
            api.sfx.wrong();
            api.msg(`A ${s.name.toLowerCase()} goes here. Can you find it?`, '#ffd54a');
          }
        },
      });
    }
    const tmp = new THREE.Vector3();

    // Number blocks (appear after shapes)
    const quiz = new THREE.Group(); quiz.position.set(0, 0, -D / 2 + 0.75); quiz.visible = false; G.add(quiz);
    const qSign = TX.label(['How many rubber ducks', 'are hiding in the workshop?'], { w: 1.6, size: 64, weight: 800, color: '#3a2350', bg: 'rgba(255,255,255,0.94)', border: '#ffd23f', borderWidth: 10, radius: 30 });
    qSign.position.set(0, 1.92, -0.12); quiz.add(qSign);
    const stand = box(1.9, 0.5, 0.35, mat('#ffffff', { map: TX.wood('#e0a96d', 'kid2') })); stand.position.y = 0.25; quiz.add(stand);
    const ncol = ['#ff5a7a', '#ffb13f', '#6be38a', '#3ec1ff', '#9b7bff'];
    for (let n = 1; n <= 5; n++) {
      const cube = new THREE.Group();
      const b = box(0.26, 0.26, 0.26, mat(ncol[n - 1], { rough: 0.4 }));
      cube.add(b);
      const face = TX.label(String(n), { w: 0.2, size: 150, weight: 900, color: '#ffffff', depthWrite: true });
      face.position.z = 0.131; cube.add(face);
      const top = TX.label(String(n), { w: 0.2, size: 150, weight: 900, color: '#ffffff', depthWrite: true });
      top.rotation.x = -Math.PI / 2; top.position.y = 0.131; cube.add(top);
      cube.position.set((n - 3) * 0.34, 0.63, 0.05);
      quiz.add(cube);
      api.addIA(cube, {
        label: `Answer ${n}`, hoverScale: 1.12,
        enabled: () => state.asked && !state.open,
        onActivate: () => {
          if (n === 4) { openDoor(); }
          else {
            api.sfx.wrong();
            api.anim(0.4, (k) => { cube.rotation.z = Math.sin(k * Math.PI * 4) * 0.25 * (1 - k); });
            api.msg(n < 4 ? 'Hmm, there are more ducks than that. Look around again!' : 'Not quite that many. Count again!', '#ffd54a');
          }
        },
      });
    }
    function askQuestion() {
      state.asked = true; quiz.visible = true;
      api.anim(0.6, (k) => { quiz.position.y = -0.6 * (1 - k); });
      api.shadowsDirty();
    }
    function openDoor() {
      state.open = true;
      api.sfx.solve();
      portal.visible = true;
      api.msg('YES! 4 ducks! The Toy Door is opening!', '#7dffb0');
      knob.getWorldPosition(tmp); api.burst(tmp, '#ffd23f', 120, 2);
      api.anim(1.4, (k) => { hinge.rotation.y = -k * 1.7; api.shadowsDirty(); }).then(() => setTimeout(() => api.escape(), 700));
    }

    // ---------- Pickups ----------
    function pickup(key, pos, parent = G) {
      const s = shapes[key];
      const m = new THREE.Mesh(extrude(THREE, s.shape, 0.05, 0.012), mat(s.color, { rough: 0.2, metal: 0.1, emissive: s.color, ei: 0.3 }));
      m.position.copy(pos); m.castShadow = true;
      parent.add(m);
      const ia = api.addIA(m, {
        label: `Take the ${s.name}`, hoverScale: 1.2,
        enabled: () => state[key] === 'revealed',
        onActivate: () => {
          state[key] = 'taken'; m.visible = false;
          m.getWorldPosition(tmp); api.burst(tmp, s.color, 50, 1.2);
          api.inv.add(key, s.name, s.icon);
          const found = ['star', 'moon', 'tri'].filter((x) => state[x] === 'taken').length;
          if (found < 3) setTimeout(() => api.msg(`You found ${found} of 3 shapes!`, '#7dffb0'), 1200);
          else setTimeout(() => api.msg('You found all 3 shapes! Put each one in its hole on the Toy Door.', '#7dffb0'), 1200);
        },
      });
      api.onUpdate((dt, t) => { if (state[key] === 'revealed') { m.rotation.y += dt * 1.6; } });
      return { m, ia };
    }

    // Toy shelf (east) + teddy hiding the star
    const shelf = new THREE.Group(); shelf.position.set(D / 2 - 0.3, 0, -0.4); shelf.rotation.y = -Math.PI / 2; G.add(shelf);
    const sw = mat('#ffffff', { map: TX.wood('#f0b6d0', 'shelf') , rough: 0.6 });
    for (const y of [0.05, 0.6, 1.15, 1.7]) { const b = box(1.8, 0.05, 0.45, sw); b.position.y = y; shelf.add(b); }
    for (const x of [-0.9, 0.9]) { const b = box(0.05, 1.75, 0.45, sw); b.position.set(x, 0.875, 0); shelf.add(b); }
    const back = box(1.8, 1.75, 0.02, mat('#ffe3f0')); back.position.set(0, 0.875, -0.22); shelf.add(back);
    // blocks on shelf
    const letters = ['A', 'B', 'C'];
    letters.forEach((L, i) => {
      const b = box(0.16, 0.16, 0.16, mat(bcols[i + 1], { rough: 0.5 })); b.position.set(-0.6 + i * 0.18, 0.705, 0.02); b.rotation.y = i * 0.2; shelf.add(b);
      const f = TX.label(L, { w: 0.13, size: 120, weight: 900, depthWrite: true }); f.position.set(-0.6 + i * 0.18 + Math.sin(i * 0.2) * 0.08, 0.705, 0.02 + Math.cos(i * 0.2) * 0.081); f.rotation.y = i * 0.2; shelf.add(f);
    });
    // teddy
    const teddy = new THREE.Group(); teddy.position.set(0.35, 0.625, 0.03); shelf.add(teddy);
    const fur = mat('#a8713f', { rough: 0.95 }), light = mat('#e3b98a', { rough: 0.95 }), eye = mat('#111', { rough: 0.2 });
    const tb = sph(0.16, fur); tb.scale.set(1, 1.15, 0.9); tb.position.y = 0.17; teddy.add(tb);
    const belly = sph(0.1, light); belly.scale.set(1, 1.2, 0.5); belly.position.set(0, 0.16, 0.11); teddy.add(belly);
    const th = sph(0.12, fur); th.position.y = 0.42; teddy.add(th);
    for (const x of [-0.08, 0.08]) {
      const ear = sph(0.045, fur); ear.position.set(x, 0.53, 0); teddy.add(ear);
      const e = sph(0.016, eye, 12); e.position.set(x * 0.5, 0.45, 0.105); teddy.add(e);
      const arm = sph(0.06, fur); arm.scale.set(1, 1.6, 1); arm.position.set(x * 2, 0.2, 0.03); teddy.add(arm);
      const leg = sph(0.07, fur); leg.position.set(x * 1.2, 0.04, 0.08); teddy.add(leg);
    }
    const snout = sph(0.05, light); snout.position.set(0, 0.4, 0.1); teddy.add(snout);
    const nose = sph(0.018, eye, 12); nose.position.set(0, 0.415, 0.145); teddy.add(nose);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.015, 8, 16), mat('#ff3b5c')); bow.position.set(0, 0.32, 0.1); teddy.add(bow);
    const starP = pickup('star', new THREE.Vector3(0.35, 0.78, -0.06), shelf);
    starP.m.rotation.y = 0;
    api.addIA(teddy, {
      label: 'Teddy bear', hoverScale: 1.08,
      onActivate: () => {
        if (state.star === 'hidden') {
          state.star = 'revealed';
          api.sfx.mech();
          api.anim(0.7, (k) => { teddy.position.x = 0.35 + 0.33 * k; teddy.rotation.z = Math.sin(k * Math.PI * 3) * 0.15; api.shadowsDirty(); });
          api.msg('Teddy scooted over… there was a RED STAR behind him! Look at it to take it.', '#7dffb0');
        } else {
          api.anim(0.5, (k) => { teddy.rotation.z = Math.sin(k * Math.PI * 4) * 0.2 * (1 - k); });
          api.msg('Teddy waves hello!', '#ffffff', 3);
        }
      },
    });
    // Duck #1 on top shelf
    const duck = (scale = 1) => {
      const g = new THREE.Group();
      const y = mat('#ffd23f', { rough: 0.3 }), o = mat('#ff8a1f', { rough: 0.4 });
      const body = sph(0.09, y); body.scale.set(1.25, 0.85, 1); body.position.y = 0.075; g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.07, 12), y); tail.rotation.z = Math.PI / 2.8; tail.position.set(-0.11, 0.1, 0); g.add(tail);
      const head = sph(0.058, y); head.position.set(0.06, 0.17, 0); g.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 12), o); beak.rotation.z = -Math.PI / 2; beak.position.set(0.12, 0.165, 0); g.add(beak);
      for (const z of [-0.028, 0.028]) { const e = sph(0.011, eye, 10); e.position.set(0.098, 0.19, z); g.add(e); }
      g.scale.setScalar(scale);
      return g;
    };
    const d1 = duck(1); d1.position.set(-0.55, 1.175, 0); d1.rotation.y = -0.6; shelf.add(d1);
    // rocket (fun) on shelf
    const rocket = new THREE.Group(); rocket.position.set(-0.4, 0.075, 0.02); shelf.add(rocket);
    const rb = cyl(0.06, 0.06, 0.3, mat('#ffffff', { rough: 0.3, metal: 0.2 })); rb.position.y = 0.15; rocket.add(rb);
    const rn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 20), mat('#ff3b5c')); rn.position.y = 0.365; rocket.add(rn);
    for (let i = 0; i < 3; i++) { const fin = box(0.01, 0.09, 0.07, mat('#3e7bff')); const a = i * Math.PI * 2 / 3; fin.position.set(Math.sin(a) * 0.065, 0.04, Math.cos(a) * 0.065); fin.rotation.y = a; rocket.add(fin); }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 16), glowMat('#ffb13f', 0.9)); flame.rotation.x = Math.PI; flame.position.y = -0.06; flame.visible = false; rocket.add(flame);
    let rocketBusy = false;
    api.addIA(rocket, {
      label: 'Toy rocket', hoverScale: 1.1,
      onActivate: () => {
        if (rocketBusy) return; rocketBusy = true; flame.visible = true; api.sfx.whoosh();
        api.anim(1.6, (k) => { rocket.position.y = 0.075 + Math.sin(k * Math.PI) * 0.7; rocket.rotation.y = k * 12; }).then(() => { flame.visible = false; rocketBusy = false; });
        api.msg('3… 2… 1… BLAST OFF! 🚀', '#ffffff', 3);
      },
    });

    // Drum (west) hiding the moon
    const drum = new THREE.Group(); drum.position.set(-2.5, 0, -1.3); G.add(drum);
    const shellM = cyl(0.36, 0.36, 0.42, mat('#ff3b5c', { rough: 0.35 }), 40); shellM.position.y = 0.21; drum.add(shellM);
    for (const y of [0.02, 0.4]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.025, 10, 40), mat('#ffd23f', { rough: 0.2, metal: 0.9 })); rim.rotation.x = Math.PI / 2; rim.position.y = y; drum.add(rim); }
    const head = cyl(0.35, 0.35, 0.01, mat('#fff8ec', { rough: 0.8 }), 40); head.position.y = 0.425; drum.add(head);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const z = box(0.012, 0.38, 0.012, mat('#ffffff')); z.position.set(Math.sin(a) * 0.362, 0.21, Math.cos(a) * 0.362); z.rotation.z = 0.5 * (i % 2 ? 1 : -1); z.rotation.y = a; drum.add(z); }
    for (const s of [-1, 1]) { const st = cyl(0.012, 0.012, 0.36, mat('#e0a96d')); st.position.set(s * 0.18, 0.47, 0.3); st.rotation.z = s * 1.2; drum.add(st); }
    const moonP = pickup('moon', new THREE.Vector3(-2.5, 0.25, -1.3));
    moonP.m.visible = false;
    let drumHits = 0;
    api.addIA(drum, {
      label: 'Drum', hoverScale: 1.06, repeat: true,
      onActivate: () => {
        drumHits++;
        api.sfx.mech();
        api.anim(0.3, (k) => { drum.scale.set(1 + Math.sin(k * Math.PI) * 0.06, 1 - Math.sin(k * Math.PI) * 0.06, 1 + Math.sin(k * Math.PI) * 0.06); });
        if (state.moon === 'hidden') {
          if (drumHits < 2) { api.msg('BOOM! Something rattled inside… bang it again!', '#ffd54a'); return; }
          state.moon = 'revealed'; moonP.m.visible = true;
          api.anim(0.8, (k) => { moonP.m.position.y = 0.25 + k * 0.55; });
          api.msg('A BLUE MOON popped out of the drum! Look at it to take it.', '#7dffb0');
        } else api.msg('BOOM BOOM! 🥁', '#ffffff', 2);
      },
    });

    // Train + track (floor, front-right) hiding the triangle
    const tc = new THREE.Vector3(1.55, 0, -1.6), tr = 0.75;
    const track = new THREE.Mesh(new THREE.TorusGeometry(tr, 0.03, 8, 80), mat('#7a7f8c', { rough: 0.3, metal: 0.8 }));
    track.rotation.x = Math.PI / 2; track.position.set(tc.x, 0.03, tc.z); G.add(track);
    const track2 = new THREE.Mesh(new THREE.TorusGeometry(tr - 0.12, 0.03, 8, 80), track.material); track2.rotation.x = Math.PI / 2; track2.position.copy(track.position); G.add(track2);
    const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.02, 0.22), mat('#8a5a34'), 28);
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      fm4.compose(fp.set(tc.x + Math.cos(a) * (tr - 0.06), 0.01, tc.z + Math.sin(a) * (tr - 0.06)), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a), one);
      ties.setMatrixAt(i, fm4);
    }
    ties.receiveShadow = true; G.add(ties);
    const train = new THREE.Group(); G.add(train);
    const eng = new THREE.Group(); train.add(eng);
    const eb = box(0.34, 0.16, 0.18, mat('#2fbf71', { rough: 0.35 })); eb.position.y = 0.12; eng.add(eb);
    const cab = box(0.14, 0.14, 0.19, mat('#ff3b5c', { rough: 0.35 })); cab.position.set(-0.1, 0.27, 0); eng.add(cab);
    const stack = cyl(0.03, 0.04, 0.12, mat('#222', { metal: 0.6 })); stack.position.set(0.1, 0.26, 0); eng.add(stack);
    for (const x of [-0.11, 0.1]) for (const z of [-0.1, 0.1]) { const wh = cyl(0.05, 0.05, 0.03, mat('#ffd23f', { metal: 0.6, rough: 0.3 }), 20); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.05, z); eng.add(wh); }
    const car = new THREE.Group(); train.add(car);
    const cb = box(0.26, 0.1, 0.17, mat('#3e7bff', { rough: 0.35 })); cb.position.y = 0.1; car.add(cb);
    const d2 = duck(0.9); d2.position.set(0, 0.15, 0); d2.rotation.y = Math.PI / 2; car.add(d2);
    let trainA = Math.PI * 0.62;
    const triP = pickup('tri', new THREE.Vector3(tc.x + Math.cos(trainA) * (tr - 0.06), 0.09, tc.z + Math.sin(trainA) * (tr - 0.06)));
    triP.m.visible = false;
    function placeTrain() {
      const r = tr - 0.06;
      eng.position.set(tc.x + Math.cos(trainA) * r, 0, tc.z + Math.sin(trainA) * r);
      eng.rotation.y = -trainA - Math.PI / 2 + Math.PI;
      const b = trainA + 0.42;
      car.position.set(tc.x + Math.cos(b) * r, 0, tc.z + Math.sin(b) * r);
      car.rotation.y = -b - Math.PI / 2 + Math.PI;
    }
    placeTrain();
    let trainBusy = false;
    api.addIA(train, {
      label: 'Toy train', hoverScale: 1.06,
      onActivate: () => {
        if (trainBusy) return; trainBusy = true;
        api.sfx.whoosh();
        api.msg('Choo choo! 🚂', '#ffffff', 3);
        const from = trainA;
        api.anim(2.4, (k) => { trainA = from - k * Math.PI * 2.5; placeTrain(); api.shadowsDirty(); }).then(() => {
          trainBusy = false;
          if (state.tri === 'hidden') {
            state.tri = 'revealed'; triP.m.visible = true;
            api.msg('The train drove away and left a YELLOW TRIANGLE on the track! Look at it to take it.', '#7dffb0');
          }
        });
      },
    });

    // Table (south-west) with crayons; duck under it
    const table = new THREE.Group(); table.position.set(-2.2, 0, 1.5); G.add(table);
    const tw = mat('#ffffff', { map: TX.wood('#ffd2a1', 'tbl') });
    const tt = box(1.2, 0.05, 0.8, tw); tt.position.y = 0.55; table.add(tt);
    for (const x of [-0.55, 0.55]) for (const z of [-0.35, 0.35]) { const l = cyl(0.03, 0.03, 0.55, mat('#ff7ab8')); l.position.set(x, 0.275, z); table.add(l); }
    const paper = box(0.42, 0.005, 0.3, mat('#ffffff', { rough: 0.95 })); paper.position.set(0.1, 0.58, 0); paper.rotation.y = 0.2; table.add(paper);
    const drawing = TX.label('☺ ☀', { w: 0.3, size: 110, color: '#3e7bff', depthWrite: true }); drawing.rotation.x = -Math.PI / 2; drawing.rotation.z = -0.2; drawing.position.set(0.1, 0.585, 0); table.add(drawing);
    bcols.forEach((c, i) => { const cr = cyl(0.008, 0.008, 0.12, mat(c), 10); cr.rotation.z = Math.PI / 2; cr.rotation.y = 0.3 * i; cr.position.set(-0.35 + i * 0.03, 0.585, -0.2 + i * 0.05); table.add(cr); });
    const d3 = duck(1); d3.position.set(0.15, 0, -0.05); d3.rotation.y = 2.4; table.add(d3);

    // Window (east wall, south) with duck on sill
    const win = new THREE.Group(); win.position.set(W / 2 - 0.02, 1.55, 2.0); win.rotation.y = -Math.PI / 2; G.add(win);
    const skyC = document.createElement('canvas'); skyC.width = 256; skyC.height = 256;
    const sg = skyC.getContext('2d'); const gr = sg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#58b7ff'); gr.addColorStop(1, '#d9f1ff'); sg.fillStyle = gr; sg.fillRect(0, 0, 256, 256);
    sg.fillStyle = 'rgba(255,255,255,0.95)'; for (const [x, y, r] of [[60, 80, 26], [90, 74, 32], [120, 84, 24], [180, 150, 22], [205, 144, 28]]) { sg.beginPath(); sg.arc(x, y, r, 0, Math.PI * 2); sg.fill(); }
    sg.fillStyle = '#6fd46f'; sg.beginPath(); sg.ellipse(128, 270, 200, 70, 0, 0, Math.PI * 2); sg.fill();
    const skyT = new THREE.CanvasTexture(skyC); skyT.colorSpace = THREE.SRGBColorSpace;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), new THREE.MeshBasicMaterial({ map: skyT, toneMapped: false }));
    win.add(glass);
    const fm = mat('#ffffff', { rough: 0.4 });
    for (const [w, h, x, y] of [[1.22, 0.06, 0, 0.48], [1.22, 0.06, 0, -0.48], [0.06, 1.0, 0.58, 0], [0.06, 1.0, -0.58, 0], [1.1, 0.03, 0, 0], [0.03, 0.9, 0, 0]]) { const b = box(w, h, 0.05, fm); b.position.set(x, y, 0.02); win.add(b); }
    const sill = box(1.3, 0.04, 0.2, fm); sill.position.set(0, -0.52, 0.09); win.add(sill);
    const d4 = duck(0.9); d4.position.set(0.3, -0.5, 0.09); d4.rotation.y = 0.8; win.add(d4);
    const sunL = new THREE.PointLight('#bfe4ff', 3, 4, 2); sunL.position.set(W / 2 - 0.6, 1.6, 2.0); G.add(sunL);

    // Bouncy ball (fun)
    const ball = new THREE.Group(); ball.position.set(0.9, 0, 1.2); G.add(ball);
    const bm = sph(0.14, mat('#ffffff', { map: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); ['#ff3b5c', '#ffd23f', '#3e7bff', '#2fbf71'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 64, 0, 64, 128); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), rough: 0.3 }), 32);
    bm.position.y = 0.14; ball.add(bm);
    let ballBusy = false;
    api.addIA(ball, {
      label: 'Bouncy ball', hoverScale: 1.1,
      onActivate: () => {
        if (ballBusy) return; ballBusy = true; api.sfx.place();
        api.anim(1.5, (k) => { bm.position.y = 0.14 + Math.abs(Math.sin(k * Math.PI * 3)) * 0.8 * (1 - k); bm.rotation.x += 0.2; api.shadowsDirty(); }, (k) => k).then(() => { ballBusy = false; });
      },
    });

    // Toy blocks tower near door (decor)
    for (let i = 0; i < 5; i++) { const b = box(0.2, 0.2, 0.2, mat(bcols[i], { rough: 0.5 })); b.position.set(-1.5, 0.1 + i * 0.2, -2.9); b.rotation.y = i * 0.35; G.add(b); }

    api.dust(160, [6, 2.6, 6], '#fff2cc', [0, 1.4, 0]);

    api.lightSwitch(new THREE.Vector3(1.55, 1.25, -D / 2 + 0.02));
    api.secret(['★ SECRET ★', 'Glow paint soaks up light,', 'then lets it out slowly.'], 2.2).position.set(0, 2.85, -D / 2 + 0.03);
    for (const [x, z, r] of [[-2.5, -1.3, 0.55], [-2.2, 1.5, 0.8], [-1.5, -2.9, 0.3], [0.9, 1.2, 0.25], [3.05, -0.4, 0.9]]) api.blob(x, z, r);
    for (const x of [-1.8, 1.8]) api.halo(new THREE.Vector3(x, H - 0.76, -0.4), '#fff1c4', 0.7);
    const kp1 = api.poster('kanizsa', 0.8); kp1.position.set(-W / 2 + 0.03, 1.7, 0.2); kp1.rotation.y = Math.PI / 2; G.add(kp1);
    api.addSeat(new THREE.Vector3(0, 0, 1.3), 0, { label: 'Middle of the room' });
    api.addSeat(new THREE.Vector3(1.9, 0, -0.4), -Math.PI / 2, { label: 'Toy shelf' });
    api.addSeat(new THREE.Vector3(-1.6, 0, -0.2), Math.PI / 2 * 1.15, { label: 'Drum & table' });
    api.addSeat(new THREE.Vector3(0.2, 0, -1.55), 0, { label: 'Toy Door' });

    return {
      hint() {
        if (state.open) return 'You did it!';
        if (state.asked) return 'Count every yellow rubber duck! Check the toy shelf, the train, the window, and under the table.';
        const loose = ['star', 'moon', 'tri'].filter((k) => api.inv.has(k));
        if (loose.length) return 'Take your shapes to the big Toy Door and look at the matching hole for each one.';
        if (state.star === 'hidden') return 'The teddy bear on the toy shelf looks like he is hiding something. Give him a poke!';
        if (state.moon === 'hidden') return 'Bang the red drum… then bang it again! Something might pop out.';
        if (state.tri === 'hidden') return 'Make the toy train go! Watch where it was parked.';
        return 'Look for a shape that is glowing and spinning — look at it to pick it up.';
      },
      answer() {
        if (state.asked) return 'There are 4 ducks: on the toy shelf, riding the train, on the window sill, and under the table. Look at block number 4.';
        if (state.star === 'hidden') return 'Look at the teddy bear on the toy shelf. The red star is behind him.';
        if (state.moon === 'hidden') return 'Look at the red drum two times. The blue moon pops out.';
        if (state.tri === 'hidden') return 'Look at the toy train. When it drives off, the yellow triangle is on the track.';
        return 'Pick up any glowing shape, then look at its matching hole on the Toy Door.';
      },
      idle: () => state.asked ? 'Count the rubber ducks, then look at the right number block.' : 'Find the red star, blue moon and yellow triangle.',
    };
  },
};
