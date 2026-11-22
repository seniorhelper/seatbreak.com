// Original optical-illusion library (Canvas 2D). All drawing code is original.
// SAFETY: nothing flashes. Animated pieces drift slowly (<0.4 cycle/s, <1 Hz luminance change).
const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
function tones(opts) {
  const c = opts.contrast == null ? 0.75 : opts.contrast;
  const k = Math.max(0, Math.min(1, c / 0.75));
  const mid = [150, 148, 150], lo = [40, 46, 64], hi = [244, 238, 222];
  return { dark: rgb(mixc(mid, lo, k)), light: rgb(mixc(mid, hi, k)), darkA: mixc(mid, lo, k), lightA: mixc(mid, hi, k),
    accent: '#e0703a', blue: '#3a78c8', green: '#2f9e6a', guide: '#e8b020' };
}
function bg(g, w, h, col) { g.fillStyle = col; g.fillRect(0, 0, w, h); }
function line(g, x1, y1, x2, y2, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'butt'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function circ(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } }
function poly(g, pts, fill, stroke, lw) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } }
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const AFTER = {
  green: { shape: '#27c47a', answer: 'magenta / pink' },
  blue: { shape: '#2f6fe0', answer: 'yellow / orange' },
  red: { shape: '#d83a3a', answer: 'cyan / blue-green' },
  yellow: { shape: '#e8c820', answer: 'blue / violet' },
};

