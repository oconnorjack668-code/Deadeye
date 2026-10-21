// The first promo's rim line on the first hoop runs past the far side of the ring onto the
// bracket. This moves its right-hand end back onto the ring, in assets/classic/hook.mp4 and
// the first shots of middle.mp4. Run by build-classic.mjs straight after it cuts those pieces
// (running it a second time on its own output would move the end again).
//
// Each frame: find the two dots (orange disk, white ring), work out where the raw clip (16606)
// sits in the frame from them, cover the overrun line and old dot with the same spot from the
// raw clip at the matching moment (colour-matched to the frame), then put the old dot back
// at the ring's far edge. Blurred frames (the whip pan, shakes) get a smooth fill instead.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', '..', 'promo-classic', 'assets', 'classic');
const FF = process.env.FFMPEG || 'C:/Users/Vivobook S16/AppData/Local/Temp/deadeye-bench/ffmpeg-bin/ffmpeg.exe';
const RAW = 'C:/Users/Vivobook S16/Downloads/Mobile Devices/16606.mp4';
const enc = ['-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-g', '15', '-movflags', '+faststart'];
const W = 1080, H = 1920, FS = W * H * 3;
// The first promo's taps in 16606 (2336x1080) pixels, measured by registering its frames on the
// raw clip. The left tap is on the ring; the right one is on the bracket. The ring's far edge
// is 0.79 of the way along.
const TAP_L = [1226.5, 236.5], TAP_R = [1369.5, 214.25], RIM_END = 0.79;
// pieces and the frames that show the first hoop
const PIECES = [['hook', 0, 84], ['middle', 0, 166]];
// raw clip kept in memory around the hoop
const RX = 1150, RY = 120, RW = 300, RH = 220, RFPS = 30.02;

const isOr = (b, i) => b[i] > 215 && b[i + 1] > 70 && b[i + 1] < 160 && b[i + 2] < 70;
const isWh = (b, i) => b[i] > 225 && b[i + 1] > 215 && b[i + 2] > 190;
const isOverlay = (b, i) => { const r = b[i], g = b[i + 1], bl = b[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); return (mx > 200 && mx - mn > 110) || (r > 235 && g > 235 && bl > 235); };
// overlay pieces that are not the rim line (green call rings, red ball trail): left alone
const keepOverlay = (b, i) => { const r = b[i], g = b[i + 1], bl = b[i + 2]; return (g > r + 30 && g > bl + 20) || (r > 180 && g < 85 && bl < 85 && g - bl < 40); }; // red, not the line's darker orange edge

function frames(file, onFrame) {
  return new Promise((resolve) => {
    const p = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
    let parts = [], have = 0, n = 0, chain = Promise.resolve();
    p.stdout.on('data', (d) => {
      parts.push(d); have += d.length;
      while (have >= FS) {
        const all = Buffer.concat(parts), f = Buffer.from(all.subarray(0, FS));
        parts = [all.subarray(FS)]; have -= FS;
        const k = n++; chain = chain.then(() => onFrame(f, k));
        if (have < FS) { p.stdout.pause(); chain.then(() => p.stdout.resume()); }
      }
    });
    p.on('close', () => chain.then(() => resolve(n)));
  });
}

