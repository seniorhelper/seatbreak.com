// Procedural canvas textures — every asset is original, drawn in code.
import * as THREE from 'three';

const cache = new Map();

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(key, w, h, draw, srgb = true) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.shared = true;
  cache.set(key, t);
  return t;
}

// A repeat-adjusted copy that shares the same image
export function rep(tex, x = 1, y = 1) {
  const t = tex.clone();
  t.repeat.set(x, y);
  t.needsUpdate = true;
  t.userData.shared = true;
  return t;
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return '#' + c.getHexString();
}

export function wood(base = '#8a5a34', key = 'w') {
  return make('wood' + base + key, 512, 512, (g, w, h) => {
    const r = rng(base.length * 97 + key.length * 13);
    const rows = 6, ph = h / rows;
    for (let i = 0; i < rows; i++) {
      const off = (r() * 0.14 - 0.07);
      g.fillStyle = shade(base, off);
      g.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 26; k++) {
        g.strokeStyle = `rgba(40,20,8,${0.05 + r() * 0.12})`;
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        const y0 = i * ph + r() * ph;
        for (let x = 0; x <= w; x += 16) {
          const y = y0 + Math.sin(x * 0.012 + k + i) * 3 + Math.sin(x * 0.05 + k * 2) * 1.2;
          x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }
      if (r() > 0.5) { // knot
        const kx = r() * w, ky = i * ph + ph / 2;
        for (let s = 9; s > 0; s--) {
          g.strokeStyle = `rgba(50,25,10,${0.08 + s * 0.015})`;
          g.beginPath(); g.ellipse(kx, ky, s * 2.6, s * 1.1, 0, 0, Math.PI * 2); g.stroke();
        }
      }
      g.fillStyle = 'rgba(20,10,4,0.55)';
      g.fillRect(0, i * ph, w, 2);
      const seam = r() * w;
      g.fillRect(seam, i * ph, 2, ph);
    }
  });
}

export function wallpaper(a = '#f3d9e8', b = '#ffffff', motif = 'star', key = '') {
  return make('wp' + a + b + motif + key, 512, 512, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 18, h);
    g.globalAlpha = 0.85;
    const drawStar = (cx, cy, R) => {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? R * 0.45 : R, an = -Math.PI / 2 + i * Math.PI / 5;
        g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr);
      }
      g.closePath(); g.fill();
    };
    for (let y = 32; y < h; y += 64) for (let x = 41; x < w; x += 64) {
      g.fillStyle = shade(a, -0.12);
      if (motif === 'star') drawStar(x, y + ((x / 64) % 2) * 32 - 16, 10);
      else if (motif === 'damask') {
        g.beginPath(); g.ellipse(x, y, 8, 16, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x, y - 22, 4, 0, Math.PI * 2); g.fill();
      } else { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1;
  });
}

export function panel(base = '#2a3140', line = '#121722', key = '') {
  return make('pn' + base + line + key, 512, 512, (g, w, h) => {
    const r = rng(7 + key.length);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.03})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 30, 1);
    }
    g.strokeStyle = line; g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.strokeRect(3, 3, w / 2 - 3, h / 2 - 3);
    g.strokeRect(w / 2, h / 2, w / 2 - 3, h / 2 - 3);
    g.fillStyle = shade(base, 0.12);
    for (const [x, y] of [[20, 20], [w - 20, 20], [20, h - 20], [w - 20, h - 20], [w / 2 + 20, h / 2 + 20], [w / 2 - 20, h / 2 - 20]]) {
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
    }
  });
}

export function brick(base = '#7a3b2a', key = '') {
  return make('br' + base + key, 512, 512, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = '#8f8576'; g.fillRect(0, 0, w, h);
    const bh = 32, bw = 96;
    for (let y = 0; y < h; y += bh) {
      const o = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        g.fillStyle = shade(base, r() * 0.12 - 0.06);
        g.fillRect(x + o + 3, y + 3, bw - 6, bh - 6);
      }
    }
  });
}

export function carpet(a = '#6b1f2a', b = '#c9a24a', key = '') {
  return make('cp' + a + b + key, 512, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.strokeStyle = b; g.lineWidth = 10; g.strokeRect(30, 30, w - 60, h - 60);
    g.lineWidth = 3; g.strokeRect(50, 50, w - 100, h - 100);
    g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
    g.strokeRect(-90, -90, 180, 180); g.restore();
  });
}