export const ILLUSIONS = [
  { id: 'muller-lyer', name: 'Arrow Lines', kind: 'static', question: 'Which horizontal line is longer?', answer: 'They are exactly the same length.',
    science: 'The fins make your brain read the lines as nearer or farther corners of a room, so it rescales them. Scientists still debate exactly why.', sourceNote: 'Franz Carl Muller-Lyer, 1889', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'ponzo', name: 'Railway Bars', kind: 'static', question: 'Which bar is longer, the top one or the bottom one?', answer: 'They are exactly the same length.',
    science: 'Converging lines look like distance, so your brain thinks the higher bar is farther away and must be bigger.', sourceNote: 'Mario Ponzo, 1911', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'ebbinghaus', name: 'Circle Crowds', kind: 'static', question: 'Which orange circle in the middle is bigger?', answer: 'They are exactly the same size.',
    science: 'Size is judged by comparison with what is nearby, so a circle among big neighbors looks smaller. The exact brain mechanism is still studied.', sourceNote: 'Classic illusion, named for Hermann Ebbinghaus', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'cafe-wall', name: 'Tilted Tiles', kind: 'static', question: 'Are the long gray lines straight and parallel or slanted?', answer: 'They are perfectly straight and parallel.',
    science: 'The shifted dark and light tiles trick your brain into reading tiny tilts along each line, which add up to a slant.', sourceNote: 'Described by Richard Gregory in the 1970s', safety: 'Repeating pattern: keep under 12% of view; never fill the wall.' },
  { id: 'hermann-grid', name: 'Ghost Dots', kind: 'static', question: 'Do you see gray dots where the white lines cross? Are they really there?', answer: 'No. The gray dots are not drawn; your vision adds them.',
    science: 'You see faint dots at crossings you are not looking at. The old explanation (lateral inhibition) has been challenged, so the cause is not fully settled.', sourceNote: 'Ludimar Hermann, 1870', safety: 'Grid pattern: keep under 10% of view; never fill the wall.' },
  { id: 'simultaneous-contrast', name: 'Gray Squares', kind: 'static', question: 'Which marked square is darker?', answer: 'Neither. Both squares are exactly the same gray',
    science: 'Your brain judges brightness by comparing to the surroundings, so the same gray looks lighter on a dark background.', sourceNote: 'Classic illusion (simultaneous contrast, studied since the 1800s)', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'shadow-tiles', name: 'Shadow Stripe Tiles', kind: 'static', question: 'Are the two marked tiles the same color?', answer: 'Yes, they are the same color.',
    science: 'Your brain tries to cancel out shadows to guess the true color of things, so a tile in shadow is seen as lighter than it really is on screen.', sourceNote: 'Classic illusion (shadow-and-lightness effect, inspired by Edward Adelson, 1995; original composition here)', safety: 'Low risk. Keep under 20% of view.' },
  { id: 'kanizsa', name: 'Phantom Triangle', kind: 'static', question: 'Is there a triangle in the middle? Is it drawn?', answer: 'No triangle is drawn. Your brain completes it.',
    science: 'Your brain fills in missing edges to make the simplest shape that explains the gaps. Researchers still study how.', sourceNote: 'Gaetano Kanizsa, 1955', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'impossible-triangle', name: 'Endless Triangle', kind: 'static', question: 'Could you build this triangle out of real beams?', answer: 'No. It only works as a flat drawing.',
    science: 'Each corner looks fine alone, but they do not fit together in 3D space. Your brain checks corners one at a time.', sourceNote: 'Oscar Reutersvard, 1934; Penrose and Penrose, 1958', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'blivet', name: 'Three-or-Two Prongs', kind: 'static', question: 'How many prongs does the fork have at the top, two or three?', answer: 'It cannot be built; it is a drawing that switches meaning between top and bottom.',
    science: 'The top and bottom of the drawing suggest different 3D shapes, and your brain cannot make them agree.', sourceNote: 'Classic illusion (blivet or devil\'s fork, 1960s)', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'zollner', name: 'Bent Stripes', kind: 'static', question: 'Are the long diagonal lines parallel?', answer: 'Yes, they are perfectly parallel.',
    science: 'Short crossing ticks make long lines look tilted away from the ticks. Scientists still debate the details.', sourceNote: 'Johann Karl Friedrich Zollner, 1860', safety: 'Repeating pattern: keep under 12% of view.' },
  { id: 'afterimage-star', name: 'Stare Star', kind: 'static', question: 'Stare at the dot for 20 seconds, then look at a white wall. What color do you see?', answer: AFTER.green.answer,
    science: 'Staring tires the cells that sense that color, so for a moment you see its opposite. Green leaves a pink ghost.', sourceNote: 'Classic illusion', safety: 'Single shape, low risk. Keep under 15% of view; stare only briefly and look away if uncomfortable.' },
  { id: 'two-faces-vase', name: 'Vase or Faces', kind: 'static', question: 'Do you see a vase or two faces looking at each other? Can you see both?', answer: 'Both are in the picture; your brain can only hold one at a time.',
    science: 'The same shapes can be read two ways, and your brain flips between them. This is an original ambiguous figure.', sourceNote: 'Classic ambiguous-figure idea; original drawing', safety: 'Low risk. Keep under 25% of view.' },
  { id: 'stepping-feet', name: 'Stepping Bars', kind: 'animated', question: 'Do the two bars step forward one after the other?', answer: 'No. They both slide at the same smooth constant speed.',
    science: 'The bars change contrast against the stripes, which makes them seem to speed up and slow down. Slow, gentle motion only.', sourceNote: 'Classic illusion (the footsteps illusion)', safety: 'Slow drift only. Keep under 15% of view.' },
  { id: 'waterfall', name: 'Slow Waterfall', kind: 'animated', question: 'Watch the stripes drift for a while, then look at the wall. What does it seem to do?', answer: 'It may seem to drift the other way for a moment, although the wall is still.',
    science: 'Motion-sensing cells in your brain tire and the balance shifts, so still things seem to move. This is called the motion aftereffect.', sourceNote: 'Aristotle noted it; Robert Addams described it in 1834', safety: 'Slow drift, 0.25 cycles per second. Keep under 12% of view; never fill the wall.' },
];

