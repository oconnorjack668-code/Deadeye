// Direction C: GLASS. Premium sports-tech: ember light behind frosted glass, big soft shadows, duotone icons in glowing tiles,
// ring gauges, warm Bricolage headlines. Calmer than A and B, the most "expensive" feel.
import { ico, court, LOGO, FOOTAGE, SHOTS, DUR, NOW, clock } from './2026-11-20-direction-common.mjs';

export const styleC = `
:root{--bg:#08080C;--ember1:#FFA14A;--ember2:#FF4E2B;--text:#FFFFFF;--mut:rgba(255,255,255,.86);--mint:#34D399;--rose:#FB7185;--ice:#9AD0FF;--ink:#160A04;--amber:#FFC46B}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg)}
body{width:390px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:var(--text);font-weight:500;-webkit-font-smoothing:antialiased}
.ph{width:1em;height:1em;flex:none;display:block}
.screen{position:relative;width:390px;min-height:844px;overflow:hidden;background:var(--bg)}
.screen::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>")}
.blob{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none}
.z{position:relative;z-index:1}
.pad{padding:0 16px}
.disp{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;letter-spacing:-.018em;word-spacing:.08em;line-height:1;font-variation-settings:'opsz' 72}
.num{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;letter-spacing:-.03em;word-spacing:.08em;font-variant-numeric:tabular-nums;line-height:.92;font-variation-settings:'opsz' 96}
.cap{font-size:13px;font-weight:600;color:var(--mut)}
.small{font-size:14px;line-height:1.5;color:var(--mut)}
.glass{background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.04)),rgba(8,8,12,.32);border:1px solid rgba(255,255,255,.17);backdrop-filter:blur(22px) saturate(150%);-webkit-backdrop-filter:blur(22px) saturate(150%);border-radius:26px;box-shadow:0 20px 44px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.28)}
.pill{border-radius:999px}
.tile{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:26px;color:var(--ember1);background:linear-gradient(150deg,rgba(255,255,255,.2),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.2);box-shadow:0 0 22px rgba(255,110,40,.38),inset 0 1px 0 rgba(255,255,255,.35)}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:54px;border:0;border-radius:18px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:19px;letter-spacing:-.01em;color:var(--ink);background:linear-gradient(135deg,#FFB35C,#FF7433 55%,#FF5A2E);box-shadow:0 12px 32px rgba(255,92,40,.5),inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 0 rgba(160,40,0,.25)}
.btn .ph{font-size:24px}
.btn2{color:var(--text);background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:1.5px solid rgba(255,255,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.3);height:50px}
.nav{position:absolute;left:12px;right:12px;bottom:12px;height:68px;border-radius:34px;display:flex;align-items:center;padding:0 6px;z-index:5}
.nav a{flex:1;height:54px;border-radius:27px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--mut);font-size:12px;font-weight:700}
.nav a .ph{font-size:24px}
.nav a.on{color:#fff;background:linear-gradient(160deg,rgba(255,150,70,.35),rgba(255,80,40,.18));box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 22px rgba(255,100,40,.35)}
.nav a.on .ph{color:var(--ember1)}
.fab{position:absolute;right:20px;bottom:92px;width:60px;height:60px;border-radius:50%;display:grid;place-items:center;color:var(--ink);font-size:28px;z-index:6;background:linear-gradient(135deg,#FFB35C,#FF5A2E);box-shadow:0 14px 34px rgba(255,92,40,.6),inset 0 1px 0 rgba(255,255,255,.6)}
.medal{border-radius:50%;display:grid;place-items:center;position:relative}
.medal.lock{width:54px;height:54px;font-size:22px;color:rgba(255,255,255,.7);background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1px dashed rgba(255,255,255,.4)}
.medal.bronze{background:radial-gradient(circle at 30% 25%,#FFE0B0 0,#E39A52 32%,#B2561E 68%,#7A3410 100%);color:#3A1604;box-shadow:0 0 0 3px rgba(255,255,255,.14),0 0 0 6px rgba(255,150,70,.18),0 0 40px rgba(255,120,40,.55),inset 0 2px 0 rgba(255,255,255,.55),inset 0 -6px 12px rgba(80,20,0,.4)}
.bar{height:12px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#FFB35C,#FF5A2E);box-shadow:0 0 14px rgba(255,100,40,.8)}
`;

