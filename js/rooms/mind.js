// MEDIUM — The Mind Bender (eight-sided illusion gallery: your eyes lie, measuring tells the truth)
const OPTS = ['The first one', 'The second one', 'Exactly the same'];

export const mind = {
  id: 'mind', title: 'The Mind Bender', tier: 'MEDIUM', ages: 'Ages 8+ · illusions', color: '#b48cff', par: 420, tableScale: 9,
  learn: ['Your brain judges size and shade by what is next to a thing', 'Stare at one color and you briefly see its opposite afterward', 'Anamorphic art only lines up from one exact spot'],
  intro: 'Welcome to the gallery where nothing is what it seems. Answer each exhibit with the TRUTH, not what your eyes tell you, to earn the exit code.',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl } = api;
    const G = api.group, ILL = api.ill;
    api.setScene({ bg: new THREE.Color('#0a0714') });
    const R = 3.9, H = 3.5, WW = 2 * R * Math.tan(Math.PI / 8) + 0.12;
    const S = { solved: {}, n: 0, open: false, timer: 0 };
    const find = (k) => (ILL ? ILL.ILLUSIONS.find((i) => i.id.includes(k)) : null);
    const draw = (meta, g, w, h, o) => {
      g.fillStyle = '#f1ecdf'; g.fillRect(0, 0, w, h);
      if (!meta) { g.fillStyle = '#333'; g.font = '700 48px system-ui'; g.textAlign = 'center'; g.fillText('Illusion loading…', w / 2, h / 2); return; }
      try { ILL.drawIllusion(meta.id, g, w, h, o); } catch (e) { console.warn(e); }
    };

    // ---------- eight-sided shell ----------
    const floorM = mat('#a9a3bd', { map: TX.rep(TX.tiles('#cfc3e6', '#bfb2da', 8, 'mind'), 3, 3), rough: 0.8, metal: 0 });
    const nm = TX.normalFrom(floorM.map); if (nm) { floorM.normalMap = nm; floorM.normalScale = new THREE.Vector2(0.6, 0.6); }
    const fl = new THREE.Mesh(new THREE.CircleGeometry(R / Math.cos(Math.PI / 8) + 0.1, 8), floorM); fl.rotation.x = -Math.PI / 2; fl.rotation.z = Math.PI / 8; fl.receiveShadow = true; G.add(fl);
    const cl = new THREE.Mesh(new THREE.CircleGeometry(R / Math.cos(Math.PI / 8) + 0.1, 8), mat('#17102a', { rough: 0.9 })); cl.rotation.x = Math.PI / 2; cl.rotation.z = Math.PI / 8; cl.position.y = H; cl.userData.cut = 'ceil'; G.add(cl);
    const wallCols = ['#2b1f55', '#3a2468', '#2b1f55', '#3a2468', '#2b1f55', '#3a2468', '#2b1f55', '#3a2468'];
    const walls = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, g = new THREE.Group();
      g.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R); g.rotation.y = -a; // local +Z faces the room center
      const w = box(WW, H, 0.12, mat(wallCols[i], { rough: 0.85 }), { cast: false }); w.position.set(0, H / 2, -0.06); g.add(w);
      const trim = box(WW, 0.08, 0.04, glowMat(i % 2 ? '#b48cff' : '#5ef2ff', 0.9, false), { cast: false }); trim.position.set(0, 0.05, 0.02); g.add(trim);
      g.userData.cut = 'wall'; g.userData.n = [Math.sin(a), -Math.cos(a)];
      G.add(g); walls.push(g);
    }
    G.add(new THREE.HemisphereLight('#e6dcff', '#1a1030', 0.9));
    const spot = new THREE.SpotLight('#fff4ff', 34, 10, 1.05, 0.7, 1.4);
    spot.position.set(0, H - 0.05, 0); spot.target.position.set(0, 0, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0008;
    G.add(spot, spot.target);
    const pl = new THREE.PointLight('#b48cff', 5, 8, 1.8); pl.position.set(0, 2.4, 0); G.add(pl);
    api.halo(new THREE.Vector3(0, H - 0.15, 0), '#f4e8ff', 1.4, 0.5);

    // ---------- exhibits ----------
    const exhibits = [];
    function exhibit(wi, key, letter, digit, question, correct, opts = {}) {
      const meta = find(key), wall = walls[wi];
      const pic = api.screen(1024, 768, 1.6, (g, w, h, reveal = false) => draw(meta, g, w, h, Object.assign({ reveal }, opts.draw || {})), { transparent: false, depthWrite: true });
      pic.position.set(0, 1.95, 0.03); wall.add(pic);
      const fr = box(1.72, 1.32, 0.05, mat('#c9a24a', { metal: 0.9, rough: 0.25 })); fr.position.set(0, 1.95, 0.0); wall.add(fr);
      const head = TX.label([`EXHIBIT ${letter}`, question], { w: 2.3, size: 50, weight: 800, colors: ['#ffd54a'], color: '#ffffff', bg: 'rgba(10,7,20,0.9)', border: '#b48cff', radius: 16, depthWrite: true });
      head.position.set(0, 2.95, 0.04); wall.add(head);
      const plate = TX.label(`CODE DIGIT ${letter}:  ${digit}`, { w: 1.1, size: 70, weight: 900, color: '#0a0714', bg: '#7dffb0', radius: 14, depthWrite: true });
      plate.position.set(0, 1.07, 0.05); plate.visible = false; wall.add(plate);
      const e = { key, letter, digit, meta, pic };
      (opts.options || OPTS).forEach((t, k) => {
        const b = TX.label(t, { w: 0.74, width: 560, height: 130, size: 54, weight: 800, color: '#fff', bg: '#2a2050', border: '#b48cff', borderWidth: 5, radius: 16, depthWrite: true });
        b.position.set((k - 1) * 0.78, 0.82, 0.05); wall.add(b);
        api.addIA(b, {
          label: t, hoverScale: 1.07, repeat: true, dwell: 0.9, enabled: () => !S.solved[letter],
          onActivate: () => {
            if (k !== correct) { api.sfx.wrong(); return api.msg(opts.wrong || 'That is what your eyes say. But eyes can be fooled. Trust a ruler, not a glance!', '#ffd54a'); }
            S.solved[letter] = true; S.n++; api.sfx.solve(); plate.visible = true; pic.redraw(true);
            api.msg(`Correct! Code digit ${letter} is ${digit}. ${S.n}/4 exhibits solved.`, '#7dffb0', 10);
            if (meta) api.bolt(`${meta.answer}. ${meta.science}`.slice(0, 300), 'thinking');
          },
        });
      });
      exhibits.push(e); return e;
    }
    exhibit(6, 'muller', 'A', 4, 'Which line is longer?', 2);
    exhibit(7, 'ebbing', 'B', 1, 'Which center circle is bigger?', 2);
    exhibit(0, 'contrast', 'C', 9, 'Which marked square is darker?', 2);
    const ex4 = exhibit(1, 'after', 'D', 6, 'Stare at the dot for 20 seconds, then look at the white panel. What color ghost do you see?', 1, {
      options: ['Green', 'Pink', 'Blue'], draw: { color: 'green' }, wrong: 'Not quite. Stare at the center dot without moving your eyes for a full 20 seconds, then look at the white panel.',
    });
    const white = box(1.3, 1.0, 0.03, new THREE.MeshBasicMaterial({ color: '#f6f4ee', toneMapped: false }), { cast: false });
    white.position.set(0, 1.95, 0.02); walls[2].add(white);
    const wl = TX.label(['WHITE PANEL', 'Look here after you stare at Exhibit D'], { w: 1.5, size: 46, weight: 700, colors: ['#ffd54a'], color: '#fff', bg: 'rgba(10,7,20,0.9)', radius: 14, depthWrite: true }); wl.position.set(0, 2.72, 0.04); walls[2].add(wl);
    api.addIA(ex4.pic, { label: 'Start a 20 second stare', hoverScale: 1.0, dwell: 1.2, enabled: () => !S.solved.D && S.timer <= 0, onActivate: () => { S.timer = 20; api.bolt('Keep your eyes on the little dot. Do not look away. I will count twenty seconds for you!', 'calm'); } });
    api.onUpdate((dt) => { if (S.timer > 0) { S.timer -= dt; if (S.timer <= 0) api.bolt('Time! Now look at the white panel on your right. What color is the ghost?', 'excited'); } });

    // ---------- anamorphic sculpture: looks like junk until you sit in the one right spot ----------
    const EYE = new THREE.Vector3(1.7, 1.2, 1.9), AIM = new THREE.Vector3(-0.5, 2.75, -1.0);
    const dir = AIM.clone().sub(EYE).normalize(), rt = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(rt, dir).normalize();
    const cells = [[0, 5], [1, 5], [2, 5], [3, 5], [3, 4], [2.6, 3], [2.2, 2], [1.8, 1], [1.4, 0]], D0 = 3.0, s = 0.17;
    const tcol = ['#ff4d6d', '#ff9a3d', '#ffe14d', '#57e389', '#3ec1ff', '#8a7dff', '#ff7ab8', '#5ef2ff', '#b6ff6a'];
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    cells.forEach(([cx, cy], i) => {
      const c = EYE.clone().addScaledVector(dir, D0).addScaledVector(rt, (cx - 1.5) * s).addScaledVector(up, (cy - 2.5) * s);
      const f = 0.5 + ((i * 0.37) % 1) * 0.75; // push each tile nearer or farther along its sight line
      const m = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ color: tcol[i], side: THREE.DoubleSide, toneMapped: false }));
      m.position.copy(EYE).addScaledVector(c.clone().sub(EYE), f); m.scale.setScalar(s * 1.1 * f); m.lookAt(EYE);
      G.add(m);
      const wire = cyl(0.003, 0.003, H - m.position.y, mat('#888'), 4, { cast: false }); wire.position.set(m.position.x, (H + m.position.y) / 2, m.position.z); G.add(wire);
    });
    const anaSign = TX.label(['EXHIBIT E · THE SCATTERED NUMBER', 'These floating tiles look like a mess.', 'Glide to the EYE spot on the floor.', 'The number you see there is the LAST code digit.'], { w: 2.3, size: 50, weight: 700, colors: ['#ffd54a'], color: '#fff', bg: 'rgba(10,7,20,0.9)', border: '#5ef2ff', radius: 16, depthWrite: true });
    anaSign.position.set(0, 2.1, 0.04); walls[5].add(anaSign);

    // ---------- decor: more illusions to enjoy ----------
    const p1 = api.poster('kanizsa', 1.1); p1.position.set(-0.75, 1.9, 0.04); walls[3].add(p1);
    const p2 = api.poster('impossible', 1.1); p2.position.set(0.75, 1.9, 0.04); walls[3].add(p2);
    const anim = ILL ? ILL.ILLUSIONS.find((i) => i.kind === 'animated') : null;
    if (anim) {
      const scr = api.screen(512, 384, 1.2, (g, w, h, t = 0) => draw(anim, g, w, h, { t }), { transparent: false, depthWrite: true });
      scr.position.set(0, 1.25, 0.04); walls[5].add(scr);
      let fr = 0; api.onUpdate((dt, t) => { if (++fr % 5 === 0) scr.redraw(t); });
      api.addIA(scr, { label: anim.name, hoverScale: 1.03, onActivate: () => api.bolt(`${anim.question} ${anim.answer}. ${anim.science}`.slice(0, 300), 'thinking') });
    }
    const sw = api.lightSwitch(new THREE.Vector3(-1.25, 1.25, 0.03)); walls[3].add(sw);
    const sec = api.secret(['★ SECRET ★', 'In the dark your eyes use rod cells,', 'and rods cannot see color.'], 2.4); sec.position.set(0, 3.05, 0.06); walls[3].add(sec);

    // ---------- exit ----------
    const door = walls[4];
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), api.portalMat('#b48cff', '#5ef2ff')); portal.position.set(-0.45, 1.1, 0.03); door.add(portal);
    const slab = box(1.24, 2.24, 0.07, mat('#3a2468', { metal: 0.5, rough: 0.35 })); slab.position.set(-0.45, 1.12, 0.07); door.add(slab);
    const es = TX.label('EXIT · code = A B C D E', { w: 1.5, size: 60, weight: 900, color: '#7dffb0' }); es.position.set(-0.3, 2.55, 0.06); door.add(es);
    const kp = api.keypad({ code: '41967', size: 1.5, color: '#b48cff', title: 'A B C D E', bodyColor: '#241a44', onSolve: () => {
      S.open = true; api.msg('The gallery door slides open. Your mind is officially bent!', '#7dffb0');
      api.anim(1.2, (k) => { slab.position.y = 1.12 + k * 2.4; api.shadowsDirty(); }).then(() => setTimeout(() => api.escape(), 600));
    }, onWrong: () => api.msg('Not the code. Solve exhibits A to D for four digits, then read the scattered number from the EYE spot for the fifth.', '#ff9d9d') });
    kp.position.set(0.85, 1.35, 0.06); door.add(kp);

    api.blob(0, 0, 1.2, 0.25);
    api.dust(120, [6, 3, 6], '#e6d4ff', [0, 1.7, 0]);
    api.addSeat(new THREE.Vector3(0, 0, 0.4), 0, { label: 'Center' });
    api.addSeat(new THREE.Vector3(EYE.x, 0, EYE.z), Math.atan2(-dir.x, -dir.z), { label: 'EYE spot', color: '#ffd54a' });
    api.addSeat(new THREE.Vector3(-0.6, 0, -0.6), Math.PI / 4, { label: 'Exhibits A and B' });
    api.addSeat(new THREE.Vector3(0.6, 0, -0.6), -Math.PI / 4, { label: 'Exhibits C and D' });
    api.addSeat(new THREE.Vector3(0, 0, 1.3), Math.PI, { label: 'Exit door' });

    return {
      hint() {
        const left = ['A', 'B', 'C', 'D'].filter((l) => !S.solved[l]);
        if (left.length) return left[0] === 'D' ? 'Exhibit D: look at the picture to start a 20 second timer, stare at the dot, then look at the white panel. The ghost is the OPPOSITE color of the shape.' : `Exhibit ${left[0]}: illusions make equal things look different. What would a ruler or a color checker say?`;
        return 'Four digits found. Now glide to the yellow EYE spot and look at the floating tiles. In Table mode, ask me for the answer instead.';
      },
      answer() {
        const left = ['A', 'B', 'C', 'D'].filter((l) => !S.solved[l]);
        if (left.length) return left[0] === 'D' ? 'Exhibit D: the ghost is pink. A green shape leaves a pinkish afterimage.' : `Exhibit ${left[0]}: choose "Exactly the same".`;
        return 'The scattered number is 7. The full exit code is 4 1 9 6 7.';
      },
      idle: () => `${S.n}/4 exhibits solved. Trust the measurement, not your eyes.`,
    };
  },
};
