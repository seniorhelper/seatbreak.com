// Original synthesized sound — no audio files.
let ctx = null, master = null, amb = null;

export function initAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { ctx = null; }
}

function tone(freq, dur = 0.15, type = 'sine', vol = 0.2, when = 0, slideTo = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noiseBurst(dur = 0.3, vol = 0.15, freq = 800) {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = b;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}

export function audioNodes() { return { ctx, master }; }

export const sfx = {
  hover() { tone(1400, 0.04, 'sine', 0.03); },
  click() { tone(880, 0.06, 'triangle', 0.12); tone(1320, 0.05, 'sine', 0.06, 0.02); },
  pick() { [660, 880, 1320].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, i * 0.06)); },
  place() { tone(330, 0.12, 'square', 0.06); tone(495, 0.2, 'triangle', 0.12, 0.05); },
  wrong() { tone(220, 0.22, 'sawtooth', 0.09, 0, 140); },
  solve() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.32, 'triangle', 0.13, i * 0.09)); },
  escape() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, 'triangle', 0.13, i * 0.1));
    tone(1568, 1.2, 'sine', 0.08, 0.65);
  },
  whoosh() { noiseBurst(0.45, 0.18, 600); },
  mech() { noiseBurst(0.18, 0.12, 1800); tone(140, 0.2, 'square', 0.05); },
  beep(dur) { tone(740, dur, 'sine', 0.09); },
  alarm() { for (let i = 0; i < 4; i++) tone(880, 0.25, 'square', 0.06, i * 0.5, 440); },
  tick() { tone(2000, 0.02, 'square', 0.03); },
  note(f, d = 0.5) { tone(f, d, 'triangle', 0.16); tone(f * 2, d * 0.6, 'sine', 0.05); },
  splash() { noiseBurst(0.5, 0.14, 400); tone(300, 0.25, 'sine', 0.08, 0, 600); },
};

const AMB = {
  hub: [[110, 'sine'], [164.8, 'sine'], [220, 'triangle']],
  kids: [[261.6, 'triangle'], [329.6, 'sine'], [392, 'sine']],
  teens: [[98, 'sine'], [146.8, 'sine'], [196, 'triangle']],
  adults: [[73.4, 'sine'], [110, 'triangle'], [138.6, 'sine']],
  expert: [[55, 'sawtooth'], [82.4, 'sine'], [110, 'sine']],
  flood: [[65.4, 'sine'], [98, 'sine'], [130.8, 'triangle']],
  theater: [[130.8, 'triangle'], [196, 'sine'], [246.9, 'sine']],
};

export function ambient(key) {
  if (!ctx) return;
  stopAmbient();
  const g = ctx.createGain(); g.gain.value = 0.0001;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = key === 'expert' ? 500 : 900;
  f.connect(g); g.connect(master);
  const oscs = (AMB[key] || AMB.hub).map(([fr, ty], i) => {
    const o = ctx.createOscillator(); o.type = ty; o.frequency.value = fr;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07 + i * 0.05;
    const lg = ctx.createGain(); lg.gain.value = fr * 0.004;
    lfo.connect(lg); lg.connect(o.frequency);
    const og = ctx.createGain(); og.gain.value = ty === 'sawtooth' ? 0.05 : 0.12;
    o.connect(og); og.connect(f); o.start(); lfo.start();
    return [o, lfo];
  });
  g.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 2.5);
  amb = { g, oscs };
}

export function stopAmbient() {
  if (!ctx || !amb) return;
  const a = amb; amb = null;
  a.g.gain.cancelScheduledValues(ctx.currentTime);
  a.g.gain.setValueAtTime(a.g.gain.value, ctx.currentTime);
  a.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  setTimeout(() => a.oscs.forEach(([o, l]) => { try { o.stop(); l.stop(); } catch (e) {} }), 800);
}