const blobs = (a = '') => `<div class="blob" style="left:-90px;top:120px;width:280px;height:280px;background:rgba(255,40,70,.50)"></div>
<div class="blob" style="right:-110px;top:-60px;width:320px;height:320px;background:rgba(255,120,30,.55)"></div>
<div class="blob" style="right:-60px;top:560px;width:260px;height:260px;background:rgba(110,80,255,.26)"></div>${a}`;

const nav = (on = 'Home') => `<nav class="nav glass" aria-label="Main">
 ${[['Home', 'house'], ['Hoops', 'basketball'], ['Gym', 'barbell'], ['Train', 'lightning'], ['IQ', 'brain']]
   .map(([n, i]) => `<a class="${n === on ? 'on' : ''}">${ico(i, 'duotone')}${n}</a>`).join('')}
</nav>`;

function ring(size, pct, stroke, label) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="rg${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB35C"/><stop offset="1" stop-color="#FF4E2B"/></linearGradient></defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="${stroke}"/>
  ${pct ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#rg${size})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}</svg>`;
}

export function todayC() {
  return `<div class="screen">${blobs()}
 <header class="pad z" style="display:flex;align-items:center;gap:12px;padding-top:20px;padding-bottom:16px">
  <img src="${LOGO}" width="46" height="46" alt="" style="filter:drop-shadow(0 6px 16px rgba(255,50,60,.55))">
  <div style="flex:1"><div class="disp" style="font-size:30px">Hey Sam</div><div class="cap" style="margin-top:4px">Level 1 · Rookie</div></div>
  <div class="glass pill" style="padding:9px 14px;border-radius:999px;display:flex;gap:6px;align-items:center"><span style="font-size:18px;color:var(--ember1)">${ico('lightning', 'duotone')}</span><span style="font-weight:700;font-size:14px">0 XP</span></div>
 </header>

 <section class="pad z">
  <div class="glass" style="padding:22px 20px 20px;overflow:hidden;border-radius:30px">
   <div style="position:absolute;right:-30px;top:-34px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(255,130,50,.55),rgba(255,70,40,.0) 68%)"></div>
   <div style="position:absolute;right:-16px;top:10px;font-size:150px;color:#FFAA60;transform:rotate(-14deg);filter:drop-shadow(0 0 30px rgba(255,110,40,.75))">${ico('basketball', 'duotone')}</div>
   <div class="glass pill" style="display:inline-flex;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:700;position:relative">Today</div>
   <h1 class="disp" style="font-size:40px;line-height:1;margin:14px 0 10px;max-width:215px;position:relative">Log your first shots</h1>
   <p class="small" style="max-width:210px;margin-bottom:20px;position:relative">About five minutes. Every shot builds your chart.</p>
   <div style="display:grid;gap:10px;position:relative">
    <button class="btn">${ico('pencil-simple', 'bold')}Log shots</button>
    <button class="btn btn2">${ico('camera', 'duotone')}Track with camera</button>
   </div>
  </div>
 </section>

 <section class="pad z" style="margin-top:16px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
   ${[['Makes', '0', 'target'], ['Day streak', '0', 'fire'], ['Accuracy', '--', 'chart-line-up']].map(([l, n, i]) => `
   <div class="glass" style="padding:14px 12px 14px;border-radius:22px">
    <div class="tile">${ico(i, 'duotone')}</div>
    <div class="num" style="font-size:42px;margin-top:12px;text-shadow:0 0 24px rgba(255,130,60,.35)">${n}</div>
    <div class="cap" style="margin-top:6px;font-size:13px">${l}</div>
   </div>`).join('')}
  </div>
  <p class="small" style="margin-top:10px">Your first session fills these in.</p>
 </section>

 <section class="pad z" style="margin-top:14px;padding-bottom:166px">
  <div class="glass" style="padding:16px;border-radius:26px">
   <div style="display:flex;align-items:center;gap:14px">
    <div style="position:relative;width:64px;height:64px">${ring(64, 0.02, 7)}<div class="num" style="position:absolute;inset:0;display:grid;place-items:center;font-size:26px">1</div></div>
    <div style="flex:1"><div class="disp" style="font-size:22px">Level 1 Rookie</div><div class="small" style="margin-top:4px;line-height:1.35">60 XP to Level 2. Your first session is worth 20 XP and a badge.</div></div>
   </div>
   <div style="display:flex;margin-top:14px">
    ${[['First Session', 'target'], ['Heating Up', 'fire'], ['First 100', 'basketball']].map(([n]) => `
    <div style="flex:1;display:grid;justify-items:center;gap:7px;text-align:center"><div class="medal lock">${ico('lock-simple', 'duotone')}</div><div class="cap" style="font-size:12px">${n}</div></div>`).join('')}
   </div>
  </div>
 </section>
 <div class="fab" aria-label="Log">${ico('plus', 'bold')}</div>
 ${nav('Home')}
</div>`;
}

