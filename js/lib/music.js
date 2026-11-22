// SeatBreak - original composed music (stage 2). Pure Web Audio, no samples, no imports.
// Every track is a hand-written 16-bar A/B composition (melody + bass + accompaniment + light rhythm),
// rendered by small layered/detuned oscillator instruments. Deterministic: identical on every play.

const TRACK_IDS = ['hub', 'kids', 'teens', 'flood', 'adults', 'theater', 'expert', 'mind'];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- low-level voices ---------- */
const nbufs = new WeakMap();
function noiseBuf(ctx) {
  let b = nbufs.get(ctx);
  if (!b) {
    const n = Math.floor(ctx.sampleRate * 1), r = rng(99);
    b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    nbufs.set(ctx, b);
  }
  return b;
}
function free(...nodes) { nodes.forEach((n) => { try { if (n) n.disconnect(); } catch (e) { /* ignore */ } }); }

// Polyphony guard: at most 10 overlapping accompaniment notes (14 for melody/bass/stings) per context.
const VST = new WeakMap();
function admit(ctx, t, end, prio) {
  let s = VST.get(ctx);
  if (!s) VST.set(ctx, (s = []));
  for (let i = s.length - 1; i >= 0; i--) if (s[i] <= t) s.splice(i, 1);
  if (s.length >= (prio ? 14 : 10)) return false;
  s.push(end); return true;
}

// Generic layered synth voice. o.osc = [[type, ratio, detuneCents, level], ...]
// o.fm = [ratio, index, decay]  o.vib = [rate, cents, delay]
// o.lp = cutoff | [start, end, time] | [start, end, time, peak, peakTime]
function synth(ctx, dest, t, f, o, prio) {
  const att = o.att || 0.005, dec = o.dec || 0.3, sus = o.sus || 0, rel = o.rel || 0.15;
  const hold = Math.max(o.dur || 0, att + 0.02);
  const end = sus > 0 ? t + hold + rel : t + att + dec;
  if (!admit(ctx, t, end, prio)) return;
  const g = ctx.createGain(), nodes = [g];
  let head = g;
  if (o.lp) {
    const lp = ctx.createBiquadFilter(), L = o.lp;
    lp.type = 'lowpass'; lp.Q.value = o.q || 0.7;
    if (typeof L === 'number') lp.frequency.setValueAtTime(L, t);
    else {
      lp.frequency.setValueAtTime(L[0], t);
      if (L[3]) { lp.frequency.linearRampToValueAtTime(L[3], t + L[4]); lp.frequency.setTargetAtTime(L[1], t + L[4], L[2] / 3); }
      else lp.frequency.setTargetAtTime(L[1], t, L[2] / 3);
    }
    lp.connect(g); head = lp; nodes.push(lp);
  }
  const oscs = o.osc.map(([type, ratio, det, lvl]) => {
    const x = ctx.createOscillator(), xg = ctx.createGain();
    x.type = type;
    if (o.glide) {
      x.frequency.setValueAtTime(f * ratio * o.glide, t);
      x.frequency.exponentialRampToValueAtTime(f * ratio, t + (o.gt || 0.06));
    } else x.frequency.setValueAtTime(f * ratio, t);
    if (det) x.detune.setValueAtTime(det, t);
    xg.gain.value = lvl; x.connect(xg); xg.connect(head); nodes.push(x, xg);
    return x;
  });
  const extra = [];
  if (o.fm) {
    const [r, idx, d] = o.fm, mod = ctx.createOscillator(), mg = ctx.createGain();
    mod.frequency.setValueAtTime(f * r, t);
    mg.gain.setValueAtTime(f * idx, t); mg.gain.setTargetAtTime(f * idx * 0.06, t, d / 3);
    mod.connect(mg); oscs.forEach((x) => mg.connect(x.frequency)); nodes.push(mod, mg); extra.push(mod);
  }
  if (o.vib) {
    const [rate, depth, dl] = o.vib, lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = rate;
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + dl); lg.gain.linearRampToValueAtTime(depth, t + dl + 0.25);
    lfo.connect(lg); oscs.forEach((x) => lg.connect(x.detune)); nodes.push(lfo, lg); extra.push(lfo);
  }
  const v = o.vol;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + att);
  if (sus > 0) { g.gain.setTargetAtTime(v * sus, t + att, dec / 3); g.gain.setTargetAtTime(0, t + hold, rel / 5); }
  else g.gain.setTargetAtTime(0, t + att, dec / 5);
  g.connect(dest);
  const stopAt = end + 0.04;
  oscs.concat(extra).forEach((x) => { x.start(t); x.stop(stopAt); });
  oscs[0].onended = () => free(...nodes);
}

function nz(ctx, dest, t, dur, vol, freq, q, type, prio) {
  if (!admit(ctx, t, t + dur, prio)) return;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf(ctx);
  f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.003);
  g.gain.setTargetAtTime(0, t + 0.003, dur / 5);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, (freq * 0.0137) % 0.5); s.stop(t + dur + 0.03);
  s.onended = () => free(s, f, g);
}