const inner = [[0, 0]], ring = [];
for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; inner.push([Math.round(5 * Math.cos(a)), Math.round(5 * Math.sin(a))]); }
for (let k = 0; k < 20; k++) { const a = (k * Math.PI) / 10; ring.push([Math.round(11 * Math.cos(a)), Math.round(11 * Math.sin(a))]); }
function findDots(b) {
  const cl = [];
  for (let y = 16; y < 1000; y += 2) for (let x = 16; x < W - 16; x += 2) {
    if (!isOr(b, (y * W + x) * 3)) continue;
    let o = 0; for (const [dx, dy] of inner) if (isOr(b, ((y + dy) * W + x + dx) * 3)) o++;
    if (o < 11) continue;
    let w = 0; for (const [dx, dy] of ring) if (isWh(b, ((y + dy) * W + x + dx) * 3)) w++;
    if (w < 12) continue;
    let c = cl.find((c) => Math.hypot(c.x / c.n - x, c.y / c.n - y) < 14);
    if (!c) cl.push((c = { x: 0, y: 0, n: 0 }));
    c.x += x * w; c.y += y * w; c.n += w;
  }
  return cl.map((c) => [c.x / c.n, c.y / c.n]).sort((a, b) => a[0] - b[0]);
}
// both dots for every frame in range: seen, or filled in from the frames around it
function trackDots(seen, from, to) {
  const both = [];
  for (let k = from; k < to; k++) { const d = seen[k]; if (d.length === 2 && d[1][0] - d[0][0] > 200 && d[1][0] - d[0][0] < 360) both.push(k); }
  const predict = (k) => {
    const a = [...both].reverse().find((j) => j <= k), b = both.find((j) => j >= k);
    if (a === undefined || b === undefined) { const j = a ?? b; return seen[j]; }
    if (a === b) return seen[a];
    const t = (k - a) / (b - a), A = seen[a], B = seen[b];
    return [0, 1].map((s) => [A[s][0] + t * (B[s][0] - A[s][0]), A[s][1] + t * (B[s][1] - A[s][1])]);
  };
  const out = {};
  let started = false;
  for (let k = from; k < to; k++) {
    const d = seen[k];
    if (!started && !d.length) continue; // the hoop has not come into shot yet
    started = true;
    if (both.includes(k)) { out[k] = d; continue; }
    const [pl, pr] = predict(k);
    if (d.length >= 1) {
      const dot = d[0], toL = Math.hypot(dot[0] - pl[0], dot[1] - pl[1]), toR = Math.hypot(dot[0] - pr[0], dot[1] - pr[1]);
      const off = [pr[0] - pl[0], pr[1] - pl[1]];
      out[k] = toL < toR ? [dot, [dot[0] + off[0], dot[1] + off[1]]] : [[dot[0] - off[0], dot[1] - off[1]], dot];
    } else out[k] = [pl, pr];
  }
  return out;
}
// similarity transform taking raw pixels to frame pixels, from the two taps and the two dots
function sim(pL, pR) {
  const qx = TAP_R[0] - TAP_L[0], qy = TAP_R[1] - TAP_L[1], px = pR[0] - pL[0], py = pR[1] - pL[1];
  const d = qx * qx + qy * qy, a = (px * qx + py * qy) / d, b = (py * qx - px * qy) / d, k = a * a + b * b;
  return (x, y) => { const ux = x - pL[0], uy = y - pL[1]; return [TAP_L[0] + (a * ux + b * uy) / k, TAP_L[1] + (-b * ux + a * uy) / k]; };
}
function sampleRaw(buf, qx, qy, c) {
  const x = qx - RX, y = qy - RY, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  if (x0 < 0 || y0 < 0 || x0 + 1 >= RW || y0 + 1 >= RH) return -1;
  const i = (y0 * RW + x0) * 3 + c, j = i + RW * 3;
  return (buf[i] * (1 - fx) + buf[i + 3] * fx) * (1 - fy) + (buf[j] * (1 - fx) + buf[j + 3] * fx) * fy;
}
const segDist = (x, y, a, b) => {
  const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy);
};

// the raw clip around the hoop, every frame
const rawBuf = execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-i', RAW, '-vf', `crop=${RW}:${RH}:${RX}:${RY}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 2e9 });
const RFS = RW * RH * 3, raws = [], rawLum = [];
for (let i = 0; i + RFS <= rawBuf.length; i += RFS) {
  const f = rawBuf.subarray(i, i + RFS), l = new Uint8Array(RW * RH);
  for (let p = 0; p < RW * RH; p++) l[p] = 0.299 * f[p * 3] + 0.587 * f[p * 3 + 1] + 0.114 * f[p * 3 + 2];
  raws.push(f); rawLum.push(l);
}

// the raw frame that best matches this one around the hoop, and how well (correlation)
function matchRaw(b, inv) {
  const idx = [], val = [];
  for (let y = 300; y < 640; y += 5) for (let x = 360; x < 920; x += 5) {
    const i = (y * W + x) * 3; if (isOverlay(b, i)) continue;
    const [qx, qy] = inv(x, y), rx = Math.round(qx - RX), ry = Math.round(qy - RY);
    if (rx < 0 || ry < 0 || rx >= RW || ry >= RH) continue;
    idx.push(ry * RW + rx); val.push(0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]);
  }
  const n = idx.length; let sa = 0, saa = 0;
  for (const v of val) { sa += v; saa += v * v; }
  const va = saa / n - (sa / n) ** 2;
  let best = { c: -2, k: 0 };
  const all = new Float32Array(rawLum.length);
  rawLum.forEach((l, k) => {
    let sb = 0, sbb = 0, sab = 0;
    for (let j = 0; j < n; j++) { const u = l[idx[j]]; sb += u; sbb += u * u; sab += u * val[j]; }
    const c = (sab / n - (sa / n) * (sb / n)) / Math.sqrt(va * (sbb / n - (sb / n) ** 2));
    all[k] = c;
    if (c > best.c) best = { c, k };
  });
  return { ...best, all };
}

