// Measures text contrast on the rendered direction mockups, against the real pixels behind each line of text
// (worst case: the lightest pixel behind light text, the darkest behind dark text). Includes text over the footage.
// Run: node 2026-11-20-direction-contrast.mjs 2026-11-20-direction-a-today.html [more...]   (same Chrome setup as the shot script)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const files = process.argv.slice(2);
const port = 9700 + Math.floor(Math.random() * 200);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-ctr-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsu;
for (let i = 0; i < 60 && !wsu; i++) {
  try { wsu = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* wait */ }
  if (!wsu) await sleep(250);
}
const ws = new WebSocket(wsu);
await new Promise((r) => (ws.onopen = r));
let id = 0; const waiting = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value;

function decodePng(buf) {
  let p = 8; let w; let h; let ct; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h * bpp);
  const stride = w * bpp;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let out;
      if (f === 0) out = v; else if (f === 1) out = v + a; else if (f === 2) out = v + b; else if (f === 3) out = v + ((a + b) >> 1);
      else { const pp = a + b - c; const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c); out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[y * stride + x] = out & 255;
    }
  }
  return { w, h, bpp, px };
}
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

const COLLECT = `(() => {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter((q) => q.width > 2 && q.height > 2).map((q) => [q.left, q.top, q.width, q.height]);
    out.push({ t: t.slice(0, 34), color: cs.color, fs: parseFloat(cs.fontSize), fw: parseInt(cs.fontWeight, 10), rects });
  }
  return out;
})()`;

const report = [];
try {
  for (const f of files) {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: pathToFileURL(path.resolve(HERE, f)).href });
    await sleep(2500); await evalJs('document.fonts.ready.then(()=>true)'); await sleep(800);
    const h = await evalJs('Math.ceil(document.documentElement.scrollHeight)');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    const items = await evalJs(COLLECT);
    await evalJs(`(() => { const s = document.createElement('style'); s.textContent = '*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important;text-decoration-color:transparent!important}'; document.head.appendChild(s); })()`);
    await sleep(400);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const img = decodePng(Buffer.from(shot.result.data, 'base64'));
    let worst = []; let tested = 0;
    for (const it of items) {
      const m = it.color.match(/[\d.]+/g).map(Number);
      const [cr, cg, cb] = m; const ca = m[3] ?? 1;
      const large = it.fs >= 24 || (it.fs >= 18.66 && it.fw >= 700);
      const need = large ? 3 : 4.5;
      let minRatio = 99; let atBg = '';
      for (const [x, y, w, hh] of it.rects) {
        const x0 = Math.max(0, Math.floor(x * 2)); const x1 = Math.min(img.w - 1, Math.ceil((x + w) * 2));
        // glyph core only: the font's content box is taller than the letters, so trim 22% off the top and 18% off the bottom
        const y0 = Math.max(0, Math.floor((y + hh * 0.22) * 2)); const y1 = Math.min(img.h - 1, Math.ceil((y + hh * 0.82) * 2));
        const tl = lum(cr, cg, cb);
        const light = tl > 0.35;
        let best = null; let bestL = light ? -1 : 2;
        for (let yy = y0; yy <= y1; yy += 2) {
          for (let xx = x0; xx <= x1; xx += 2) {
            const o = (yy * img.w + xx) * img.bpp;
            const L = lum(img.px[o], img.px[o + 1], img.px[o + 2]);
            if (light ? L > bestL : L < bestL) { bestL = L; best = [img.px[o], img.px[o + 1], img.px[o + 2]]; }
          }
        }
        if (!best) continue;
        const fr = Math.round(cr * ca + best[0] * (1 - ca)); const fg = Math.round(cg * ca + best[1] * (1 - ca)); const fb = Math.round(cb * ca + best[2] * (1 - ca));
        const r = ratio(lum(fr, fg, fb), bestL);
        if (r < minRatio) { minRatio = r; atBg = `bg rgb(${best.join(',')})`; }
      }
      if (minRatio === 99) continue;
      tested++;
      if (minRatio < need) worst.push(`  FAIL ${minRatio.toFixed(2)} (need ${need}) "${it.t}" ${it.fs}px/${it.fw} ${it.color} on ${atBg}`);
      else if (minRatio < need + 1.2) worst.push(`  thin ${minRatio.toFixed(2)} (need ${need}) "${it.t}" ${it.fs}px/${it.fw} on ${atBg}`);
    }
    report.push(`${f}: ${tested} text runs tested, ${worst.filter((w) => w.includes('FAIL')).length} fail`);
    report.push(...worst);
  }
} finally { ws.close(); chrome.kill(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ } }
console.log(report.join('\n'));
