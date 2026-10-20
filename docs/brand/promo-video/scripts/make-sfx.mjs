// Synthesises the sound effects from scratch (noise, sine tones and filters),
// so there is nothing to license: the sounds are ours to use commercially.
// Run: node scripts/make-sfx.mjs           -> assets/sfx/sfx.wav (index.html)
//      node scripts/make-sfx.mjs classic   -> assets/sfx/sfx-classic.wav (classic.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets', 'sfx');
const SR = 48000;
const PRESET = process.argv[2] === 'classic' ? 'classic' : 'main';
const LEN = PRESET === 'classic' ? 24.53 : 32.0;
const buf = new Float32Array(Math.ceil(SR * LEN));

// seeded noise so every run sounds the same
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

// RBJ biquad band-pass / high-pass / low-pass, with a centre frequency that can move per sample
function filterNoise(n, fn, type, q = 1) {
  const out = new Float32Array(n);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const f = Math.min(fn(i / n), SR * 0.45);
    const w = (2 * Math.PI * f) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
    else { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
    const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    const x0 = rnd();
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}
const add = (t, samples, gain) => {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < samples.length && s0 + i < buf.length; i++) buf[s0 + i] += samples[i] * gain;
};
const env = (n, fn) => { const e = new Float32Array(n); for (let i = 0; i < n; i++) e[i] = fn(i / SR, i / n); return e; };
const mul = (a, e) => { for (let i = 0; i < a.length; i++) a[i] *= e[i]; return a; };
const tone = (freq, dur, decay, gain = 1) => {
  const n = Math.round(dur * SR), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; o[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / decay) * gain * Math.min(1, t / 0.002); }
  return o;
};
const sum = (...arrs) => { const o = new Float32Array(Math.max(...arrs.map((a) => a.length))); arrs.forEach((a) => a.forEach((v, i) => (o[i] += v))); return o; };

// net swish: bright noise that rushes through and dies away, with a small confirming ding
function swish(t) {
  const n = Math.round(0.45 * SR);
  const noise = filterNoise(n, (p) => 3200 + 2600 * Math.sin(p * Math.PI), 'bp', 0.9);
  mul(noise, env(n, (s) => Math.min(1, s / 0.015) * Math.exp(-s / 0.11)));
  add(t, noise, 2.2);
  add(t + 0.02, sum(tone(1318, 0.5, 0.12), tone(1976, 0.5, 0.09, 0.6)), 0.16);
}
// miss: rim clank, metal ring plus a dull thud
function clank(t) {
  const ring = sum(tone(410, 0.7, 0.2), tone(655, 0.7, 0.14, 0.7), tone(1120, 0.7, 0.1, 0.5), tone(1710, 0.7, 0.06, 0.4));
  add(t, ring, 0.34);
  const n = Math.round(0.02 * SR);
  add(t, mul(filterNoise(n, () => 2500, 'hp'), env(n, (s) => Math.exp(-s / 0.004))), 1.2);
  add(t, tone(95, 0.3, 0.07), 0.5);
}
// whoosh between screens
function whoosh(t, dur = 0.28, gain = 0.2, up = true) {
  const n = Math.round(dur * SR);
  const noise = filterNoise(n, (p) => (up ? 500 + 3500 * p : 4000 - 3500 * p), 'bp', 0.7);
  mul(noise, env(n, (s, p) => Math.pow(Math.sin(Math.PI * p), 1.6)));
  add(t, noise, gain * 4);
}
// logo hit: riser into a low boom
function logoHit(t) {
  whoosh(t - 0.4, 0.4, 0.22, true);
  add(t, sum(tone(62, 1.2, 0.35), tone(124, 0.6, 0.15, 0.4)), 0.6);
  const n = Math.round(0.25 * SR);
  add(t, mul(filterNoise(n, () => 900, 'lp'), env(n, (s) => Math.exp(-s / 0.05))), 1.6);
}
// tap on the rim set-up screen
function click(t, f = 1700) {
  const n = Math.round(0.004 * SR);
  add(t, mul(filterNoise(n, () => 3000, 'hp'), env(n, (s) => Math.exp(-s / 0.001))), 1.4);
  add(t, tone(f, 0.12, 0.025), 0.3);
}
// rising confirm
function chime(t, notes = [784, 1047, 1319], gap = 0.09) {
  notes.forEach((f, i) => add(t + i * gap, sum(tone(f, 0.8, 0.22), tone(f * 2, 0.5, 0.08, 0.3)), 0.14));
}

// ---- timelines (global seconds) ----
if (PRESET === 'main') {
  // index.html
  swish(2.6);              // first make
  swish(5.0);              // make
  clank(6.7);              // miss
  swish(8.4);              // make
  click(9.4); click(9.8, 2000); chime(10.1, [988, 1319], 0.07); // rim taps, rim set
  [10.6, 12.6, 13.8, 15.0, 16.4, 18.0, 20.0, 21.0, 21.8, 23.0, 24.2].forEach((t) => whoosh(t - 0.05, 0.22, 0.03)); // app screens
  whoosh(25.3, 0.3, 0.035, false);
  logoHit(26.8);
  chime(27.55);
} else {
  // classic.html: the first promo's own calls, moved for the cut logo sting
  swish(1.75);             // make
  swish(3.73);             // make
  clank(5.13);             // miss
  swish(6.53);             // make
  swish(7.93);             // make
  click(8.93); click(9.33, 2000);   // rim taps
  swish(10.63);            // make on the "any gym" shot
  logoHit(19.53);          // end card
  chime(20.3);
}

// normalise and write 16-bit stereo
let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const g = 0.85 / peak;
const pcm = Buffer.alloc(buf.length * 4);
for (let i = 0; i < buf.length; i++) {
  const v = Math.max(-1, Math.min(1, Math.tanh(buf[i] * g * 1.1)));
  const s = Math.round(v * 32767);
  pcm.writeInt16LE(s, i * 4); pcm.writeInt16LE(s, i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16);
hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28);
hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
fs.mkdirSync(OUT, { recursive: true });
const NAME = PRESET === 'classic' ? 'sfx-classic.wav' : 'sfx.wav';
fs.writeFileSync(path.join(OUT, NAME), Buffer.concat([hdr, pcm]));
console.log('wrote assets/sfx/' + NAME);
