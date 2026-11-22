// EXPERT — Zero Hour Vault (timed spy mission)
import { shell } from './common.js?v=3';

const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
const WORD = 'NOVA';
const VAULT = '2580';
const MONITORS = [ // east wall, left → right as you face it
  { color: '#f2f2f2', cname: 'WHITE', d: 0 },
  { color: '#ff3b4f', cname: 'RED', d: 5 },
  { color: '#3bff8a', cname: 'GREEN', d: 8 },
  { color: '#3b8bff', cname: 'BLUE', d: 2 },
];

export const expert = {
  id: 'expert', title: 'Zero Hour Vault', tier: 'EXPERT', ages: 'Agents only · 15:00 timer', color: '#ff2050', par: 480, limit: 900, tableScale: 10,
  failTitle: 'MISSION FAILED', failReason: 'Time ran out before the vault opened.', failLine: 'The vault resets. Try again, Agent.',
  learn: ['Mirrors: light bounces off at the same angle it arrives', 'Morse code spells letters with short and long signals. SOS is ··· ––– ···'],
  intro: 'AGENT: you have 15 minutes. Kill the security grid, crack the codeword, open the vault. Read the mission board above the table.',
  build(api) {
    const { THREE, TX, mat, glowMat, box, cyl, sph } = api;
    const G = api.group;
    api.setScene({ bg: new THREE.Color('#020308') });
    const W = 9, D = 8, H = 3.4;
    const S = { grid: true, word: false, vault: false, wrong: 0, entry: '', listen: false };
    const tmp = new THREE.Vector3();
    shell(api, {
      w: W, d: D, h: H,
      floor: mat('#ffffff', { map: TX.rep(TX.panel('#1d222c', '#0b0e14', 'vfloor'), 6, 5), metal: 0.7, rough: 0.35 }),
      wall: mat('#ffffff', { map: TX.rep(TX.panel('#232a38', '#10141d', 'vwall'), 6, 2.2), metal: 0.6, rough: 0.45 }),
      ceil: mat('#ffffff', { map: TX.rep(TX.panel('#151922', '#0a0c12', 'vceil'), 6, 5), metal: 0.5, rough: 0.6 }),
      trim: '#0b0e14', trimH: 0.1,
    });
    // neon strips
    const neon = glowMat('#22e6ff', 0.95, false);
    for (const [w, d, x, z] of [[W, 0.03, 0, -D / 2 + 0.03], [W, 0.03, 0, D / 2 - 0.03], [0.03, D, W / 2 - 0.03, 0], [0.03, D, -W / 2 + 0.03, 0]]) {
      for (const y of [0.14, H - 0.08]) { const n = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), neon); n.position.set(x, y, z); G.add(n); }
    }

    // ---------- Lights ----------
    G.add(new THREE.HemisphereLight('#7fb0ff', '#05060a', 0.3));
    const top = new THREE.SpotLight('#cfe6ff', 26, 8, 0.75, 0.6, 1.5);
    top.position.set(0, H - 0.05, 0.9); top.target.position.set(0, 0, 0.3); top.castShadow = true; top.shadow.mapSize.set(1024, 1024); top.shadow.bias = -0.0008;
    G.add(top, top.target);
    for (const x of [-3, 3]) { const p = new THREE.PointLight('#2a7dff', 3, 6, 2); p.position.set(x, 2.6, 1.5); G.add(p); }
    const alarm = new THREE.SpotLight('#ff1030', 18, 9, 0.35, 0.5, 1.5); alarm.position.set(0, H - 0.2, -2.6); G.add(alarm, alarm.target);
    const alarmBulb = sph(0.1, glowMat('#ff2040', 1, false), 16, { cast: false }); alarmBulb.position.set(0, H - 0.12, -2.6); G.add(alarmBulb);
    api.onUpdate((dt, t) => {
      if (S.grid) { alarm.target.position.set(Math.sin(t * 0.7) * 3, 0, -2.6 + Math.cos(t * 0.7) * 2.5); alarm.intensity = 10; }
      else alarm.intensity = Math.max(0, alarm.intensity - dt * 20);
      alarmBulb.material.color.set(S.grid ? '#ff2040' : '#3bff8a');
    });

    // ---------- Mission board ----------
    const board = api.screen(1024, 420, 1.7, (g, w, h) => {
      g.fillStyle = 'rgba(4,10,22,0.82)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 26); g.fill();
      g.strokeStyle = '#22e6ff'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#22e6ff'; g.font = '900 54px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('MISSION: ZERO HOUR', 40, 62);
      const obj = [[!S.grid, 'Disable the security grid  (laser table)'], [S.word, 'Decode the beacon · enter the codeword'], [S.vault, 'Open the vault']];
      obj.forEach(([done, t], i) => {
        const y = 150 + i * 88;
        g.strokeStyle = done ? '#3bff8a' : '#ffffff'; g.lineWidth = 5; g.strokeRect(44, y - 26, 52, 52);
        if (done) { g.fillStyle = '#3bff8a'; g.font = '900 52px system-ui'; g.fillText('✓', 50, y + 2); }
        g.fillStyle = done ? '#8affb8' : '#ffffff'; g.font = '700 44px system-ui'; g.fillText(t, 124, y);
      });
    });
    board.position.set(0, 2.45, -0.9); board.lookAt(0, 1.2, 1.6); G.add(board);

    // ---------- Laser table (center) ----------
    const tbl = new THREE.Group(); tbl.position.set(0, 0, 0.3); G.add(tbl);
    const ttop = box(1.4, 0.08, 1.4, mat('#2a303c', { metal: 0.8, rough: 0.3 })); ttop.position.y = 0.76; tbl.add(ttop);
    const tped = cyl(0.25, 0.4, 0.72, mat('#1a1e27', { metal: 0.7, rough: 0.4 }), 32); tped.position.y = 0.36; tbl.add(tped);
    const gridC = document.createElement('canvas'); gridC.width = gridC.height = 512; const gc = gridC.getContext('2d');
    gc.fillStyle = '#05121a'; gc.fillRect(0, 0, 512, 512); gc.strokeStyle = 'rgba(34,230,255,0.45)'; gc.lineWidth = 3;
    for (let i = 0; i <= 5; i++) { gc.beginPath(); gc.moveTo(6 + i * 100, 6); gc.lineTo(6 + i * 100, 506); gc.stroke(); gc.beginPath(); gc.moveTo(6, 6 + i * 100); gc.lineTo(506, 6 + i * 100); gc.stroke(); }
    const gT = new THREE.CanvasTexture(gridC); gT.colorSpace = THREE.SRGBColorSpace;
    const gridM = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.02), new THREE.MeshBasicMaterial({ map: gT, toneMapped: false }));
    gridM.rotation.x = -Math.PI / 2; gridM.position.y = 0.801; tbl.add(gridM);
    const Y = 0.86, cell = 0.2;
    const cx = (c) => (c - 2) * cell, cz = (r) => (r - 2) * cell;
    const mirrors = [
      { c: 1, r: 2, st: '\\' }, { c: 1, r: 0, st: '\\' }, { c: 4, r: 0, st: '\\' }, { c: 3, r: 2, st: '/' }, { c: 4, r: 4, st: '/' }, { c: 2, r: 4, st: '\\' },
    ];
    const blockers = [[2, 2], [3, 1], [0, 4]];
    const emitter = new THREE.Group(); emitter.position.set(cx(-1) + 0.08, Y, cz(2)); tbl.add(emitter);
    const em = box(0.1, 0.09, 0.09, mat('#3a3f4c', { metal: 0.8, rough: 0.3 })); emitter.add(em);
    const emL = sph(0.025, glowMat('#ff2040', 1, false), 12, { cast: false }); emL.position.x = 0.055; emitter.add(emL);
    const recv = new THREE.Group(); recv.position.set(cx(4), Y, cz(-1) + 0.08); tbl.add(recv);
    const rm = box(0.09, 0.09, 0.1, mat('#3a3f4c', { metal: 0.8, rough: 0.3 })); recv.add(rm);
    const rmL = sph(0.03, glowMat('#ffb020', 1, false), 12, { cast: false }); rmL.position.z = 0.055; recv.add(rmL);
    const tl = TX.label('EMITTER', { w: 0.16, size: 50, weight: 800, color: '#ff8090' }); tl.rotation.x = -Math.PI / 2; tl.position.set(cx(-1) + 0.08, 0.81, cz(2) + 0.1); tbl.add(tl);
    const rl = TX.label('RECEIVER', { w: 0.17, size: 50, weight: 800, color: '#ffd27a' }); rl.rotation.x = -Math.PI / 2; rl.position.set(cx(4) - 0.16, 0.81, cz(-1) + 0.06); tbl.add(rl);
    blockers.forEach(([c, r]) => { const b = box(0.13, 0.12, 0.13, mat('#4a3a20', { metal: 0.3, rough: 0.6 })); b.position.set(cx(c), 0.86, cz(r)); tbl.add(b); const st = box(0.135, 0.02, 0.135, mat('#ffcc00')); st.position.set(cx(c), 0.88, cz(r)); tbl.add(st); });
    const glass = new THREE.MeshStandardMaterial({ color: '#cfefff', metalness: 1, roughness: 0.05, envMapIntensity: 2 });
    mirrors.forEach((m) => {
      const g = new THREE.Group(); g.position.set(cx(m.c), 0.8, cz(m.r)); tbl.add(g);
      const base = cyl(0.07, 0.08, 0.03, mat('#1a1e27', { metal: 0.8 }), 24); base.position.y = 0.015; g.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.006, 8, 32), glowMat('#22e6ff', 0.9, false)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.032; g.add(ring);
      const pivot = new THREE.Group(); pivot.position.y = 0.09; g.add(pivot);
      const panel = box(0.16, 0.11, 0.012, glass); pivot.add(panel);
      const back = box(0.16, 0.11, 0.004, mat('#20242c')); back.position.z = -0.008; pivot.add(back);
      pivot.rotation.y = m.st === '/' ? Math.PI / 4 : -Math.PI / 4;
      m.pivot = pivot;
      api.addIA(g, {
        label: 'Rotate mirror', hoverScale: 1.12, dwell: 0.9, repeat: true, enabled: () => S.grid,
        onActivate: () => {
          m.st = m.st === '/' ? '\\' : '/';
          const from = pivot.rotation.y, to = m.st === '/' ? Math.PI / 4 : -Math.PI / 4;
          api.sfx.tick();
          api.anim(0.25, (k) => { pivot.rotation.y = from + (to - from) * k; }).then(trace);
        },
      });
    });
    const beamMat = glowMat('#ff2040', 0.85), coreMat = glowMat('#ffd0d8', 0.9);
    const segs = [];
    for (let i = 0; i < 14; i++) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8, 1, true), beamMat);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6, 1, true), coreMat);
      a.add(b); a.visible = false; tbl.add(a); segs.push(a);
    }
    const yAxis = new THREE.Vector3(0, 1, 0);
    function trace() {
      let c = -1, r = 2, dx = 1, dz = 0;
      const pts = [new THREE.Vector3(cx(-1) + 0.13, Y, cz(2))];
      let hit = false;
      for (let step = 0; step < 40; step++) {
        c += dx; r += dz;
        if (c < 0 || c > 4 || r < 0 || r > 4) {
          if (c === 4 && r === -1) { hit = true; pts.push(new THREE.Vector3(cx(4), Y, cz(-1) + 0.12)); }
          else pts.push(new THREE.Vector3(cx(Math.max(-0.4, Math.min(4.4, c))), Y, cz(Math.max(-0.4, Math.min(4.4, r)))));
          break;
        }
        if (blockers.some(([bc, br]) => bc === c && br === r)) { pts.push(new THREE.Vector3(cx(c) - dx * 0.065, Y, cz(r) - dz * 0.065)); break; }
        const m = mirrors.find((mm) => mm.c === c && mm.r === r);
        if (m) {
          pts.push(new THREE.Vector3(cx(c), Y, cz(r)));
          if (m.st === '/') { const ndx = -dz, ndz = -dx; dx = ndx; dz = ndz; } else { const ndx = dz, ndz = dx; dx = ndx; dz = ndz; }
        }
      }
      segs.forEach((s, i) => {
        if (i >= pts.length - 1) { s.visible = false; return; }
        const a = pts[i], b = pts[i + 1];
        const len = a.distanceTo(b);
        s.visible = len > 0.001;
        s.position.copy(a).lerp(b, 0.5);
        s.scale.set(1, len, 1);
        s.quaternion.setFromUnitVectors(yAxis, tmp.copy(b).sub(a).normalize());
      });
      rmL.material.color.set(hit ? '#3bff8a' : '#ffb020');
      if (hit && S.grid) gridOff();
    }
    trace();

    // ---------- Security grid + vault (north) ----------
    const lasers = new THREE.Group(); G.add(lasers);
    const lmat = glowMat('#ff1030', 0.8);
    const lzs = [-2.2, -2.5];
    for (const z of lzs) for (let i = 0; i < 5; i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, W - 0.4, 6, 1, true), lmat); l.rotation.z = Math.PI / 2; l.position.set(0, 0.3 + i * 0.42, z); lasers.add(l);
    }
    const sweep = [];
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.4, 6, 1, true), lmat); l.position.set(-3 + i * 2, 1.4, -2.35); lasers.add(l); sweep.push(l); }
    for (const x of [-W / 2 + 0.12, W / 2 - 0.12]) for (const z of lzs) { const em2 = box(0.12, 2.3, 0.12, mat('#2a303c', { metal: 0.8 })); em2.position.set(x, 1.15, z); G.add(em2); }
    api.onUpdate((dt, t) => {
      if (!lasers.visible) return;
      sweep.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.1 + i * 1.7) * 0.7; });
      lmat.opacity = S.grid ? 0.7 + Math.sin(t * 1.5) * 0.06 : lmat.opacity * 0.9;
      if (!S.grid && lmat.opacity < 0.02) lasers.visible = false;
    });
    const vault = new THREE.Group(); vault.position.set(0, 1.45, -D / 2 + 0.05); G.add(vault);
    const steel = mat('#8a93a6', { metal: 0.95, rough: 0.22 });
    const vframe = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 20, 64), steel); vframe.position.z = 0.1; vault.add(vframe);
    const vportal = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), api.portalMat('#ff2050', '#ffd27a')); vportal.position.z = 0.02; vault.add(vportal);
    const vdoor = new THREE.Group(); vault.add(vdoor);
    const vd = cyl(1.18, 1.18, 0.3, steel, 64); vd.rotation.x = Math.PI / 2; vd.position.z = 0.2; vdoor.add(vd);
    for (let i = 0; i < 3; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(0.3 + i * 0.3, 0.025, 8, 64), mat('#5a6272', { metal: 0.9, rough: 0.3 })); rr.position.z = 0.36; vdoor.add(rr); }
    const wheel = new THREE.Group(); wheel.position.z = 0.42; vdoor.add(wheel);
    const hubV = cyl(0.12, 0.12, 0.12, mat('#c9a24a', { metal: 0.95, rough: 0.2 }), 24); hubV.rotation.x = Math.PI / 2; wheel.add(hubV);
    for (let i = 0; i < 3; i++) { const sp = box(0.9, 0.05, 0.05, mat('#c9a24a', { metal: 0.95, rough: 0.2 })); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const bolt = cyl(0.05, 0.05, 0.1, steel, 12); bolt.rotation.x = Math.PI / 2; bolt.position.set(Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0.36); vdoor.add(bolt); }
    const vlight = new THREE.PointLight('#ffd27a', 0, 6, 2); vlight.position.set(0, 0, 0.8); vault.add(vlight);
    const vSign = TX.label('VAULT 0', { w: 0.7, size: 80, weight: 900, color: '#ff4060', glow: '#ff1030' }); vSign.position.set(0, 1.62, 0.1); vault.add(vSign);
    const vkp = api.keypad({ code: VAULT, color: '#ff8090', title: 'VAULT', bodyColor: '#262b36', enabled: () => !S.grid, onSolve: openVault, onWrong: () => {
      S.wrong++; api.penalty(30);
      api.msg(`ACCESS DENIED. Security penalty: −30 seconds. (${S.wrong} failed attempt${S.wrong > 1 ? 's' : ''})`, '#ff5470');
    } });
    vkp.position.set(1.85, 1.35, -D / 2 + 0.08); G.add(vkp);
    function openVault() {
      S.vault = true; board.redraw();
      api.msg('VAULT OPEN. Mission complete, Agent!', '#7dffb0');
      api.sfx.solve(); vlight.intensity = 8;
      api.anim(1.2, (k) => { wheel.rotation.z = k * Math.PI * 2; }).then(() => api.anim(1.6, (k) => { vdoor.position.x = k * 2.7; api.shadowsDirty(); })).then(() => setTimeout(() => api.escape(), 700));
    }
    function gridOff() {
      S.grid = false; board.redraw();
      api.sfx.solve(); api.sfx.mech();
      api.msg('SECURITY GRID OFFLINE. The monitors on the east wall are booting… and the path to the vault is clear.', '#7dffb0', 12);
      monitors.forEach((m, i) => setTimeout(() => { m.on = true; m.scr.redraw(true); api.sfx.tick(); }, 500 + i * 350));
      api.refreshSeats();
    }

    // ---------- Monitors (east wall) ----------
    const monitors = MONITORS.map((m, i) => {
      const g = new THREE.Group(); g.position.set(W / 2 - 0.08, 1.75, -1.65 + i * 1.1); g.rotation.y = -Math.PI / 2; G.add(g);
      const bez = box(0.95, 0.62, 0.06, mat('#0c0f15', { metal: 0.6, rough: 0.4 })); g.add(bez);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.99, 0.66), glowMat(m.color, 0.9, false)); edge.position.z = -0.031; g.add(edge);
      const o = { on: false };
      o.scr = api.screen(512, 320, 0.88, (gg, w, h, on = false) => {
        if (!on) {
          gg.fillStyle = '#0b0d12'; gg.fillRect(0, 0, w, h);
          for (let k = 0; k < 2500; k++) { const v = 20 + Math.random() * 35 | 0; gg.fillStyle = `rgb(${v},${v},${v})`; gg.fillRect(Math.random() * w, Math.random() * h, 3, 2); }
          gg.fillStyle = '#ffffff'; gg.font = '800 40px ui-monospace, monospace'; gg.textAlign = 'center'; gg.fillText('NO SIGNAL', w / 2, h / 2 + 14);
          return;
        }
        gg.fillStyle = '#05080e'; gg.fillRect(0, 0, w, h);
        gg.strokeStyle = m.color; gg.lineWidth = 10; gg.strokeRect(8, 8, w - 16, h - 16);
        gg.fillStyle = m.color; gg.font = '800 38px ui-monospace, monospace'; gg.textAlign = 'center'; gg.textBaseline = 'middle';
        gg.fillText(`CAM ${i + 1} · ${m.cname}`, w / 2, 52);
        gg.shadowColor = m.color; gg.shadowBlur = 30; gg.font = '900 190px ui-monospace, monospace'; gg.fillText(String(m.d), w / 2, 190);
      }, { transparent: false, renderOrder: 3 });
      o.scr.position.z = 0.032; g.add(o.scr);
      api.addIA(g, { label: `${m.cname} monitor`, hoverScale: 1.03, onActivate: () => api.msg(o.on ? `The ${m.cname.toLowerCase()} monitor shows the number ${m.d}.` : 'NO SIGNAL. Something is jamming the cameras.', '#cfe8ff') });
      let nt = 0; api.onUpdate((dt) => { nt += dt; if (!o.on && nt > 1.2) { nt = 0; o.scr.redraw(false); } });
      return o;
    });

    // ---------- Morse beacon + chart (west wall) ----------
    const beacon = new THREE.Group(); beacon.position.set(-W / 2 + 0.2, 2.15, -1.2); G.add(beacon);
    const bBase = cyl(0.16, 0.18, 0.1, mat('#2a303c', { metal: 0.8 }), 24); bBase.rotation.z = Math.PI / 2; beacon.add(bBase);
    const bDome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffb020', { emissive: '#ffb020', ei: 0.05, transparent: true, opacity: 0.9, rough: 0.2 }));
    bDome.rotation.z = -Math.PI / 2; bDome.position.x = 0.05; beacon.add(bDome);
    const bL = new THREE.PointLight('#ffb020', 0, 4, 2); bL.position.x = 0.4; beacon.add(bL);
    const bLabel = TX.label(['SIGNAL BEACON', 'look to toggle sound'], { w: 0.55, size: 48, weight: 800, colors: ['#ffd27a', '#a9b8d8'], bg: 'rgba(5,8,16,0.85)', radius: 12 });
    bLabel.position.set(0.06, 0.38, 0); bLabel.rotation.y = Math.PI / 2; beacon.add(bLabel);
    // timeline
    const U = 0.32, tl2 = [];
    WORD.split('').forEach((ch, li) => {
      MORSE[ch].split('').forEach((sym, si) => { tl2.push([1, sym === '.' ? U : U * 3]); if (si < MORSE[ch].length - 1) tl2.push([0, U]); });
      tl2.push([0, li < WORD.length - 1 ? U * 3 : U * 9]);
    });
    const total = tl2.reduce((a, b) => a + b[1], 0);
    let wasOn = false;
    api.onUpdate((dt, t) => {
      let x = t % total, on = false;
      for (const [v, d] of tl2) { if (x < d) { on = !!v; break; } x -= d; }
      bDome.material.emissiveIntensity = on ? 2.4 : 0.05;
      bL.intensity = on ? 1.5 : 0; // small lamp, under 2 flashes a second
      if (on && !wasOn && S.listen) { let rem = 0, xx = t % total; for (const [v, d] of tl2) { if (xx < d) { rem = d - xx; break; } xx -= d; } api.sfx.beep(Math.max(0.08, rem)); }
      wasOn = on;
    });
    api.addIA(beacon, { label: 'Signal beacon', hoverScale: 1.06, onActivate: () => { S.listen = !S.listen; api.msg(S.listen ? 'Beacon audio ON. Short = dot, long = dash. A long pause means the message repeats.' : 'Beacon audio OFF.', '#ffd27a'); } });
    const chartLines = ['MORSE CODE   ·  short  —  long'];
    const letters = Object.keys(MORSE);
    for (let i = 0; i < 9; i++) {
      const cols = [letters[i], letters[i + 9], letters[i + 18]].filter(Boolean).map((L) => `${L}  ${MORSE[L].replace(/\./g, '•').replace(/-/g, '—')}`.padEnd(13, ' '));
      chartLines.push(cols.join('   '));
    }
    const chart = TX.label(chartLines, { w: 2.0, size: 50, weight: 700, family: 'ui-monospace, Menlo, Consolas, monospace', align: 'left', colors: ['#ffd27a'], color: '#e6f4ff', bg: 'rgba(5,8,16,0.92)', border: '#ffb020', radius: 16, pad: 36, depthWrite: true });
    chart.position.set(-W / 2 + 0.06, 1.55, 0.45); chart.rotation.y = Math.PI / 2; G.add(chart);
    api.addIA(chart, { label: 'Morse chart', hoverScale: 1.02, onActivate: () => api.msg('A Morse code chart. Dot = short flash, dash = long flash.', '#ffd27a') });

    // ---------- Terminal (south-west) ----------
    const term = new THREE.Group(); term.position.set(-2.6, 0, 2.2); term.rotation.y = Math.PI - 0.2; G.add(term);
    const desk = box(1.5, 0.06, 0.7, mat('#2a303c', { metal: 0.7, rough: 0.35 })); desk.position.y = 0.76; term.add(desk);
    for (const x of [-0.68, 0.68]) { const l = box(0.06, 0.76, 0.6, mat('#1a1e27', { metal: 0.7 })); l.position.set(x, 0.38, 0); term.add(l); }
    const mon = box(1.0, 0.62, 0.05, mat('#0c0f15', { metal: 0.6 })); mon.position.set(0, 1.25, -0.25); mon.rotation.x = -0.12; term.add(mon);
    const tscr = api.screen(1024, 620, 0.94, (g, w, h) => {
      g.fillStyle = '#020a06'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(60,255,140,0.05)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
      g.fillStyle = '#3bff8a'; g.font = '700 40px ui-monospace, Menlo, monospace'; g.textAlign = 'left'; g.textBaseline = 'top';
      if (!S.word) {
        ['> SECURE TERMINAL v3', '> INTERCEPTED TRANSMISSION ON', '  SIGNAL BEACON (WEST WALL).', '> ENTER 4-LETTER CODEWORD:'].forEach((l, i) => g.fillText(l, 40, 40 + i * 58));
        g.font = '800 110px ui-monospace, Menlo, monospace';
        g.fillText(S.entry.padEnd(4, '_').split('').join(' '), 60, 330);
        if (S.bad) { g.fillStyle = '#ff5470'; g.font = '700 40px ui-monospace, monospace'; g.fillText('> REJECTED. TRY AGAIN.', 40, 510); }
      } else {
        ['> CODEWORD "NOVA" ACCEPTED', '> DECRYPTING VAULT SEQUENCE…', '', '  BLUE → RED → GREEN → WHITE', '', '> MATCH EACH COLOR TO ITS', '  CAMERA MONITOR (EAST WALL).'].forEach((l, i) => { g.fillStyle = i === 3 ? '#ffffff' : '#3bff8a'; g.font = i === 3 ? '900 52px ui-monospace, monospace' : '700 40px ui-monospace, monospace'; g.fillText(l, 40, 40 + i * 70); });
      }
    }, { transparent: false });
    tscr.position.set(0, 1.25, -0.22); tscr.rotation.x = -0.12; term.add(tscr);
    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
    const kb = new THREE.Group(); kb.position.set(0, 0.81, 0.08); kb.rotation.x = -Math.PI / 2 + 0.35; term.add(kb);
    const kw = 0.082;
    rows.forEach((row, ri) => row.split('').forEach((L, ci) => {
      const k = TX.label(L, { w: kw * 0.9, width: 120, height: 120, size: 76, weight: 800, color: '#cfffe0', bg: '#16202a', border: '#2a8a5a', borderWidth: 6, radius: 14, depthWrite: true });
      k.position.set((ci - (row.length - 1) / 2) * kw + ri * 0.02, 0.12 - ri * kw, 0);
      kb.add(k);
      api.addIA(k, { label: L, repeat: true, dwell: 0.75, hoverScale: 1.15, enabled: () => !S.word, onActivate: () => { if (S.entry.length < 4) { S.entry += L; S.bad = false; tscr.redraw(); api.sfx.tick(); } } });
    }));
    for (const [txt, x, fn, col] of [['DEL', -0.33, () => { S.entry = S.entry.slice(0, -1); S.bad = false; tscr.redraw(); }, '#6b1d2b'], ['ENTER', 0.33, submit, '#1d6b45']]) {
      const k = TX.label(txt, { w: kw * 2.2, width: 280, height: 120, size: 64, weight: 900, color: '#ffffff', bg: col, radius: 14, depthWrite: true });
      k.position.set(x, 0.12 - 3 * kw, 0); kb.add(k);
      api.addIA(k, { label: txt === 'DEL' ? 'Delete' : 'Enter', repeat: true, dwell: 0.8, hoverScale: 1.1, enabled: () => !S.word, onActivate: fn });
    }
    function submit() {
      if (S.entry === WORD) { S.word = true; tscr.redraw(); board.redraw(); api.sfx.solve(); api.msg('CODEWORD ACCEPTED. The terminal reveals the vault color sequence.', '#7dffb0', 12); }
      else { S.bad = true; S.entry = ''; tscr.redraw(); api.sfx.wrong(); }
    }

    api.dust(120, [9, 3, 8], '#9fdcff', [0, 1.6, 0]);

    api.lightSwitch(new THREE.Vector3(-W / 2 + 0.02, 1.3, 1.7), Math.PI / 2);
    api.secret(['★ SECRET ★', 'Laser light is one pure color', 'in a tight, narrow beam.'], 2.2).position.set(-2.6, 3.0, -D / 2 + 0.03);
    api.blob(0, 0.3, 1.0, 0.35); api.blob(-2.6, 2.2, 0.9, 0.3);
    api.addSeat(new THREE.Vector3(0, 0, 1.55), 0, { label: 'Laser table' });
    api.addSeat(new THREE.Vector3(-2.2, 0, 0.2), Math.PI / 2 * 1.25, { label: 'Beacon & terminal' });
    api.addSeat(new THREE.Vector3(2.4, 0, 0.2), -Math.PI / 2, { label: 'Camera monitors' });
    api.addSeat(new THREE.Vector3(0.7, 0, -1.75), -0.22, { label: 'Vault', locked: () => S.grid, lockedMsg: 'The security grid is live. Lasers block the vault. Disable it first!' });

    return {
      hint() {
        if (S.grid) return 'Laser table: look at mirrors to flip them. Guide the red beam from the EMITTER (left) to the RECEIVER (top-right). The beam must turn 3 times; yellow crates block it.';
        if (!S.word) return 'The amber SIGNAL BEACON on the west wall blinks Morse code: short flash = dot, long flash = dash. Decode the 4 letters with the chart and type them at the terminal.';
        return 'The terminal gave a color order. Each camera monitor (east wall) shows one number for its color. Glide to the vault and enter the 4 numbers in that order.';
      },
      answer() {
        if (S.grid) return 'Flip 3 mirrors: the first mirror the beam hits, the mirror straight beyond it at the far edge, and the mirror in the far-right corner.';
        if (!S.word) return 'The beacon spells N O V A. Type NOVA at the terminal and press Enter.';
        return 'The vault code is 2 5 8 0 (blue, red, green, white).';
      },
      idle: () => S.grid ? 'Objective 1: kill the security grid at the laser table.' : !S.word ? 'Objective 2: decode the beacon.' : 'Objective 3: open the vault.',
    };
  },
};
