// Builds the three opening-animation prototypes: node 2026-11-22-loading-build-open.mjs
// LOGO=improved-c node ... builds variant A only, with that logo version (for the logo comparison).
// The logo is the SVG redraw in docs/agent-os/design/logo/ (faithful by default). Every moving piece is its own box with a static
// picture inside and only transform and opacity move. One exception: B's net is a small SVG whose path is morphed (SMIL), so it can
// ripple like a real net; it repaints about 230 x 200 px for a fifth of a second.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANTS, parts } from '../logo/2026-11-22-logo-lib.mjs';
import { makeSwish } from './2026-11-22-loading-swish.mjs';
import { fauxCss, fauxHome, fontCss, page, rm } from './2026-11-22-loading-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fonts = await fontCss();
const LOGO = process.env.LOGO ?? 'improved-c';
const V = VARIANTS[LOGO];
const SUFFIX = process.env.LOGO ? `-${LOGO}` : '';
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

// ---------- B: swish, two finishes (see 2026-11-22-loading-swish.mjs) ----------
const SWISH = makeSwish({ D, CY, S, html, brackets, P, f1 });

const w = (n, v) => { fs.writeFileSync(path.join(HERE, `2026-11-22-loading-open-${n}${SUFFIX}.html`), v); console.log('wrote', n + SUFFIX, Math.round(v.length / 1024), 'KB'); };
w('a-lockon', A);
if (!process.env.LOGO) { w('b1-swish-settle', SWISH.b1); w('b2-swish-resolve', SWISH.b2); w('c-reticle', C); }
console.log({ S, D, ARM, GAP, WW, WH, CY });
