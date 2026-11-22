// Builds the slogan, page-loading and shot-tracker-decode prototypes: node 2026-11-22-loading-build-screens.mjs
// Every animation is CSS (transform and opacity), so the capture script can seek it frame by frame.
// The only exception is the percent and shot counters in the decode mockup, which use an animated @property so the mockup
// can count by itself; in the app they come from the tracker's own state.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ball, fontCss, page, rm } from './2026-11-22-loading-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fonts = await fontCss();
const write = (n, v) => { fs.writeFileSync(path.join(HERE, `2026-11-22-loading-${n}.html`), v); console.log('wrote', n, Math.round(v.length / 1024), 'KB'); };

const SLOGANS = ['Aim is earned', '1% better every day', 'One more rep'];

// ============ 2. Rotating slogan ============
// A line of the cycle: fade in 350 ms, hold, fade out 220 ms, then the next line. Never two lines at once.
// n slogans, each shown DWELL seconds, so the whole cycle is n x DWELL and each line owns 1/n of it.
const DWELL = 6;
const cyc = (n) => {
  const full = n * DWELL * 1000;
  const inP = ((350 / full) * 100).toFixed(2);
  const outStart = (((DWELL * 1000 - 220) / full) * 100).toFixed(2);
  const outEnd = ((DWELL * 1000) / full * 100).toFixed(2);
  return `@keyframes cyc{0%{opacity:0;transform:translateY(7px);animation-timing-function:cubic-bezier(.2,0,0,1)}${inP}%{opacity:1;transform:translateY(0)}${outStart}%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.4,0,1,1)}${outEnd}%{opacity:0;transform:translateY(-5px)}100%{opacity:0;transform:translateY(-5px)}}`;
};
const slot = (list, cls = '') =>
  `<div class="slot ${cls}" aria-label="Brand line"><p class="sl first">${list[0]}</p>${list
    .slice(1)
    .map((t, i) => `<p class="sl" aria-hidden="true" style="--i:${i + 1}">${t}</p>`)
    .join('')}</div>`;

const SLOGAN_CSS = `
.page{padding:18px 16px 0}
.cap1{font:700 12px/16px 'Geist',system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;margin:0 2px 6px;display:flex;justify-content:space-between}
.cap1 span:last-child{color:#8b8b94;font-weight:400;letter-spacing:0;text-transform:none}
.frame{position:relative;height:232px;border-radius:16px;border:1px solid #27272a;background:#09090b;overflow:hidden;margin-bottom:14px}
.center{display:flex;flex-direction:column;align-items:center;text-align:center}
.mark{border-radius:50%;box-shadow:0 8px 20px rgba(0,0,0,.45)}
.brand{font:900 24px/1 'Geist',system-ui,sans-serif;letter-spacing:.14em;padding-left:.14em;text-transform:uppercase;color:#fafafa}
.slot{position:relative;height:21px;width:100%}
.sl{position:absolute;left:0;right:0;top:0;font:700 14px/21px 'Geist',system-ui,sans-serif;letter-spacing:.2em;padding-left:.2em;text-transform:uppercase;color:#f87171;white-space:nowrap;text-align:center}
.sl.small{font-size:12px;line-height:16px}
/* open: one line, fades in once, stays */
.open .sl{animation:none}
.play .open .sl{animation:rise 420ms var(--ease) 500ms backwards}
.play .open .mark{animation:fade 360ms var(--ease) 80ms backwards}
.play .open .brand{animation:rise 360ms var(--ease) 260ms backwards}
/* login: rotates, never two at once */
${cyc(3)}
.login .sl{opacity:0}
.login .sl.first{opacity:1}
.play .login .sl{animation:cyc ${DWELL * 3}s linear infinite backwards;animation-delay:calc(var(--i,0)*${DWELL}s + 700ms)}
.play .login .sl.first{animation-delay:700ms}
.field{height:44px;border-radius:12px;border:1px solid #3f3f46;background:#09090b;width:100%;margin-top:9px;text-align:left;padding:0 12px;font:400 14px/42px 'Geist',system-ui,sans-serif;color:#8b8b94}
.btn{height:44px;border-radius:12px;background:#c2410c;width:100%;margin-top:9px;font:700 14px/44px 'Geist',system-ui,sans-serif;color:#fff;text-align:center}
.login .center{padding:16px 22px 0;height:100%}
.login .mark{margin-bottom:7px}
.login .brand{font-size:20px;margin-bottom:5px}
/* home: one line a day, sits under the greeting */
.home{padding:14px 16px}
.hrow{display:flex;align-items:center;gap:12px}
.hrow .t{font:900 20px/24px 'Geist',system-ui,sans-serif;color:#fff;letter-spacing:-.01em}
.hrow .av{margin-left:auto;width:36px;height:36px;border-radius:50%;background:#27272a;border:1px solid #3f3f46}
.home .slot{margin:5px 0 0 40px;height:18px;text-align:left}
.home .sl{text-align:left;padding-left:0;font-size:12px;line-height:18px}
.hcard{margin-top:16px;border-radius:16px;border:1px solid rgba(194,65,12,.35);background:linear-gradient(135deg,rgba(234,88,12,.16),rgba(9,9,11,0));padding:14px}
.hcard .l{font:700 12px/16px 'Geist',system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa}
.hcard .h{font:900 20px/28px 'Geist',system-ui,sans-serif;color:#fff;margin:2px 0 10px}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}}
${rm(['.open .sl', '.open .mark', '.open .brand'], 'animation:none')}
${rm(['.login .sl'], 'animation:none')}
`;