/* ---------- instrument palette ---------- */
const I = {
  ep: () => ({ osc: [['sine', 1, 0, 1], ['triangle', 2, 4, 0.06]], fm: [1, 1.1, 0.6], att: 0.004, dec: 1.8 }), // FM e-piano bell
  glass: () => ({ osc: [['sine', 1, 0, 1], ['sine', 2, 7, 0.12]], fm: [3.5, 1.3, 0.35], att: 0.006, dec: 2.6 }), // inharmonic glass bell
  mbox: () => ({ osc: [['sine', 1, 0, 1], ['sine', 3, 0, 0.1]], fm: [5, 0.55, 0.08], att: 0.002, dec: 1.0 }), // music box tine
  blk: () => ({ osc: [['sine', 1, 0, 1]], att: 0.001, dec: 0.07 }), // woodblock
  pad: (d) => ({ osc: [['sawtooth', 1, -8, 0.5], ['sawtooth', 1, 8, 0.5]], lp: 950, q: 0.5, att: 1.0, dec: 1, sus: 0.85, rel: 1.2, dur: d }),
  tpad: (d) => ({ osc: [['triangle', 1, -6, 0.6], ['triangle', 1, 6, 0.6]], lp: 1600, att: 1.1, dec: 1, sus: 0.9, rel: 1.3, dur: d }),
  sub: (d) => ({ osc: [['sine', 1, 0, 1], ['triangle', 2, 0, 0.12]], att: 0.04, dec: 0.6, sus: 0.7, rel: 0.4, dur: d }),
  kbass: () => ({ osc: [['triangle', 1, 0, 1], ['sine', 1, 0, 0.6]], lp: [1300, 380, 0.15], att: 0.004, dec: 0.38 }),
  arp: () => ({ osc: [['sawtooth', 1, 0, 0.45], ['triangle', 1, 6, 0.6]], lp: [2400, 480, 0.3], q: 2, att: 0.003, dec: 0.55 }),
  lead: (d) => ({ osc: [['triangle', 1, 0, 1], ['sine', 2, 0, 0.12]], vib: [5, 14, 0.2], att: 0.04, dec: 0.4, sus: 0.75, rel: 0.25, dur: d }),
  wpl: (d, c) => ({ osc: [['triangle', 1, 0, 1], ['sawtooth', 1, -5, 0.25]], lp: [c * 1.8, c * 0.55, 0.5], q: 3, att: 0.004, dec: 1.2 }),
  wlead: (d, c) => ({ osc: [['sawtooth', 1, 0, 0.4], ['triangle', 1, 4, 0.8]], lp: [c * 2.2, c * 0.8, 0.8], q: 2, att: 0.01, dec: 0.8, sus: 0.5, rel: 0.5, dur: d }),
  drip: () => ({ osc: [['sine', 1, 0, 1]], glide: 0.6, gt: 0.05, att: 0.004, dec: 0.25 }),
  hpsi: () => ({ osc: [['sawtooth', 1, -4, 0.45], ['sawtooth', 2, 5, 0.1], ['square', 1, 3, 0.1]], lp: [3800, 1300, 0.25], att: 0.002, dec: 0.9 }),
  viol: (d) => ({ osc: [['sawtooth', 1, 0, 0.35], ['triangle', 1, 0, 0.7]], lp: 600, vib: [4.5, 8, 0.3], att: 0.06, dec: 0.4, sus: 0.7, rel: 0.25, dur: d }),
  reed: (d) => ({ osc: [['square', 1, 0, 0.35], ['sawtooth', 1, 7, 0.3]], lp: 1500, q: 2.5, vib: [5.6, 16, 0.12], att: 0.025, dec: 0.25, sus: 0.8, rel: 0.09, dur: d }),
  tuba: (d) => ({ osc: [['triangle', 1, 0, 1], ['sine', 1, 0, 0.7]], lp: [900, 500, 0.15], att: 0.015, dec: 0.35, sus: 0.35, rel: 0.1, dur: d }),
  pah: () => ({ osc: [['triangle', 1, 0, 1], ['square', 1, 0, 0.1]], lp: [2200, 700, 0.12], att: 0.004, dec: 0.22 }),
  mbass: () => ({ osc: [['sine', 1, 0, 1], ['triangle', 1, 0, 0.6]], lp: [1000, 240, 0.15], att: 0.005, dec: 0.55 }),
  stab: (d) => ({ osc: [['sawtooth', 1, -9, 0.45], ['sawtooth', 1, 9, 0.45]], lp: [350, 800, 0.25, 1600, 0.06], q: 1.5, att: 0.035, dec: 0.3, sus: 0.45, rel: 0.18, dur: d }),
  horn: (d) => ({ osc: [['sawtooth', 1, 0, 0.4], ['triangle', 1, -5, 0.7]], lp: [500, 1000, 0.3, 1400, 0.08], vib: [5, 10, 0.3], att: 0.05, dec: 0.3, sus: 0.75, rel: 0.18, dur: d }),
  kick: () => ({ osc: [['sine', 1, 0, 1]], glide: 2.2, gt: 0.06, att: 0.004, dec: 0.3 }),
};
// noise percussion: [dur, freq, Q, filterType]
const NZ = { shk: [0.05, 4200, 1.2], hat: [0.04, 5200, 1], rim: [0.035, 1900, 4], brush: [0.12, 1500, 0.7] };

