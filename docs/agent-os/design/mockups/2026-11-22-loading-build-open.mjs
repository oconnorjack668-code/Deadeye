// Builds the three opening-animation prototypes: node 2026-11-22-loading-build-open.mjs
// LOGO=improved-c node ... builds variant A only, with that logo version (for the logo comparison).
// The logo is the SVG redraw in docs/agent-os/design/logo/ (faithful by default). Every moving piece is its own box with a static
// picture inside and only transform and opacity move. One exception: B's net is a small SVG whose path is morphed (SMIL), so it can
// ripple like a real net; it repaints about 230 x 200 px for a fifth of a second.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANTS, parts } from '../logo/2026-11-22-logo-lib.mjs';
import { fauxCss, fauxHome, fontCss, page, rm } from './2026-11-22-loading-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fonts = await fontCss();
const LOGO = process.env.LOGO ?? 'faithful';
const V = VARIANTS[LOGO];
const SUFFIX = LOGO === 'faithful' ? '' : `-${LOGO}`;
const P = parts(V, 'o');
const f1 = (x) => +x.toFixed(1);

// ---- geometry: the logo's own proportions at scale s (ball 166 px wide for the faithful logo) ----
const s = 0.385;
const S = Math.round(2 * V.box * s); // scope (bracket square) size
const D = Math.round(2 * V.R * s); // ball diameter
const ARM = Math.round(V.arm * s);
const WK = V.wordK;
const WW = Math.round(553 * s * WK);
const WH = Math.round(102 * s * WK);
const GAP = Math.round((905 - 101 * WK + V.wordDy - (V.cy + V.box)) * s);
const TOP = 218; // top of the scope on the 844 px stage
const CY = TOP + S / 2; // ball centre y
const BO = (S - D) / 2;

const BASE = `
${fauxCss}
.stage{position:absolute;inset:0;z-index:10;background:#09090b}
.lock{position:absolute;left:50%;top:${TOP}px;margin-left:-${S / 2}px;width:${S}px;display:flex;flex-direction:column;align-items:center}
.scope{position:relative;width:${S}px;height:${S}px}
.bk{position:absolute;width:${ARM}px;height:${ARM}px}
.bk.tl{left:0;top:0;--dx:-1;--dy:-1}.bk.tr{right:0;top:0;--dx:1;--dy:-1}
.bk.bl{left:0;bottom:0;--dx:-1;--dy:1}.bk.bb{right:0;bottom:0;--dx:1;--dy:1}
.bks{position:absolute;inset:0}
.ballwrap{position:absolute;left:${BO}px;top:${BO}px;width:${D}px;height:${D}px}
.ballwrap>div{width:100%;height:100%}
.ping{position:absolute;left:${BO}px;top:${BO}px;width:${D}px;height:${D}px;border-radius:50%;border:2px solid #ff2436;opacity:0}
.glow{position:absolute;left:50%;top:50%;width:460px;height:460px;margin:-230px 0 0 -230px;border-radius:50%;background:radial-gradient(circle,rgba(255,36,54,.2) 0%,rgba(255,36,54,0) 62%)}
.word{margin-top:${GAP}px;width:${WW}px;height:${WH}px}
.slogan{margin-top:28px;font:700 14px/1.5 'Geist',system-ui,sans-serif;letter-spacing:.2em;padding-left:.2em;text-transform:uppercase;color:#f87171;white-space:nowrap}
.hint{position:absolute;left:0;right:0;bottom:78px;text-align:center;font:400 12px 'Geist',system-ui,sans-serif;color:#8b8b94;z-index:11}
html.cap .hint{display:none}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}}
@keyframes ballin{from{opacity:0;transform:scale(.8)}}
@keyframes thump{0%{transform:scale(1)}38%{transform:scale(1.05)}100%{transform:scale(1)}}
@keyframes ping{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(1.55)}}
@keyframes exit{to{opacity:0}}
@keyframes skip{to{opacity:0}}
@keyframes bkclose{
  0%{transform:translate(calc(var(--dx)*68px),calc(var(--dy)*68px));animation-timing-function:cubic-bezier(.16,.84,.34,1)}
  72%{transform:translate(calc(var(--dx)*-4px),calc(var(--dy)*-4px));animation-timing-function:cubic-bezier(.4,0,.2,1)}
  100%{transform:translate(0,0)}
}
.skipped .stage{animation:skip 150ms ease-out forwards!important}
`;

const html = (title, css, inner, rmSel, rmExit) =>
  page({
    title,
    fonts,
    css: BASE + css + '\n' + rm(rmSel, 'animation:none') + '\n' + rm(['.stage'], `animation:exit 200ms linear ${rmExit}ms both`),
    body: `${fauxHome()}
<div class="stage" id="stage">
${inner}
</div>
<p class="hint">Tap the screen to skip</p>`,
    script: `document.getElementById('stage').addEventListener('pointerdown',function(){document.documentElement.classList.add('skipped')});`,
  });

