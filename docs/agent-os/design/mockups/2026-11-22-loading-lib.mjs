// Shared pieces for the 2026-11-22 loading prototypes (build script: 2026-11-22-loading-build.mjs).
// Draft tooling. Needs Node 22+ and network once, to cache the Geist font files (SIL OFL, the app's own font)
// in the temp folder; the generated HTML files then carry the font inside, so they open anywhere offline.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GEIST = 'https://fonts.gstatic.com/s/geist/v5/gyBhhwUxId8gMGYQMKR3pzfaWI_';
const FILES = { 400: 'RnOM4nQ', 700: 'Re-Q4nQ', 900: 'RNeQ4nQ' };

async function fontB64(weight) {
  const cache = path.join(os.tmpdir(), `dd-geist-${weight}.ttf`);
  if (!fs.existsSync(cache)) {
    const res = await fetch(`${GEIST}${FILES[weight]}.ttf`);
    if (!res.ok) throw new Error(`font ${weight}: ${res.status}`);
    fs.writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
  }
  return fs.readFileSync(cache).toString('base64');
}

export async function fontCss() {
  const parts = [];
  for (const w of [400, 700, 900]) {
    parts.push(`@font-face{font-family:'Geist';font-weight:${w};font-style:normal;font-display:block;src:url(data:font/ttf;base64,${await fontB64(w)}) format('truetype')}`);
  }
  return parts.join('\n');
}

// The Deadeye ball, redrawn as SVG from public/icon-512.png (red ball, dark ring, crosshair, two seams).
// An approximation for the prototype: the builder uses the real asset (see the doc, "Build").
let uid = 0;
export function ball() {
  const id = `g${++uid}`;
  return `<svg viewBox="0 0 690 690" width="100%" height="100%" aria-hidden="true" focusable="false">
<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="650"><stop offset="0" stop-color="#ff4352"/><stop offset="1" stop-color="#d1121f"/></linearGradient>
<clipPath id="${id}c"><circle cx="345" cy="345" r="306"/></clipPath></defs>
<circle cx="345" cy="345" r="322" fill="#7d0d18"/>
<circle cx="345" cy="345" r="306" fill="url(#${id})"/>
<g clip-path="url(#${id}c)">
<circle cx="345" cy="345" r="196" fill="#121214"/>
<circle cx="345" cy="345" r="92" fill="url(#${id})"/>
<path d="M78 170 C205 262 222 428 78 520" fill="none" stroke="#0a0a0b" stroke-width="46"/>
<path d="M612 170 C485 262 468 428 612 520" fill="none" stroke="#0a0a0b" stroke-width="46"/>
<rect x="322" y="0" width="46" height="690" fill="#0a0a0b"/>
<rect x="0" y="322" width="690" height="46" fill="#0a0a0b"/>
</g></svg>`;
}

/** Page shell: a 390x844 phone column, font inside, replay and reduced-motion controls (hidden when capturing). */
export function page({ title, css, body, fonts, script = '', tools = true }) {
  return `<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=390, initial-scale=1">
<title>${title}</title>
<style>
${fonts}
:root{--ease:cubic-bezier(.2,0,0,1)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#000;font-family:'Geist',system-ui,sans-serif;color:#f4f4f5;-webkit-font-smoothing:antialiased}
body{min-height:100vh;display:flex;justify-content:center;align-items:flex-start}
.phone{position:relative;width:390px;height:844px;overflow:hidden;background:#09090b;flex:none}
@media (min-width:480px){.phone{margin:24px 0;border-radius:36px;outline:1px solid #27272a}}
html.cap body{display:block}
html.cap .phone{margin:0;border-radius:0;outline:0}
html.cap .tools{display:none}
.tools{position:absolute;left:0;right:0;bottom:20px;z-index:50;display:flex;gap:8px;justify-content:center}
.tools button{height:44px;padding:0 16px;border-radius:12px;border:1px solid #52525b;background:#18181bdd;color:#e4e4e7;font:700 14px 'Geist',system-ui,sans-serif;cursor:pointer}
.tools button:focus-visible{outline:2px solid #fb923c;outline-offset:2px}
.tools button[aria-pressed=true]{background:#f4f4f5;color:#09090b;border-color:#f4f4f5}
${css}
</style>
</head>
<body>
<main class="phone" id="phone" aria-label="${title}">
${body}
${tools ? `<div class="tools"><button type="button" id="replay">Replay</button><button type="button" id="rm" aria-pressed="false">Reduced motion: off</button></div>` : ''}
</main>
<script>
(function(){
  var root=document.documentElement;
  if(location.search.indexOf('cap')>-1) root.classList.add('cap');
  if(location.search.indexOf('rm')>-1) root.classList.add('rm');
  var phone=document.getElementById('phone');
  function play(){root.classList.remove('play','skipped');void phone.offsetWidth;root.classList.add('play');}
  window.__play=play;
  var rb=document.getElementById('replay'); if(rb) rb.addEventListener('click',play);
  var mb=document.getElementById('rm');
  if(mb) mb.addEventListener('click',function(){
    var on=root.classList.toggle('rm'); mb.setAttribute('aria-pressed',on); mb.textContent='Reduced motion: '+(on?'on':'off'); play();
  });
  ${script}
  play();
})();
</script>
</body>
</html>
`;
}

/** Writes both the media-query rule and the .rm preview rule (the button simulates the phone setting). */
export function rm(selectors, decl) {
  return selectors.map((s) => `@media (prefers-reduced-motion:reduce){.play ${s}{${decl}}}\n.rm.play ${s}{${decl}}`).join('\n');
}

/** Placeholder app screen: blocks only, so nobody reads it as a redesign of Home. */
export function fauxHome() {
  const nav = [0, 1, 2, 3, 4].map((i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  return `<div class="faux" aria-hidden="true">
<div class="fh"><div class="fav"></div><div><div class="fb w1"></div><div class="fb w2"></div></div></div>
<div class="fc"></div><div class="fc"></div><div class="fr"></div><div class="fr"></div>
<div class="fnav">${nav}</div></div>`;
}
export const fauxCss = `
.faux{position:absolute;inset:0;padding:16px;background:#09090b}
.fh{display:flex;gap:12px;align-items:center;margin:10px 0 28px}
.fav{width:48px;height:48px;border-radius:12px;background:#27272a}
.fb{height:14px;border-radius:6px;background:#27272a;margin:6px 0}.w1{width:150px}.w2{width:210px;height:10px;background:#18181b}
.fc{height:104px;border-radius:16px;border:1px solid #27272a;background:#18181bb3;margin-bottom:14px}
.fr{height:64px;border-radius:16px;border:1px solid #27272a;background:#18181b80;margin-bottom:12px}
.fnav{position:absolute;left:0;right:0;bottom:0;height:68px;border-top:1px solid #27272a;background:#09090b;display:flex;justify-content:space-around;align-items:center}
.fnav i{width:26px;height:26px;border-radius:8px;background:#27272a}.fnav i.on{background:#7d0d18}
`;