function play(ctx, dest, t, e, sd, s, tr) {
  const [k, m, steps, v, p] = e, vol = v * tr.lvl;
  if (NZ[k]) { const z = NZ[k]; return nz(ctx, dest, t, z[0], vol, z[1], z[2], z[3], p); }
  const mk = I[k];
  if (!mk) return undefined;
  const o = mk(steps * sd, tr.lfoCut ? tr.lfoCut(s) : 1200);
  o.vol = vol;
  return synth(ctx, dest, t, mtof(m), o, p);
}

/* ---------- composition helpers ---------- */
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (a) => (a === '#' ? 1 : a === 'b' ? -1 : 0);
function nm(s) { const m = /^([A-G])([#b]?)(\d)$/.exec(s); return 12 * (+m[3] + 1) + PC[m[1]] + acc(m[2]); }
// melody string: tokens NOTE[.steps] or _[.steps] (rest)
function mel(str) {
  const notes = []; let s = 0;
  str.trim().split(/\s+/).forEach((tok) => {
    const [n, d] = tok.split('.'), dur = +(d || 1);
    if (n !== '_') notes.push([s, nm(n), dur]);
    s += dur;
  });
  return { notes, len: s };
}
const Q = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], sus4: [0, 5, 7] };
function chord(sym) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(sym), r = (PC[m[1]] + acc(m[2]) + 12) % 12;
  return { root: r, pcs: Q[m[3]].map((x) => (x + r) % 12) };
}
const place = (pc, lo) => lo + ((((pc - lo) % 12) + 12) % 12);
const voiced = (c, lo) => c.pcs.map((p) => place(p, lo)).sort((a, b) => a - b);

function compose(def) {
  const ch = def.prog.trim().split(/\s+/).map(chord), bars = ch.length, spb = def.spb, steps = spb * bars;
  const ev = Array.from({ length: steps }, () => []);
  const add = (s, k, m, d, v, p) => { if (s >= 0 && s < steps) ev[s].push([k, m, d, v, p ? 1 : 0]); };
  const M = mel(def.mel);
  M.notes.forEach(([s, m, d]) => add(s, def.lead, m + (def.tr || 0), d, def.lv * (s % spb === 0 ? 1.08 : 1), 1));
  ch.forEach((c, b) => def.arr(add, b * spb, c, ch[(b + 1) % bars], b));
  const key = ch[0].root;
  return Object.assign({ lvl: 1, swing: 0, fb: 0.3, dly: 0.75 }, def, {
    bars, steps, ev, melLen: M.len, ped: place(key + 7, 74), pulse: place(key, 36),
  });
}

