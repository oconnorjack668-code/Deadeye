// Renders a loading prototype to an MP4 and a PNG still, frame by frame, so the video is exact (no screen-recording jitter).
// All animation in the prototypes is CSS, so every frame is made by pausing the page's animations at time t and taking a screenshot.
//   node 2026-11-22-loading-capture.mjs <name> <durationMs> <fps> <stillMs>      e.g.  open-a-lockon 1750 60 1150
// Needs Chrome (CHROME env var or the default Windows path), ffmpeg (FFMPEG env var), Node 22+.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG =
  process.env.FFMPEG ??
  'C:/Users/Vivobook S16/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const [name, durStr, fpsStr, stillStr, query = 'cap'] = process.argv.slice(2);
const DUR = Number(durStr);
const FPS = Number(fpsStr);
const STILL = Number(stillStr);
if (!name || !DUR || !FPS) throw new Error('usage: <name> <durationMs> <fps> <stillMs> [query]');

const htmlFile = path.join(HERE, `2026-11-22-loading-${name}.html`);
const port = 9300 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-load-'));
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-frames-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const p = list.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
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
const evalJs = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });

async function shot(t, out) {
  await evalJs(`(async()=>{document.getAnimations().forEach(a=>{a.pause();a.currentTime=${t}});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return 1})()`);
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
}

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: pathToFileURL(htmlFile).href + '?' + query });
  await sleep(1500);
  await evalJs('document.fonts.ready.then(()=>true)');
  await sleep(300);
  // Restart the animations and pause them in the same tick: finished animations drop out of getAnimations(), so they must not be left to run.
  await evalJs('window.__play();document.getAnimations().forEach(a=>a.pause());1');
  if (process.env.TIMES) {
    // Preview mode: a few stills at chosen times into the temp folder, no video.
    for (const t of process.env.TIMES.split(',')) await shot(Number(t), path.join(os.tmpdir(), `dd-prev-${name}-${t}.png`));
    console.log('preview stills in', os.tmpdir());
    process.exit(0);
  }
  const n = Math.round((DUR / 1000) * FPS);
  for (let i = 0; i < n; i++) await shot((i / FPS) * 1000, path.join(frames, `f${String(i).padStart(5, '0')}.png`));
  const still = path.join(HERE, `2026-11-22-loading-${name}.png`);
  await shot(STILL, still);
  const mp4 = path.join(HERE, `2026-11-22-loading-${name}.mp4`);
  const r = spawnSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
  ], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  console.log('wrote', path.basename(mp4), `${n} frames @ ${FPS} fps`, path.basename(still));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); fs.rmSync(frames, { recursive: true, force: true }); } catch { /* ignore */ }
}
