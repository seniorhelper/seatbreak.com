// "Bolt" the robot drone's voice (stage 2).
// Layer 1: original formant "robot speech" in pure Web Audio. Each word is one continuous voiced source
// (sawtooth + body sine) through three moving formant filters, with noise for s/sh/f/t/k/p bursts,
// nasal murmur for m/n/ng, semitone-quantized robotic pitch, sentence declination, question rise and
// small random variation. Layer 2 (optional): browser speechSynthesis for real words, with Layer 1 quiet underneath.

const MOODS = {
  happy: { base: 235, speed: 1.0, range: 1.0 }, calm: { base: 200, speed: 0.88, range: 0.7 },
  excited: { base: 270, speed: 1.12, range: 1.35 }, thinking: { base: 210, speed: 0.9, range: 0.8 },
};
// vowel formants [F1, F2, F3], slightly raised for a small robot
const V = {
  iy: [290, 2350, 3050], ih: [420, 2000, 2600], eh: [560, 1850, 2500], ae: [690, 1740, 2450], ah: [660, 1220, 2450],
  aa: [760, 1120, 2480], ao: [600, 900, 2450], uh: [460, 1060, 2300], uw: [320, 900, 2250], er: [500, 1380, 1720],
};
const DIPH = { ey: ['eh', 'iy'], ay: ['aa', 'iy'], ow: ['ao', 'uh'], aw: ['aa', 'uw'], oy: ['ao', 'iy'] };
const LONG = { iy: 1, aa: 1, ao: 1, uw: 1, er: 1 };
// consonants: k kind (stop|fric|nas|liq), d duration, voiced, noise [freq, Q, vol], formants for nasals/liquids
const C = {
  p: { k: 'stop', z: [900, 0.8, 0.5] }, t: { k: 'stop', z: [4200, 1.2, 0.5] }, k: { k: 'stop', z: [2100, 1.5, 0.55] },
  b: { k: 'stop', v: 1, z: [800, 0.8, 0.25] }, d: { k: 'stop', v: 1, z: [3800, 1.2, 0.25] }, g: { k: 'stop', v: 1, z: [2000, 1.5, 0.3] },
  s: { k: 'fric', d: 0.09, z: [5600, 1.6, 0.4] }, z: { k: 'fric', d: 0.07, v: 1, z: [5200, 1.6, 0.18] },
  sh: { k: 'fric', d: 0.09, z: [2700, 1.4, 0.45] }, zh: { k: 'fric', d: 0.07, v: 1, z: [2600, 1.4, 0.2] },
  f: { k: 'fric', d: 0.07, z: [4200, 0.6, 0.2] }, v: { k: 'fric', d: 0.055, v: 1, z: [4000, 0.6, 0.08] },
  th: { k: 'fric', d: 0.065, z: [5200, 0.5, 0.16] }, dh: { k: 'fric', d: 0.045, v: 1, z: [5000, 0.5, 0.06] },
  h: { k: 'fric', d: 0.05, z: [1600, 0.5, 0.25] },
  ch: { k: 'aff', z: [2900, 1.4, 0.45] }, jh: { k: 'aff', v: 1, z: [2700, 1.4, 0.22] },
  m: { k: 'nas', f: [260, 950, 2250] }, n: { k: 'nas', f: [260, 1450, 2500] }, ng: { k: 'nas', f: [260, 1900, 2500] },
  l: { k: 'liq', f: [380, 1100, 2700] }, r: { k: 'liq', f: [430, 1150, 1550] }, w: { k: 'liq', f: [310, 720, 2200] }, y: { k: 'liq', f: [290, 2250, 2950] },
};
const LEX = {
  the: 'dh ah', a: 'ah', an: 'ae n', to: 't uw', you: 'y uw', your: 'y ao r', i: 'ay', is: 'ih z', of: 'ah v', are: 'aa r',
  one: 'w ah n', two: 't uw', do: 'd uw', what: 'w ah t', where: 'w eh r', there: 'dh eh r', here: 'h iy r', they: 'dh ey',
  this: 'dh ih s', that: 'dh ae t', with: 'w ih th', key: 'k iy', door: 'd ao r', room: 'r uw m', hello: 'h eh l ow',
  hi: 'h ay', bolt: 'b ow l t', friend: 'f r eh n d', great: 'g r ey t', good: 'g uh d', look: 'l uh k', again: 'ah g eh n',
  puzzle: 'p ah z ah l', said: 's eh d', says: 's eh z', was: 'w ah z', were: 'w er', have: 'h ae v', give: 'g ih v',
  come: 'k ah m', some: 's ah m', done: 'd ah n', now: 'n aw', how: 'h aw', who: 'h uw', all: 'ao l', ok: 'ow k ey',
  okay: 'ow k ey', yes: 'y eh s', no: 'n ow', clue: 'k l uw', escape: 'eh s k ey p', buddy: 'b ah d iy', nice: 'n ay s',
  open: 'ow p ah n', golden: 'g ow l d ah n', want: 'w aa n t', would: 'w uh d', could: 'k uh d', it: 'ih t', and: 'ae n d',
};
const FUNC = new Set(['the', 'a', 'an', 'to', 'of', 'is', 'it', 'in', 'on', 'and', 'or', 'at', 'for', 'as', 'be', 'by']);