// a dot near p, allowing for the colour flashes washing it out (orange-ish centre, pale ring)
function refineDot(b, p) {
  const orish = (i) => b[i] - b[i + 2] > 70 && b[i] - b[i + 1] > 30;
  // pale, or white with a ball trail drawn half over it
  const whish = (i) => (Math.min(b[i], b[i + 1], b[i + 2]) > 185 && Math.max(b[i], b[i + 1], b[i + 2]) - Math.min(b[i], b[i + 1], b[i + 2]) < 70) || (b[i] > 235 && Math.min(b[i + 1], b[i + 2]) > 140);
  let best = { s: 0 };
  for (let y = Math.round(p[1]) - 40; y <= Math.round(p[1]) + 40; y++) for (let x = Math.round(p[0]) - 40; x <= Math.round(p[0]) + 40; x++) {
    if (x < 14 || x >= W - 14 || y < 14) continue;
    // a call ring or ball trail drawn across the dot hides part of it: those pixels count too
    let s = 0, o = 0, w = 0;
    for (const [dx, dy] of inner) { const i = ((y + dy) * W + x + dx) * 3; if (orish(i)) s++; else if (keepOverlay(b, i)) o++; }
    if (s < 4 || s + o < 10) continue;
    for (const [dx, dy] of ring) { const i = ((y + dy) * W + x + dx) * 3; if (whish(i)) w++; else if (keepOverlay(b, i)) o++; }
    if (w >= 4 && s + w + o > best.s) best = { s: s + w + o, p: [x, y] };
  }
  return best.s >= 25 ? best.p : null;
}
function settleDots(b, guess, sure) {
  if (sure) return guess;
  const [gl, gr] = guess, off = [gr[0] - gl[0], gr[1] - gl[1]], l = refineDot(b, gl), r = refineDot(b, gr);
  if (l && r && r[0] - l[0] > 200 && r[0] - l[0] < 360) return [l, r];
  if (r) return [[r[0] - off[0], r[1] - off[1]], r];
  if (l) return [l, [l[0] + off[0], l[1] + off[1]]];
  return null; // no dot seen: a flash frame with the line somewhere else, left alone
}
// one raw frame per frame: a jumpy best match is replaced by its neighbours' steady timing
function steadyTiming(matches, ks) {
  const step = RFPS / 30, off = {}, out = {};
  for (const k of ks) if (matches[k].c >= 0.8) off[k] = matches[k].k - k * step;
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  // frames whose best match agrees with their neighbours: steady offset from those neighbours
  const steady = {};
  for (const k of ks) {
    if (off[k] === undefined) continue;
    const win = ks.filter((j) => Math.abs(j - k) <= 6 && off[j] !== undefined).map((j) => off[j]);
    const sup = win.filter((v) => Math.abs(v - off[k]) <= 2);
    if (sup.length >= 3) steady[k] = med(sup);
  }
  // every other frame takes the timing of the nearest steady frame before or after it,
  // whichever looks more like it
  const clamp = (v) => Math.max(0, Math.min(raws.length - 1, Math.round(v)));
  for (const k of ks) {
    if (steady[k] !== undefined) { out[k] = clamp(k * step + steady[k]); continue; }
    const cands = [];
    for (const dir of [-1, 1]) for (let j = k + dir; Math.abs(j - k) <= 8; j += dir) if (steady[j] !== undefined) { cands.push(clamp(k * step + steady[j])); break; }
    const best = cands.sort((a, b) => matches[k].all[b] - matches[k].all[a])[0];
    if (best !== undefined && matches[k].all[best] >= 0.5) out[k] = best;
  }
  return out;
}