/* ---------- the eight compositions (all original) ---------- */
const BUILD = {
  // Lobby: warm, welcoming D major. FM e-piano bell, triangle pad, sub bass, soft shaker.
  hub: () => compose({
    lvl: 0.8, bpm: 76, sb: 0.5, spb: 8, cut: 3400, fb: 0.35, lead: 'ep', lv: 0.16,
    prog: 'D Bm G A D F#m G A  Em G D Bm G A Bm A',
    mel: 'F#5.2 A5.2 D6.3 _.1  C#6.2 B5.2 F#5.4  G5.2 B5.2 D6.2 E6.2  C#6.6 _.2 ' +
      'F#5.2 A5.2 E6.3 D6.1  C#6.2 A5.2 F#5.2 A5.2  B5.3 A5.1 G5.2 F#5.2  E5.6 _.2 ' +
      'G5.2 B5.2 E6.4  D6.2 B5.2 G5.4  A5.2 F#5.2 A5.2 D6.2  F#6.4 E6.2 D6.2 ' +
      'B5.3 C#6.1 D6.2 B5.2  A5.4 E5.4  D6.2 C#6.2 B5.2 A5.2  A5.6 _.2',
    arr(add, s, c) {
      const v = voiced(c, 57);
      add(s, 'tpad', v[1], 8, 0.05); add(s, 'tpad', v[2], 8, 0.045);
      add(s, 'sub', place(c.root, 38), 5, 0.2, 1); add(s + 6, 'sub', place(c.root + 7, 38), 2, 0.12, 1);
      add(s + 4, 'ep', place(c.pcs[0], 62), 2, 0.05);
      for (let i = 1; i < 8; i += 2) add(s + i, 'shk', 0, 0, i === 5 ? 0.03 : 0.02);
    },
  }),
  // Kids: bouncy F major music box, plucky bass, woodblock.
  kids: () => compose({
    lvl: 1.2, bpm: 100, sb: 0.5, spb: 8, swing: 0.1, cut: 3800, fb: 0.22, dly: 0.5, lead: 'mbox', lv: 0.17,
    prog: 'F C Dm Bb F C Bb F  Bb F Gm C Am Dm C F',
    mel: 'C6 A5 C6 F6.2 _ E6 D6  E6 G5 C6.2 _.2 G5 A5  F5 A5 D6.2 C6 A5 F5.2  G5.2 F5 D5 F5.4 ' +
      'C6 A5 C6 F6.2 _ G6 A6  G6.2 E6 C6 D6.2 E6.2  D6 C6 Bb5 A5 G5.2 C6.2  A5.2 F5.2 _.4 ' +
      'D6.2 F6.2 D6 C6 Bb5.2  C6.2 A5.2 F5.4  Bb5 A5 G5 Bb5 D6.2 G6.2  E6.3 D6 C6.2 _.2 ' +
      'C6 E6 A6.2 G6 E6 C6.2  D6.2 F6.2 A6.2 F6.2  G6 F6 E6 D6 C6 Bb5 A5 G5  F5.2 C6.2 F6.2 _.2',
    arr(add, s, c) {
      const v = voiced(c, 62);
      add(s, 'kbass', place(c.root, 41), 2, 0.22, 1); add(s + 4, 'kbass', place(c.root + 7, 41), 2, 0.18, 1);
      [2, 6].forEach((o) => { add(s + o, 'mbox', v[1], 1, 0.05); add(s + o, 'mbox', v[2], 1, 0.045); add(s + o, 'blk', 84, 1, 0.035); });
      [1, 3, 5, 7].forEach((o) => add(s + o, 'shk', 0, 0, 0.018));
    },
  }),
  // Teens: cool E minor, saw pad + filtered pluck arpeggio, vibrato lead, lo-fi kick/rim.
  teens: () => compose({
    lvl: 0.75, bpm: 84, sb: 0.5, spb: 8, cut: 3200, fb: 0.4, lead: 'lead', lv: 0.13,
    prog: 'Em Cmaj7 G D Em Cmaj7 Am7 B7  C D Bm7 Em Am7 D Cmaj7 B7',
    mel: 'B4.2 E5.2 G5.3 F#5  E5.6 _.2  D5.2 G5.2 B5.3 A5  F#5.6 _.2 ' +
      'B4.2 E5.2 G5.2 B5.2  C6.3 B5 G5.4  A5.2 G5.2 E5.2 C5.2  D#5.6 _.2 ' +
      'E5.2 G5.2 C6.4  D6.2 C6 B5 A5.4  B5.3 A5 F#5.4  G5.2 F#5.2 E5.4 ' +
      'C6.2 B5.2 A5.2 E5.2  F#5.3 G5 A5.4  G5.2 E5.2 B5.4  A5.2 F#5.2 D#5.4',
    arr(add, s, c) {
      const pv = voiced(c, 52), av = voiced(c, 64), pat = [0, 1, 2, 3, 2, 1, 0, 1];
      add(s, 'pad', pv[1], 8, 0.045); add(s, 'pad', pv[2], 8, 0.04);
      add(s, 'sub', place(c.root, 36), 7, 0.2, 1);
      pat.forEach((k, i) => add(s + i, 'arp', av[k % av.length] + (k >= av.length ? 12 : 0), 1, i === 0 ? 0.055 : 0.045));
      add(s, 'kick', 40, 1, 0.13); add(s + 5, 'kick', 40, 1, 0.07); add(s + 4, 'rim', 0, 0, 0.05);
    },
  }),
  // Flood: flowing D dorian, LFO-swept filtered plucks, soft drips, distant pump thump.
  flood: () => compose({
    lvl: 0.68, bpm: 72, sb: 0.5, spb: 8, cut: 2400, fb: 0.5, lead: 'wlead', lv: 0.14,
    lfoCut: (s) => 1100 + 650 * Math.sin((2 * Math.PI * s) / 32),
    prog: 'Dm C Bbmaj7 C Dm Am G Am  Bb C Dm Am Bb C Gm A',
    mel: 'A4.2 D5.2 E5.2 F5.2  E5.4 G5.2 E5.2  D5.3 C5 A4.4  C5.2 D5.2 E5.4 ' +
      'F5.2 A5.2 G5.2 F5.2  E5.4 C5.2 E5.2  D5.2 B4.2 D5.2 G5.2  E5.6 _.2 ' +
      'F5.2 D5.2 Bb4.2 D5.2  E5.2 G5.2 C6.4  A5.3 G5 F5.2 E5.2  E5.4 A4.4 ' +
      'D5.2 F5.2 A5.2 G5.2  G5.4 E5.4  D5.2 Bb4.2 G4.2 Bb4.2  C#5.4 E5.4',
    arr(add, s, c, n, b) {
      const v = voiced(c, 62), r = rng(41 + b);
      add(s, 'tpad', place(c.pcs[0], 50), 8, 0.05); add(s, 'tpad', place(c.pcs[2], 55), 8, 0.045);
      add(s, 'sub', place(c.root, 36), 8, 0.18, 1);
      [0, 1, 2, 4, 5, 6].forEach((o, i) => add(s + o, 'wpl', v[[0, 1, 2, 2, 1, 0][i] % v.length] + (i === 2 ? 12 : 0), 1, 0.05));
      add(s, 'kick', 38, 1, 0.08); add(s + 4, 'kick', 38, 1, 0.05);
      if (r() < 0.6) add(s + 3 + 4 * Math.floor(r() * 2), 'drip', [84, 86, 89, 91][Math.floor(r() * 4)], 1, 0.03);
    },
  }),
  // Adults: elegant A minor 3/4, harpsichord melody and broken chords, bowed viol bass.
  adults: () => compose({
    lvl: 1.4, bpm: 100, sb: 0.5, spb: 6, cut: 3300, fb: 0.28, dly: 1, lead: 'hpsi', lv: 0.13,
    prog: 'Am Dm G C F Dm E7 Am  C G Am Em F C Dm E7',
    mel: 'E5.2 A5 B5 C6.2  D6.2 C6 B5 A5.2  B5.2 D6 C6 B5.2  E5 G5 C6.4 ' +
      'A5.2 C6 A5 F5.2  F5 E5 D5.2 F5.2  G#5.2 B5.2 D6.2  C6.2 B5 G#5 A5.2 ' +
      'G5.2 C6 D6 E6.2  D6.2 B5.2 G5.2  C6.2 A5 B5 C6.2  B5.4 G5.2 ' +
      'A5 G5 F5 A5 C6.2  E6.2 D6 C6 G5.2  F5.2 A5 D6 C6 B5  G#5.4 E5.2',
    arr(add, s, c) {
      const v = voiced(c, 57);
      add(s, 'viol', place(c.root, 40), 6, 0.13, 1); add(s, 'hpsi', place(c.root, 45), 1, 0.05);
      [[1, 0], [2, 1], [3, 2], [4, 1], [5, 0]].forEach(([o, k]) => add(s + o, 'hpsi', v[(k + (o === 3 ? 1 : 0)) % v.length] + (o === 3 ? 12 : 0), 1, 0.04));
    },
  }),
  // Theater: playful vaudeville in C, vibrato reed, tuba oom-pah, brushed snare.
  theater: () => compose({
    lvl: 1.0, bpm: 116, sb: 0.5, spb: 8, swing: 0.14, cut: 3400, fb: 0.15, dly: 0.5, tr: -12, lead: 'reed', lv: 0.13,
    prog: 'C A7 Dm G7 C E7 F G7  F Fm C A7 D7 G7 C G7',
    mel: 'E5 G5 C6.2 B5 C6 E6.2  C#6.2 A5.2 G5 A5 E5.2  F5 A5 D6.2 C6 D6 F6.2  F6.2 D6.2 B5.4 ' +
      'E5 G5 C6.2 D6 E6 G6.2  G#5.2 B5.2 D6.2 B5.2  A5 C6 F6.2 E6 D6 C6.2  B5.2 D6.2 G5.2 _.2 ' +
      'A5.3 G5 F5.2 A5.2  Ab5.3 G5 F5.2 C6.2  G5.2 E5.2 C5.2 E5.2  A5.2 C#6.2 E6.2 G6.2 ' +
      'F#6.3 E6 D6.2 C6.2  B5.2 D6.2 F6.2 D6.2  E6 D6 C6.2 G5.2 E5.2  D5.2 F5.2 B5.2 D6.2',
    arr(add, s, c) {
      const v = voiced(c, 55);
      add(s, 'tuba', place(c.root, 36), 1.5, 0.21, 1); add(s + 4, 'tuba', place(c.root + 7, 36), 1.5, 0.17, 1);
      [2, 6].forEach((o) => { v.slice(1, 4).forEach((m) => add(s + o, 'pah', m, 1, 0.04)); add(s + o, 'brush', 0, 0, 0.045); });
      [1, 3, 5, 7].forEach((o) => add(s + o, 'shk', 0, 0, 0.014));
    },
  }),
  // Expert: noir D minor swing, muted walking bass, rim + ride, sparse brass stabs, muted horn lead.
  expert: () => compose({
    lvl: 1.1, bpm: 92, sb: 0.5, spb: 8, swing: 0.2, cut: 2600, fb: 0.25, lead: 'horn', lv: 0.11,
    prog: 'Dm7 Dm7 Gm7 A7 Dm7 Bbmaj7 Em7b5 A7  Gm7 C7 Fmaj7 Bbmaj7 Em7b5 A7 Dm7 A7',
    mel: '_.2 A4 C5 D5.3 _  F5.2 E5 D5 _.4  _.2 Bb4 D5 F5.3 _  E5.2 C#5.2 _.4 ' +
      '_.2 A4 C5 D5.2 F5.2  A5.4 F5.2 _.2  G5.2 E5 Bb4 _.4  C#5.4 _.4 ' +
      '_.2 D5 F5 A5.3 _  G5.2 E5.2 _.4  _.2 C5 F5 A5.2 C6.2  D6.4 A5.2 _.2 ' +
      '_.2 G5 Bb5 D6.2 C6.2  Bb5.2 G5 E5 C#5.4  D5.2 F5.2 A5.2 C6.2  A5.4 _.4',
    arr(add, s, c, n, b) {
      const r = place(c.root, 38), nr = place(n.root, 38);
      [r, place(c.pcs[1], 38), place(c.pcs[2], 38), nr > r ? nr - 1 : nr + 1].forEach((m, i) => add(s + i * 2, 'mbass', m, 2, 0.22, 1));
      add(s + 2, 'rim', 0, 0, 0.05); add(s + 6, 'rim', 0, 0, 0.05);
      [[0, 0.022], [2, 0.02], [3, 0.013], [4, 0.022], [6, 0.02], [7, 0.013]].forEach(([o, v]) => add(s + o, 'hat', 0, 0, v));
      add(s, 'kick', 38, 1, 0.06);
      if (b % 2 === 1) [c.pcs[1], c.pcs[3] === undefined ? c.pcs[2] : c.pcs[3], c.pcs[2]].forEach((p, i) => add(s + 3, 'stab', place(p, 58 + i * 3), 1, 0.04));
      if (b === 7 || b === 15) add(s + 7, 'stab', place(c.pcs[1], 62), 1, 0.035);
    },
  }),
  // Mind: dreamy C major / F lydian, glassy FM bells, saw pad, soft heartbeat.
  mind: () => compose({
    lvl: 0.8, bpm: 66, sb: 0.5, spb: 8, cut: 3200, fb: 0.5, dly: 1, lead: 'glass', lv: 0.13,
    prog: 'Fmaj7 G Em7 Am7 Fmaj7 G Cmaj7 Cmaj7  Dm7 Em7 Fmaj7 G Am7 Em7 Fmaj7 Gsus4',
    mel: 'A5.2 C6.2 E6.4  D6.4 B5.4  G5.2 B5.2 D6.2 E6.2  C6.6 _.2 ' +
      'A5.2 B5.2 C6.2 E6.2  D6.3 C6 B5.4  G5.4 E5.4  B5.6 _.2 ' +
      'F5.2 A5.2 C6.4  B5.2 G5.2 E6.4  E6.2 C6.2 A5.2 B5.2  D6.6 _.2 ' +
      'E6.2 C6.2 A5.4  G5.2 B5.2 E6.4  C6.3 B5 A5.4  G5.6 _.2',
    arr(add, s, c, n, b) {
      const v = voiced(c, 55);
      add(s, 'pad', v[1], 8, 0.042); add(s, 'pad', v[v.length > 3 ? 3 : 2], 8, 0.036);
      add(s, 'sub', place(c.root, 36), 8, 0.17, 1);
      add(s, 'kick', 36, 1, 0.06); add(s + 1, 'kick', 36, 1, 0.035);
      if (b % 2 === 1) add(s + 4, 'glass', place(c.pcs[2], 79), 2, 0.04);
    },
  }),
};
const cache = {};
function getTrack(id) { return cache[id] || (cache[id] = BUILD[id]()); }