const brackets = `<i class="bk tl">${P.corner(-1, -1)}</i><i class="bk tr">${P.corner(1, -1)}</i><i class="bk bl">${P.corner(-1, 1)}</i><i class="bk bb">${P.corner(1, 1)}</i>`;
const lockup = (extra = '', after = '') => `
<div class="lock">
  <div class="scope">
    <div class="glow"></div>
    ${extra}
    <div class="ballwrap"><div class="ball">${P.ball}</div></div>
    ${after}
    <div class="ping"></div>
  </div>
  <div class="word">${P.wordBox}</div>
  <div class="slogan">Aim is earned</div>
</div>`;

// ---------- A: lock on (recommended). The four brackets close in on the ball like a scope locking on. ----------
const A = html(
  'Opening A: Lock on',
  `
.play .glow{animation:fade 700ms ease-out 260ms backwards}
.play .ball{animation:ballin 400ms var(--ease) 100ms backwards}
.play .ballwrap{animation:thump 320ms var(--ease) 520ms both}
.play .bk{animation:bkclose 460ms linear 60ms backwards,fade 140ms linear 60ms backwards}
.play .ping{animation:ping 560ms var(--ease) 520ms forwards}
.play .word{animation:rise 360ms var(--ease) 560ms backwards}
.play .slogan{animation:rise 360ms var(--ease) 800ms backwards}
.play .stage{animation:exit 200ms cubic-bezier(.4,0,1,1) 1250ms both}
`,
  lockup(brackets),
  ['.glow', '.ball', '.ballwrap', '.bk', '.ping', '.word', '.slogan'],
  900,
);

// ---------- C: reticle. Four hairlines meet at the centre, the ball is revealed, the brackets settle. No artwork. ----------
const C = html(
  'Opening C: Reticle',
  `
.stage{--cy:${CY}px}
.ln{position:absolute;background:#ff2436;opacity:.85}
.l-l{left:0;width:195px;height:2px;top:calc(var(--cy) - 1px);transform-origin:left center}
.l-r{right:0;width:195px;height:2px;top:calc(var(--cy) - 1px);transform-origin:right center}
.l-t{top:0;height:var(--cy);width:2px;left:194px;transform-origin:center top}
.l-b{top:var(--cy);bottom:0;width:2px;left:194px;transform-origin:center bottom}
@keyframes sweepx{from{transform:scaleX(0)}}
@keyframes sweepy{from{transform:scaleY(0)}}
@keyframes lnout{to{opacity:0}}
@keyframes bksin{from{opacity:0;transform:scale(1.16)}}
.play .l-l,.play .l-r{animation:sweepx 400ms cubic-bezier(.7,0,.2,1) backwards,lnout 260ms linear 400ms forwards}
.play .l-t,.play .l-b{animation:sweepy 400ms cubic-bezier(.7,0,.2,1) backwards,lnout 260ms linear 400ms forwards}
.play .glow{animation:fade 600ms ease-out 360ms backwards}
.play .ball{animation:ballin 380ms var(--ease) 340ms backwards}
.play .bks{animation:bksin 380ms var(--ease) 420ms backwards}
.play .word{animation:rise 360ms var(--ease) 640ms backwards}
.play .slogan{animation:rise 360ms var(--ease) 820ms backwards}
.play .stage{animation:exit 200ms cubic-bezier(.4,0,1,1) 1200ms both}
`,
  `<i class="ln l-l"></i><i class="ln l-r"></i><i class="ln l-t"></i><i class="ln l-b"></i>` + lockup(`<div class="bks">${brackets}</div>`),
  ['.ln', '.glow', '.ball', '.bks', '.word', '.slogan'],
  900,
);

// ---------- B: swish. A basketball drops through a real net (backboard, rim, a net that stretches, ripples and settles), then it becomes the mark. ----------
// Ball path (Hermite through points: ms, y of the ball centre, speed px/ms): falls, slows in the net, drops out, lands at the logo.
const KEYS = [[0, -130, 0.25], [260, 70, 1.5], [470, 205, 0.5], [650, CY, 0]];
const ballY = (t) => {
  if (t <= 0) return KEYS[0][1];
  if (t >= 650) return CY;
  let i = 0;
  while (t > KEYS[i + 1][0]) i++;
  const [t0, y0, v0] = KEYS[i], [t1, y1, v1] = KEYS[i + 1];
  const h = t1 - t0, u = (t - t0) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * y0 + h10 * h * v0 + h01 * y1 + h11 * h * v1;
};
const timeAt = (y) => { for (let t = 0; t <= 650; t += 2) if (ballY(t) >= y) return t; return 650; };