function clean(text) {
  return String(text == null ? '' : text).replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}\s.,!?;:'-]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// crude English letter-to-sound rules (good enough for a robot accent)
function phon(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return [];
  if (LEX[w]) return LEX[w].split(' ');
  const out = [], vow = (ch) => 'aeiouy'.includes(ch), n = w.length;
  const hasOtherVowel = /[aeiouy]/.test(w.slice(0, -1));
  for (let i = 0; i < n; i++) {
    const c = w[i], nx = w[i + 1] || '', r3 = w.slice(i, i + 3), r4 = w.slice(i, i + 4), r2 = c + nx;
    if (r4 === 'tion') { out.push('sh', 'ah', 'n'); i += 3; continue; }
    if (r3 === 'igh') { out.push('ay'); i += 2; continue; }
    const two = { ch: ['ch'], sh: ['sh'], th: ['th'], ph: ['f'], wh: ['w'], ck: ['k'], ng: ['ng'], qu: ['k', 'w'], ee: ['iy'], ea: ['iy'],
      oo: ['uw'], ou: ['aw'], oi: ['oy'], oy: ['oy'], ai: ['ey'], ay: ['ey'], ei: ['ey'], ey: [i + 2 >= n ? 'iy' : 'ey'], oa: ['ow'],
      au: ['ao'], aw: ['ao'], ue: ['uw'], ew: ['uw'], er: ['er'], ir: ['er'], ur: ['er'], ar: ['aa', 'r'], or: ['ao', 'r'],
      ow: [i + 2 >= n ? 'ow' : 'aw'] };
    if (two[r2] && !(r2 === 'er' && vow(w[i + 2] || ''))) { out.push(...two[r2]); i++; continue; }
    if (c === nx && !vow(c)) continue; // double consonant
    if (vow(c)) {
      if (c === 'y') { if (i === 0) out.push('y'); else if (i === n - 1) out.push(/[aeiou]/.test(w) ? 'iy' : 'ay'); else out.push('ih'); continue; }
      if (c === 'e' && i === n - 1 && hasOtherVowel) continue; // silent final e
      const magic = i + 2 === n - 1 && w[n - 1] === 'e' && !vow(nx);
      if (c === 'e' && n <= 3 && i === n - 1) { out.push('iy'); continue; }
      if (c === 'o' && i === n - 1) { out.push('ow'); continue; }
      out.push(magic ? { a: 'ey', e: 'iy', i: 'ay', o: 'ow', u: 'uw' }[c] : { a: 'ae', e: 'eh', i: 'ih', o: 'aa', u: 'ah' }[c]);
      continue;
    }
    if (c === 'c') { out.push('eiy'.includes(nx) ? 's' : 'k'); continue; }
    if (c === 'g') { out.push(nx === 'e' && i + 2 >= n ? 'jh' : 'g'); continue; }
    if (c === 'x') { out.push('k', 's'); continue; }
    if (c === 'j') { out.push('jh'); continue; }
    if (c === 's' && i === n - 1 && i > 0 && !'ptkf'.includes(w[i - 1])) { out.push('z'); continue; }
    if (c === 'q') { out.push('k'); continue; }
    if (C[c]) out.push(c);
  }
  return out;
}
const isV = (p) => !!(V[p] || DIPH[p]);

