// Builds the three opening-animation prototypes: node 2026-11-22-loading-build-open.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ball, fauxCss, fauxHome, fontCss, page, rm } from './2026-11-22-loading-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fonts = await fontCss();

// Base look of the lockup (the logo's own geometry: brackets, ball, wordmark; the slogan is the brand red).
// Every moving piece is its own box with a static picture inside, and only transform and opacity move.
const BASE = `
${fauxCss}
.stage{position:absolute;inset:0;z-index:10;background:#09090b}
.lock{position:absolute;left:50%;top:222px;margin-left:-116px;width:232px;display:flex;flex-direction:column;align-items:center}
.scope{position:relative;width:232px;height:232px}
.bk{position:absolute;width:40px;height:40px;border:0 solid #ff2436}
.bk.tl{left:0;top:0;border-width:8px 0 0 8px;--dx:-1;--dy:-1}
.bk.tr{right:0;top:0;border-width:8px 8px 0 0;--dx:1;--dy:-1}
.bk.bl{left:0;bottom:0;border-width:0 0 8px 8px;--dx:-1;--dy:1}
.bk.bb{right:0;bottom:0;border-width:0 8px 8px 0;--dx:1;--dy:1}
.bks{position:absolute;inset:0}
.ballwrap{position:absolute;left:42px;top:42px;width:148px;height:148px}
.ballwrap>div{width:100%;height:100%}
.ping{position:absolute;left:42px;top:42px;width:148px;height:148px;border-radius:50%;border:2px solid #ff2436;opacity:0}
.glow{position:absolute;left:50%;top:50%;width:440px;height:440px;margin:-220px 0 0 -220px;border-radius:50%;background:radial-gradient(circle,rgba(255,36,54,.2) 0%,rgba(255,36,54,0) 62%)}
.word{margin-top:22px;font:900 34px/1 'Geist',system-ui,sans-serif;letter-spacing:.22em;padding-left:.22em;color:#f4f4f5;white-space:nowrap}
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
.skipped .stage{animation:skip 150ms ease-out forwards!important}
`;

const html = (name, title, css, inner, rmSel, rmExit) =>
  page({
    title,
    fonts,
    css:
      BASE +
      css +
      '\n' +
      rm(rmSel, 'animation:none') +
      '\n' +
      rm(['.stage'], `animation:exit 200ms linear ${rmExit}ms both`),
    body: `${fauxHome()}
<div class="stage" id="stage">
${inner}
</div>
<p class="hint">Tap the screen to skip</p>`,
    script: `document.getElementById('stage').addEventListener('pointerdown',function(){document.documentElement.classList.add('skipped')});`,
  });

const lockup = (extra = '', after = '') => `
<div class="lock">
  <div class="scope">
    <div class="glow"></div>
    ${extra}
    <div class="ballwrap"><div class="ball">${ball()}</div></div>
    ${after}
    <div class="ping"></div>
  </div>
  <div class="word">DEADEYE</div>
  <div class="slogan">Aim is earned</div>
</div>`;

const brackets = `<i class="bk tl"></i><i class="bk tr"></i><i class="bk bl"></i><i class="bk bb"></i>`;