/* ---------- shared step renderer (used by live scheduler AND offline) ---------- */
function renderStep(ctx, dest, tr, s, t, sd, tension) {
  const tt = t + ((s % 2) ? tr.swing * sd : 0), evs = tr.ev[s];
  for (let i = 0; i < evs.length; i++) play(ctx, dest, tt, evs[i], sd, s, tr);
  if (tension > 0.03) {
    const spBeat = Math.round(1 / tr.sb);
    if (s % spBeat === 0) synth(ctx, dest, t, mtof(tr.pulse), { osc: [['sine', 1, 0, 1]], glide: 1.5, gt: 0.05, att: 0.006, dec: 0.3, vol: 0.12 * tension }, 1);
    else nz(ctx, dest, t, 0.03, 0.025 * tension, 2600, 3);
    if (s % (tr.spb * 2) === 0) {
      synth(ctx, dest, t, mtof(tr.ped), { osc: [['triangle', 1, -5, 0.5], ['triangle', 1, 5, 0.5]], lp: 1800, vib: [6, 22, 0.6],
        att: 1.2, dec: 1, sus: 0.9, rel: 1, dur: sd * tr.spb * 2, vol: 0.035 * tension }, 1);
    }
  }
}

const stepDur = (tr, ten) => (60 / (tr.bpm * (1 + 0.06 * ten))) * tr.sb;
// Pure scheduling function: schedules every step whose time lies in [t0,t1) at constant tension.
export function scheduleRange(trackId, t0, t1, ctx, dest, opts = {}) {
  const tr = getTrack(trackId), ten = opts.tension || 0, sd = stepDur(tr, ten);
  for (let i = Math.ceil(t0 / sd); i * sd < t1; i++) renderStep(ctx, dest, tr, i % tr.steps, i * sd, sd, ten);
}