// Build a timed plan: words -> segments. Random variation comes from rnd().
function plan(text, mood, rnd) {
  const M = MOODS[mood] || MOODS.happy, sp = 1 / M.speed;
  const toks = clean(text).split(' ').filter(Boolean);
  const words = [], wordStarts = [];
  let t = 0;
  // split into sentences so declination/rise is per sentence
  const sents = []; let curS = [];
  toks.forEach((tok) => {
    let letters = tok.replace(/[^\p{L}\p{N}']/gu, '');
    const punct = (tok.match(/[.,!?;:]+$/) || [''])[0];
    if (/^\d+$/.test(letters)) letters = letters.split('').map((d) => NUM[+d]).join(' ');
    letters.split(' ').filter(Boolean).forEach((lw, j, arr) => curS.push({ w: lw, p: j === arr.length - 1 ? punct : '' }));
    if (!letters && punct && curS.length) curS[curS.length - 1].p += punct;
    if (/[.!?]/.test(punct)) { sents.push(curS); curS = []; }
  });
  if (curS.length) sents.push(curS);
  sents.forEach((S) => {
    const end = (S[S.length - 1] || {}).p || '', q = /\?/.test(end), ex = /!/.test(end);
    const ph = S.map((x) => phon(x.w)), total = Math.max(1, ph.reduce((a, p) => a + p.filter(isV).length, 0));
    let syl = 0;
    S.forEach((x, wi) => {
      const P = ph[wi];
      if (!P.length) return;
      const lw = x.w.toLowerCase(), func = FUNC.has(lw), lastWord = wi === S.length - 1;
      const nv = P.filter(isV).length; let vi = 0;
      const W = { t, segs: [], noise: [] };
      wordStarts.push(t);
      let wt = 0;
      P.forEach((p, pi) => {
        const jit = 1 + (rnd() - 0.5) * 0.12;
        if (isV(p)) {
          const stressed = vi === 0 && !func && nv > 0, finalSyl = lastWord && vi === nv - 1;
          let d = (DIPH[p] ? 0.17 : LONG[p] ? 0.14 : 0.1) * sp * jit;
          if (stressed) d *= 1.2; if (func) d *= 0.75; if (finalSyl) d *= 1.4;
          const prog = syl / total;
          let f = M.base * (1.12 - 0.24 * prog) * (ex ? 1.1 : 1);
          f *= 1 + (stressed ? 0.08 * M.range * (ex ? 1.8 : 1) : 0) + (rnd() - 0.5) * 0.07 * M.range;
          f = 440 * Math.pow(2, Math.round(12 * Math.log2(f / 440)) / 12); // robotic semitone steps
          let f2 = f * 0.98;
          if (finalSyl && q) { f *= 1.05; f2 = f * 1.4; }
          else if (finalSyl && ex) f2 = f * 0.85;
          else if (finalSyl && end) f2 = f * 0.8;
          const [a, b] = DIPH[p] || [p, p];
          W.segs.push({ t: wt, d, amp: stressed ? 1 : func ? 0.7 : 0.82, F: V[a], F2: V[b], f0: f, f1: f2, v: 1 });
          wt += d; vi++; syl++;
          return;
        }
        const c = C[p];
        if (!c) return;
        const prevV = pi > 0 && isV(P[pi - 1]);
        if (c.k === 'stop' || c.k === 'aff') {
          const cl = (c.v ? 0.035 : 0.045) * sp * jit;
          W.segs.push({ t: wt, d: cl, amp: c.v ? 0.12 : 0, v: 1 });
          wt += cl;
          const bd = c.k === 'aff' ? 0.07 * sp : (c.v ? 0.015 : 0.03) * sp;
          W.noise.push({ t: wt, d: bd, z: c.z });
          if (c.k === 'aff') { W.segs.push({ t: wt, d: bd, amp: c.v ? 0.3 : 0, v: 1 }); wt += bd; }
          else if (!c.v) { W.segs.push({ t: wt, d: bd * 0.6, amp: 0, v: 1 }); wt += bd * 0.6; }
        } else if (c.k === 'fric') {
          const d = c.d * sp * jit;
          W.noise.push({ t: wt, d, z: c.z });
          W.segs.push({ t: wt, d, amp: c.v ? 0.35 : 0, v: 1 });
          wt += d;
        } else {
          const d = (c.k === 'nas' ? 0.07 : 0.055) * sp * jit * (prevV ? 1 : 0.85);
          W.segs.push({ t: wt, d, amp: c.k === 'nas' ? 0.42 : 0.7, F: c.f, F2: c.f, nas: c.k === 'nas', v: 1 });
          wt += d;
        }
      });
      W.d = wt; words.push(W);
      t += wt + (func ? 0.015 : 0.035) * sp;
      if (x.p) t += /[.!?]/.test(x.p) ? 0.38 * sp : 0.18 * sp;
    });
  });
  return { wordsArr: words, wordStarts, duration: t, words: words.length };
}

function free(...n) { n.forEach((x) => { try { if (x) x.disconnect(); } catch (e) { /* ignore */ } }); }
const nbufs = new WeakMap();
function noiseBuf(ctx) {
  let b = nbufs.get(ctx);
  if (!b) {
    const n = ctx.sampleRate | 0; b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0); let s = 12345;
    for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
    nbufs.set(ctx, b);
  }
  return b;
}

// Render one word: continuous voiced source through 3 formant bandpasses + one noise channel.
function renderWord(ctx, dest, t0, W, rnd) {
  const end = t0 + W.d, src = ctx.createOscillator(), body = ctx.createOscillator(), bodyG = ctx.createGain();
  const vg = ctx.createGain(), out = ctx.createGain(), nodes = [src, body, bodyG, vg, out];
  src.type = 'sawtooth'; body.type = 'sine'; bodyG.gain.value = 0.35;
  src.connect(vg); body.connect(bodyG); bodyG.connect(vg);
  const FQ = [6, 10, 12], FG = [1, 0.7, 0.32];
  const bps = FQ.map((q, i) => {
    const bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = q; g.gain.value = FG[i];
    vg.connect(bp); bp.connect(g); g.connect(out); nodes.push(bp, g);
    return bp;
  });
  const first = W.segs.find((s) => s.F) || { F: V.ah, f0: 220 };
  const f0s = W.segs.find((s) => s.f0) || { f0: 220 };
  let lastF = first.F, lastF0 = f0s.f0, lastA = 0;
  bps.forEach((bp, i) => bp.frequency.setValueAtTime(lastF[i], t0));
  [src, body].forEach((o) => o.frequency.setValueAtTime(lastF0, t0));
  src.detune.setValueAtTime((rnd() - 0.5) * 10, t0);
  vg.gain.setValueAtTime(0, t0);
  W.segs.forEach((s) => {
    const st = t0 + s.t, tr = Math.min(0.035, s.d * 0.45);
    if (s.F) {
      bps.forEach((bp, i) => { bp.frequency.setValueAtTime(lastF[i], st); bp.frequency.linearRampToValueAtTime(s.F[i], st + tr); });
      if (s.F2 !== s.F) bps.forEach((bp, i) => bp.frequency.linearRampToValueAtTime(s.F2[i], st + s.d * 0.9));
      lastF = s.F2 || s.F;
    }
    if (s.f0) {
      [src, body].forEach((o) => { o.frequency.setValueAtTime(lastF0, st); o.frequency.linearRampToValueAtTime(s.f0, st + 0.03); o.frequency.linearRampToValueAtTime(s.f1, st + s.d); });
      lastF0 = s.f1;
    }
    const a = s.amp * (s.nas ? 0.8 : 1);
    vg.gain.setValueAtTime(lastA, st); vg.gain.linearRampToValueAtTime(a, st + Math.min(0.018, s.d * 0.5));
    lastA = a;
  });
  const ls = W.segs.length ? t0 + W.segs[W.segs.length - 1].t + 0.02 : t0;
  vg.gain.setValueAtTime(lastA, Math.max(ls, end - 0.02)); vg.gain.linearRampToValueAtTime(0, Math.max(ls, end - 0.02) + 0.02);
  out.connect(dest);
  if (W.noise.length) {
    const ns = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    ns.buffer = noiseBuf(ctx); nf.type = 'bandpass'; ng.gain.setValueAtTime(0, t0);
    W.noise.forEach((z) => {
      const st = t0 + z.t;
      nf.frequency.setValueAtTime(z.z[0], st); nf.Q.setValueAtTime(z.z[1], st);
      ng.gain.setValueAtTime(0, st); ng.gain.linearRampToValueAtTime(z.z[2], st + Math.min(0.008, z.d * 0.3));
      ng.gain.setValueAtTime(z.z[2] * 0.8, st + z.d * 0.7); ng.gain.linearRampToValueAtTime(0, st + z.d);
    });
    ns.connect(nf); nf.connect(ng); ng.connect(dest);
    ns.start(t0, rnd() * 0.5); ns.stop(end + 0.05);
    nodes.push(ns, nf, ng);
  }
  src.start(t0); body.start(t0); src.stop(end + 0.05); body.stop(end + 0.05);
  src.onended = () => free(...nodes);
}

// tiny friendly two-tone chirp ("bee-dip") used at the start of an utterance
function chirp(ctx, dest, t, up) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(up ? 700 : 1100, t); o.frequency.exponentialRampToValueAtTime(up ? 1250 : 800, t + 0.07);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.01); g.gain.setTargetAtTime(0, t + 0.06, 0.015);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.16);
  o.onended = () => free(o, g);
}