const NX = 195, RIM_Y = 72, RIM_RX = 112, RIM_RY = 17, J = 8, DY = 22, NCOL = 9, BR = D / 2;
const hw = (j) => 112 - 46 * (j / J) ** 0.9;
const nodes = (t) => {
  const grid = [];
  const yb = ballY(t);
  for (let j = 0; j <= J; j++) {
    const row = [];
    const cnt = j % 2 === 0 ? NCOL : NCOL - 1;
    const tj = timeAt(RIM_Y + RIM_RY + j * DY);
    const tau = t - tj;
    const ripple = tau > 0 ? Math.exp(-tau / 110) * Math.cos((2 * Math.PI * tau) / 240) : 0;
    // The ball pushes a whole row outward so the mesh wraps around it (rows keep their order).
    const rowY = RIM_Y + RIM_RY + j * DY;
    let k = 1;
    if (j > 0) {
      const dyb = rowY - yb;
      if (Math.abs(dyb) < BR + 8) {
        const b = (Math.sqrt(Math.max(0, BR * BR - Math.min(dyb * dyb, BR * BR))) + 6) / hw(j);
        k = (1 + b + Math.sqrt((1 - b) ** 2 + 0.02)) / 2;
      }
    }
    for (let i = 0; i < cnt; i++) {
      const u = j % 2 === 0 ? -1 + (2 * i) / (NCOL - 1) : -1 + (2 * i + 1) / (NCOL - 1);
      let x = u * hw(j);
      let y = j === 0 ? RIM_Y + RIM_RY * Math.sqrt(Math.max(0, 1 - u * u)) : RIM_Y + RIM_RY + j * DY;
      const w = j / J;
      x *= k * (1 + ripple * 0.11 * (0.35 + 0.65 * w));
      y += (-8 * Math.exp(-tau / 130) * Math.sin((2 * Math.PI * tau) / 240) * w) * (tau > 0 ? 1 : 0);
      y += 9 * w * Math.exp(-(((tau + 40) / 75) ** 2));
      row.push([NX + x, y]);
    }
    grid.push(row);
  }
  return grid;
};
const netD = (t) => {
  const g = nodes(t);
  let d = '';
  for (let j = 0; j < J; j++) {
    const a = g[j], b = g[j + 1];
    a.forEach(([x, y], i) => {
      // each node joins the two nearest nodes in the row below
      const targets = j % 2 === 0 ? [i - 1, i] : [i, i + 1];
      targets.forEach((k) => {
        if (k >= 0 && k < b.length) d += `M${f1(x)} ${f1(y)}L${f1(b[k][0])} ${f1(b[k][1])}`;
      });
    });
  }
  const last = g[J];
  d += 'M' + last.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
  return d;
};
const STEP = 20, TMAX = 1000;
const samples = [];
for (let t = 0; t <= TMAX; t += STEP) samples.push(netD(t));
const NET_ID = 'netd';
const netAnim = `<animate attributeName="d" dur="${TMAX / 1000}s" begin="0s" fill="freeze" calcMode="linear" values="${samples.join(';')}"/>`;
const netSvg = (inner) => `<svg class="netsvg" viewBox="${NX - 150} 0 300 300" width="300" height="300" aria-hidden="true">${inner}</svg>`;
const rim = (front) => `<path d="M${NX - RIM_RX} ${RIM_Y} A${RIM_RX} ${RIM_RY} 0 0 ${front ? 0 : 1} ${NX + RIM_RX} ${RIM_Y}" fill="none" stroke="${front ? '#ff2436' : '#8f1420'}" stroke-width="${front ? 6 : 5}" stroke-linecap="round"/>`;
const BOARD = `<svg viewBox="0 0 390 120" width="390" height="120" aria-hidden="true"><rect x="62" y="-60" width="266" height="106" rx="12" fill="rgba(255,255,255,.035)" stroke="#3a3a40" stroke-width="2"/><rect x="146" y="-20" width="98" height="60" rx="3" fill="none" stroke="#ff2436" stroke-opacity=".55" stroke-width="2"/><rect x="${NX - 22}" y="44" width="44" height="12" rx="2" fill="#5e0912"/></svg>`;
const FB = `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true"><defs>
<radialGradient id="fbg" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="#ff6a75"/><stop offset=".45" stop-color="#ef3340"/><stop offset=".85" stop-color="#b3121f"/><stop offset="1" stop-color="#8a0d17"/></radialGradient>
<radialGradient id="fbs" cx="62%" cy="70%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>
<clipPath id="fbc"><circle cx="100" cy="100" r="98"/></clipPath></defs>
<circle cx="100" cy="100" r="98" fill="url(#fbg)"/>
<g clip-path="url(#fbc)" fill="none" stroke="#4a050d" stroke-opacity=".82" stroke-width="5.5" stroke-linecap="round"><path d="M100 0V200"/><path d="M0 100H200"/><path d="M34 14C78 56 78 144 34 186"/><path d="M166 14C122 56 122 144 166 186"/></g>
<circle cx="100" cy="100" r="98" fill="url(#fbs)"/></svg>`;
const HL = `<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true"><defs><radialGradient id="hlg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><ellipse cx="68" cy="52" rx="34" ry="20" transform="rotate(-32 68 52)" fill="url(#hlg)"/></svg>`;