const D = {};
D['muller-lyer'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const L = w * 0.5, x0 = w * 0.25, lw = h * 0.018, fin = h * 0.09;
  const arrow = (y, out) => {
    line(g, x0, y, x0 + L, y, T.dark, lw);
    for (const [x, d] of [[x0, 1], [x0 + L, -1]]) {
      const dx = (out ? -d : d) * fin * 0.9;
      line(g, x, y, x + dx, y - fin, T.dark, lw); line(g, x, y, x + dx, y + fin, T.dark, lw);
    }
  };
  arrow(h * 0.33, true); arrow(h * 0.67, false);
  if (o.reveal) for (const x of [x0, x0 + L]) { line(g, x, h * 0.12, x, h * 0.88, T.accent, lw * 0.7); }
};
D['ponzo'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const lw = h * 0.025, vx = w / 2, vy = h * 0.05;
  for (const s of [-1, 1]) line(g, vx + s * w * 0.04, vy, vx + s * w * 0.42, h * 0.97, T.dark, lw);
  for (let i = 1; i < 7; i++) { const y = h * (0.1 + i * 0.14), k = (y - vy) / (h * 0.97 - vy), hw = w * (0.04 + 0.38 * k);
    line(g, vx - hw, y, vx + hw, y, 'rgba(60,70,90,0.35)', lw * 0.5); }
  const bw = w * 0.22, bh = h * 0.045;
  for (const y of [h * 0.3, h * 0.78]) { g.fillStyle = T.accent; g.fillRect(vx - bw / 2, y - bh / 2, bw, bh); }
  if (o.reveal) for (const x of [vx - bw / 2, vx + bw / 2]) line(g, x, h * 0.2, x, h * 0.88, T.guide, lw * 0.5);
};
D['ebbinghaus'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const r = h * 0.09, cy = h / 2;
  const ring = (cx, n, nr, dist, col) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; circ(g, cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, nr, col); } };
  const c1 = w * 0.27, c2 = w * 0.73;
  ring(c1, 6, h * 0.14, r + h * 0.14 + h * 0.025, T.blue);
  ring(c2, 10, h * 0.035, r + h * 0.035 + h * 0.025, T.blue);
  circ(g, c1, cy, r, T.accent); circ(g, c2, cy, r, T.accent);
  if (o.reveal) for (const c of [c1, c2]) circ(g, c, cy, r, null, T.dark, h * 0.008);
};
D['cafe-wall'] = (g, w, h, o, T) => {
  bg(g, w, h, '#8a8a90');
  const rows = 8, rh = h / rows, tw = w / 8;
  for (let r = 0; r < rows; r++) {
    const off = [0, 0.25, 0.5, 0.75][r % 4] * tw * 2;
    for (let x = -tw * 2; x < w + tw * 2; x += tw * 2) { g.fillStyle = T.dark; g.fillRect(x + off, r * rh, tw, rh); g.fillStyle = T.light; g.fillRect(x + off + tw, r * rh, tw, rh); }
  }
  for (let r = 1; r < rows; r++) line(g, 0, r * rh, w, r * rh, '#8a8a90', Math.max(2, h * 0.012));
  if (o.reveal) for (let r = 1; r < rows; r++) line(g, 0, r * rh, w, r * rh, T.accent, h * 0.004);
};
D['hermann-grid'] = (g, w, h, o, T) => {
  bg(g, w, h, T.dark);
  const n = 4, cell = Math.min(w, h) / (n + 0.8), gap = cell * 0.18;
  const gw = n * cell + (n - 1) * gap, ox = (w - gw) / 2, oy = (h - (n * cell + (n - 1) * gap)) / 2;
  g.fillStyle = T.dark; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2c3248'; // dark rounded blocks on a light lattice
  bg(g, w, h, T.light);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = T.dark; g.fillRect(ox + i * (cell + gap), oy + j * (cell + gap), cell, cell); }
  if (o.reveal) for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) circ(g, ox + i * (cell + gap) - gap / 2, oy + j * (cell + gap) - gap / 2, gap * 0.55, null, T.accent, 3);
};
D['simultaneous-contrast'] = (g, w, h, o, T) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, T.light); gr.addColorStop(1, T.dark);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const mid = mixc(T.darkA, T.lightA, 0.5), col = rgb(mid), s = Math.min(w * 0.11, h * 0.3);
  const S2 = Math.min(w * 0.17, h * 0.36);
  for (const fx of [0.15, 0.85]) { const cx = w * fx; g.fillStyle = col; g.fillRect(cx - S2 / 2, h / 2 - S2 / 2, S2, S2); }
  if (o.reveal) { g.fillStyle = col; g.fillRect(w * 0.15, h / 2 - S2 * 0.14, w * 0.7, S2 * 0.28); g.fillStyle = '#d9662b'; g.font = `700 ${Math.round(h * 0.06)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillText('one strip of the very same gray', w / 2, h * 0.86); }
};
D['shadow-tiles'] = (g, w, h, o, T) => {
  const cols = 8, rows = 6, t = Math.min(w / cols, h / rows), ox = (w - t * cols) / 2, oy = (h - t * rows) / 2;
  bg(g, w, h, '#2a3040');
  const X = [96, 140, 128], s = 0.55, B = X.map(v => Math.min(255, Math.round(v / s)));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = rgb((r + c) % 2 ? B : X); g.fillRect(ox + c * t, oy + r * t, t, t); }
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(ox + 3 * t, oy, 2 * t, rows * t);
  // striped cylinder standing at the top of the band
  const cx = ox + 4 * t, ytop = oy + t * 0.3, ybot = oy + t * 1.8, rw = t * 0.8;
  g.fillStyle = '#d8d2c0'; g.fillRect(cx - rw, ytop, rw * 2, ybot - ytop);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#d8d2c0' : T.accent; g.fillRect(cx - rw, ytop + i * (ybot - ytop) / 5, rw * 2, (ybot - ytop) / 5); }
  g.fillStyle = '#d8d2c0'; g.beginPath(); g.ellipse(cx, ybot, rw, rw * 0.35, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#eee8d6'; g.beginPath(); g.ellipse(cx, ytop, rw, rw * 0.35, 0, 0, Math.PI * 2); g.fill();
  const p1 = [ox + 1.5 * t, oy + 3.5 * t], p2 = [ox + 4.5 * t, oy + 3.5 * t];
  if (o.reveal) g.fillStyle = rgb(X), g.fillRect(p1[0], p1[1] - t * 0.12, p2[0] - p1[0], t * 0.24);
  for (const p of [p1, p2]) { circ(g, p[0], p[1], t * 0.12, null, '#fff', 3); g.fillStyle = '#fff'; }
  if (o.reveal) { for (const p of [p1, p2]) { circ(g, p[0], p[1], t * 0.08, rgb(X)); } }
};
D['kanizsa'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const R = Math.min(w, h) * 0.3, cx = w / 2, cy = h * 0.54, r = Math.min(w, h) * 0.1, pts = [];
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  for (const p of pts) {
    const a = Math.atan2(cy - p[1], cx - p[0]);
    g.fillStyle = T.dark; g.beginPath(); g.moveTo(p[0], p[1]); g.arc(p[0], p[1], r, a + Math.PI / 6, a - Math.PI / 6 + Math.PI * 2); g.closePath(); g.fill();
  }
  if (o.reveal) poly(g, pts, null, T.accent, 3);
};
D['impossible-triangle'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const L = 1, s = 0.27, c3 = 0.866;
  const P = (x, y, z) => [(x - y) * c3, (x + y) * 0.5 - z];
  const box = (x0, x1, y0, y1, z0, z1) => {
    const top = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
    const fx = [P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)];
    const fy = [P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)];
    return [[top, '#e4ecf8'], [fx, '#7f9cc6'], [fy, '#3c5a8c']];
  };
  const bars = [box(0, L, 0, s, 0, s), box(L - s, L, 0, L, 0, s), box(L - s, L, L - s, L, 0, L)];
  const all = []; bars.forEach(b => b.forEach(f => f[0].forEach(p => all.push(p))));
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = Math.min(w * 0.8 / (x1 - x0), h * 0.8 / (y1 - y0)), ox = w / 2 - (x0 + x1) / 2 * k, oy = h / 2 - (y0 + y1) / 2 * k;
  const T2 = p => [ox + p[0] * k, oy + p[1] * k];
  for (const i of [1, 2, 0]) for (const f of bars[i]) poly(g, f[0].map(T2), f[1], '#1c2433', Math.max(2, h * 0.007));
  if (o.reveal) { const q = T2(P(0, 0, 0)); circ(g, q[0], q[1], h * 0.05, null, T.accent, 3); }
};
D['blivet'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const p = Math.min(w / 7.5, h / 5), x0 = (w - 5 * p) / 2, yt = h * 0.12, ym = h * 0.5, yb = h * 0.88, lw = Math.max(3, h * 0.012);
  const Lx = k => x0 + k * p, c = T.dark;
  for (const k of [0, 2, 3, 5]) line(g, Lx(k), yt, Lx(k), ym, c, lw);
  for (const k of [0, 1, 2, 3, 4, 5]) line(g, Lx(k), ym, Lx(k), yb - p / 2, c, lw);
  line(g, Lx(1), ym, Lx(2), ym, c, lw); line(g, Lx(3), ym, Lx(4), ym, c, lw);
  line(g, Lx(0), yt, Lx(2), yt, c, lw); line(g, Lx(3), yt, Lx(5), yt, c, lw);
  g.strokeStyle = c; g.lineWidth = lw;
  for (const k of [0, 2, 4]) { g.beginPath(); g.arc(Lx(k) + p / 2, yb - p / 2, p / 2, 0, Math.PI); g.stroke(); }
  if (o.reveal) { for (const k of [1, 3]) circ(g, Lx(k + 0.5), ym, p * 0.2, null, T.accent, 4); }
};
D['zollner'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 7);
  const n = 4, gap = h * 0.2, lw = Math.max(3, h * 0.014), tl = h * 0.05, L = w * 0.62;
  for (let i = 0; i < n; i++) {
    const y = (i - (n - 1) / 2) * gap, s = i % 2 ? 1 : -1;
    for (let x = -L / 2 + tl; x <= L / 2 - tl; x += tl * 1.1) line(g, x - s * tl, y - tl, x + s * tl, y + tl, T.blue, lw * 0.6);
    line(g, -L / 2, y, L / 2, y, T.dark, lw);
    if (o.reveal) line(g, -w, y, w, y, T.accent, lw * 0.3);
  }
  g.restore();
};
D['afterimage-star'] = (g, w, h, o, T) => {
  bg(g, w, h, T.light);
  const col = (AFTER[o.color] || AFTER.green).shape, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.4, pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.42 : R; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  poly(g, pts, col);
  circ(g, cx, cy, R * 0.06, '#101418');
  if (o.reveal) circ(g, cx, cy, R * 0.12, null, '#101418', 2);
};
export function afterimageAnswer(color) { return (AFTER[color] || AFTER.green).answer; }
D['two-faces-vase'] = (g, w, h, o, T) => {
  g.fillStyle = '#1a2032'; g.fillRect(0, 0, w, h);
  const pts = [[0, .17], [.1, .13], [.2, .125], [.3, .07], [.36, .06], [.42, .10], [.5, .075], [.56, .095], [.62, .075], [.7, .105], [.78, .09], [.88, .15], [1, .20]];
  const f = t => { for (let i = 0; i < pts.length - 1; i++) if (t <= pts[i + 1][0]) { const u = (t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), s = (1 - Math.cos(u * Math.PI)) / 2; return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * s; } return pts[pts.length - 1][1]; };
  const y0 = h * 0.04, hh = h * 0.92, cx = w / 2, sc = Math.min(w, hh * 1.2), N = 140, E = [[], []];
  for (let i = 0; i <= N; i++) { const t = i / N; E[0].push([cx - f(t) * sc, y0 + t * hh]); E[1].push([cx + f(t) * sc, y0 + t * hh]); }
  for (const s of [-1, 1]) {
    const e = E[s < 0 ? 0 : 1];
    g.beginPath(); g.moveTo(cx + s * w * 0.46, y0); e.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(cx + s * w * 0.46, y0 + hh);
    g.bezierCurveTo(cx + s * w * 0.62, y0 + hh * 0.7, cx + s * w * 0.62, y0 + hh * 0.2, cx + s * w * 0.46, y0); g.closePath();
    g.fillStyle = '#34406a'; g.fill();
    circ(g, cx + s * w * 0.2, y0 + hh * 0.2, sc * 0.016, '#e8d8b0');
  }
  g.beginPath(); E[0].forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); E[1].slice().reverse().forEach(p => g.lineTo(p[0], p[1])); g.closePath();
  g.fillStyle = o.reveal ? 'rgba(232,176,32,0.95)' : '#e8dcc0'; g.fill();
  if (o.reveal) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
};
D['stepping-feet'] = (g, w, h, o, T) => {
  const t = o.t || 0, sw = w * 0.12;
  for (let x = 0, i = 0; x < w; x += sw, i++) { g.fillStyle = i % 2 ? T.dark : T.light; g.fillRect(x, 0, sw + 1, h); }
  const A = w * 0.2, spd = w * 0.1, per = 4 * A / spd, ph = ((t % per) + per) % per / per;
  const tri = ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4, x = w / 2 + tri * A, bh = h * 0.14, bw = w * 0.1;
  g.fillStyle = '#e8b020'; g.fillRect(x - bw / 2, h * 0.28 - bh / 2, bw, bh);
  g.fillStyle = '#2f6fd0'; g.fillRect(x - bw / 2, h * 0.72 - bh / 2, bw, bh);
  if (o.reveal) for (const y of [h * 0.28, h * 0.72]) line(g, x, y - bh, x, y + bh, T.accent, 3);
};
D['waterfall'] = (g, w, h, o, T) => {
  const t = o.t || 0, P = h / 6, off = (t * 0.25 * P) % P;
  for (let y = 0; y < h; y += 2) {
    const v = (1 + Math.cos(((y - off) / P) * Math.PI * 2)) / 2;
    g.fillStyle = rgb(mixc(T.darkA, T.lightA, v)); g.fillRect(0, y, w, 2);
  }
  if (o.reveal) for (let i = 0; i < 7; i++) line(g, 0, i * P, w * 0.06, i * P, T.accent, 3);
};

export function drawIllusion(id, g, w, h, opts = {}) {
  const fn = D[id];
  if (!fn) throw new Error('Unknown illusion: ' + id);
  const T = tones(opts);
  g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
  try { fn(g, w, h, opts, T); } finally { g.restore(); }
}

// ---------- Surreal dream sky (equirectangular 2:1, wraps at x=0/x=w) ----------
export function drawSurrealSky(g, w, h, seed = 1) {
  const R = rng(seed * 7919 + 13), TAU = Math.PI * 2, hz = h * 0.5;
  const wrap = (x, r, fn) => { fn(x); if (x - r < 0) fn(x + w); if (x + r > w) fn(x - w); };
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#080c26'); gr.addColorStop(0.28, '#1f1858'); gr.addColorStop(0.42, '#1a2a52');
  gr.addColorStop(0.5, '#0a1220'); gr.addColorStop(0.7, '#070b17'); gr.addColorStop(1, '#04060e');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // stars (upper sky only)
  for (let i = 0; i < 700; i++) { const x = R() * w, y = Math.pow(R(), 1.3) * h * 0.4, a = 0.25 + R() * 0.55;
    g.fillStyle = `rgba(235,230,255,${a})`; g.fillRect(x, y, 1 + (R() < 0.1), 1 + (R() < 0.1)); }
  // aurora ribbons (integer-frequency sines => seamless)
  const ribbons = [[0.2, '70,230,190', 3, 0.5], [0.14, '150,110,240', 5, 0.3], [0.26, '60,170,230', 2, 0.4]];
  ribbons.forEach(([yb, col, k, a], ri) => {
    const ph = R() * TAU;
    for (let x = 0; x < w; x += 3) {
      const u = x / w * TAU, y = h * (yb + 0.04 * Math.sin(u * k + ph) + 0.02 * Math.sin(u * (k * 2 + 1) + ph * 2));
      const len = h * (0.1 + 0.05 * Math.sin(u * (k + 2) + ph));
      const lg = g.createLinearGradient(0, y - len, 0, y + len * 0.2);
      lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.7, `rgba(${col},${a * 0.35})`); lg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = lg; g.fillRect(x, y - len, 3, len * 1.2);
    }
  });
  // checkerboard plain bending into the sky
  const checker = (cx, cw) => wrap(cx, cw, (X) => {
    const n = 14, m = 10;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const q = (a, b) => { const v = b / m, bend = Math.pow(v, 1.7), sx = 1 - v * 0.45; return [X + (a / n - 0.5) * cw * sx + Math.sin(v * 2.4) * cw * 0.08, hz * 0.97 - bend * h * 0.34]; };
      const p = [q(i, j), q(i + 1, j), q(i + 1, j + 1), q(i, j + 1)];
      g.fillStyle = (i + j) % 2 ? 'rgba(90,70,150,0.30)' : 'rgba(20,30,70,0.35)'; poly(g, p, g.fillStyle);
    }
  });
  checker(w * 0.72, w * 0.16);
  // moon that is an eye-shaped doorway
  wrap(w * 0.45, h * 0.2, (X) => {
    const Y = h * 0.2, r = h * 0.12;
    const mg = g.createRadialGradient(X, Y, r * 0.8, X, Y, r * 2.2); mg.addColorStop(0, 'rgba(220,210,255,0.35)'); mg.addColorStop(1, 'rgba(220,210,255,0)');
    g.fillStyle = mg; g.fillRect(X - r * 2.2, Y - r * 2.2, r * 4.4, r * 4.4);
    circ(g, X, Y, r, '#d9d4ee');
    g.beginPath(); g.moveTo(X - r * 0.8, Y); g.quadraticCurveTo(X, Y - r * 0.9, X + r * 0.8, Y); g.quadraticCurveTo(X, Y + r * 0.9, X - r * 0.8, Y); g.closePath();
    const dg = g.createLinearGradient(0, Y - r * 0.5, 0, Y + r * 0.5); dg.addColorStop(0, '#f2a64a'); dg.addColorStop(1, '#6a2a50');
    g.fillStyle = dg; g.fill();
    g.fillStyle = '#1a1028'; g.beginPath(); g.ellipse(X, Y, r * 0.09, r * 0.4, 0, 0, TAU); g.fill();
  });
  // floating islands with upward waterfalls
  const island = (cx, cy, rw) => wrap(cx, rw * 1.5, (X) => {
    for (let s = 0; s < 3; s++) { const sx = X + (s - 1) * rw * 0.5, a = 0.5;
      const wg = g.createLinearGradient(0, cy - h * 0.2, 0, cy);
      wg.addColorStop(0, 'rgba(160,230,255,0)'); wg.addColorStop(1, 'rgba(160,230,255,0.5)');
      g.strokeStyle = wg; g.lineWidth = rw * 0.05; g.beginPath(); g.moveTo(sx, cy); g.bezierCurveTo(sx + rw * 0.2, cy - h * 0.07, sx - rw * 0.2, cy - h * 0.13, sx + rw * 0.05, cy - h * 0.2); g.stroke(); }
    const rg = g.createLinearGradient(0, cy, 0, cy + rw * 0.9); rg.addColorStop(0, '#2c2748'); rg.addColorStop(1, '#0f1224');
    g.fillStyle = rg; g.beginPath(); g.moveTo(X - rw, cy); g.quadraticCurveTo(X - rw * 0.4, cy + rw * 0.5, X, cy + rw * 0.9); g.quadraticCurveTo(X + rw * 0.4, cy + rw * 0.5, X + rw, cy); g.closePath(); g.fill();
    g.fillStyle = '#1f5a5a'; g.beginPath(); g.ellipse(X, cy, rw, rw * 0.16, 0, 0, TAU); g.fill();
    circ(g, X + rw * 0.4, cy - rw * 0.12, rw * 0.04, '#ffb35a');
  });
  island(w * 0.12, h * 0.3, h * 0.06); island(w * 0.3, h * 0.17, h * 0.045); island(w * 0.58, h * 0.31, h * 0.07); island(w * 0.88, h * 0.2, h * 0.05);
  // drooping staircase to nowhere
  wrap(w * 0.8, w * 0.1, (X) => {
    for (let i = 0; i < 16; i++) { const u = i / 15, x = X - w * 0.07 + u * w * 0.14, y = h * 0.38 - Math.sin(u * 1.5) * h * 0.2 + Math.pow(u, 3) * h * 0.06, s = 1 - u * 0.4, sw = w * 0.012 * s * 2.5, sh = h * 0.012 * s * 2.5;
      g.fillStyle = `rgba(${150 - i * 4},${120 - i * 3},${190 - i * 4},0.75)`; g.fillRect(x, y, sw, sh);
      g.fillStyle = 'rgba(30,20,60,0.6)'; g.fillRect(x, y + sh, sw, sh * 0.5); }
  });
  // oversized keys and keyholes drifting like clouds
  const key = (cx, cy, s, rot) => wrap(cx, s * 2, (X) => {
    g.save(); g.translate(X, cy); g.rotate(rot); g.fillStyle = 'rgba(220,170,110,0.28)'; g.strokeStyle = 'rgba(220,170,110,0.28)';
    g.lineWidth = s * 0.12; g.beginPath(); g.arc(-s, 0, s * 0.45, 0, TAU); g.stroke();
    g.fillRect(-s * 0.55, -s * 0.06, s * 1.7, s * 0.12); g.fillRect(s * 0.8, 0, s * 0.1, s * 0.3); g.fillRect(s * 1.0, 0, s * 0.1, s * 0.22); g.restore();
  });
  const hole = (cx, cy, s) => wrap(cx, s, (X) => { g.fillStyle = 'rgba(120,150,220,0.2)'; g.beginPath(); g.arc(X, cy, s * 0.5, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(X - s * 0.2, cy + s * 0.9); g.lineTo(X, cy); g.lineTo(X + s * 0.2, cy + s * 0.9); g.closePath(); g.fill(); });
  key(w * 0.05, h * 0.1, h * 0.05, -0.3); key(w * 0.36, h * 0.33, h * 0.04, 0.4); key(w * 0.66, h * 0.1, h * 0.06, 0.2); key(w * 0.93, h * 0.36, h * 0.04, -0.5);
  hole(w * 0.22, h * 0.1, h * 0.06); hole(w * 0.52, h * 0.36, h * 0.05); hole(w * 0.78, h * 0.08, h * 0.05);
  // ---- extra dream layer: more islands, a spiral river of stars, lanterns, glowing keyhole doors, paper boats ----
  const R2 = rng(seed * 104729 + 7);
  for (let i = 0; i < 9; i++) island(R2() * w, h * (0.07 + R2() * 0.3), h * (0.022 + R2() * 0.04));
  checker(w * 0.2, w * 0.12);
  wrap(w * 0.27, w * 0.2, (X) => {
    for (let i = 0; i < 280; i++) { const u = i / 279, a = u * TAU * 1.3, rad = w * 0.12 * (1 - u * 0.78), x = X + Math.cos(a) * rad, y = h * 0.27 - Math.sin(a) * rad * 0.42 - u * h * 0.1, sz = (1 - u) * 3 + 0.7;
      g.fillStyle = `rgba(${200 + 55 * u | 0},${225 - 40 * u | 0},255,${0.75 - u * 0.45})`; g.fillRect(x, y, sz * 1.7, sz * 0.85); }
  });
  for (let k = 0; k < 6; k++) { const x0 = R2() * w, y0 = h * (0.3 + R2() * 0.13);
    for (let i = 0; i < 9; i++) { const x = (x0 + i * w * 0.012) % w, y = y0 - i * h * 0.012 - Math.sin(i * 0.8) * h * 0.006, rr = h * 0.014;
      const lg = g.createRadialGradient(x, y, 0, x, y, rr); lg.addColorStop(0, 'rgba(255,190,110,0.9)'); lg.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = lg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } }
  [[0.07, 0.4], [0.41, 0.41], [0.63, 0.4], [0.94, 0.41]].forEach(([fx, fy]) => wrap(w * fx, h * 0.11, (X) => { const Y = h * fy, ks = h * 0.035;
    const dg = g.createRadialGradient(X, Y, 0, X, Y, ks * 3); dg.addColorStop(0, 'rgba(255,214,140,0.5)'); dg.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = dg; g.fillRect(X - ks * 3, Y - ks * 3, ks * 6, ks * 6);
    g.fillStyle = 'rgba(255,226,170,0.9)'; g.beginPath(); g.arc(X, Y - ks * 0.5, ks * 0.42, 0, TAU); g.fill(); g.beginPath(); g.moveTo(X - ks * 0.22, Y + ks * 0.9); g.lineTo(X, Y - ks * 0.4); g.lineTo(X + ks * 0.22, Y + ks * 0.9); g.closePath(); g.fill(); }));
  for (let k = 0; k < 8; k++) { const X = w * (0.04 + R2() * 0.92), Y = h * (0.1 + R2() * 0.26), bs = h * (0.012 + R2() * 0.012), bc = 'rgba(240,236,255,0.5)';
    poly(g, [[X - bs * 1.6, Y], [X + bs * 1.6, Y], [X + bs, Y + bs * 0.7], [X - bs, Y + bs * 0.7]], bc); poly(g, [[X, Y - bs * 1.5], [X + bs * 0.9, Y - bs * 0.1], [X, Y - bs * 0.1]], bc); }
  // darken near/below horizon so foreground reads well
  const dk = g.createLinearGradient(0, h * 0.43, 0, h * 0.6);
  dk.addColorStop(0, 'rgba(6,9,18,0)'); dk.addColorStop(0.45, 'rgba(6,9,18,0.82)'); dk.addColorStop(1, 'rgba(4,6,14,0.95)');
  g.fillStyle = dk; g.fillRect(0, h * 0.43, w, h * 0.57);
}
