// HARD — Clockwork Library (adults)
import { shell } from './common.js?v=3';

export const adults = {
  id: 'adults', title: 'Clockwork Library', tier: 'HARD', ages: 'Ages 13+ · logic chain', color: '#ff8a3d', par: 600, tableScale: 9,
  learn: ['24-hour time: subtract 12 after noon, so 18:45 is 6:45 pm', 'A magnifying glass is a convex lens: it bends light to make things look bigger'],
  intro: 'Locked in after closing time. The founder left his library full of secrets — find the way out.',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    api.setScene({ bg: new THREE.Color('#0d0806') });
    const W = 8, D = 7, H = 3.6;
    const S = { hour: 12, min: 0, clock: false, brass: 'hidden', drawer: false, lens: 'hidden', painting: false, safe: false, exitkey: 'hidden', open: false };
    const tmp = new THREE.Vector3();
    const darkWood = TX.wood('#4a2c18', 'lib');
    shell(api, {
      w: W, d: D, h: H,
      floor: mat('#ffffff', { map: TX.rep(TX.wood('#5c3a22', 'libfloor'), 4, 3.5), rough: 0.45 }),
      wall: mat('#ffffff', { map: TX.rep(TX.wallpaper('#3b1f22', '#4a282a', 'damask', 'lib'), 3, 1.6), rough: 0.85 }),
      ceil: mat('#ffffff', { map: TX.rep(TX.panel('#3a2416', '#24160c', 'libceil'), 4, 3), rough: 0.7 }),
      trim: '#3a2212', trimH: 0.9,
    });
    // wainscot rail
    for (const [w, d, x, z] of [[W, 0.05, 0, -D / 2 + 0.04], [W, 0.05, 0, D / 2 - 0.04], [0.05, D, W / 2 - 0.04, 0], [0.05, D, -W / 2 + 0.04, 0]]) {
      const r = box(w, 0.06, d, mat('#c9a24a', { metal: 0.85, rough: 0.3 })); r.position.set(x, 0.92, z); r.castShadow = false; G.add(r);
    }
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), mat('#ffffff', { map: TX.carpet('#5a1620', '#c9a24a', 'librug'), rough: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, 0.2); rug.receiveShadow = true; G.add(rug);

    // ---------- Lights ----------
    G.add(new THREE.HemisphereLight('#ffd9b0', '#1c0f0a', 0.28));
    const chand = new THREE.Group(); chand.position.set(0, H - 0.9, 0.2); G.add(chand);
    const gold = mat('#c9a24a', { metal: 0.92, rough: 0.22 });
    const cring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 8, 48), gold); cring.rotation.x = Math.PI / 2; chand.add(cring);
    const chain = cyl(0.01, 0.01, 0.9, gold); chain.position.y = 0.45; chand.add(chain);
    const flames = [];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const cnd = cyl(0.018, 0.018, 0.12, mat('#f5ecd8', { rough: 0.8 }), 10); cnd.position.set(Math.sin(a) * 0.45, 0.07, Math.cos(a) * 0.45); chand.add(cnd);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 8), glowMat('#ffcf6a', 1)); fl.position.set(Math.sin(a) * 0.45, 0.155, Math.cos(a) * 0.45); chand.add(fl); flames.push(fl);
    }
    const chandL = new THREE.PointLight('#ffc47a', 9, 9, 1.8); chandL.position.y = 0.1; chand.add(chandL);
    const keyL = new THREE.SpotLight('#ffd8a8', 16, 10, 0.95, 0.75, 1.5);
    keyL.position.set(0.5, H - 0.1, 1.2); keyL.target.position.set(-0.6, 0, -1.2); keyL.castShadow = true; keyL.shadow.mapSize.set(1024, 1024); keyL.shadow.bias = -0.0008;
    G.add(keyL, keyL.target);

    // ---------- Fireplace (north) ----------
    const fp = new THREE.Group(); fp.position.set(-0.6, 0, -D / 2 + 0.3); G.add(fp);
    const stone = mat('#ffffff', { map: TX.rep(TX.brick('#6d5a4a', 'fp'), 1, 1), rough: 0.9 });
    const fpBody = box(2.0, 1.25, 0.6, stone); fpBody.position.y = 0.625; fp.add(fpBody);
    const hole = box(1.0, 0.8, 0.5, mat('#120a06', { rough: 1 })); hole.position.set(0, 0.42, 0.08); fp.add(hole);
    const mantel = box(2.3, 0.1, 0.72, mat('#ffffff', { map: darkWood, rough: 0.35 })); mantel.position.y = 1.3; fp.add(mantel);
    const logs = [];
    for (let i = 0; i < 3; i++) { const l = cyl(0.05, 0.05, 0.6, mat('#3a2414', { rough: 1 }), 10); l.rotation.z = Math.PI / 2; l.rotation.y = (i - 1) * 0.35; l.position.set(0, 0.08 + (i === 1 ? 0.07 : 0), 0.12); fp.add(l); logs.push(l); }
    const fireFl = [];
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.07 + Math.random() * 0.05, 0.3 + Math.random() * 0.2, 10), glowMat(i % 2 ? '#ff7a1a' : '#ffc040', 0.75));
      f.position.set((i - 3) * 0.08, 0.3, 0.12 + (i % 2) * 0.05); fp.add(f); fireFl.push(f);
    }
    const fireL = new THREE.PointLight('#ff8a3d', 6, 6, 1.8); fireL.position.set(0, 0.5, 0.6); fp.add(fireL);
    api.onUpdate((dt, t) => {
      fireFl.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * (3 + i * 0.4) + i) * 0.2 + Math.sin(t * 5.5 + i * 3) * 0.08; f.position.y = 0.26 + f.scale.y * 0.08; });
      fireL.intensity = 5.5 + Math.sin(t * 4.3) * 0.22 + Math.sin(t * 2.1) * 0.18;
      flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 5 + i) * 0.12; });
      chandL.intensity = 8.6 + Math.sin(t * 3) * 0.15;
    });
    const plaque = TX.label(['THE FOUNDER\'S LIBRARY', 'First opened its doors at 18:45', 'on the 3rd of October, 1845'], { w: 0.9, size: 52, weight: 700, colors: ['#1a1206', '#2a1e0e', '#2a1e0e'], bg: '#d8b45c', radius: 8, family: 'Georgia, serif', depthWrite: true });
    plaque.position.set(0, 1.0, 0.31); fp.add(plaque);
    api.addIA(plaque, { label: 'Brass plaque', hoverScale: 1.04, onActivate: () => api.msg('"The Founder\'s Library first opened its doors at 18:45 on the 3rd of October, 1845."', '#e3c06a', 12) });
    // mantel decor
    for (const x of [-0.85, 0.85]) { const c = cyl(0.03, 0.04, 0.25, gold, 12); c.position.set(x, 1.48, 0.1); fp.add(c); const f = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 8), glowMat('#ffcf6a', 1)); f.position.set(x, 1.63, 0.1); fp.add(f); flames.push(f); }

    // Portrait + safe behind it
    const safeG = new THREE.Group(); safeG.position.set(-0.6, 2.35, -D / 2 + 0.02); G.add(safeG);
    const safeBody = box(0.7, 0.7, 0.06, mat('#2a2d33', { metal: 0.85, rough: 0.35 })); safeBody.position.z = 0.03; safeG.add(safeBody);
    const safeIn = box(0.5, 0.5, 0.02, mat('#0a0a0c')); safeIn.position.z = 0.065; safeG.add(safeIn);
    const safeDoor = new THREE.Group(); safeDoor.position.set(-0.25, 0, 0.08); safeG.add(safeDoor);
    const sdm = box(0.5, 0.5, 0.04, mat('#3a3f48', { metal: 0.9, rough: 0.3 })); sdm.position.x = 0.25; safeDoor.add(sdm);
    const kp = api.keypad({ code: '3816', size: 0.62, color: '#ffd27a', title: 'SAFE', bodyColor: '#2a2d33', onSolve: () => {
      S.safe = true; api.msg('Click… the safe swings open!', '#7dffb0');
      api.anim(1.0, (k) => { safeDoor.rotation.y = -k * 1.9; }).then(() => { S.exitkey = 'revealed'; });
    }, onWrong: () => api.msg('The safe buzzes. Wrong combination.', '#ff8080') });
    kp.position.set(0.25, 0, 0.035); safeDoor.add(kp);
    const exitKey = new THREE.Group(); exitKey.position.set(0, -0.05, 0.1); safeG.add(exitKey);
    const ekBow = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 10, 24), gold); ekBow.position.x = -0.1; exitKey.add(ekBow);
    const ekShaft = cyl(0.01, 0.01, 0.18, gold, 10); ekShaft.rotation.z = Math.PI / 2; ekShaft.position.x = 0.0; exitKey.add(ekShaft);
    for (const x of [0.06, 0.085]) { const b = box(0.012, 0.04, 0.01, gold); b.position.set(x, -0.025, 0); exitKey.add(b); }
    const ekGem = sph(0.018, mat('#ff3b5c', { emissive: '#ff3b5c', ei: 0.6, rough: 0.1 }), 12); ekGem.position.x = -0.1; exitKey.add(ekGem);
    api.addIA(exitKey, { label: 'Take the ornate key', hoverScale: 1.2, enabled: () => S.exitkey === 'revealed', onActivate: () => { S.exitkey = 'taken'; exitKey.visible = false; api.inv.add('exitkey', 'Ornate Key', '🗝'); } });

    const portraitHinge = new THREE.Group(); portraitHinge.position.set(-0.6 + 0.52, 2.35, -D / 2 + 0.16); G.add(portraitHinge);
    const portrait = new THREE.Group(); portrait.position.x = -0.52; portraitHinge.add(portrait);
    const frame = box(1.04, 1.28, 0.08, gold); portrait.add(frame);
    const pc = document.createElement('canvas'); pc.width = 512; pc.height = 640;
    const pg = pc.getContext('2d');
    function paintPortrait(reveal) {
      const bg = pg.createRadialGradient(256, 260, 40, 256, 320, 420); bg.addColorStop(0, '#5a4630'); bg.addColorStop(1, '#1a120a');
      pg.fillStyle = bg; pg.fillRect(0, 0, 512, 640);
      pg.fillStyle = '#121014'; pg.beginPath(); pg.ellipse(256, 640, 220, 230, 0, Math.PI, 0); pg.fill(); // coat
      pg.fillStyle = '#e9e1d0'; pg.beginPath(); pg.moveTo(206, 430); pg.lineTo(256, 520); pg.lineTo(306, 430); pg.fill(); // shirt
      pg.fillStyle = '#7a1420'; pg.beginPath(); pg.moveTo(226, 450); pg.lineTo(286, 470); pg.lineTo(286, 450); pg.lineTo(226, 470); pg.fill(); // bow tie
      pg.fillStyle = '#c99d7a'; pg.beginPath(); pg.ellipse(256, 300, 95, 120, 0, 0, Math.PI * 2); pg.fill(); // face
      pg.fillStyle = '#6a6a6a'; pg.beginPath(); pg.ellipse(256, 215, 100, 50, 0, Math.PI, 0); pg.fill(); // hair
      pg.fillRect(160, 330, 26, 70); pg.fillRect(326, 330, 26, 70); // sideburns
      pg.fillStyle = '#2a1a10'; for (const x of [220, 292]) { pg.beginPath(); pg.ellipse(x, 290, 12, 7, 0, 0, Math.PI * 2); pg.fill(); }
      pg.strokeStyle = '#5a5a5a'; pg.lineWidth = 9; pg.beginPath(); pg.moveTo(212, 352); pg.quadraticCurveTo(256, 336, 300, 352); pg.stroke(); // mustache
      pg.strokeStyle = 'rgba(0,0,0,0.25)'; pg.lineWidth = 3; pg.beginPath(); pg.moveTo(240, 380); pg.lineTo(272, 380); pg.stroke();
      pg.fillStyle = 'rgba(255,255,255,0.035)'; for (let i = 0; i < 900; i++) pg.fillRect(Math.random() * 512, Math.random() * 640, 2, 2);
      if (reveal) {
        pg.save(); pg.shadowColor = '#7df9ff'; pg.shadowBlur = 18; pg.fillStyle = '#bff8ff';
        pg.font = 'italic 700 40px Georgia, serif'; pg.textAlign = 'center';
        pg.fillText('Red spines,', 256, 560); pg.fillText('read left to right.', 256, 605); pg.restore();
      } else {
        pg.fillStyle = 'rgba(220,200,160,0.18)'; pg.font = 'italic 9px Georgia, serif'; pg.textAlign = 'center';
        pg.fillText('red spines, read left to right', 256, 590);
      }
      pTex.needsUpdate = true;
    }
    const pTex = new THREE.CanvasTexture(pc); pTex.colorSpace = THREE.SRGBColorSpace;
    paintPortrait(false);
    const canvasM = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 1.1), new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.7 }));
    canvasM.position.z = 0.045; portrait.add(canvasM);
    const pLight = new THREE.SpotLight('#ffe2b0', 4, 3, 0.6, 0.5, 1.5); pLight.position.set(-0.6, 3.3, -D / 2 + 0.9); pLight.target.position.set(-0.6, 2.35, -D / 2); G.add(pLight, pLight.target);
    api.addIA(portrait, {
      label: 'Portrait of the founder', hoverScale: 1.02, enabled: () => !S.painting,
      onActivate: () => {
        if (!api.inv.has('lens')) { api.sfx.wrong(); api.msg('A stern portrait of the founder. There is faint writing in the paint — far too tiny to read with the naked eye.', '#e3c06a', 12); return; }
        S.painting = true; api.inv.remove('lens'); api.sfx.solve();
        paintPortrait(true);
        api.msg('Through the lens, hidden ink appears: "Red spines, read left to right." …and the portrait swings open on a hinge!', '#bff8ff', 14);
        setTimeout(() => api.anim(1.2, (k) => { portraitHinge.rotation.y = k * 1.5; }), 1600);
      },
    });

    // ---------- Grandfather clock (north-east) ----------
    const clock = new THREE.Group(); clock.position.set(2.7, 0, -D / 2 + 0.4); G.add(clock);
    const cw = mat('#ffffff', { map: TX.wood('#5a3018', 'clk'), rough: 0.35 });
    const cbase = box(0.62, 0.5, 0.42, cw); cbase.position.y = 0.25; clock.add(cbase);
    const tback = box(0.48, 1.15, 0.03, mat('#24140a', { rough: 0.8 })); tback.position.set(0, 1.07, -0.155); clock.add(tback);
    for (const x of [-0.225, 0.225]) { const sd = box(0.03, 1.15, 0.34, cw); sd.position.set(x, 1.07, 0); clock.add(sd); }
    const chood = box(0.62, 0.72, 0.42, cw); chood.position.y = 2.0; clock.add(chood);
    const ccrown = box(0.7, 0.1, 0.46, cw); ccrown.position.y = 2.4; clock.add(ccrown);
    const finial = sph(0.05, gold, 12); finial.position.y = 2.5; clock.add(finial);
    const face = api.screen(512, 512, 0.48, (g, w, h) => {
      g.fillStyle = '#f3ead2'; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c9a24a'; g.lineWidth = 14; g.stroke();
      g.fillStyle = '#1a1206'; g.font = '700 54px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const RN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      RN.forEach((n, i) => { const a = i / 12 * Math.PI * 2; g.fillText(n, 256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); });
      for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.fillRect(256 + Math.sin(a) * 232 - 2, 256 - Math.cos(a) * 232 - 2, i % 5 ? 3 : 7, i % 5 ? 3 : 7); }
    }, { transparent: true, depthWrite: true });
    face.position.set(0, 2.02, 0.215); clock.add(face);
    const hourHand = new THREE.Group(), minHand = new THREE.Group();
    const hh = box(0.018, 0.12, 0.006, mat('#111', { metal: 0.5 }), { cast: false }); hh.position.y = 0.05; hourHand.add(hh);
    const mh = box(0.012, 0.18, 0.006, mat('#111', { metal: 0.5 }), { cast: false }); mh.position.y = 0.08; minHand.add(mh);
    hourHand.position.set(0, 2.02, 0.222); minHand.position.set(0, 2.02, 0.228); clock.add(hourHand, minHand);
    const hub = sph(0.016, gold, 10); hub.position.set(0, 2.02, 0.232); clock.add(hub);
    const pendW = new THREE.Group(); pendW.position.set(0, 1.6, -0.06); clock.add(pendW);
    const prod = cyl(0.006, 0.006, 0.8, gold, 6); prod.position.y = -0.4; pendW.add(prod);
    const pbob = cyl(0.08, 0.08, 0.02, gold, 24); pbob.rotation.x = Math.PI / 2; pbob.position.y = -0.82; pendW.add(pbob);
    const cglass = box(0.36, 0.95, 0.01, new THREE.MeshStandardMaterial({ color: '#cfe0ff', transparent: true, opacity: 0.15, roughness: 0.05, metalness: 0.2, depthWrite: false }), { cast: false }); cglass.position.set(0, 1.07, 0.176); clock.add(cglass);
    const cdoor = new THREE.Group(); cdoor.position.set(-0.19, 1.07, 0.18); clock.add(cdoor);
    const cdFrame = new THREE.Group(); cdoor.add(cdFrame);
    for (const [w, h, x, y] of [[0.38, 0.05, 0.19, 0.46], [0.38, 0.05, 0.19, -0.46], [0.05, 0.97, 0.0, 0], [0.05, 0.97, 0.38, 0]]) { const b = box(w, h, 0.03, cw); b.position.set(x, y, 0); cdFrame.add(b); }
    const brassKey = new THREE.Group(); brassKey.position.set(0, 0.95, 0.08); clock.add(brassKey);
    const bkBow = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 20), gold); bkBow.position.x = -0.07; brassKey.add(bkBow);
    const bkS = cyl(0.007, 0.007, 0.12, gold, 8); bkS.rotation.z = Math.PI / 2; brassKey.add(bkS);
    const bkT = box(0.01, 0.03, 0.008, gold); bkT.position.set(0.05, -0.018, 0); brassKey.add(bkT);
    brassKey.visible = false;
    api.addIA(brassKey, { label: 'Take the brass key', hoverScale: 1.25, enabled: () => S.brass === 'revealed', onActivate: () => { S.brass = 'taken'; brassKey.visible = false; api.inv.add('brasskey', 'Brass Key', '🔑'); } });
    function setHands() {
      const hourA = ((S.hour % 12) + S.min / 60) / 12 * Math.PI * 2;
      hourHand.rotation.z = -hourA; minHand.rotation.z = -(S.min / 60) * Math.PI * 2;
    }
    setHands();
    const knobH = new THREE.Group(), knobM = new THREE.Group();
    for (const [k, x, txt] of [[knobH, -0.15, 'HOUR'], [knobM, 0.15, 'MIN']]) {
      const kb = cyl(0.045, 0.045, 0.04, gold, 20); kb.rotation.x = Math.PI / 2; k.add(kb);
      const lbl = TX.label(txt + ' ▸', { w: 0.14, size: 50, weight: 800, color: '#1a1206', bg: '#e3c06a', radius: 8, depthWrite: true }); lbl.position.set(0, -0.08, 0.005); k.add(lbl);
      k.position.set(x, 1.73, 0.23); clock.add(k);
    }
    function checkClock() {
      if (S.hour === 6 && S.min === 45 && !S.clock) {
        S.clock = true; S.brass = 'revealed'; brassKey.visible = true;
        api.sfx.solve(); for (let i = 0; i < 3; i++) setTimeout(() => api.sfx.beep(0.5), 400 + i * 600);
        api.msg('BONG… BONG… The clock strikes 6:45 and its case door swings open. A brass key hangs inside!', '#7dffb0', 12);
        api.anim(1.0, (k) => { cdoor.rotation.y = -k * 1.8; cglass.visible = k < 0.1; });
      }
    }
    api.addIA(knobH, { label: 'Hour knob', repeat: true, dwell: 0.9, hoverScale: 1.15, enabled: () => !S.clock, onActivate: () => { S.hour = S.hour % 12 + 1; setHands(); api.sfx.tick(); checkClock(); } });
    api.addIA(knobM, { label: 'Minute knob', repeat: true, dwell: 0.9, hoverScale: 1.15, enabled: () => !S.clock, onActivate: () => { S.min = (S.min + 15) % 60; setHands(); api.sfx.tick(); checkClock(); } });
    api.onUpdate((dt, t) => { pendW.rotation.z = Math.sin(t * 2.4) * 0.22; });

    // ---------- Writing desk (south-west) ----------
    const desk = new THREE.Group(); desk.position.set(-2.4, 0, 2.2); desk.rotation.y = Math.PI / 2; G.add(desk);
    const dw = mat('#ffffff', { map: TX.wood('#5e3920', 'wdesk'), rough: 0.35 });
    const dtop = box(1.4, 0.06, 0.7, dw); dtop.position.y = 0.78; desk.add(dtop);
    const leather = box(1.0, 0.005, 0.45, mat('#1f3a2a', { rough: 0.8 })); leather.position.set(0, 0.812, 0); desk.add(leather);
    for (const x of [-0.5, 0.5]) { const p = box(0.36, 0.75, 0.66, dw); p.position.set(x, 0.375, 0); desk.add(p); }
    const drawer = new THREE.Group(); drawer.position.set(0, 0.66, 0); desk.add(drawer);
    const dfr = box(0.6, 0.14, 0.03, dw); dfr.position.z = 0.34; drawer.add(dfr);
    const dbx = box(0.56, 0.1, 0.6, mat('#3a2414')); dbx.position.z = 0.02; drawer.add(dbx);
    const keyhole = cyl(0.018, 0.018, 0.01, gold, 16); keyhole.rotation.x = Math.PI / 2; keyhole.position.set(0, 0, 0.36); drawer.add(keyhole);
    const lensG = new THREE.Group(); lensG.position.set(0, 0.07, 0.05); drawer.add(lensG);
    const lr = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 10, 32), gold); lr.rotation.x = -Math.PI / 2; lensG.add(lr);
    const lg = new THREE.Mesh(new THREE.CircleGeometry(0.058, 32), new THREE.MeshPhysicalMaterial({ color: '#d9f3ff', transparent: true, opacity: 0.35, roughness: 0, metalness: 0, envMapIntensity: 2 })); lg.rotation.x = -Math.PI / 2; lensG.add(lg);
    const lh = cyl(0.009, 0.012, 0.12, mat('#2a1a10'), 10); lh.rotation.z = Math.PI / 2; lh.position.x = 0.12; lensG.add(lh);
    api.addIA(drawer, {
      label: 'Locked drawer', hoverScale: 1.04, enabled: () => !S.drawer,
      onActivate: () => {
        if (!api.inv.has('brasskey')) { api.sfx.wrong(); api.msg('The desk drawer is locked. There is a small brass keyhole.', '#ffd54a'); return; }
        api.inv.remove('brasskey'); S.drawer = true; S.lens = 'revealed'; api.sfx.mech();
        api.anim(0.7, (k) => { drawer.position.z = k * 0.34; });
        api.msg('The brass key turns. Inside the drawer: a MAGNIFYING LENS.', '#7dffb0');
      },
    });
    api.addIA(lensG, { label: 'Take the magnifying lens', hoverScale: 1.25, enabled: () => S.lens === 'revealed', onActivate: () => { S.lens = 'taken'; lensG.visible = false; api.inv.add('lens', 'Magnifying Lens', '🔍'); } });
    const dnote = TX.label(['To whoever finds this:', 'The clock remembers the hour', 'the founder first opened', 'these doors.', '— The Librarian'], { w: 0.42, size: 44, weight: 600, color: '#2a2230', bg: '#efe4c8', radius: 6, family: 'Georgia, serif', depthWrite: true });
    dnote.rotation.x = -Math.PI / 2; dnote.rotation.z = 0.12; dnote.position.set(-0.15, 0.818, 0.02); desk.add(dnote);
    api.addIA(dnote, { label: 'Read the note', hoverScale: 1.05, onActivate: () => api.msg('The note: "The clock remembers the hour the founder first opened these doors." — The Librarian', '#efe4c8', 12) });
    const inkw = cyl(0.03, 0.035, 0.05, mat('#111', { rough: 0.1 }), 12); inkw.position.set(0.42, 0.835, -0.15); desk.add(inkw);
    const quill = cyl(0.002, 0.008, 0.25, mat('#f5f0e6'), 6); quill.position.set(0.42, 0.92, -0.15); quill.rotation.z = 0.4; desk.add(quill);
    const dlamp = new THREE.PointLight('#ffcf8a', 2.2, 3, 2); dlamp.position.set(-2.4, 1.4, 2.0); G.add(dlamp);
    const dlb = sph(0.05, mat('#fff', { emissive: '#ffcf8a', ei: 2 }), 12, { cast: false }); dlb.position.set(-2.1, 1.12, 2.55); G.add(dlb);
    const dls = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.15, 20, 1, true), mat('#1f5a3a', { side: THREE.DoubleSide, rough: 0.4, emissive: '#0d2a1c', ei: 0.4 })); dls.position.set(-2.1, 1.17, 2.55); G.add(dls);
    const dlp = cyl(0.01, 0.01, 0.32, gold); dlp.position.set(-2.1, 0.97, 2.55); G.add(dlp);

    // ---------- Bookshelves ----------
    const palette = ['#2f4a3a', '#1f3550', '#4a3a28', '#5a4a2a', '#2a2a2a', '#6b5a3a', '#3a2f50', '#7a6a4a', '#2c3e3a', '#4d4030', '#1d2b40', '#55472f'];
    const special = { west: [] };
    function shelfUnit(x, faceDir, z0, z1, specials = []) {
      const len = z1 - z0, rows = [0.18, 0.62, 1.06, 1.5, 1.94, 2.38];
      const unit = new THREE.Group(); G.add(unit);
      const sw = mat('#ffffff', { map: darkWood, rough: 0.5 });
      const back = box(0.04, 2.8, len, sw); back.position.set(x - faceDir * 0.18, 1.4, (z0 + z1) / 2); unit.add(back);
      for (const z of [z0, z1, (z0 + z1) / 2]) { const s = box(0.4, 2.8, 0.05, sw); s.position.set(x, 1.4, z); unit.add(s); }
      for (const y of [...rows, 2.8].map((r) => r - 0.02)) { const s = box(0.4, 0.04, len, sw); s.position.set(x, y, (z0 + z1) / 2); unit.add(s); }
      const crown = box(0.46, 0.12, len + 0.08, sw); crown.position.set(x, 2.86, (z0 + z1) / 2); unit.add(crown);
      // instanced books
      const books = [];
      rows.forEach((y, ri) => {
        let z = z0 + 0.05;
        while (z < z1 - 0.08) {
          const bw = 0.03 + Math.random() * 0.045, bh = 0.24 + Math.random() * 0.14;
          const zc = z + bw / 2;
          const nearSpecial = specials.some((s) => s.row === ri && Math.abs(s.z - zc) < 0.085);
          const nearDivider = Math.abs(zc - (z0 + z1) / 2) < 0.05;
          if (!nearSpecial && !nearDivider && Math.random() > 0.05) books.push({ y: y + bh / 2, z: zc, w: bw, h: Math.min(bh, 0.4), lean: Math.random() > 0.93 ? 0.12 : 0, col: palette[Math.floor(Math.random() * palette.length)] });
          z += bw + 0.004;
        }
      });
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat('#ffffff', { rough: 0.75 }), books.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
      books.forEach((b, i) => {
        e.set(b.lean, 0, 0); q.setFromEuler(e); sc.set(0.22, b.h, b.w); p.set(x + faceDir * 0.02, b.y, b.z);
        m4.compose(p, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, c.set(b.col).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06));
      });
      im.castShadow = true; im.receiveShadow = true; unit.add(im);
      // gold stripes on spines (single merged instanced)
      const st = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), gold, books.length * 2);
      let n = 0;
      books.forEach((b) => { for (const dy of [0.32, -0.3]) { m4.compose(p.set(x + faceDir * 0.131, b.y + b.h * dy, b.z), q.identity(), sc.set(0.004, 0.012, b.w * 0.9)); st.setMatrixAt(n++, m4); } });
      st.count = n; unit.add(st);
      // special books
      specials.forEach((s) => {
        const bw = 0.075, bh = 0.36;
        const y = rows[s.row] + bh / 2;
        const b = box(0.24, bh, bw, mat(s.color, { rough: 0.55 })); b.position.set(x + faceDir * 0.02, y, s.z); unit.add(b);
        const lab = TX.label(String(s.n), { w: 0.065, width: 120, height: 150, size: 120, weight: 900, color: '#ffd86b', family: 'Georgia, serif', glow: '#b8860b', depthWrite: true });
        lab.position.set(x + faceDir * 0.142, y + 0.06, s.z); lab.rotation.y = faceDir * Math.PI / 2; unit.add(lab);
        for (const dy of [0.14, -0.14]) { const g2 = box(0.005, 0.014, bw * 0.9, gold); g2.position.set(x + faceDir * 0.141, y + dy, s.z); unit.add(g2); }
        api.addIA(b, { label: `${s.cname} book`, hoverScale: 1.06, onActivate: () => api.msg(`A ${s.cname.toLowerCase()} book. Its spine is stamped with the number ${s.n}.`, '#e3c06a') });
      });
      return unit;
    }
    // West wall (face east, +x). Facing west, LEFT = south (+z) → read from +z to -z.
    shelfUnit(-W / 2 + 0.22, 1, -2.9, 2.9, [
      { row: 3, z: 2.2, n: 3, color: '#a3162b', cname: 'Red' },
      { row: 1, z: 1.3, n: 5, color: '#1f6b3a', cname: 'Green' },
      { row: 2, z: 0.6, n: 8, color: '#a3162b', cname: 'Red' },
      { row: 4, z: 0.05, n: 7, color: '#1f3f8a', cname: 'Blue' },
      { row: 1, z: -0.9, n: 1, color: '#a3162b', cname: 'Red' },
      { row: 3, z: -1.5, n: 2, color: '#1f6b3a', cname: 'Green' },
      { row: 2, z: -2.3, n: 6, color: '#a3162b', cname: 'Red' },
    ]);
    // East wall (face west, -x) decor + a decoy
    shelfUnit(W / 2 - 0.22, -1, -1.6, 2.9, [{ row: 2, z: 0.9, n: 4, color: '#6b3a8a', cname: 'Purple' }]);
    const shelfSign = TX.label('ARCHIVES', { w: 0.9, size: 70, weight: 800, color: '#e3c06a', family: 'Georgia, serif', depthWrite: true });
    shelfSign.position.set(-W / 2 + 0.47, 3.12, 0); shelfSign.rotation.y = Math.PI / 2; G.add(shelfSign);

    // Armchair + globe (decor, globe spins)
    const chair = new THREE.Group(); chair.position.set(1.4, 0, -1.9); chair.rotation.y = -0.5; G.add(chair);
    const lea = mat('#5a1620', { rough: 0.55 });
    const seat = box(0.8, 0.22, 0.75, lea); seat.position.y = 0.38; chair.add(seat);
    const backC = box(0.8, 0.75, 0.18, lea); backC.position.set(0, 0.8, -0.3); chair.add(backC);
    for (const x of [-0.42, 0.42]) { const arm = box(0.14, 0.3, 0.75, lea); arm.position.set(x, 0.55, 0); chair.add(arm); }
    const globe = new THREE.Group(); globe.position.set(2.1, 0, 0.6); G.add(globe);
    const gst = cyl(0.03, 0.12, 0.8, mat('#ffffff', { map: darkWood }), 16); gst.position.y = 0.4; globe.add(gst);
    const gc = document.createElement('canvas'); gc.width = 512; gc.height = 256; const gg = gc.getContext('2d');
    gg.fillStyle = '#c9b48a'; gg.fillRect(0, 0, 512, 256); gg.fillStyle = '#6b8a5a';
    for (let i = 0; i < 22; i++) { gg.beginPath(); gg.ellipse(Math.random() * 512, 40 + Math.random() * 176, 20 + Math.random() * 50, 12 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2); gg.fill(); }
    gg.strokeStyle = 'rgba(80,50,20,0.4)'; for (let i = 0; i < 8; i++) { gg.beginPath(); gg.moveTo(i * 64, 0); gg.lineTo(i * 64, 256); gg.stroke(); }
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const gsp = sph(0.22, mat('#ffffff', { map: gt, rough: 0.5 }), 32); gsp.position.y = 1.02; gsp.rotation.z = 0.4; globe.add(gsp);
    const gmer = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.008, 8, 40, Math.PI * 1.2), gold); gmer.position.y = 1.02; gmer.rotation.set(0, Math.PI / 2, 0.4 + Math.PI / 2); globe.add(gmer);
    let spin = 0;
    api.addIA(gsp, { label: 'Antique globe', hoverScale: 1.06, onActivate: () => { spin = 9; api.msg('The globe whirls around. Somewhere out there, the founder is laughing.', '#e3c06a', 4); } });
    api.onUpdate((dt) => { gsp.rotation.y += dt * (0.1 + spin); spin *= Math.pow(0.4, dt); });

    // ---------- Exit doors (south) ----------
    const ex = new THREE.Group(); ex.position.set(0.6, 0, D / 2 - 0.06); ex.rotation.y = Math.PI; G.add(ex);
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.5), api.portalMat('#ff8a3d', '#ffe0a3')); portal.position.set(0, 1.25, -0.02); ex.add(portal);
    const fr = mat('#ffffff', { map: darkWood, rough: 0.35 });
    for (const [w, h, x, y] of [[2.0, 0.22, 0, 2.62], [0.2, 2.7, -0.9, 1.35], [0.2, 2.7, 0.9, 1.35]]) { const b = box(w, h, 0.2, fr); b.position.set(x, y, 0.04); ex.add(b); }
    const leaves = [];
    for (const s of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(s * 0.8, 0, 0.04); ex.add(hinge);
      const leaf = box(0.8, 2.5, 0.07, mat('#ffffff', { map: TX.wood('#4a2a16', 'door'), rough: 0.4 })); leaf.position.set(-s * 0.4, 1.25, 0); hinge.add(leaf);
      for (const y of [0.7, 1.8]) { const p = box(0.55, 0.75, 0.02, mat('#ffffff', { map: TX.wood('#3a2010', 'door2'), rough: 0.4 })); p.position.set(-s * 0.4, y, 0.045); hinge.add(p); }
      const hd = sph(0.04, gold, 12); hd.position.set(-s * 0.72, 1.15, 0.07); hinge.add(hd);
      leaves.push({ hinge, s });
    }
    const exSign = TX.label('EXIT', { w: 0.42, size: 90, weight: 900, color: '#e3c06a', family: 'Georgia, serif' }); exSign.position.set(0, 2.9, 0.15); ex.add(exSign);
    api.addIA(ex, {
      label: 'Library doors', hoverScale: 1.0, enabled: () => !S.open,
      onActivate: () => {
        if (!api.inv.has('exitkey')) { api.sfx.wrong(); api.msg('The great doors are locked tight. The keyhole is ornate — a common key won\'t do.', '#ffd54a'); return; }
        api.inv.remove('exitkey'); S.open = true; api.sfx.solve();
        api.msg('The ornate key turns with a deep CLUNK. The doors swing open!', '#7dffb0');
        api.anim(1.6, (k) => { leaves.forEach((l) => (l.hinge.rotation.y = l.s * k * 1.5)); api.shadowsDirty(); }).then(() => setTimeout(() => api.escape(), 600));
      },
    });

    api.dust(180, [8, 3, 7], '#ffdcae', [0, 1.6, 0]);

    api.lightSwitch(new THREE.Vector3(1.55, 1.3, -D / 2 + 0.02));
    api.secret(['★ SECRET ★', 'A pendulum\'s timing depends on', 'its length, not its weight.'], 2.2).position.set(1.6, 3.1, -D / 2 + 0.03);
    for (const [x, z, r] of [[1.4, -1.9, 0.75], [2.1, 0.6, 0.35], [-2.4, 2.2, 0.95], [2.7, -D / 2 + 0.4, 0.5]]) api.blob(x, z, r);
    api.halo(new THREE.Vector3(0, H - 0.75, 0.2), '#ffd9a0', 1.6, 0.45); api.halo(new THREE.Vector3(-0.6, 0.45, -D / 2 + 0.7), '#ff9a4a', 1.5, 0.4);
    const ap1 = api.poster('impossible', 0.8); ap1.position.set(W / 2 - 0.03, 2.2, -2.6); ap1.rotation.y = -Math.PI / 2; G.add(ap1);
    api.addSeat(new THREE.Vector3(0, 0, 1.0), 0, { label: 'Center' });
    api.addSeat(new THREE.Vector3(-2.0, 0, -0.2), Math.PI / 2, { label: 'West bookshelf' });
    api.addSeat(new THREE.Vector3(1.1, 0, -1.3), 0.25, { label: 'Fireplace & clock' });
    api.addSeat(new THREE.Vector3(-0.3, 0, 2.0), Math.PI, { label: 'Desk & exit' });

    return {
      hint() {
        if (!S.clock) return 'Read the note on the writing desk, then the brass plaque on the fireplace. 18:45 is a 24-hour time. Set the grandfather clock with its HOUR and MIN knobs.';
        if (S.brass !== 'taken' && !S.drawer) return 'The grandfather clock opened — take the brass key from inside its case.';
        if (!S.drawer) return 'The brass key fits the locked drawer of the writing desk.';
        if (S.lens === 'revealed') return 'Take the magnifying lens from the open drawer.';
        if (!S.painting) return 'Look at the portrait above the fireplace while you carry the magnifying lens.';
        if (!S.safe) return 'Find only the RED books on the west bookshelf. Face the shelf and read their numbers from left to right. Enter them on the safe.';
        if (S.exitkey === 'revealed') return 'Take the ornate key from the open safe.';
        return 'Use the ornate key on the library doors behind you (south wall).';
      },
      answer() {
        if (!S.clock) return 'Set the grandfather clock to 6:45. Look at the HOUR knob until the short hand is on VI, and the MIN knob three times.';
        if (S.brass !== 'taken' && !S.drawer) return 'Take the brass key hanging inside the open clock case.';
        if (!S.drawer) return 'Look at the locked drawer of the writing desk (behind you, south-west).';
        if (S.lens === 'revealed') return 'Take the magnifying lens from the drawer.';
        if (!S.painting) return 'Look at the portrait above the fireplace.';
        if (!S.safe) return 'The safe code is 3 8 1 6: the four red books, read left to right.';
        if (S.exitkey === 'revealed') return 'Take the ornate key from the safe.';
        return 'Look at the big library doors on the south wall.';
      },
      idle: () => 'Every object in this library is a clue — or a distraction.',
    };
  },
};