const SLOGAN = page({
  title: 'Slogan: how it sits and changes',
  fonts,
  css: SLOGAN_CSS,
  body: `<div class="page">
<div class="cap1"><span>1 On open</span><span>one line, picked per open</span></div>
<div class="frame open"><div class="center" style="padding-top:46px"><div class="mark" style="width:64px;height:64px;margin-bottom:12px">${ball()}</div><div class="brand" style="margin-bottom:12px">Deadeye</div>${slot([SLOGANS[0]])}</div></div>
<div class="cap1"><span>2 Sign in</span><span>demo: rotates every 6 s (see doc)</span></div>
<div class="frame login"><div class="center"><div class="mark" style="width:44px;height:44px">${ball()}</div><div class="brand">Deadeye</div>${slot(SLOGANS)}<div class="field">Email</div><div class="btn">Sign in</div></div></div>
<div class="cap1"><span>3 Home</span><span>one line, new each visit</span></div>
<div class="frame home"><div class="hrow"><div class="mark" style="width:28px;height:28px">${ball()}</div><div class="t">Hey Sam</div><div class="av"></div></div>${slot([SLOGANS[2]]).replace('class="sl first"', 'class="sl first small"')}<div class="hcard"><div class="l">Today</div><div class="h">Log a session</div><div class="btn" style="margin:0;width:150px;height:44px">Start</div></div></div>
</div>`,
});
write('slogan', SLOGAN);