// ---------- A: lock on (recommended). The four brackets close in on the ball like a scope locking on. ----------
const A = html(
  'a',
  'Opening A: Lock on',
  `
@keyframes bkclose{
  0%{transform:translate(calc(var(--dx)*68px),calc(var(--dy)*68px));animation-timing-function:cubic-bezier(.16,.84,.34,1)}
  72%{transform:translate(calc(var(--dx)*-4px),calc(var(--dy)*-4px));animation-timing-function:cubic-bezier(.4,0,.2,1)}
  100%{transform:translate(0,0)}
}
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

// ---------- B: swish. A ball drops through a net, then the brackets close on it. ----------
const NET = (() => {
  const top = [12, 52, 95, 138, 178];
  const bot = [54, 75, 95, 115, 136];
  const strands = top
    .map((x, i) => `<path d="M${x} 20 L${bot[i]} 112"/>`)
    .concat(top.slice(0, -1).map((x, i) => `<path d="M${x} 20 L${bot[i + 1]} 112"/>`), top.slice(1).map((x, i) => `<path d="M${x} 20 L${bot[i]} 112"/>`))
    .join('');
  const svg = (inner) => `<svg viewBox="0 0 190 130" width="190" height="130" aria-hidden="true">${inner}</svg>`;
  // The back of the rim sits behind the ball, the net and the front of the rim in front of it: the ball goes through.
  const back = `<div class="net nb">${svg('<path d="M3 16 A92 13 0 0 1 187 16" fill="none" stroke="#a31a27" stroke-width="5"/>')}</div>`;
  const front = `<div class="net nf">${svg(`<g fill="none" stroke="#f4f4f5" stroke-opacity=".62" stroke-width="2.2" stroke-linecap="round">${strands}<path d="M48 112 A47 7 0 0 0 142 112"/></g><path d="M3 16 A92 13 0 0 0 187 16" fill="none" stroke="#ff2436" stroke-width="5" stroke-linecap="round"/>`)}</div>`;
  return { back, front };
})();
const B = html(
  'b',
  'Opening B: Swish',
  `
.net{position:absolute;left:50%;top:-100px;width:190px;height:130px;margin-left:-95px;transform-origin:50% 12%}
@keyframes fall{
  0%{transform:translateY(-480px);animation-timing-function:cubic-bezier(.55,.05,.95,.6)}
  58%{transform:translateY(-175px);animation-timing-function:cubic-bezier(.25,.3,.5,1)}
  84%{transform:translateY(-26px);animation-timing-function:cubic-bezier(.3,0,.4,1)}
  100%{transform:translateY(0)}
}
@keyframes land{0%{transform:scale(1.05,.93)}45%{transform:scale(.99,1.02)}100%{transform:scale(1)}}
@keyframes netpass{0%{transform:scale(1,1)}30%{transform:scale(.9,1.22)}62%{transform:scale(1.03,.95)}100%{transform:scale(1,1)}}
@keyframes netop{0%{opacity:0}14%{opacity:1}70%{opacity:1}100%{opacity:0}}
@keyframes bkclose{
  0%{transform:translate(calc(var(--dx)*68px),calc(var(--dy)*68px));animation-timing-function:cubic-bezier(.16,.84,.34,1)}
  72%{transform:translate(calc(var(--dx)*-4px),calc(var(--dy)*-4px));animation-timing-function:cubic-bezier(.4,0,.2,1)}
  100%{transform:translate(0,0)}
}
.play .glow{animation:fade 600ms ease-out 560ms backwards}
.play .ball{animation:fall 500ms linear 80ms backwards}
.play .ballwrap{animation:land 300ms var(--ease) 575ms forwards}
.play .net{animation:netpass 360ms ease-out 290ms both,netop 820ms linear 0ms both}
.play .bk{animation:bkclose 400ms linear 540ms backwards,fade 140ms linear 540ms backwards}
.play .ping{animation:ping 520ms var(--ease) 900ms forwards}
.play .word{animation:rise 360ms var(--ease) 740ms backwards}
.play .slogan{animation:rise 360ms var(--ease) 930ms backwards}
.play .stage{animation:exit 200ms cubic-bezier(.4,0,1,1) 1300ms both}
.net{opacity:0}
`,
  lockup(brackets + NET.back, NET.front),
  ['.glow', '.ball', '.ballwrap', '.net', '.bk', '.ping', '.word', '.slogan'],
  900,
);

// ---------- C: reticle. Four hairlines meet at the centre, the ball is revealed, the brackets settle. No artwork. ----------
const C = html(
  'c',
  'Opening C: Reticle',
  `
.stage{--cy:338px}
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

for (const [k, v] of Object.entries({ a: A, b: B, c: C })) {
  const name = { a: 'a-lockon', b: 'b-swish', c: 'c-reticle' }[k];
  fs.writeFileSync(path.join(HERE, `2026-11-22-loading-open-${name}.html`), v);
  console.log('wrote', name, Math.round(v.length / 1024), 'KB');
}
