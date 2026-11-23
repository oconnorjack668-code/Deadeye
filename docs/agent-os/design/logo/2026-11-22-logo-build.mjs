// Builds the logo SVGs, the 1024 px PNGs (dark and light) and the comparison board: node 2026-11-22-logo-build.mjs
// Draft tooling. Needs Chrome (CHROME env var or the default Windows path) and Node 22+.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VARIANTS, logoSvg } from './2026-11-22-logo-lib.mjs';
import { fontCss } from '../mockups/2026-11-22-loading-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PRE = '2026-11-22-deadeye-logo-';

for (const [k, v] of Object.entries(VARIANTS)) {
  fs.writeFileSync(path.join(HERE, `${PRE}${k}.svg`), logoSvg(v));
  fs.writeFileSync(path.join(HERE, `${PRE}${k}-mark.svg`), logoSvg(v, { word: false }));
}

const port = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-logo-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; let id = 0; const waiting = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const p = list.find((t) => t.type === 'page');
      if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } }; return; }
    } catch { /* not up */ }
    await sleep(250);
  }
  throw new Error('chrome did not start');
}
async function shot(html, w, h, dsf, out) {
  const tmp = path.join(os.tmpdir(), `dd-logo-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(tmp).href });
  await sleep(900);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>true)', awaitPromise: true });
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
  fs.rmSync(tmp, { force: true });
  console.log('wrote', path.basename(out));
}

try {
  await connect();
  const page = (inner, bg) => `<!doctype html><html><body style="margin:0;background:${bg}">${inner}</body></html>`;
  for (const [k, v] of Object.entries(VARIANTS)) {
    await shot(page(logoSvg(v, { bg: '#0a0a0b' }), '#0a0a0b'), 1024, 1024, 1, path.join(HERE, `${PRE}${k}-dark-1024.png`));
    await shot(page(logoSvg(v, { bg: '#f4f4f5', wordColor: '#0a0a0b' }), '#f4f4f5'), 1024, 1024, 1, path.join(HERE, `${PRE}${k}-light-1024.png`));
  }

  // Comparison board: original vs faithful vs improved, large (dark, light) and at small sizes (as an app icon, 48 px, 32 px).
  const fonts = await fontCss();
  const cols = [['Original (public/icon-store-1024.png)', 'orig'], ['Faithful redraw', 'faithful'], ['Improved A: polish', 'improved-a'], ['Improved B: small-size', 'improved-b'], ['Improved C: recommended', 'improved-c']];
  const mark = (key, sz, bg, word = true, wc = '#f4f4f5') =>
    key === 'orig'
      ? `<img src="${pathToFileURL(path.join(HERE, '../../../../public/icon-store-1024.png')).href}" width="${sz}" height="${sz}" style="display:block;${bg === '#f4f4f5' ? 'mix-blend-mode:normal;' : ''}border-radius:${Math.round(sz * 0.0)}px">`
      : logoSvg(VARIANTS[key], { bg, wordColor: wc, size: sz, word });
  const markOnly = (k) => { const v = VARIANTS[k]; const w = 2 * v.box + 24; return logoSvg(v, { word: false, size: 48 }).replace('viewBox="0 0 1024 1024"', `viewBox="${v.cx - v.box - 12} ${v.cy - v.box - 12} ${w} ${w}"`); };
const rowHtml = (label, fn) => `<div class="row"><div class="rl">${label}</div>${cols.map(([, k]) => `<div class="cell">${fn(k)}</div>`).join('')}</div>`;
  const icon = (key, sz, bg) => `<div style="width:${sz}px;height:${sz}px;border-radius:${Math.round(sz * 0.225)}px;overflow:hidden;background:${bg}">${mark(key, sz, '#0a0a0b')}</div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0}body{background:#09090b;color:#f4f4f5;font-family:'Geist',system-ui,sans-serif;padding:28px 28px 20px;width:1780px}
h1{font:900 24px/32px 'Geist';margin-bottom:4px}p.s{font:400 14px/21px 'Geist';color:#a1a1aa;margin-bottom:18px}
.hdr,.row{display:grid;grid-template-columns:150px repeat(5,300px);gap:12px;align-items:center;margin-bottom:12px}
.hdr div{font:700 14px/20px 'Geist';color:#e4e4e7;text-align:center}.rl{font:700 12px/16px 'Geist';letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa}
.cell{display:flex;justify-content:center;align-items:center;gap:14px}
.cell.big svg,.cell.big img{border-radius:18px}
.sm{display:flex;align-items:center;gap:16px}.sm span{font:400 12px/16px 'Geist';color:#8b8b94}
</style></head><body>
<h1>Deadeye logo: original, faithful redraw and improvements</h1>
<p class="s">Proposal only. The app icon and logo files are replaced only after the founder picks. All SVG, 22 Nov 2026.</p>
<div class="hdr"><div></div>${cols.map(([t]) => `<div>${t}</div>`).join('')}</div>
${rowHtml('Large, dark', (k) => `<div class="big">${mark(k, 290, '#0a0a0b')}</div>`)}
${rowHtml('Large, light', (k) => `<div class="big">${k === 'orig' ? `<div style="width:290px;height:290px;border-radius:18px;background:#f4f4f5;display:grid;place-items:center;font:400 12px 'Geist';color:#52525b;text-align:center;padding:30px">The original has a dark background baked in and no light version</div>` : mark(k, 290, '#f4f4f5', true, '#0a0a0b')}</div>`)}
${rowHtml('As an app icon, 48 px', (k) => `<div class="sm">${icon(k, 48, '#0a0a0b')}${icon(k, 32, '#0a0a0b')}${icon(k, 24, '#0a0a0b')}<span>48 / 32 / 24 px</span></div>`)}
${rowHtml('Mark only, 48 px', (k) => `<div class="sm"><div style="width:48px;height:48px;overflow:hidden;${k === 'orig' ? `background:url(${pathToFileURL(path.join(HERE, '../../../../public/icon-store-1024.png')).href}) -11.9px -5.5px/71.9px 71.9px no-repeat;` : ''}">${k === 'orig' ? '' : markOnly(k)}</div><span>brackets + ball, 48 px</span></div>`)}
</body></html>`;
  await shot(html, 1780, 890, 2, path.join(HERE, '2026-11-22-deadeye-logo-comparison.png'));
} finally {
  ws?.close(); chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
}