// ============ 3. Page loading ============
// Skeleton at 0 ms (as today, with one sweep instead of the pulse); the small loader only after 400 ms, so a fast page never shows it.
const PAGE_CSS = `
.cyc{position:absolute;inset:0}
.skel{position:absolute;inset:0;padding:16px;background:#09090b;overflow:hidden}
.sh{display:flex;gap:12px;align-items:center;margin:0 0 32px;padding-top:6px}
.sa{width:48px;height:48px;border-radius:12px;background:#27272a}
.sb{height:22px;width:190px;border-radius:6px;background:#27272a}.sc{height:12px;width:250px;border-radius:6px;background:#18181b;margin-top:9px}
.s1{height:112px;border-radius:16px;border:1px solid #27272a;background:#18181bb3;margin-bottom:16px}
.s2{height:64px;border-radius:16px;border:1px solid #27272a;background:#18181b80;margin-bottom:12px}
.sweep{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.sweep:before{content:"";position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.055),rgba(255,255,255,0));transform:translateX(-100%)}
.nav{position:absolute;left:0;right:0;bottom:0;height:68px;border-top:1px solid #27272a;background:#09090b;display:flex;justify-content:space-around;align-items:center;z-index:3}
.nav i{width:26px;height:26px;border-radius:8px;background:#27272a}.nav i.on{background:#7d0d18}
.loaded{position:absolute;inset:0;padding:16px;background:#09090b}
.loaded .t{font:900 24px/32px 'Geist',system-ui,sans-serif;color:#fff;letter-spacing:-.01em}
.loaded .u{font:400 14px/21px 'Geist',system-ui,sans-serif;color:#a1a1aa}
.card{border-radius:16px;border:1px solid #27272a;background:#18181bb3;padding:14px;margin-bottom:16px;height:112px}
.card.hero{border-color:rgba(194,65,12,.4);background:linear-gradient(135deg,rgba(234,88,12,.16),rgba(9,9,11,0))}
.card .l{font:700 12px/16px 'Geist',system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa}
.card .n{font:900 32px/40px 'Geist',system-ui,sans-serif;color:#fff;font-variant-numeric:tabular-nums}
.card .b{width:148px;height:44px;border-radius:12px;background:#c2410c;color:#fff;font:700 14px/44px 'Geist',system-ui,sans-serif;text-align:center;margin-top:6px}
.row{height:64px;border-radius:16px;border:1px solid #27272a;background:#18181b80;margin-bottom:12px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;font:700 14px 'Geist',system-ui,sans-serif;color:#e4e4e7}
.row b{font:900 16px 'Geist',system-ui,sans-serif;font-variant-numeric:tabular-nums;color:#fff}
.loader{position:absolute;left:50%;bottom:92px;margin-left:-109px;width:218px;height:44px;z-index:5;border-radius:999px;border:1px solid #3f3f46;background:rgba(24,24,27,.94);box-shadow:0 10px 28px rgba(0,0,0,.55);display:flex;align-items:center;gap:10px;padding:0 18px 0 10px}
.spin{width:26px;height:26px;flex:none}
.loader p{font:700 12px/16px 'Geist',system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#f87171;white-space:nowrap}
.cap2{position:absolute;left:0;right:0;top:0;z-index:9;display:none}
/* One 6.4 s demo cycle: slow load (3.4 s) then the page appears at once, no fade, as in the app. */
@keyframes skelOn{0%,53%{opacity:1}53.1%,100%{opacity:0}}
@keyframes loadedOn{0%,53%{opacity:0}53.1%,100%{opacity:1}}
@keyframes sweep{0%{transform:translateX(-100%)}100%{transform:translateX(260%)}}
@keyframes loaderIn{0%,6.25%{opacity:0;transform:translateY(10px)}10%{opacity:1;transform:translateY(0)}52%{opacity:1;transform:translateY(0)}53.1%,100%{opacity:0;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.play .skel{animation:skelOn 6.4s steps(1,end) infinite}
.play .loaded{animation:loadedOn 6.4s steps(1,end) infinite}
.play .sweep:before{animation:sweep 1.5s cubic-bezier(.45,0,.55,1) infinite}
.play .loader{animation:loaderIn 6.4s linear infinite backwards;animation-timing-function:cubic-bezier(.2,0,0,1)}
.play .spin{animation:spin 1.1s cubic-bezier(.5,.1,.5,.9) infinite}
.loaded{opacity:0}.skel{opacity:1}.loader{opacity:0}
${rm(['.sweep:before', '.spin'], 'animation:none')}
${rm(['.loader'], 'animation:loaderIn 6.4s steps(1,end) infinite;animation-timing-function:steps(1,end)')}
`;
const PAGE = page({
  title: 'Page loading',
  fonts,
  css: PAGE_CSS,
  body: `
<div class="loaded" aria-hidden="true">
  <div style="display:flex;align-items:center;gap:12px;margin:6px 0 32px"><div class="sa" style="background:#7d0d18"></div><div><div class="t">Hey Sam</div><div class="u">Today is a good day to shoot</div></div></div>
  <div class="card hero"><div class="l">Today</div><div class="b">Log a session</div></div>
  <div class="card"><div class="l">Makes this week</div><div class="n">142</div></div>
  <div class="card"><div class="l">Best streak</div><div class="n">6 days</div></div>
  <div class="row">Last session<b>6/10</b></div><div class="row">Free throws<b>70%</b></div>
</div>
<div class="skel" aria-busy="true" aria-label="Loading">
  <div class="sh"><div class="sa"></div><div><div class="sb"></div><div class="sc"></div></div></div>
  <div class="s1"></div><div class="s1"></div><div class="s1"></div>
  <div class="s2"></div><div class="s2"></div>
  <div class="sweep"></div>
</div>
<div class="nav"><i class="on"></i><i></i><i></i><i></i><i></i></div>
<div class="loader" role="status"><div class="spin">${ball()}</div><p>Aim is earned</p></div>`,
});
write('page', PAGE);