/* ---------- stings (all original) ---------- */
function stingRange(name, t, ctx, dest) {
  const bell = (dt, m, v, dec, r) => synth(ctx, dest, t + dt, mtof(m), { osc: [['sine', 1, 0, 1], ['sine', 2, 5, 0.1]], fm: [r || 3.5, 1.1, 0.25], att: 0.004, dec: dec || 0.8, vol: v }, 1);
  const brass = (dt, m, v, d) => synth(ctx, dest, t + dt, mtof(m), { osc: [['sawtooth', 1, -7, 0.45], ['sawtooth', 1, 7, 0.45], ['triangle', 0.5, 0, 0.3]],
    lp: [600, 1500, 0.3, 2400, 0.05], vib: [5.5, 9, 0.25], att: 0.02, dec: 0.2, sus: 0.7, rel: 0.25, dur: d, vol: v }, 1);
  const thump = (dt, m, v) => synth(ctx, dest, t + dt, mtof(m), { ...I.kick(), vol: v }, 1);
  switch (name) {
    case 'solve':
      nz(ctx, dest, t, 0.025, 0.07, 3200, 1.5, 'bandpass', 1);
      synth(ctx, dest, t, mtof(67), { ...I.pah(), vol: 0.14 }, 1);
      [79, 84, 88].forEach((m, i) => bell(i * 0.07, m, 0.17, 0.7));
      bell(0.21, 91, 0.12, 1.0, 2);
      break;
    case 'escape':
      [[0, 55], [0.13, 60], [0.26, 64]].forEach(([dt, m]) => brass(dt, m, 0.11, 0.09));
      brass(0.39, 67, 0.12, 0.28); thump(0.39, 36, 0.2);
      brass(0.74, 65, 0.1, 0.09); brass(0.87, 69, 0.11, 0.09);
      [60, 64, 67, 72].forEach((m) => brass(1.0, m, 0.075, 0.85));
      synth(ctx, dest, t + 1.0, mtof(36), { ...I.tuba(0.9), vol: 0.2 }, 1); thump(1.0, 33, 0.26);
      nz(ctx, dest, t + 1.0, 1.4, 0.035, 5200, 0.5, 'bandpass', 1);
      [96, 91, 88, 84].forEach((m, i) => bell(1.05 + i * 0.13, m, 0.07, 0.7));
      break;
    case 'fail':
      [[0, 69], [0.24, 65], [0.48, 62]].forEach(([dt, m]) => synth(ctx, dest, t + dt, mtof(m), { ...I.ep(), dec: 1.0, vol: 0.13 }, 1));
      [50, 57, 62].forEach((m) => synth(ctx, dest, t + 0.48, mtof(m), { ...I.tpad(0.6), att: 0.15, rel: 0.6, vol: 0.05 }, 1));
      break;
    case 'secret':
      [84, 86, 88, 91, 93, 96, 98, 100].forEach((m, i) => bell(i * 0.055, m, 0.085 - i * 0.004, 0.5, 2));
      [88, 95].forEach((m) => synth(ctx, dest, t + 0.1, mtof(m), { osc: [['sine', 1, -6, 0.5], ['sine', 1, 6, 0.5]], att: 0.25, dec: 0.3, sus: 0.8, rel: 0.6, dur: 0.5, vol: 0.04 }, 1));
      bell(0.5, 103, 0.06, 1.2, 2);
      break;
    case 'unlock':
      nz(ctx, dest, t, 0.02, 0.13, 2500, 2, 'bandpass', 1);
      thump(0.01, 40, 0.3);
      nz(ctx, dest, t + 0.01, 0.1, 0.1, 500, 0.8, 'lowpass', 1);
      bell(0.12, 79, 0.15, 0.6); bell(0.22, 86, 0.15, 0.9);
      break;
    default: break;
  }
}