export function sky(key = 'deep', hue = 250) {
  return make('sky' + key + hue, 2048, 1024, (g, w, h) => {
    const r = rng(hue);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, `hsl(${hue},55%,6%)`);
    gr.addColorStop(0.5, `hsl(${hue + 20},50%,10%)`);
    gr.addColorStop(1, `hsl(${hue - 20},60%,4%)`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { // nebula clouds
      const x = r() * w, y = h * 0.2 + r() * h * 0.6, R = 150 + r() * 380;
      const ng = g.createRadialGradient(x, y, 0, x, y, R);
      const hh = hue + (r() * 120 - 60);
      ng.addColorStop(0, `hsla(${hh},90%,55%,0.22)`);
      ng.addColorStop(1, `hsla(${hh},90%,40%,0)`);
      g.fillStyle = ng; g.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 2600; i++) {
      const s = r();
      g.fillStyle = `rgba(255,255,255,${0.25 + s * 0.75})`;
      const sz = s > 0.985 ? 2.6 : s > 0.9 ? 1.6 : 0.9;
      g.beginPath(); g.arc(r() * w, r() * h, sz, 0, Math.PI * 2); g.fill();
    }
  });
}

export function noise(key = 'n', base = '#777', amp = 0.15) {
  return make('nz' + key + base, 256, 256, (g, w, h) => {
    const r = rng(key.length * 11 + 3);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) {
      const v = (r() - 0.5) * amp;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
    }
  });
}

export function tiles(a = '#e9e6df', b = '#cfc9bd', n = 8, key = '') {
  return make('tl' + a + b + n + key, 512, 512, (g, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s);
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });
}

// ---------- Text ----------
export function textCanvas(lines, o = {}) {
  const fs = o.size || 64;
  const font = `${o.weight || 700} ${fs}px ${o.family || 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'}`;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  const arr = Array.isArray(lines) ? lines : String(lines).split('\n');
  const pad = o.pad ?? Math.round(fs * 0.4);
  const lh = fs * (o.lineHeight || 1.22);
  let mw = 0;
  for (const l of arr) mw = Math.max(mw, g.measureText(l).width);
  c.width = Math.ceil(o.width || mw + pad * 2);
  c.height = Math.ceil(o.height || arr.length * lh + pad * 2);
  g.font = font;
  if (o.bg) {
    g.fillStyle = o.bg;
    const rr = o.radius ?? fs * 0.3;
    g.beginPath(); g.roundRect(0, 0, c.width, c.height, rr); g.fill();
  }
  if (o.border) {
    g.strokeStyle = o.border; g.lineWidth = o.borderWidth || 6;
    const bw = g.lineWidth / 2, rr = o.radius ?? fs * 0.3;
    g.beginPath(); g.roundRect(bw, bw, c.width - bw * 2, c.height - bw * 2, rr); g.stroke();
  }
  g.textBaseline = 'middle';
  g.textAlign = o.align || 'center';
  const x = g.textAlign === 'left' ? pad : g.textAlign === 'right' ? c.width - pad : c.width / 2;
  const top = (c.height - arr.length * lh) / 2 + lh / 2;
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = fs * 0.35; }
  arr.forEach((l, i) => {
    g.fillStyle = (o.colors && o.colors[i]) || o.color || '#fff';
    g.fillText(l, x, top + i * lh);
  });
  return c;
}

export function label(lines, o = {}) {
  const c = textCanvas(lines, o);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const w = o.w || 1;
  const h = w * c.height / c.width;
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: o.depthWrite ?? false, side: o.side || THREE.FrontSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.renderOrder = o.renderOrder || 2;
  mesh.userData.h = h;
  return mesh;
}

// Build a tangent-space normal map from any canvas texture (cheap "real surface" look for floors)
const nCache = new Map();
export function normalFrom(tex, strength = 2.2) {
  const src = tex.image;
  if (!src || !src.getContext) return null;
  if (nCache.has(src)) { const t = nCache.get(src).clone(); t.repeat.copy(tex.repeat); t.needsUpdate = true; t.userData.shared = true; return t; }
  const w = src.width, h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), out = g.createImageData(w, h);
  const L = (x, y) => { const i = (((y + h) % h) * w + ((x + w) % w)) * 4; return (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * strength, dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    const il = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) * 4;
    out.data[i] = (-dx * il * 0.5 + 0.5) * 255; out.data[i + 1] = (dy * il * 0.5 + 0.5) * 255; out.data[i + 2] = (il * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const base = new THREE.CanvasTexture(c);
  base.wrapS = base.wrapT = THREE.RepeatWrapping; base.anisotropy = 4; base.userData.shared = true;
  nCache.set(src, base);
  const t = base.clone(); t.repeat.copy(tex.repeat); t.needsUpdate = true; t.userData.shared = true;
  return t;
}
// soft radial shadow / edge gradient used for fake ambient occlusion
export function blobTex() {
  return make('blob', 128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.6, 'rgba(0,0,0,0.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }, false);
}
export function edgeTex() {
  return make('edge', 8, 64, (g) => { const r = g.createLinearGradient(0, 0, 0, 64); r.addColorStop(0, 'rgba(0,0,0,0.6)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 8, 64); }, false);
}