// ============ 4. Shot tracker decode ============
const DEC_CSS = `
@property --p{syntax:'<integer>';initial-value:0;inherits:false}
@property --s{syntax:'<integer>';initial-value:0;inherits:false}
.scr{position:absolute;inset:0;padding:14px 16px 0;background:#09090b}
.top{display:flex;align-items:center;gap:6px;height:44px;margin:0 0 8px -6px;font:900 20px/28px 'Geist',system-ui,sans-serif;color:#fff;letter-spacing:-.01em}
.top svg{width:28px;height:28px;stroke:#d4d4d8;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.clip{position:relative;height:330px;border-radius:16px;border:1px solid #27272a;background:#0c0c0e;overflow:hidden}
.clip .ph{position:absolute;left:0;right:0;top:50%;margin-top:-9px;text-align:center;font:400 12px/18px 'Geist',system-ui,sans-serif;color:#8b8b94}
.cb{position:absolute;width:26px;height:26px;border:0 solid #ff2436;opacity:.9}
.cb.tl{left:14px;top:14px;border-width:3px 0 0 3px}.cb.tr{right:14px;top:14px;border-width:3px 3px 0 0}
.cb.bl{left:14px;bottom:14px;border-width:0 0 3px 3px}.cb.bb{right:14px;bottom:14px;border-width:0 3px 3px 0}
.scan{position:absolute;left:0;right:0;top:0;height:70px;margin-top:-70px;background:linear-gradient(to bottom,rgba(255,36,54,0),rgba(255,36,54,.16));border-bottom:2px solid rgba(255,36,54,.8)}
.head{display:flex;align-items:flex-end;gap:14px;margin-top:22px}
.pct{font:900 48px/48px 'Geist',system-ui,sans-serif;color:#fff;font-variant-numeric:tabular-nums;min-width:108px;letter-spacing:-.02em;counter-reset:p var(--p)}
.pct:after{content:counter(p) "%"}
.hl{padding-bottom:2px}
.hl h2{font:900 16px/22px 'Geist',system-ui,sans-serif;color:#fff}
.hl p{font:400 14px/21px 'Geist',system-ui,sans-serif;color:#a1a1aa;counter-reset:s var(--s)}
.hl p b{font:900 14px/21px 'Geist',system-ui,sans-serif;color:#fff;font-variant-numeric:tabular-nums}
.hl p b:after{content:counter(s)}
.track{position:relative;height:8px;border-radius:999px;background:#27272a;overflow:hidden;margin-top:14px}
.fill{position:absolute;inset:0;border-radius:999px;background:linear-gradient(90deg,#ea580c,#fb923c);transform-origin:left center;transform:scaleX(0)}
.sheen{position:absolute;top:0;bottom:0;left:0;width:34%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.22),rgba(255,255,255,0));transform:translateX(-100%)}
.tips{position:relative;height:96px;margin-top:20px;border-radius:16px;border:1px solid #27272a;background:rgba(24,24,27,.7)}
.tip{position:absolute;left:18px;right:18px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;opacity:0}
.tip .k{font:700 12px/16px 'Geist',system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;margin-bottom:4px}
.tip .x{font:400 14px/21px 'Geist',system-ui,sans-serif;color:#d4d4d8}
.tip.sg{align-items:center;text-align:center}
.tip.sg .x{font:700 14px/21px 'Geist',system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#f87171}
.stop{margin-top:16px;height:48px;border-radius:12px;border:1px solid #52525b;background:#27272a;display:flex;align-items:center;justify-content:center;gap:8px;font:700 16px/24px 'Geist',system-ui,sans-serif;color:#fff}
.stop i{width:14px;height:14px;border-radius:3px;background:#fff;display:block}
/* 12 s demo: progress is uneven on purpose, like a real decode. Dwell 4 s per line, 16 s cycle. */
@keyframes bar{0%{transform:scaleX(0)}8%{transform:scaleX(.05)}30%{transform:scaleX(.27)}46%{transform:scaleX(.39)}72%{transform:scaleX(.74)}92%{transform:scaleX(.97)}100%{transform:scaleX(1)}}
@keyframes pnum{0%{--p:0}8%{--p:5}30%{--p:27}46%{--p:39}72%{--p:74}92%{--p:97}100%{--p:100}}
@keyframes snum{0%{--s:0}18%{--s:1}30%{--s:3}46%{--s:5}60%{--s:8}72%{--s:11}92%{--s:14}100%{--s:15}}
@keyframes sheen{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}
@keyframes scan{0%{transform:translateY(0);opacity:0}12%{opacity:1}86%{opacity:1}100%{transform:translateY(410px);opacity:0}}
@keyframes cyc4{0%{opacity:0;transform:translateY(7px);animation-timing-function:cubic-bezier(.2,0,0,1)}2%{opacity:1;transform:translateY(0)}23.7%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.4,0,1,1)}25%{opacity:0;transform:translateY(-5px)}100%{opacity:0;transform:translateY(-5px)}}
.play .fill{animation:bar 12s linear forwards}
.play .pct,.play .hl p{animation:none}
.play .pct{animation:pnum 12s linear forwards}
.play .hl p{animation:snum 12s linear forwards}
.play .sheen{animation:sheen 1.6s cubic-bezier(.45,0,.55,1) infinite}
.play .scan{animation:scan 2.4s cubic-bezier(.45,0,.55,1) infinite}
.play .tip{animation:cyc4 16s linear infinite backwards;animation-delay:calc(var(--i)*4s + 300ms)}
.tip.first{opacity:1}
${rm(['.sheen', '.scan'], 'animation:none')}
${rm(['.tip'], 'animation:none;opacity:0')}
.rm.play .tip.first{opacity:1}
@media (prefers-reduced-motion:reduce){.play .tip.first{opacity:1}}
`;
const DECODE = page({
  title: 'Shot tracker: decoding a clip',
  fonts,
  css: DEC_CSS,
  body: `<div class="scr">
<div class="top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>Track a clip</div>
<div class="clip"><i class="cb tl"></i><i class="cb tr"></i><i class="cb bl"></i><i class="cb bb"></i><div class="scan"></div><div class="ph">Your clip (placeholder)</div></div>
<div class="head"><div class="pct" role="progressbar" aria-label="Checking your clip" aria-valuemin="0" aria-valuemax="100" aria-valuenow="42"></div><div class="hl"><h2>Checking your clip</h2><p>Shots found <b></b></p></div></div>
<div class="track"><div class="fill"></div><div class="sheen"></div></div>
<div class="tips" aria-live="off">
  <div class="tip first" style="--i:0"><span class="k">How it works</span><span class="x">Checking every frame without playing it, so no shot is missed between frames.</span></div>
  <div class="tip sg" style="--i:1" aria-hidden="true"><span class="x">Aim is earned</span></div>
  <div class="tip" style="--i:2" aria-hidden="true"><span class="k">Good to know</span><span class="x">Every shot can be corrected before you save.</span></div>
  <div class="tip sg" style="--i:3" aria-hidden="true"><span class="x">One more rep</span></div>
</div>
<div class="stop"><i></i>Stop early and review</div>
</div>`,
});
write('decode', DECODE);