function fixFrame(b, pL, pR, rawK) {
  const pE = [pL[0] + RIM_END * (pR[0] - pL[0]), pL[1] + RIM_END * (pR[1] - pL[1])];
  // the new end dot is drawn in the old one's colours (they change with the flashes), with
  // anything drawn over that spot (call rings, ball trail) left on top as before
  const DOT = 13, avg = (px) => px.length ? [0, 1, 2].map((c) => px.reduce((t, p) => t + p[c], 0) / px.length) : null;
  const dotColours = (p) => {
    const or = [], wh = [];
    for (let dy = -DOT; dy <= DOT; dy++) for (let dx = -DOT; dx <= DOT; dx++) {
      const x = Math.round(p[0]) + dx, y = Math.round(p[1]) + dy, d = Math.hypot(dx, dy);
      if (x < 0 || x >= W || y < 0) continue;
      const i = (y * W + x) * 3, px = [b[i], b[i + 1], b[i + 2]];
      if (keepOverlay(b, i)) continue;
      if (d < 6.5 && px[0] - px[2] > 70) or.push(px);
      else if (d > 9.5 && d < 11.5 && Math.min(...px) > 170) wh.push(px);
    }
    return or.length > 20 && wh.length > 10 ? [avg(or), avg(wh)] : null;
  };
  const colours = dotColours(pR) || dotColours(pL) || [[255, 110, 0], [255, 255, 250]];
  const over = new Set();
  for (let dy = -DOT; dy <= DOT; dy++) for (let dx = -DOT; dx <= DOT; dx++) {
    const x = Math.round(pE[0]) + dx, y = Math.round(pE[1]) + dy;
    if (x >= 0 && x < W && keepOverlay(b, (y * W + x) * 3)) over.add(y * W + x);
  }
  // what to cover: the line past the ring, and the old dot
  const inMask = (x, y) => segDist(x, y, pE, pR) <= 5.5 || Math.hypot(x - pR[0], y - pR[1]) <= 16;
  const x0 = Math.max(0, Math.floor(Math.min(pE[0], pR[0]) - 30)), x1 = Math.min(W - 1, Math.ceil(Math.max(pE[0], pR[0]) + 30));
  const y0 = Math.max(0, Math.floor(Math.min(pE[1], pR[1]) - 30)), y1 = Math.ceil(Math.max(pE[1], pR[1]) + 30);
  const mask = [], ringPx = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * W + x) * 3;
    if (inMask(x, y)) { if (!keepOverlay(b, i)) mask.push([x, y]); continue; }
    const d = Math.min(segDist(x, y, pE, pR) - 5.5, Math.hypot(x - pR[0], y - pR[1]) - 16);
    if (d < 12 && !isOverlay(b, i) && !keepOverlay(b, i)) ringPx.push([x, y]);
  }
  let inv = sim(pL, pR);
  if (rawK !== undefined) {
    // a frame blurred by a whip or shake would show a sharp patch: fill those instead
    let ge = 0, gr = 0;
    for (const [x, y] of ringPx) {
      if (x + 1 > x1 || inMask(x + 1, y)) continue;
      const i = (y * W + x) * 3, q = inv(x, y), q1 = inv(x + 1, y), a = sampleRaw(raws[rawK], q[0], q[1], 1), c = sampleRaw(raws[rawK], q1[0], q1[1], 1);
      if (a < 0 || c < 0) continue;
      ge += Math.abs(b[i + 4] - b[i + 1]); gr += Math.abs(c - a);
    }
    if (ge < 0.6 * gr) rawK = undefined;
  }
  if (rawK !== undefined) {
    // on a zoom pop or shake the footage can sit a little differently from the dots: nudge and
    // scale the raw clip round the old dot until it lines up with the picture there, and fill
    // instead if it never does
    const reg = [];
    for (let y = y0 - 20; y <= y1 + 20; y += 2) for (let x = x0 - 20; x <= x1 + 20; x += 2) {
      if (x < 0 || x >= W || y < 0 || inMask(x, y)) continue;
      const i = (y * W + x) * 3; if (!isOverlay(b, i) && !keepOverlay(b, i)) reg.push([x, y, b[i + 1]]);
    }
    const base = inv, raw = raws[rawK];
    const ncc = (f) => {
      let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (const [x, y, v] of reg) { const q = f(x, y), u = sampleRaw(raw, q[0], q[1], 1); if (u < 0) continue; n++; sa += u; sb += v; saa += u * u; sbb += v * v; sab += u * v; }
      return n > 100 ? (sab / n - (sa / n) * (sb / n)) / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2)) : -1;
    };
    const moved = (tx, ty, ds) => (x, y) => base(pR[0] + (x - pR[0] - tx) / (1 + ds), pR[1] + (y - pR[1] - ty) / (1 + ds));
    let best = { r: ncc(base), tx: 0, ty: 0, ds: 0 };
    if (best.r < 0.85) for (const [span, step, dss] of [[24, 3, [-0.08, -0.04, 0, 0.04, 0.08]], [4, 1, [-0.02, 0, 0.02]]]) {
      const c = { ...best };
      for (const dsd of dss) for (let ty = -span; ty <= span; ty += step) for (let tx = -span; tx <= span; tx += step) {
        const r = ncc(moved(c.tx + tx, c.ty + ty, c.ds + dsd)); if (r > best.r) best = { r, tx: c.tx + tx, ty: c.ty + ty, ds: c.ds + dsd };
      }
    }
    if (best.r >= 0.6) inv = moved(best.tx, best.ty, best.ds); else rawK = undefined;
  }
  if (rawK !== undefined) {
    const raw = raws[rawK];
    // per-channel gain and offset from raw to this frame, fitted on the pixels round the cover
    for (let c = 0; c < 3; c++) {
      let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0;
      for (const [x, y] of ringPx) { const q = inv(x, y), u = sampleRaw(raw, q[0], q[1], c); if (u < 0) continue; const v = b[(y * W + x) * 3 + c]; n++; sx += u; sy += v; sxx += u * u; syy += v * v; }
      // matched on mean and spread (a least-squares slope flattens the patch when the fit is loose);
      // the flashes wash the picture out to well under half its contrast
      let g = Math.sqrt((n * syy - sy * sy) / (n * sxx - sx * sx)); if (!(g > 0.15 && g < 2.5)) g = 1;
      const o = (sy - g * sx) / n;
      for (const [x, y] of mask) { const q = inv(x, y), u = sampleRaw(raw, q[0], q[1], c); if (u >= 0) b[(y * W + x) * 3 + c] = Math.max(0, Math.min(255, g * u + o)); }
    }
  } else {
    // blurred or shaken frame: fill smoothly from the edges
    for (let it = 0; it < 300; it++) for (const [x, y] of mask) for (let c = 0; c < 3; c++) {
      let s = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || xx >= W || yy < 0) continue; s += b[(yy * W + xx) * 3 + c]; n++; }
      b[(y * W + x) * 3 + c] = s / n;
    }
  }
  // the dot, back on the ring's far edge: orange inside, white ring, soft edges
  for (let dy = -DOT - 1; dy <= DOT + 1; dy++) for (let dx = -DOT - 1; dx <= DOT + 1; dx++) {
    const x = Math.round(pE[0]) + dx, y = Math.round(pE[1]) + dy;
    if (x < 0 || x >= W || y < 0 || over.has(y * W + x)) continue;
    const d = Math.hypot(x - pE[0], y - pE[1]), a = Math.max(0, Math.min(1, 12.9 - d)), t = Math.max(0, Math.min(1, d - 8));
    if (!a) continue;
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) b[i + k] = a * ((1 - t) * colours[0][k] + t * colours[1][k]) + (1 - a) * b[i + k];
  }
}