export function createDroneVoice(ctx, dest) {
  // shared character chain: comb (metallic robot tint) -> lowpass -> compressor -> volume
  const inp = ctx.createGain(), comb = ctx.createDelay(0.05), cfb = ctx.createGain(), wet = ctx.createGain();
  const lp = ctx.createBiquadFilter(), comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
  comb.delayTime.value = 0.0045; cfb.gain.value = 0.28; wet.gain.value = 0.45;
  lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.5;
  comp.threshold.value = -20; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
  out.gain.value = 1.0;
  inp.connect(lp); inp.connect(comb); comb.connect(cfb); cfb.connect(comb); comb.connect(wet); wet.connect(lp);
  lp.connect(comp); comp.connect(out); out.connect(dest);

  let cur = null, speaking = false, token = 0, voices = [];
  const ss0 = (typeof window !== 'undefined' && window.speechSynthesis) ? window.speechSynthesis : null;
  const loadVoices = () => { try { voices = (ss0 && ss0.getVoices()) || []; } catch (e) { voices = []; } };
  loadVoices();
  try { if (ss0 && ss0.addEventListener) ss0.addEventListener('voiceschanged', loadVoices); } catch (e) { /* ignore */ }

  function end(c) {
    if (!c || c.done) return;
    c.done = true;
    clearInterval(c.pump); c.timers.forEach(clearTimeout);
    try { const now = ctx.currentTime; c.bus.gain.cancelScheduledValues(now); c.bus.gain.setValueAtTime(c.bus.gain.value, now); c.bus.gain.setTargetAtTime(0, now, 0.012); } catch (e) { /* ignore */ }
    setTimeout(() => free(c.bus), 700);
    if (c.l2) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    if (cur === c) { cur = null; speaking = false; }
    try { c.opts.onEnd && c.opts.onEnd(); } catch (e) { /* ignore */ }
    c.res();
  }

  const api = {
    useSpeechSynthesis: true,
    get speaking() { return speaking; },
    setVolume(v) { try { out.gain.setTargetAtTime(Math.max(0, Math.min(1, +v || 0)), ctx.currentTime, 0.03); } catch (e) { /* ignore */ } },
    stop() { if (cur) end(cur); },
    speak(text, opts = {}) {
      api.stop(); token++;
      const txt = clean(text), mood = opts.mood || 'happy';
      return new Promise((res) => {
        if (!txt || ctx.state === 'closed') { res(); return; }
        let c = null;
        try {
          if (ctx.state === 'suspended' && ctx.resume) { try { const rp = ctx.resume(); if (rp && rp.catch) rp.catch(() => {}); } catch (e) { /* ignore */ } }
          const P = plan(txt, mood, Math.random);
          const ss = (ss0 && typeof SpeechSynthesisUtterance !== 'undefined') ? ss0 : null;
          const useL2 = !!(api.useSpeechSynthesis && ss);
          const bus = ctx.createGain(); bus.gain.value = useL2 ? 0.15 : 1; bus.connect(inp);
          c = { tok: token, res, opts, bus, timers: [], l2: false, pump: null, done: false };
          cur = c; speaking = true;
          let l1 = false, l2 = !useL2, lastWord = -1;
          const check = () => { if (l1 && l2) end(c); };
          const word = (i) => { if (i > lastWord && !c.done) { lastWord = i; try { opts.onWord && opts.onWord(i); } catch (e) { /* ignore */ } } };
          const later = (fn, ms) => c.timers.push(setTimeout(fn, ms));
          try { opts.onStart && opts.onStart(); } catch (e) { /* ignore */ }

          const lead = opts.chirp === false ? 0.06 : 0.16, t0 = ctx.currentTime + lead;
          if (opts.chirp !== false) chirp(ctx, bus, ctx.currentTime + 0.03, mood !== 'thinking');
          let idx = 0;
          const pump = () => {
            if (c.done) return;
            try {
              const now = ctx.currentTime;
              while (idx < P.wordsArr.length && t0 + P.wordsArr[idx].t < now + 0.6) { renderWord(ctx, bus, t0 + P.wordsArr[idx].t, P.wordsArr[idx], Math.random); idx++; }
            } catch (e) { /* ignore */ }
          };
          pump(); c.pump = setInterval(pump, 120);
          P.wordStarts.forEach((ts, i) => later(() => word(i), (ts + lead) * 1000));
          later(() => { l1 = true; check(); }, (P.duration + lead + 0.1) * 1000);

          if (useL2) {
            try {
              const u = new SpeechSynthesisUtterance(txt);
              // friendly-robot tuning: bright, slightly fast, even
              u.pitch = mood === 'calm' ? 1.3 : mood === 'excited' ? 1.6 : 1.45;
              u.rate = mood === 'calm' ? 0.95 : mood === 'excited' ? 1.12 : 1.04;
              u.volume = 1;
              try {
                if (!voices.length) loadVoices();
                const en = voices.filter((v) => /^en/i.test(v.lang));
                const pick = en.find((v) => /google us english|samantha|zira|aria|jenny|libby/i.test(v.name)) || en[0];
                if (pick) u.voice = pick;
              } catch (e) { /* ignore */ }
              const starts = []; let p = 0;
              txt.split(' ').forEach((w) => { starts.push(p); p += w.length + 1; });
              u.onboundary = (ev) => {
                if (ev && ev.name && ev.name !== 'word') return;
                let wi = 0; for (let i = 0; i < starts.length; i++) if (starts[i] <= ev.charIndex) wi = i;
                word(wi);
              };
              const fin = () => { if (c.done) return; l2 = true; check(); };
              u.onend = fin; u.onerror = fin;
              c.l2 = true;
              ss.cancel(); ss.speak(u);
            } catch (e) { c.l2 = false; l2 = true; }
            later(() => end(c), (P.duration * 2 + 3) * 1000); // never hang
          }
        } catch (e) {
          if (c) end(c); else { speaking = false; res(); }
        }
      });
    },
    // offline test hook: schedules Layer 1 only, returns its duration in seconds
    _renderL1(text, mood, t0 = 0, gain = 1) {
      const P = plan(clean(text), mood || 'happy', Math.random), bus = ctx.createGain(); bus.gain.value = gain; bus.connect(inp);
      P.wordsArr.forEach((W) => renderWord(ctx, bus, t0 + W.t, W, Math.random));
      return P.duration;
    },
    _plan(text, mood) { return plan(clean(text), mood || 'happy', Math.random); },
  };
  return api;
}
