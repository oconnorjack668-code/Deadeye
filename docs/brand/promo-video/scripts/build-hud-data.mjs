// Turns the tracker's ball trace for 16606 into per-scene points for the HUD.
// The trace is the detector's own output on the clip (see README clip bench),
// so the ball box and trail are what the tracker really found.
// Run: node scripts/build-hud-data.mjs   (writes assets/data/hud-data.js)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'assets', 'data');
const rows = fs.readFileSync(path.join(DATA, '16606-ball-trace.csv'), 'utf8').trim().split('\n').slice(1)
  .map((l) => l.split(',').map(Number)).map(([t, x, y]) => ({ t: t / 1000, x, y }));
const dedup = rows.filter((r, i) => i === 0 || r.t !== rows[i - 1].t);

// Source frame 2336x1080, crop 607x1080 at x=900, scaled to 1080x1920.
const toScene = (r) => [+(((r.x * 2336 - 900) * 1080) / 607).toFixed(1), +(r.y * 1920).toFixed(1)];
const RIM = { cx: +(((0.5559 * 2336 - 900) * 1080) / 607).toFixed(1), cy: +(0.2092 * 1920).toFixed(1), w: +(0.0612 * 2336 * (1080 / 607)).toFixed(1) };

// [name, source start, length, call time in the source (s), result]
const shots = [
  ['a', 1.5, 4.0, 4.1, 'make'],
  ['b', 12.9, 1.7, 13.9, 'make'],
  ['c', 7.5, 1.7, 8.5, 'miss'],
  ['d', 19.4, 1.7, 20.4, 'make'],
];
// Where the ball first comes into frame, read by hand from the clips (the tracker only
// picks the ball up nearer the rim). Local seconds within each shot's window, scene pixels.
const MANUAL = {
  a: [[2.3, 402, 32], [2.4, 505, 143]],
  b: [],
  c: [[0.8, 402, 65]],
  d: [[0.7, 356, 104]],
};
// after the rim: a miss bounces back out (read by hand), a make drops through the net (tracker)
const BOUNCE = { c: [[1.1, 628, 311], [1.2, 560, 330]] };

// Least squares with gravity fixed: x is linear in t and y = c + b t + G t^2 / 2.
// G is 9.81 m/s^2 in scene pixels: the rim (45.7 cm) is about 254 px wide here.
const G = 9.81 * (254 / 0.457);
function fit(pts) {
  const n = pts.length, S = (f) => pts.reduce((a, p) => a + f(p), 0);
  const st = S((p) => p[0]), st2 = S((p) => p[0] ** 2);
  const px = (n * S((p) => p[0] * p[1]) - st * S((p) => p[1])) / (n * st2 - st * st), qx = (S((p) => p[1]) - px * st) / n;
  const r = pts.map((p) => [p[0], p[2] - (G * p[0] * p[0]) / 2]);
  const sr = r.reduce((a, p) => a + p[1], 0), str = r.reduce((a, p) => a + p[0] * p[1], 0);
  const b = (n * str - st * sr) / (n * st2 - st * st), c = (sr - b * st) / n;
  return { x: (t) => px * t + qx, y: (t) => c + b * t + (G * t * t) / 2 };
}

const out = { rim: RIM, shots: {} };
for (const [name, ss, len, call, result] of shots) {
  const pts = dedup.filter((r) => r.t >= ss && r.t <= ss + len).map((r) => [+(r.t - ss).toFixed(3), ...toScene(r)]);
  const c = +(call - ss).toFixed(2);
  const entry = MANUAL[name].length ? MANUAL[name][0][0] : pts[0][0];
  let flight = [...MANUAL[name], ...pts.filter((p) => p[0] >= entry - 0.01 && p[0] <= c + 0.02)];
  // drop stray detections far from the arc, then refit
  for (let k = 0; k < 3; k++) { const f = fit(flight); flight = flight.filter((p) => Math.hypot(f.x(p[0]) - p[1], f.y(p[0]) - p[2]) < 70); }
  const f = fit(flight);
  // the arc starts where the ball is first seen and is carried straight back up out of the
  // top of the frame along its own direction, so it comes in from the top like the first promo
  const t1 = flight[0][0], h = 1 / 240;
  const vx = (f.x(t1 + h) - f.x(t1)) / h, vy = (f.y(t1 + h) - f.y(t1)) / h;
  const lead = vy > 0 ? Math.min(0.25, (f.y(t1) + 60) / vy) : 0;
  const arc = [];
  for (let t = t1 - lead; t < t1; t += 1 / 60) arc.push([+t.toFixed(3), +(f.x(t1) + vx * (t - t1)).toFixed(1), +(f.y(t1) + vy * (t - t1)).toFixed(1)]);
  for (let t = t1; t <= c + 1e-6; t += 1 / 60) arc.push([+t.toFixed(3), +f.x(t).toFixed(1), +f.y(t).toFixed(1)]);
  // after the call: the drop through the net, or the bounce out
  const end = arc[arc.length - 1];
  let after = (BOUNCE[name] || pts.filter((p) => p[0] > c && p[0] <= c + 0.4)).filter((p) => p[1] > -50 && p[1] < 1130);
  const cont = []; let prev = end;
  for (const p of after) { if (Math.hypot(p[1] - prev[1], p[2] - prev[2]) > 260) break; cont.push(p); prev = p; }
  out.shots[name] = { call: c, result, arc, after: cont };
}
fs.writeFileSync(path.join(DATA, 'hud-data.js'), 'window.HUD = ' + JSON.stringify(out) + ';\n');
for (const [k, v] of Object.entries(out.shots)) console.log(k, 'arc', v.arc.length, 'from', v.arc[0], 'to', v.arc[v.arc.length - 1], 'after', JSON.stringify(v.after));