export function resultC() {
  const cz = court({ line: 'rgba(255,255,255,.7)', rim: '#FFA14A', zoneA: '#FFA14A', zoneB: '#FF4E2B', zoneAo: 0.95, make: '#34D399', miss: '#FB7185', lineW: 1.6, frameOp: 0.4, id: 'c', dotR: 4.8 });
  return `<div class="screen">${blobs(`<div class="blob" style="left:20px;top:120px;width:360px;height:300px;background:rgba(255,100,30,.46)"></div>`)}
 <div class="pad z" style="display:flex;justify-content:space-between;align-items:center;padding-top:18px">
  <div class="glass pill" style="padding:8px 14px 8px 10px;border-radius:999px;display:flex;gap:8px;align-items:center;font-weight:700;font-size:14px"><span style="font-size:22px;color:var(--mint);filter:drop-shadow(0 0 8px rgba(52,211,153,.7))">${ico('seal-check', 'duotone')}</span>First session logged</div>
  <button aria-label="Close" class="glass" style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:20px;color:#fff">${ico('x', 'bold')}</button>
 </div>

 <div class="z" style="text-align:center;margin-top:20px">
  <div class="num" style="font-size:170px;letter-spacing:-.06em;text-shadow:0 0 70px rgba(255,120,50,.6),0 8px 30px rgba(0,0,0,.4)">6<span style="color:rgba(255,255,255,.72)">/</span>10</div>
  <div style="display:flex;justify-content:center;align-items:baseline;gap:10px;margin-top:6px">
   <span class="num" style="font-size:48px;color:var(--amber)">60%</span><span class="disp" style="font-size:22px;letter-spacing:-.01em">from Mid top</span>
  </div>
 </div>

 <div class="pad z" style="display:flex;justify-content:center;gap:10px;margin-top:16px">
  <div class="glass pill" style="padding:8px 14px;border-radius:999px;display:flex;gap:7px;align-items:center;font-weight:700;font-size:14px"><span style="font-size:20px;color:var(--ember1)">${ico('fire', 'duotone')}</span>Day 1</div>
  <div class="glass pill" style="padding:8px 14px;border-radius:999px;display:flex;gap:7px;align-items:center;font-weight:700;font-size:14px"><span style="font-size:20px;color:var(--amber)">${ico('lightning', 'duotone')}</span>+20 XP</div>
 </div>

 <div class="pad z" style="margin-top:16px;display:grid;grid-template-columns:1.25fr 1fr;gap:10px">
  <div class="glass" style="padding:12px 10px 8px;border-radius:24px"><div class="cap" style="padding-left:4px">Your shot chart</div><div style="margin-top:2px">${cz}</div></div>
  <div class="glass" style="padding:12px 8px 12px;border-radius:24px;display:grid;justify-items:center;align-content:space-between;text-align:center">
   <div class="cap">Badge earned</div>
   <div class="medal bronze" style="width:86px;height:86px;font-size:42px;margin:6px 0">${ico('target', 'duotone')}</div>
   <div><div class="disp" style="font-size:19px;letter-spacing:-.015em">First Session</div><div class="cap" style="color:var(--amber);margin-top:4px">+50 XP</div></div>
  </div>
 </div>

 <div class="pad z" style="margin-top:10px">
  <div class="glass" style="padding:12px 16px 14px;border-radius:22px">
   <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="disp" style="font-size:20px">Level 2 reached</div><div class="cap">70 / 140 XP</div></div>
   <div class="bar" style="margin-top:10px"><i style="width:12.5%"></i></div>
  </div>
 </div>
 <p class="pad small z" style="margin-top:12px;padding-bottom:200px">Your shot chart has its first spot. Next time, try a different spot and see how the chart fills in.</p>

 <div class="z" style="position:absolute;left:0;right:0;bottom:0;padding:18px 16px 12px;background:linear-gradient(0deg,#08080C 66%,rgba(8,8,12,0))">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
   <button class="btn">${ico('arrow-clockwise', 'bold')}Go again</button>
   <button class="btn btn2" style="height:54px">Done for today</button>
  </div>
  <div style="display:flex;justify-content:center;align-items:center;gap:8px;height:44px;margin-top:4px;color:#fff;font-weight:700;font-size:15px;text-decoration:underline;text-underline-offset:4px">${ico('export', 'bold')}Share this result</div>
 </div>
</div>`;
}