for (const [name, from, to] of PIECES) {
  const file = path.join(OUT, name + '.mp4'), tmp = path.join(OUT, name + '-rim.mp4');
  const seen = [];
  await frames(file, (f, k) => { if (k >= from && k < to) seen[k] = findDots(f); });
  const guess = trackDots(seen, from, Math.min(to, seen.length));
  const sure = (k) => seen[k].length === 2 && guess[k] === seen[k];
  const dots = {}, matches = {};
  const hidden = {};
  await frames(file, (f, k) => { if (!guess[k]) return; const d = settleDots(f, guess[k], sure(k)); if (d) { dots[k] = d; matches[k] = matchRaw(f, sim(...d)); } else hidden[k] = f; });
  // a frame whose dots are hidden, between two that were found, takes their positions if the
  // picture still lines up there (the white flash frames do not, and are left alone)
  for (const k of Object.keys(guess).map(Number)) {
    if (dots[k] || !dots[k - 1] || !dots[k + 1] || !hidden[k]) continue;
    const d = [0, 1].map((s) => [0, 1].map((c) => (dots[k - 1][s][c] + dots[k + 1][s][c]) / 2)), m = matchRaw(hidden[k], sim(...d));
    if (m.c >= 0.45) { dots[k] = d; matches[k] = m; }
  }
  const ks = Object.keys(dots).map(Number);
  const timing = steadyTiming(matches, ks);
  const e = spawn(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', '30', '-i', '-', ...enc, tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => e.on('close', r));
  await frames(file, async (f, k) => {
    if (dots[k]) fixFrame(f, dots[k][0], dots[k][1], timing[k]);
    if (!e.stdin.write(f)) await new Promise((r) => e.stdin.once('drain', r));
  });
  e.stdin.end(); await done;
  fs.renameSync(tmp, file);
  console.log(name, ks.map((k) => `${k}:${timing[k] === undefined ? 'fill' : (timing[k] / RFPS).toFixed(2)}`).join(' '));
}
