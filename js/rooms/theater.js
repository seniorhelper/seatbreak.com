// HARD — The Grand Illusion (chained on stage; levers, sound, light)
import { shell } from './common.js?v=3';

export const theater = {
  id: 'theater', title: 'The Grand Illusion', tier: 'HARD', ages: 'Ages 12+ · three locks', color: '#e0284e', par: 480, tableScale: 9,
  learn: ['Lever law: weight × distance must match on both sides', 'A shorter bar vibrates faster, so its note is higher', 'Red + green light makes yellow. All three make white'],
  intro: 'Ladies and gentlemen… the Great Escape! You are chained to your chair with three padlocks. Each lock opens a different way: balance, sound and light.',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    api.setScene({ bg: new THREE.Color('#0a0508') });
    const W = 9, D = 7.4, H = 4.6;
    const S = { n: 0, lever: false, sound: false, light: false, pos: 0, seq: [1, 3, 0, 4], inp: 0, rgb: [0, 0, 0], tgt: 0, busy: false, done: false };
    const tmp = new THREE.Vector3();
    const curtainTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
      for (let x = 0; x < 512; x++) { const v = 0.5 + 0.5 * Math.sin(x / 512 * Math.PI * 2 * 12); g.fillStyle = `rgb(${70 + v * 130 | 0},${6 + v * 14 | 0},${18 + v * 24 | 0})`; g.fillRect(x, 0, 1, 64); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
    })();
    const velvet = mat('#ffffff', { map: curtainTex, rough: 0.95 });
    shell(api, {
      w: W, d: D, h: H,
      floor: mat('#ffffff', { map: TX.rep(TX.wood('#6e4526', 'stage'), 5, 4), rough: 0.4 }),
      wall: mat('#1c0d14', { rough: 0.95 }), wallN: mat('#12080c', { rough: 1 }),
      ceil: mat('#0e070a', { rough: 1 }), trim: '#c9a24a', trimH: 0.1,
    });
    G.add(new THREE.HemisphereLight('#ffe3c2', '#1a0a10', 0.55));
    const spot = new THREE.SpotLight('#fff1d6', 46, 12, 0.7, 0.6, 1.3);
    spot.position.set(0, H - 0.05, 1.2); spot.target.position.set(0, 0, -0.6); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0008;
    G.add(spot, spot.target);
    const warm = new THREE.PointLight('#ffb070', 7, 9, 1.7); warm.position.set(0, 2.6, -1.6); G.add(warm);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, H - 0.2, 32, 1, true), glowMat('#fff1d6', 0.05)); cone.position.set(0, (H - 0.2) / 2 + 0.1, 1.5); G.add(cone);
    const gold = mat('#c9a24a', { metal: 0.92, rough: 0.22 });

    // curtains, valance, bulbs, audience
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), api.portalMat('#e0284e', '#ffd54a')); portal.position.set(0, 1.7, -D / 2 + 0.03); G.add(portal);
    const curt = [-1, 1].map((s) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.9), velvet); c.position.set(s * 1.1, 1.95, -D / 2 + 0.1); c.castShadow = false; G.add(c); return c; });
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.9), velvet); c.position.set(s * 3.3, 1.95, -D / 2 + 0.12); G.add(c); }
    const val = box(W - 0.2, 0.7, 0.2, velvet); val.position.set(0, 4.1, -D / 2 + 0.2); val.castShadow = false; G.add(val);
    const fringe = box(W - 0.2, 0.06, 0.22, gold); fringe.position.set(0, 3.74, -D / 2 + 0.2); fringe.castShadow = false; G.add(fringe);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), glowMat('#ffe9a8', 1, false), 30);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 30; i++) { m4.makeTranslation(-4.2 + i * 0.29, 4.5, -D / 2 + 0.34); bulbs.setMatrixAt(i, m4); }
    G.add(bulbs);
    const seatsI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.6, 0.12), mat('#3a0c18', { rough: 0.9 }), 24);
    for (let i = 0; i < 24; i++) { m4.makeTranslation(-3.6 + (i % 12) * 0.65, 0.5 + Math.floor(i / 12) * 0.25, 3.0 + Math.floor(i / 12) * 0.5); seatsI.setMatrixAt(i, m4); }
    G.add(seatsI);

    // big padlocks on posts
    const locks = {};
    const mkLock = (key, x, z, icon, col) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
      const post = cyl(0.04, 0.06, 1.9, gold, 12); post.position.y = 0.95; g.add(post);
      const bodyM = box(0.34, 0.3, 0.12, mat(col, { metal: 0.9, rough: 0.25, emissive: col, ei: 0.15 })); bodyM.position.y = 2.0; g.add(bodyM);
      const sh = new THREE.Group(); sh.position.set(-0.1, 2.15, 0); g.add(sh);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 20, Math.PI), mat('#d9dde6', { metal: 1, rough: 0.2 })); arc.position.x = 0.1; sh.add(arc);
      const ic = TX.label(icon, { w: 0.22, size: 120, color: '#1a1206', depthWrite: true }); ic.position.set(0, 2.0, 0.065); g.add(ic);
      locks[key] = { g, sh, bodyM };
    };
    mkLock('lever', -1.15, -3.2, '⚖', '#ffd23f'); mkLock('sound', 0, -3.3, '♪', '#5ec8ff'); mkLock('light', 1.15, -3.2, '☀', '#ff7ab8');
    api.body.setChains(3);
    function unlock(key, text) {
      const L = locks[key];
      S.n++; api.body.setChains(3 - S.n); api.sfx.solve();
      api.anim(0.7, (k) => { L.sh.rotation.z = k * 0.9; L.sh.position.y = 2.15 + k * 0.06; });
      L.g.getWorldPosition(tmp); tmp.y = 2; api.burst(tmp, '#ffd54a', 70, 1.6);
      api.msg(S.n < 3 ? `${text} One chain drops away. ${3 - S.n} lock${3 - S.n > 1 ? 's' : ''} to go!` : `${text} The last chain falls. You are FREE!`, '#7dffb0', 12);
      if (S.n === 3) setTimeout(finale, 1500);
    }
    function finale() {
      S.done = true; api.sfx.escape();
      api.anim(2.2, (k) => { curt.forEach((c, i) => { c.scale.x = 1 - k * 0.8; c.position.x = (i ? 1 : -1) * (1.1 + k * 0.95); }); }).then(() => setTimeout(() => api.escape(), 500));
    }

    // ---------- Lock 1: the lever ----------
    const lv = new THREE.Group(); lv.position.set(-2.15, 0, -1.5); lv.rotation.y = 0.5; G.add(lv);
    const ped = box(0.5, 1.0, 0.4, mat('#2a1a22', { rough: 0.6 })); ped.position.y = 0.5; lv.add(ped);
    const ful = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 4), gold); ful.position.y = 1.12; lv.add(ful);
    const beam = new THREE.Group(); beam.position.y = 1.26; lv.add(beam);
    const bar = box(2.3, 0.05, 0.1, mat('#ffffff', { map: TX.wood('#b98a5a', 'beam'), rough: 0.5 })); beam.add(bar);
    const hang = (x, kg, col) => {
      const g = new THREE.Group(); g.position.x = x; beam.add(g);
      const st = cyl(0.006, 0.006, 0.22, mat('#ddd', { metal: 1 }), 6); st.position.y = -0.13; g.add(st);
      const w = cyl(0.1, 0.12, 0.16, mat(col, { metal: 0.8, rough: 0.3 }), 20); w.position.y = -0.31; g.add(w);
      const lb = TX.label(`${kg} kg`, { w: 0.2, size: 80, weight: 900, color: '#fff', depthWrite: true }); lb.position.set(0, -0.31, 0.125); g.add(lb);
      return g;
    };
    hang(-0.4, 6, '#3b4252');
    const wR = hang(0.2, 3, '#b0303a'); wR.visible = false;
    const lbl = TX.label('2', { w: 0.1, size: 90, weight: 900, color: '#ffd54a', depthWrite: true }); lbl.position.set(-0.4, 0.1, 0.06); beam.add(lbl);
    const tilt = () => { const net = 12 - 3 * S.pos; return Math.max(-0.28, Math.min(0.28, net / 12 * 0.28)); };
    beam.rotation.z = tilt();
    for (let n = 1; n <= 5; n++) {
      const hk = new THREE.Group(); hk.position.set(n * 0.2, 0.1, 0); beam.add(hk);
      const pad = TX.label(String(n), { w: 0.14, width: 130, height: 130, size: 92, weight: 900, color: '#1a1206', bg: '#ffd54a', radius: 20, depthWrite: true }); pad.position.z = 0.06; hk.add(pad);
      api.addIA(hk, {
        label: `Hang the 3 kg weight at ${n}`, hoverScale: 1.15, repeat: true, dwell: 0.9, enabled: () => !S.lever,
        onActivate: () => {
          S.pos = n; wR.visible = true; wR.position.x = n * 0.2; api.sfx.place();
          const from = beam.rotation.z, to = tilt();
          api.anim(0.8, (k) => { beam.rotation.z = from + (to - from) * k; api.shadowsDirty(); }).then(() => {
            if (n === 4) { S.lever = true; unlock('lever', 'Balanced! 6 × 2 = 12 and 3 × 4 = 12.'); }
            else api.msg(`Left side: 6 kg × 2 = 12. Right side: 3 kg × ${n} = ${3 * n}. ${3 * n < 12 ? 'Not enough turning force. Move it farther out.' : 'Too much turning force. Move it closer in.'}`, '#ffd54a', 11);
          });
        },
      });
    }
    const s1 = TX.label(['LOCK OF BALANCE', 'A lever balances when', 'weight × distance is the', 'same on both sides.'], { w: 1.25, size: 54, weight: 700, colors: ['#ffd23f'], color: '#fff6e0', bg: 'rgba(20,8,12,0.92)', border: '#ffd23f', radius: 16, depthWrite: true });
    s1.position.set(0, 2.25, -0.15); lv.add(s1);

    // ---------- Lock 2: the xylophone ----------
    const xy = new THREE.Group(); xy.position.set(0, 0, -2.3); G.add(xy);
    const tb = box(1.9, 0.9, 0.6, mat('#2a1a22', { rough: 0.6 })); tb.position.y = 0.45; xy.add(tb);
    const NOTES = [523.25, 587.33, 659.25, 783.99, 880], COLS = ['#ff4d5e', '#ffb13f', '#ffe14d', '#3fd17a', '#3ea8ff'];
    const bars = NOTES.map((f, i) => {
      const len = 0.74 - i * 0.09;
      const m = mat(COLS[i], { metal: 0.6, rough: 0.3, emissive: COLS[i], ei: 0.1 });
      const b = box(0.24, 0.05, len, m); b.position.set(-0.6 + i * 0.3, 1.0, 0); b.rotation.x = 0.5; xy.add(b);
      b.userData.glow = 0;
      api.addIA(b, { label: `Bar ${i + 1}`, hoverScale: 1.08, repeat: true, dwell: 0.6, enabled: () => !S.busy && !S.sound, onActivate: () => strike(i, true) });
      return b;
    });
    api.onUpdate((dt) => bars.forEach((b) => { b.userData.glow = Math.max(0, b.userData.glow - dt * 1.6); b.material.emissiveIntensity = 0.1 + b.userData.glow * 1.1; }));
    function strike(i, player) {
      api.sfx.note(NOTES[i]); bars[i].userData.glow = 1;
      if (!player) return;
      if (S.seq[S.inp] === i) { S.inp++; if (S.inp === S.seq.length) { S.sound = true; unlock('sound', 'Perfect pitch! You played the tune back.'); } }
      else { S.inp = 0; api.sfx.wrong(); api.msg('Not the tune. Look at the music box to hear (and see) it again, then start from the first note.', '#ffd54a'); }
    }
    const mb = new THREE.Group(); mb.position.set(1.25, 0.9, 0.1); xy.add(mb);
    const mbb = box(0.3, 0.2, 0.24, gold); mbb.position.y = 0.1; mb.add(mbb);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 20, 1, true), mat('#c9a24a', { metal: 0.9, rough: 0.25, side: THREE.DoubleSide })); horn.position.set(0, 0.33, 0.04); horn.rotation.x = Math.PI + 0.5; mb.add(horn);
    const mbl = TX.label('▶ LISTEN', { w: 0.34, size: 60, weight: 900, color: '#1a1206', bg: '#ffd54a', radius: 12, depthWrite: true }); mbl.position.set(0, 0.1, 0.125); mb.add(mbl);
    api.addIA(mb, {
      label: 'Play the tune', hoverScale: 1.1, repeat: true, enabled: () => !S.busy && !S.sound,
      onActivate: () => { S.busy = true; S.inp = 0; S.seq.forEach((n, k) => setTimeout(() => strike(n, false), 300 + k * 650)); setTimeout(() => { S.busy = false; api.msg('Now you: look at the same four bars in the same order.', '#bfe9ff'); }, 300 + S.seq.length * 650); },
    });
    const s2 = TX.label(['LOCK OF SOUND', 'Shorter bar = faster vibration', '= higher note. Hear the tune,', 'then play it back.'], { w: 1.4, size: 54, weight: 700, colors: ['#5ec8ff'], color: '#eaf6ff', bg: 'rgba(8,12,24,0.92)', border: '#5ec8ff', radius: 16, depthWrite: true });
    s2.position.set(0, 2.75, -0.6); xy.add(s2);

    // ---------- Lock 3: mixing light ----------
    const lt = new THREE.Group(); lt.position.set(2.15, 0, -1.5); lt.rotation.y = -0.5; G.add(lt);
    const lped = box(1.3, 0.9, 0.45, mat('#2a1a22', { rough: 0.6 })); lped.position.y = 0.45; lt.add(lped);
    const discM = new THREE.MeshBasicMaterial({ color: '#111111', toneMapped: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), discM); disc.position.set(0, 1.75, -0.1); lt.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 8, 48), gold); rim.position.copy(disc.position); lt.add(rim);
    const TG = [['YELLOW', [1, 1, 0]], ['CYAN', [0, 1, 1]], ['MAGENTA', [1, 0, 1]], ['WHITE', [1, 1, 1]]];
    const NAME = { '100': 'red', '010': 'green', '001': 'blue', '110': 'YELLOW', '011': 'CYAN', '101': 'MAGENTA', '111': 'WHITE', '000': 'darkness' };
    const tgt = api.screen(600, 170, 1.0, (g, w, h) => {
      g.fillStyle = 'rgba(20,8,12,0.94)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 20); g.fill(); g.strokeStyle = '#ff7ab8'; g.lineWidth = 6; g.stroke();
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = '800 54px system-ui';
      if (S.light) { g.fillStyle = '#7dffb0'; g.fillText('ALL COLORS MADE!', 30, h / 2); return; }
      const [nm, c] = TG[S.tgt];
      g.fillStyle = '#fff'; g.fillText(`Make ${S.tgt + 1}/4:  ${nm}`, 30, h / 2);
      g.fillStyle = `rgb(${c[0] * 255},${c[1] * 255},${c[2] * 255})`; g.beginPath(); g.roundRect(w - 130, 35, 100, 100, 16); g.fill();
    });
    tgt.position.set(0, 2.45, -0.1); lt.add(tgt);
    const lampCols = ['#ff2020', '#20e040', '#3060ff'], lampN = ['RED', 'GREEN', 'BLUE'], beams = [];
    lampN.forEach((nm, i) => {
      const x = -0.42 + i * 0.42;
      const btn = TX.label(nm, { w: 0.36, width: 300, height: 150, size: 70, weight: 900, color: '#fff', bg: lampCols[i], border: '#ffffff', borderWidth: 6, radius: 20, depthWrite: true });
      btn.position.set(x, 0.62, 0.23); lt.add(btn);
      const bm = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 16, 1, true), glowMat(lampCols[i], 0.22)); bm.position.set(x * 0.55, 1.36, 0.02); bm.rotation.z = x * 0.5; bm.visible = false; lt.add(bm); beams.push(bm);
      const lampH = cyl(0.07, 0.09, 0.14, mat('#222', { metal: 0.7 }), 14); lampH.position.set(x, 0.97, 0.05); lt.add(lampH);
      api.addIA(btn, {
        label: `${nm} light`, hoverScale: 1.08, repeat: true, dwell: 0.8, enabled: () => !S.light,
        onActivate: () => {
          S.rgb[i] ^= 1; bm.visible = !!S.rgb[i]; api.sfx.tick();
          discM.color.setRGB(S.rgb[0] || 0.03, S.rgb[1] || 0.03, S.rgb[2] || 0.03);
          const on = lampN.filter((_, k) => S.rgb[k]).map((s) => s.toLowerCase());
          const key = S.rgb.join('');
          api.msg(on.length > 1 ? `${on.join(' + ')} light makes ${NAME[key]}.` : on.length ? `Only ${on[0]} light.` : 'All lamps off: darkness.', '#ffd6ea', 6);
          if (key === TG[S.tgt][1].join('') && !S.wait) {
            api.sfx.pick(); S.wait = true;
            if (S.tgt === 3) { S.light = true; tgt.redraw(); unlock('light', 'Red + green + blue light makes WHITE!'); }
            else setTimeout(() => { S.tgt++; S.wait = false; tgt.redraw(); }, 900);
          }
        },
      });
    });
    const s3 = TX.label(['LOCK OF LIGHT', 'Light does not mix like paint.', 'Shine colors together and', 'they get BRIGHTER.'], { w: 1.25, size: 54, weight: 700, colors: ['#ff7ab8'], color: '#ffeef6', bg: 'rgba(20,8,12,0.92)', border: '#ff7ab8', radius: 16, depthWrite: true });
    s3.position.set(0, 3.1, -0.15); lt.add(s3);

    api.dust(150, [8, 3.5, 6], '#ffe2b8', [0, 2, -0.5]);
    api.lightSwitch(new THREE.Vector3(-W / 2 + 0.02, 1.3, 0.2), Math.PI / 2);
    api.secret(['★ SECRET ★', 'White light is every color mixed.', 'A prism spreads them back out.'], 2.4).position.set(0, 3.45, -D / 2 + 0.36);
    api.blob(-2.15, -1.5, 0.7); api.blob(2.15, -1.5, 0.9); api.blob(0, -2.3, 1.1);
    api.addSeat(new THREE.Vector3(0, 0, 1.5), 0, { label: 'Center stage' });

    return {
      hint() {
        if (!S.lever) return 'Lock of Balance (left): the 6 kg weight hangs at 2, so the left side is 6 × 2 = 12. Where must a 3 kg weight hang to also make 12?';
        if (!S.sound) return 'Lock of Sound (middle): look at the music box. Four bars light up one by one. Look at those same bars in the same order.';
        if (!S.light) return 'Lock of Light (right): switch the red, green and blue lamps on and off. Red + green makes yellow. Try the other pairs!';
        return 'You are free! Watch the curtain.';
      },
      answer() {
        if (!S.lever) return 'Hang the 3 kg weight at 4. (3 × 4 = 12 = 6 × 2.)';
        if (!S.sound) return 'Play bars 2, 4, 1, 5 (counting from the longest bar on the left).';
        if (!S.light) return 'Yellow = red + green. Cyan = green + blue. Magenta = red + blue. White = all three.';
        return 'Done!';
      },
      idle: () => `${3 - S.n} lock${3 - S.n === 1 ? '' : 's'} left: balance, sound, light.`,
    };
  },
};