const fall = (() => {
  let k = '@keyframes fall{';
  for (let t = 0; t <= 650; t += 13) {
    const pct = f1((t / 650) * 100);
    k += `${pct}%{transform:translateY(${f1(ballY(t) - CY)}px)}`;
  }
  return k + `100%{transform:translateY(0)}}`;
})();
const BCSS = `
${fall}
@keyframes spin{from{transform:rotate(-40deg)}to{transform:rotate(200deg);animation-timing-function:cubic-bezier(.2,.6,.3,1)}}
@keyframes fbvis{0%,93.8%{opacity:1}100%{opacity:0}}
@keyframes land{0%{transform:scale(1.05,.93)}45%{transform:scale(.99,1.02)}100%{transform:scale(1)}}
@keyframes sceneop{0%{opacity:0}14%{opacity:1}74%{opacity:1}100%{opacity:0}}
.scene{position:absolute;left:0;top:0;width:390px;height:300px;pointer-events:none}
.scene>*{position:absolute}
.board{left:0;top:0}
.netl{left:${NX - 150}px;top:0}
.fball{position:absolute;left:${BO}px;top:${BO}px;width:${D}px;height:${D}px;opacity:0}
.fball .fbi{position:absolute;inset:0}
.fball .hl{position:absolute;inset:0}
.scene{opacity:0}
.play .scene{animation:sceneop 840ms linear 0ms both}
.play .fball{animation:fall 650ms linear 0ms both,fbvis 780ms linear 0ms both}
.play .fball .fbi{animation:spin 650ms linear 0ms both}
.play .ball{animation:fade 180ms linear 600ms backwards}
.play .ballwrap{animation:land 300ms var(--ease) 650ms forwards}
.play .glow{animation:fade 600ms ease-out 640ms backwards}
.play .bk{animation:bkclose 400ms linear 640ms backwards,fade 140ms linear 640ms backwards}
.play .ping{animation:ping 520ms var(--ease) 960ms forwards}
.play .word{animation:rise 360ms var(--ease) 840ms backwards}
.play .slogan{animation:rise 360ms var(--ease) 1020ms backwards}
.play .stage{animation:exit 200ms cubic-bezier(.4,0,1,1) 1350ms both}
`;
const sceneBack = `<div class="scene"><div class="board">${BOARD}</div><div class="netl">${netSvg(`${rim(false)}<defs><path id="${NET_ID}" d="${samples[0]}">${netAnim}</path></defs><use href="#${NET_ID}" fill="none" stroke="#f4f4f5" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`)}</div></div>`;
const sceneFront = `<div class="scene"><div class="netl">${netSvg(`<use href="#${NET_ID}" fill="none" stroke="#f4f4f5" stroke-opacity=".82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${rim(true)}`)}</div></div>`;
const fb = `<div class="fball"><div class="fbi">${FB}</div><div class="hl">${HL}</div></div>`;
// The scene is placed on the stage, not inside the scope, so its coordinates are the screen's.
const Bhtml = html(
  'Opening B: Swish',
  BCSS,
  `${sceneBack}
<div class="lock" style="z-index:2;pointer-events:none">
  <div class="scope">
    <div class="glow"></div>
    <div class="bks">${brackets}</div>
    <div class="ballwrap"><div class="ball">${P.ball}</div></div>
    <div class="ping"></div>
    ${fb}
  </div>
  <div class="word">${P.wordBox}</div>
  <div class="slogan">Aim is earned</div>
</div>
<div style="position:absolute;inset:0;z-index:3;pointer-events:none">${sceneFront}</div>`,
  ['.scene', '.fball', '.fbi', '.ball', '.ballwrap', '.glow', '.bk', '.ping', '.word', '.slogan'],
  900,
);

const w = (n, v) => { fs.writeFileSync(path.join(HERE, `2026-11-22-loading-open-${n}${SUFFIX}.html`), v); console.log('wrote', n + SUFFIX, Math.round(v.length / 1024), 'KB'); };
w('a-lockon', A);
if (LOGO === 'faithful') { w('b-swish', Bhtml); w('c-reticle', C); }
console.log({ S, D, ARM, GAP, WW, WH, CY });
