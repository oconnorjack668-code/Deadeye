// Measures tap targets ([data-tap], [data-tap=main]) and sideways overflow inside each [data-measure] frame of the setup mockups.
// Run: WIDTH=1266 node 2026-11-23-setup-check.mjs 2026-11-23-setup-step1.html [more.html ...]   (Chrome, Node 22+)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = Number(process.env.WIDTH ?? 390);
const port = 9500 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-chk-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsu;
for (let i = 0; i < 60 && !wsu; i++) {
  try { wsu = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* wait */ }
  if (!wsu) await sleep(250);
}
const ws = new WebSocket(wsu);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const waiting = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const EXPR = `(() => {
  const out = [];
  document.querySelectorAll('[data-measure]').forEach((f, fi) => {
    const fr = f.getBoundingClientRect();
    let minMain = 999, minTap = 999, over = 0; const small = [];
    f.querySelectorAll('[data-tap]').forEach((e) => {
      const h = e.getBoundingClientRect().height; const main = e.dataset.tap === 'main';
      if (main) minMain = Math.min(minMain, h); else minTap = Math.min(minTap, h);
      if (h < (main ? 44 : 24) - 0.5) small.push(e.textContent.trim().slice(0, 20) + ' ' + h);
    });
    f.querySelectorAll('*').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.right > fr.right + 0.5 && !e.closest('svg')) over++; });
    out.push('frame ' + fi + ' (' + Math.round(fr.width) + 'px): main button min ' + (minMain === 999 ? '-' : minMain.toFixed(0)) + ' px, other tappables min ' + (minTap === 999 ? '-' : minTap.toFixed(0)) + ' px, elements past the right edge ' + over + (small.length ? ', TOO SMALL: ' + small.join('; ') : ''));
  });
  return out.join('\\n');
})()`;
try {
  for (const f of process.argv.slice(2)) {
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: 800, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: pathToFileURL(path.resolve(HERE, f)).href });
    await sleep(2500);
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true });
    await sleep(600);
    console.log(f);
    console.log((await send('Runtime.evaluate', { expression: EXPR, returnByValue: true })).result.result.value);
  }
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
