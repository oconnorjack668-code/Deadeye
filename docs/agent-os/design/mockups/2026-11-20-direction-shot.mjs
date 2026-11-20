// Screenshots the direction mockups at a true 390 px phone width, 2x, through Chrome's DevTools protocol.
// Draft tooling, no network use except the Google Fonts the pages link. Run:
//   node 2026-11-20-direction-shot.mjs 2026-11-20-direction-a-today.html [more.html ...]
// Needs Chrome (CHROME env var or the default Windows path). Node 22+ (global WebSocket).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const files = process.argv.slice(2);
const W = Number(process.env.WIDTH ?? 390);
if (!files.length) throw new Error('give one or more html file names');

const port = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome did not start');
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const waiting = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
};
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
});

try {
  for (const f of files) {
    const abs = path.resolve(HERE, f);
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: 800, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: pathToFileURL(abs).href });
    await sleep(2500);
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true });
    await sleep(800);
    const h = (await send('Runtime.evaluate', {
      expression: 'Math.ceil(document.documentElement.scrollHeight)', returnByValue: true,
    })).result.result.value;
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 2, mobile: true });
    await sleep(600);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const out = abs.replace(/\.html$/, '.png');
    fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log('wrote', path.basename(out), `${W}x${h}`);
  }
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