export function watchC() {
  const W = 326;
  const px = (t) => Math.round((t / DUR) * W);
  const pin = (s) => {
    const cur = s.n === 7;
    const sty = s.k === 'make'
      ? 'background:var(--mint);box-shadow:0 0 10px rgba(52,211,153,.8)'
      : s.k === 'miss' ? 'border:3px solid var(--rose)' : 'background:var(--amber);transform:rotate(45deg);border-radius:3px;box-shadow:0 0 10px rgba(255,196,107,.7)';
    return `<i style="position:absolute;left:${px(s.t) - 8}px;top:${cur ? 2 : 4}px;width:${cur ? 16 : 14}px;height:${cur ? 16 : 14}px;${s.k !== 'unclear' ? 'border-radius:50%;' : ''}${sty};${cur ? 'outline:3px solid #fff;outline-offset:1px;' : ''}"></i>`;
  };
  const gp = 'background:rgba(12,12,16,.74);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.28);box-shadow:0 8px 24px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.25)';
  return `<div class="screen" style="min-height:900px">${blobs()}
 <div class="pad z" style="padding-top:18px;display:flex;justify-content:space-between;align-items:flex-end">
  <div><div class="cap">Hoops</div><div class="disp" style="font-size:34px;margin-top:5px">Shot tracker</div></div>
  <div class="cap" style="padding-bottom:6px;color:#fff;font-weight:700">Review</div>
 </div>

 <div class="pad z" style="margin-top:12px">
  <div class="glass" style="padding:12px 18px;display:flex;align-items:center;gap:16px;border-radius:24px">
   <div class="num" style="font-size:60px;text-shadow:0 0 26px rgba(255,130,60,.45)">5/9</div>
   <div><div class="disp" style="font-size:22px;color:var(--amber)">56% made</div><div class="small" style="margin-top:4px">Watch it back to check the calls</div></div>
  </div>
 </div>

 <div class="pad z" style="margin-top:12px">
  <div class="glass" style="padding:0 0 14px;border-radius:28px;overflow:hidden">
   <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px 10px">
    <div style="font-weight:700;font-size:15px">Watch it back</div>
    <div style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--mut)">
     <span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;background:var(--mint)"></i>Make</span>
     <span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;border:2.5px solid var(--rose)"></i>Miss</span>
     <span style="display:flex;gap:5px;align-items:center"><i style="width:9px;height:9px;background:var(--amber);transform:rotate(45deg)"></i>Unclear</span>
    </div>
   </div>

   <div style="position:relative;width:342px;height:316px;margin:0 auto;border-radius:20px;overflow:hidden;background:#000;box-shadow:0 12px 30px rgba(0,0,0,.5)">
    <img src="${FOOTAGE}" width="342" height="316" alt="Gym footage, ball in the net" style="display:block">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.34),rgba(0,0,0,0) 28%,rgba(0,0,0,0) 70%,rgba(0,0,0,.44))"></div>
    <!-- tracker overlay, Glass look -->
    <div style="position:absolute;left:10px;top:10px;${gp};padding:7px 14px 8px;display:flex;align-items:baseline;gap:10px;border-radius:18px">
     <span class="num" style="font-size:38px;color:#fff">4/7</span>
     <span class="num" style="font-size:22px;color:var(--amber)">57%</span>
     <span style="font-size:13px;font-weight:700;color:#fff">${clock(NOW)}</span>
    </div>
    <div style="position:absolute;right:10px;top:12px;${gp};padding:7px 12px;display:flex;align-items:center;gap:7px;border-radius:999px"><i style="width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 8px var(--mint)"></i><span style="font-size:13px;font-weight:700;color:#fff">Ball tracked</span></div>
    <svg style="position:absolute;left:0;top:0" width="342" height="316" viewBox="0 0 342 316" aria-hidden="true">
     <defs><linearGradient id="tr" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient></defs>
     <path d="M178 60 C 160 64, 142 72, 126 82" fill="none" stroke="url(#tr)" stroke-width="4" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgba(255,255,255,.8))"/>
     <circle cx="122" cy="82" r="30" fill="none" stroke="#34D399" stroke-opacity=".4" stroke-width="2"/>
     <circle cx="122" cy="82" r="21" fill="none" stroke="#34D399" stroke-width="3.5" style="filter:drop-shadow(0 0 8px rgba(52,211,153,.9))"/>
    </svg>
    <div style="position:absolute;left:10px;top:122px;${gp};border-color:rgba(52,211,153,.7);padding:6px 16px 6px 8px;border-radius:999px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 24px rgba(0,0,0,.45),0 0 26px rgba(52,211,153,.4)">
     <span style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:22px;color:#06281C;background:linear-gradient(150deg,#6EE7B7,#34D399)">${ico('check', 'bold')}</span>
     <span class="disp" style="font-size:30px;color:#fff;letter-spacing:-.02em">Make</span>
    </div>
    <div style="position:absolute;left:10px;bottom:12px;display:flex;gap:5px">
     ${[1, 0, 1, 1, 0, 0, 1].map((m) => `<i style="width:12px;height:12px;border-radius:50%;${m ? 'background:var(--mint);box-shadow:0 0 8px rgba(52,211,153,.9)' : 'border:3px solid var(--rose);background:rgba(0,0,0,.4)'}"></i>`).join('')}
    </div>
    <div style="position:absolute;right:10px;bottom:10px;width:44px;height:44px;display:grid;place-items:center;font-size:22px;color:#fff;${gp};border-radius:50%">${ico('arrows-out', 'bold')}</div>
   </div>

   <div style="padding:6px 16px 0">
    <div style="position:relative;height:30px;margin-top:6px">${SHOTS.map(pin).join('')}</div>
    <div style="position:relative;height:44px;margin-top:-6px">
     <div style="position:absolute;left:0;right:0;top:19px;height:6px;background:rgba(255,255,255,.28);border-radius:3px"></div>
     <div style="position:absolute;left:0;width:${px(NOW)}px;top:19px;height:6px;background:#fff;border-radius:3px;box-shadow:0 0 12px rgba(255,255,255,.6)"></div>
     <div style="position:absolute;left:${px(NOW) - 12}px;top:10px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.5),0 0 0 4px rgba(255,150,70,.45)"></div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
     <button class="btn" style="width:56px;height:52px;border-radius:18px;font-size:24px">${ico('play', 'fill')}</button>
     ${['skip-back', 'skip-forward'].map((i) => `<button class="btn btn2" style="width:46px;height:46px;border-radius:16px;font-size:20px">${ico(i, 'fill')}</button>`).join('')}
     <div class="num" style="font-size:20px;flex:1;text-align:center;white-space:nowrap;letter-spacing:-.02em">${clock(NOW)} <span style="color:var(--mut);font-size:15px;font-weight:600">/ ${clock(DUR)}</span></div>
     <button class="btn btn2" style="width:50px;height:46px;font-size:16px;border-radius:16px">1×</button>
    </div>
   </div>

   <div style="margin:12px 16px 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.14)">
    <div style="display:flex;justify-content:space-between;align-items:center">
     <div><div class="disp" style="font-size:21px;letter-spacing:-.02em">Shot 7 <span style="color:var(--mut);font-weight:700">· ${clock(NOW)}</span></div><div class="small" style="font-size:14px;margin-top:3px">Tracker said Make. Tap to change.</div></div>
     <div style="display:flex;gap:6px;align-items:center;height:44px;font-weight:700;font-size:14px"><span style="font-size:18px">${ico('trash', 'duotone')}</span>Not a shot</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
     <button class="btn" style="height:54px;color:#06281C;background:linear-gradient(135deg,#6EE7B7,#34D399);box-shadow:0 12px 28px rgba(52,211,153,.4),inset 0 1px 0 rgba(255,255,255,.55)">${ico('check', 'bold')}Make</button>
     <button class="btn btn2" style="height:54px;border-color:var(--rose);color:#FFD1D8">${ico('x', 'bold')}Miss</button>
    </div>
   </div>
  </div>
 </div>

 <div class="pad z" style="margin-top:16px;padding-bottom:20px">
  <div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-weight:700;font-size:15px">Every call · 9</div><div class="small" style="font-size:14px">Tap a time to watch that shot</div></div>
  <div class="glass" style="margin-top:8px;padding:10px 16px;display:flex;align-items:center;gap:12px;border-radius:18px">
   <span class="cap">#6</span><span class="num" style="font-size:20px;display:flex;align-items:center;gap:6px"><span style="font-size:16px">${ico('play', 'fill')}</span>0:27</span><span style="margin-left:auto;color:var(--rose);font-weight:700;font-size:14px">Miss</span>
  </div>
 </div>
</div>`;
}