/* ---------- instance ---------- */
export function createMusic(ctx, dest) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.3;
  const trim = ctx.createGain(); trim.gain.value = 0.9;
  const master = ctx.createGain(); master.gain.value = 0.7;
  const stingBus = ctx.createGain(); stingBus.gain.value = 1;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 0.5;
  const duck = ctx.createGain(); duck.gain.value = 1;
  const send = ctx.createGain(); send.gain.value = 0.22;
  const delay = ctx.createDelay(1.5); delay.delayTime.value = 0.4;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800;
  lp.connect(duck); duck.connect(master); duck.connect(send); send.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master);
  master.connect(comp); stingBus.connect(comp); comp.connect(trim); trim.connect(dest);

  let cur = null, timer = null, nextT = 0, tens = 0, sm = 0, lastNow = 0;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const cutoff = (tr, x) => Math.min(4200, tr.cut + 800 * x);
  const alive = () => ctx.state !== 'closed';
  const ramp = (p, v, now, tau) => { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.setTargetAtTime(v, now, tau); };

  function fadeOut(bus, s) {
    try {
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + s);
    } catch (e) { /* ignore */ }
    later(() => free(bus), (s + 0.8) * 1000);
  }
  function tick() {
    if (!cur) return;
    if (!alive()) { api.stop(0); return; }
    try {
      const now = ctx.currentTime, dt = Math.max(0, now - lastNow); lastNow = now;
      sm += (tens - sm) * (1 - Math.exp(-dt / 0.9));
      lp.frequency.setTargetAtTime(cutoff(cur.tr, sm), now, 0.4);
      duck.gain.setTargetAtTime(1 - 0.12 * sm, now, 0.5);
      if (nextT < now - 0.5) nextT = now + 0.05;
      let guard = 0;
      while (nextT < now + 0.3 && guard++ < 64) {
        const tr = cur.tr, sd = stepDur(tr, sm);
        renderStep(ctx, cur.bus, tr, cur.step % tr.steps, nextT, sd, sm);
        nextT += sd; cur.step++;
      }
    } catch (e) { /* never throw from the scheduler */ }
  }
  const api = {
    tracks: TRACK_IDS.slice(),
    play(id) {
      if (!BUILD[id] || (cur && cur.id === id) || !alive()) return;
      try {
        if (ctx.state === 'suspended' && ctx.resume) { try { const rp = ctx.resume(); if (rp && rp.catch) rp.catch(() => {}); } catch (e) { /* ignore */ } }
        const now = ctx.currentTime, tr = getTrack(id);
        if (cur) fadeOut(cur.bus, 1.5);
        const bus = ctx.createGain();
        bus.gain.setValueAtTime(0, now); bus.gain.linearRampToValueAtTime(1, now + 1.5);
        bus.connect(lp);
        cur = { id, tr, bus, step: 0 };
        nextT = now + 0.06; lastNow = now;
        lp.frequency.setTargetAtTime(cutoff(tr, sm), now, 0.4);
        fb.gain.setTargetAtTime(tr.fb, now, 0.3);
        delay.delayTime.setTargetAtTime(Math.min(1.4, tr.dly * 60 / tr.bpm), now, 0.2);
        if (!timer) timer = setInterval(tick, 100);
        tick();
      } catch (e) { /* ignore */ }
    },
    // silences within min(fadeSeconds, 1.5) s; delay tail decays below -30 dB shortly after
    stop(fadeSeconds = 1) {
      if (timer) { clearInterval(timer); timer = null; }
      const f = Math.max(0.02, Math.min(1.5, +fadeSeconds || 0));
      if (cur) { fadeOut(cur.bus, f); cur = null; }
      try { const now = ctx.currentTime; stingBus.gain.cancelScheduledValues(now); stingBus.gain.setValueAtTime(stingBus.gain.value, now); stingBus.gain.linearRampToValueAtTime(0, now + f); } catch (e) { /* ignore */ }
    },
    setTension(x) { tens = Math.max(0, Math.min(1, +x || 0)); },
    sting(name) {
      if (!alive()) return;
      try {
        const now = ctx.currentTime;
        ramp(stingBus.gain, 1, now, 0.004);
        stingRange(name, now + 0.03, ctx, stingBus);
      } catch (e) { /* ignore */ }
    },
    setVolume(v) { try { master.gain.setTargetAtTime(Math.max(0, Math.min(1, +v || 0)), ctx.currentTime, 0.05); } catch (e) { /* ignore */ } },
    dispose() { api.stop(0.02); later(() => { timers.forEach(clearTimeout); timers.clear(); free(master, stingBus, lp, duck, send, delay, fb, dlp, comp, trim); }, 300); },
    // test hooks
    _stats() { return { interval: !!timer, timeouts: timers.size, playing: cur ? cur.id : null }; },
    _info(id) { const tr = getTrack(id); return { bars: tr.bars, steps: tr.steps, melLen: tr.melLen, spb: tr.spb, seconds: tr.steps * stepDur(tr, 0) }; },
    _scheduleRange(id, t0, t1, opts = {}) {
      const tr = getTrack(id), bus = ctx.createGain(), ten = opts.tension || 0; bus.connect(lp);
      lp.frequency.value = cutoff(tr, ten); fb.gain.value = tr.fb; duck.gain.value = 1 - 0.12 * ten;
      delay.delayTime.value = Math.min(1.4, tr.dly * 60 / tr.bpm);
      scheduleRange(id, t0, t1, ctx, bus, opts);
    },
    _sting(name, t = 0) { stingRange(name, t, ctx, stingBus); },
  };
  return api;
}
