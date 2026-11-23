// Direction B: HUD. The Deadeye viewfinder (the brackets and reticle in the logo) turned into the interface.
// Squared techy display type, cyan line work, glow, gauge rings, mono data labels, one orange for the next action.
import { ico, court, LOGO, FOOTAGE, SHOTS, DUR, NOW, clock } from './2026-11-20-direction-common.mjs';

export const styleB = `
:root{--bg:#05070D;--s1:#0B1220;--s2:#101A2E;--cy:#5CE1FF;--cyline:rgba(92,225,255,.34);--cydim:rgba(92,225,255,.14);--or:#FF6A1F;--or2:#FFA21F;
--mint:#3DF5A0;--coral:#FF6377;--amber:#FFC24B;--text:#EAF4FF;--mut:#A3B6CC;--ink:#05070D}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg)}
body{width:390px;font-family:'Geist',system-ui,sans-serif;color:var(--text);-webkit-font-smoothing:antialiased}
.ph{width:1em;height:1em;flex:none;display:block}
.screen{position:relative;width:390px;min-height:844px;overflow:hidden;background:
 radial-gradient(420px 300px at 90% -4%,rgba(92,225,255,.17),transparent 70%),
 radial-gradient(380px 300px at -10% 40%,rgba(255,106,31,.10),transparent 70%),
 radial-gradient(rgba(92,225,255,.16) 1px,transparent 1.4px) 0 0/22px 22px,var(--bg)}
.pad{padding:0 16px}
.disp{font-family:'Chakra Petch',sans-serif;font-weight:700;letter-spacing:-.005em;line-height:1}
.num{font-family:'Chakra Petch',sans-serif;font-weight:700;font-variant-numeric:tabular-nums;line-height:.95}
.mono{font-family:'Geist Mono',monospace;font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:12px;color:var(--mut)}
.small{font-size:14px;line-height:1.45;color:var(--mut)}
.card{position:relative;background:linear-gradient(180deg,rgba(18,30,52,.82),rgba(9,15,28,.86));border:1px solid var(--cyline);border-radius:6px;box-shadow:0 0 24px rgba(92,225,255,.07),inset 0 1px 0 rgba(255,255,255,.06)}
.brk::after{content:"";position:absolute;inset:-1px;pointer-events:none;background:
 linear-gradient(var(--cy),var(--cy)) top left/14px 2px no-repeat,linear-gradient(var(--cy),var(--cy)) top left/2px 14px no-repeat,
 linear-gradient(var(--cy),var(--cy)) top right/14px 2px no-repeat,linear-gradient(var(--cy),var(--cy)) top right/2px 14px no-repeat,
 linear-gradient(var(--cy),var(--cy)) bottom left/14px 2px no-repeat,linear-gradient(var(--cy),var(--cy)) bottom left/2px 14px no-repeat,
 linear-gradient(var(--cy),var(--cy)) bottom right/14px 2px no-repeat,linear-gradient(var(--cy),var(--cy)) bottom right/2px 14px no-repeat;filter:drop-shadow(0 0 4px rgba(92,225,255,.7))}
.icn{width:38px;height:38px;border-radius:8px;display:grid;place-items:center;font-size:22px;color:var(--cy);background:var(--cydim);border:1px solid var(--cyline);filter:drop-shadow(0 0 6px rgba(92,225,255,.45))}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;border:0;border-radius:10px;font-family:'Chakra Petch',sans-serif;font-weight:700;font-size:19px;color:var(--ink);background:linear-gradient(100deg,var(--or2),var(--or));box-shadow:0 0 26px rgba(255,106,31,.5),inset 0 1px 0 rgba(255,255,255,.4)}
.btn .ph{font-size:22px}
.btn2{background:rgba(92,225,255,.06);color:var(--text);border:1px solid rgba(92,225,255,.7);box-shadow:0 0 16px rgba(92,225,255,.15);height:48px}
.nav{position:absolute;left:0;right:0;bottom:0;height:78px;background:linear-gradient(180deg,rgba(8,13,24,.9),#060A14);border-top:1px solid var(--cyline);display:flex;padding:6px 8px 12px;backdrop-filter:blur(8px)}
.nav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:var(--mut);font-family:'Geist Mono',monospace;font-weight:600;font-size:12px;letter-spacing:.06em;text-transform:uppercase;position:relative}
.nav a .ph{font-size:24px}
.nav a.on{color:var(--text)}
.nav a.on .ph{color:var(--cy);filter:drop-shadow(0 0 7px rgba(92,225,255,.9))}
.nav a.on::before{content:"";position:absolute;top:-7px;left:26%;right:26%;height:2px;background:var(--cy);box-shadow:0 0 10px var(--cy)}
.fab{position:absolute;right:16px;bottom:94px;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;color:var(--ink);font-size:28px;background:linear-gradient(135deg,var(--or2),var(--or));box-shadow:0 0 0 1px rgba(255,255,255,.3) inset,0 0 30px rgba(255,106,31,.65)}
.ticks{display:flex;gap:3px}.ticks i{flex:1;height:10px;background:rgba(92,225,255,.14);border-radius:1px}
.ticks i.f{background:linear-gradient(180deg,var(--cy),#2FA8D6);box-shadow:0 0 8px rgba(92,225,255,.6)}
.hexo{width:54px;height:60px;display:grid;place-items:center;font-size:24px;position:relative}
.hexo svg.h{position:absolute;inset:0}
.hexo .ph{position:relative}
`;

const HEX = (stroke, fill = 'none', w = 2, dash = '', glow = '') => `<svg class="h" viewBox="0 0 54 60" aria-hidden="true"><path d="M27 2 L51 16 V44 L27 58 L3 44 V16 Z" fill="${fill}" stroke="${stroke}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} ${glow ? `style="filter:drop-shadow(0 0 6px ${glow})"` : ''}/></svg>`;

const bgCourt = `<svg style="position:absolute;left:-70px;bottom:-60px;opacity:.09" width="520" height="470" viewBox="0 0 220 200" aria-hidden="true"><g fill="none" stroke="#5CE1FF" stroke-width="1.4"><rect x="75" y="106" width="70" height="84"/><path d="M84 106 A26 26 0 0 1 136 106"/><path d="M13 190 V128 A104.5 104.5 0 0 1 207 128 V190"/><circle cx="110" cy="167" r="6"/></g></svg>`;

const nav = (on = 'Home') => `<nav class="nav" aria-label="Main">
 ${[['Home', 'house'], ['Hoops', 'basketball'], ['Gym', 'barbell'], ['Train', 'lightning'], ['IQ', 'brain']]
   .map(([n, i]) => `<a class="${n === on ? 'on' : ''}">${ico(i, 'bold')}${n}</a>`).join('')}
</nav>`;

export function todayB() {
  return `<div class="screen">
 ${bgCourt}
 <header class="pad" style="position:relative;display:flex;align-items:center;gap:12px;padding-top:20px;padding-bottom:16px">
  <img src="${LOGO}" width="44" height="44" alt="" style="filter:drop-shadow(0 0 10px rgba(255,60,80,.55))">
  <div style="flex:1"><div class="disp" style="font-size:28px">Hey Sam</div><div class="mono" style="color:var(--cy);margin-top:5px">Lvl 01 · Rookie</div></div>
  <div class="card" style="padding:7px 12px"><span class="mono" style="color:var(--text)">0 / 60 XP</span></div>
 </header>

 <section class="pad" style="position:relative">
  <div class="card brk" style="padding:20px 18px 18px;overflow:hidden">
   <svg style="position:absolute;right:-6px;top:6px" width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
    <circle cx="75" cy="75" r="62" fill="none" stroke="#5CE1FF" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="2 6"/>
    <circle cx="75" cy="75" r="44" fill="none" stroke="#5CE1FF" stroke-opacity=".8" stroke-width="1.5"/>
    <path d="M75 4 V30 M75 120 V146 M4 75 H30 M120 75 H146" stroke="#5CE1FF" stroke-width="2"/>
    <circle cx="75" cy="75" r="30" fill="#FF6A1F" fill-opacity=".14"/>
   </svg>
   <div style="position:absolute;right:42px;top:42px;font-size:66px;color:var(--or);filter:drop-shadow(0 0 14px rgba(255,106,31,.7))">${ico('basketball', 'duotone')}</div>
   <div class="mono" style="color:var(--cy);position:relative">[ Today ]</div>
   <h1 class="disp" style="font-size:34px;line-height:1.02;margin:10px 0 10px;max-width:190px;position:relative">Log your first shots</h1>
   <p class="small" style="max-width:200px;margin-bottom:18px;position:relative">About five minutes. Every shot builds your chart.</p>
   <div style="display:grid;gap:10px;position:relative">
    <button class="btn">${ico('pencil-simple', 'bold')}Log shots</button>
    <button class="btn btn2">${ico('camera', 'bold')}Track with camera</button>
   </div>
  </div>
 </section>

 <section class="pad" style="margin-top:16px;position:relative">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
   ${[['Makes', '0', 'target'], ['Day streak', '0', 'fire'], ['Accuracy', '--', 'chart-line-up']].map(([l, n, i]) => `
   <div class="card brk" style="padding:12px 12px 12px">
    <div class="icn">${ico(i, 'bold')}</div>
    <div class="num" style="font-size:42px;margin-top:10px">${n}</div>
    <div class="mono" style="margin-top:6px;font-size:12px;letter-spacing:.06em">${l}</div>
   </div>`).join('')}
  </div>
  <p class="small" style="margin-top:10px">Your first session fills these in.</p>
 </section>

 <section class="pad" style="margin-top:14px;padding-bottom:160px;position:relative">
  <div class="card brk" style="padding:16px">
   <div style="display:flex;justify-content:space-between;align-items:baseline">
    <div class="disp" style="font-size:22px">Level 1 <span style="color:var(--cy)">Rookie</span></div>
    <div class="mono" style="font-size:12px">60 XP to Level 2</div>
   </div>
   <div class="ticks" style="margin:10px 0 8px">${'<i></i>'.repeat(20)}</div>
   <p class="small" style="margin-bottom:12px">Your first session is worth 20 XP and a badge.</p>
   <div style="display:flex">
    ${[['First Session', 'target'], ['Heating Up', 'fire'], ['First 100', 'basketball']].map(([n, i]) => `
    <div style="flex:1;display:grid;justify-items:center;gap:6px;text-align:center">
     <div class="hexo" style="color:#8197B0">${HEX('rgba(92,225,255,.45)', 'rgba(92,225,255,.05)', 1.5, '3 3')}${ico('lock-simple', 'bold')}</div>
     <div class="mono" style="font-size:12px;letter-spacing:.03em;text-transform:none;font-family:'Geist';font-weight:600">${n}</div>
    </div>`).join('')}
   </div>
  </div>
 </section>
 <div class="fab" aria-label="Log">${ico('plus', 'bold')}</div>
 ${nav('Home')}
</div>`;
}

export function resultB() {
  const cz = court({ line: '#7FA6C4', rim: '#FF6A1F', zoneA: '#FF8A2B', zoneB: '#FF6A1F', make: '#3DF5A0', miss: '#FF6377', lineW: 1.5, frameOp: 0.45, id: 'b' });
  const C = 2 * Math.PI * 112;
  return `<div class="screen">
 ${bgCourt}
 <div class="pad" style="position:relative;display:flex;justify-content:space-between;align-items:center;padding-top:18px">
  <div class="mono" style="color:var(--mint);display:flex;align-items:center;gap:8px;font-size:12px"><span style="font-size:18px;filter:drop-shadow(0 0 6px #3DF5A0)">${ico('check', 'bold')}</span>First session logged</div>
  <button aria-label="Close" style="width:44px;height:44px;border-radius:10px;border:1px solid var(--cyline);background:rgba(92,225,255,.06);color:var(--text);display:grid;place-items:center;font-size:20px">${ico('x', 'bold')}</button>
 </div>

 <div style="position:relative;height:300px;display:grid;place-items:center;margin-top:-6px">
  <svg width="300" height="300" viewBox="0 0 300 300" style="position:absolute" aria-hidden="true">
   <defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5CE1FF"/><stop offset="1" stop-color="#3DF5A0"/></linearGradient>
   <filter id="gl"><feGaussianBlur stdDeviation="4"/></filter></defs>
   <circle cx="150" cy="150" r="136" fill="none" stroke="#5CE1FF" stroke-opacity=".45" stroke-width="6" stroke-dasharray="1.5 7.2"/>
   <circle cx="150" cy="150" r="112" fill="none" stroke="#5CE1FF" stroke-opacity=".16" stroke-width="12"/>
   <g transform="rotate(-90 150 150)">
    <circle cx="150" cy="150" r="112" fill="none" stroke="url(#gb)" stroke-width="12" stroke-linecap="butt" stroke-dasharray="${(C * 0.6).toFixed(1)} ${C.toFixed(1)}" filter="url(#gl)" opacity=".7"/>
    <circle cx="150" cy="150" r="112" fill="none" stroke="url(#gb)" stroke-width="12" stroke-dasharray="${(C * 0.6).toFixed(1)} ${C.toFixed(1)}"/>
   </g>
   <circle cx="150" cy="150" r="88" fill="rgba(92,225,255,.05)" stroke="#5CE1FF" stroke-opacity=".25"/>
  </svg>
  <div style="position:relative;text-align:center">
   <div class="num" style="font-size:82px;letter-spacing:-.03em;text-shadow:0 0 28px rgba(92,225,255,.45)">6<span style="color:var(--cy)">/</span>10</div>
   <div class="num" style="font-size:30px;color:var(--mint);margin-top:6px">60%</div>
   <div class="mono" style="margin-top:6px;color:var(--text)">from Mid top</div>
  </div>
 </div>

 <div class="pad" style="position:relative;display:flex;justify-content:center;gap:10px;margin-top:2px">
  <div class="card" style="padding:7px 14px;display:flex;gap:7px;align-items:center"><span style="font-size:18px;color:var(--or)">${ico('fire', 'fill')}</span><span class="mono" style="color:var(--text);font-size:12px">Day 1</span></div>
  <div class="card" style="padding:7px 14px;display:flex;gap:7px;align-items:center"><span style="font-size:18px;color:var(--amber)">${ico('lightning', 'fill')}</span><span class="mono" style="color:var(--text);font-size:12px">+20 XP</span></div>
 </div>

 <div class="pad" style="position:relative;margin-top:14px;display:grid;grid-template-columns:1.25fr 1fr;gap:8px">
  <div class="card brk" style="padding:12px 10px 8px"><div class="mono" style="font-size:12px;padding-left:2px">Shot chart</div><div style="margin-top:2px">${cz}</div></div>
  <div class="card brk" style="padding:12px 8px;display:grid;justify-items:center;align-content:space-between;text-align:center">
   <div class="mono" style="font-size:12px">Badge earned</div>
   <div class="hexo" style="width:76px;height:84px;font-size:34px;color:#FFB36B;margin:4px 0">${HEX('#FFB36B', 'rgba(255,140,60,.16)', 2.5, '', 'rgba(255,140,60,.9)')}${ico('target', 'duotone')}</div>
   <div><div class="disp" style="font-size:18px">First Session</div><div class="mono" style="color:var(--amber);font-size:12px;letter-spacing:.04em;margin-top:4px">+50 XP</div></div>
  </div>
 </div>

 <div class="pad" style="position:relative;margin-top:8px">
  <div class="card" style="padding:10px 14px 12px">
   <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="disp" style="font-size:19px">Level 2 <span style="color:var(--mint)">reached</span></div><div class="mono" style="font-size:12px;letter-spacing:.05em">70 / 140 XP</div></div>
   <div class="ticks" style="margin-top:8px">${'<i class="f"></i>'.repeat(10)}${'<i></i>'.repeat(10)}</div>
  </div>
 </div>
 <p class="pad small" style="position:relative;margin-top:12px;padding-bottom:178px">Your shot chart has its first spot. Next time, try a different spot and see how the chart fills in.</p>

 <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 16px 12px;background:linear-gradient(0deg,#05070D 72%,rgba(5,7,13,0))">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
   <button class="btn">${ico('arrow-clockwise', 'bold')}Go again</button>
   <button class="btn btn2" style="height:52px">Done for today</button>
  </div>
  <div style="display:flex;justify-content:center;align-items:center;gap:8px;height:44px;margin-top:4px;color:var(--cy);font-family:'Chakra Petch';font-weight:600;font-size:16px;text-decoration:underline;text-underline-offset:4px">${ico('export', 'bold')}Share this result</div>
 </div>
</div>`;
}

export function watchB() {
  const W = 326;
  const px = (t) => Math.round((t / DUR) * W);
  const pin = (s) => {
    const cur = s.n === 7;
    const sty = s.k === 'make'
      ? 'background:var(--mint);box-shadow:0 0 8px var(--mint)'
      : s.k === 'miss' ? 'border:3px solid var(--coral)' : 'background:var(--amber);transform:rotate(45deg);border-radius:2px;box-shadow:0 0 8px var(--amber)';
    return `<i style="position:absolute;left:${px(s.t) - 8}px;top:${cur ? 2 : 4}px;width:${cur ? 16 : 14}px;height:${cur ? 16 : 14}px;${s.k !== 'unclear' ? 'border-radius:50%;' : ''}${sty};${cur ? 'outline:3px solid #fff;outline-offset:1px;' : ''}"></i>`;
  };
  const plate = 'background:rgba(5,7,13,.84);border:1px solid rgba(92,225,255,.65)';
  return `<div class="screen" style="min-height:900px">
 ${bgCourt}
 <div class="pad" style="position:relative;padding-top:18px;display:flex;justify-content:space-between;align-items:flex-end">
  <div><div class="mono" style="color:var(--cy)">Hoops</div><div class="disp" style="font-size:32px;margin-top:6px">Shot tracker</div></div>
  <div class="mono" style="padding-bottom:6px;color:var(--text)">Review</div>
 </div>

 <div class="pad" style="position:relative;margin-top:12px">
  <div class="card brk" style="padding:12px 16px;display:flex;align-items:center;gap:16px">
   <div class="num" style="font-size:56px;color:var(--text);text-shadow:0 0 22px rgba(92,225,255,.4)">5<span style="color:var(--cy)">/</span>9</div>
   <div><div class="disp" style="font-size:22px;color:var(--mint)">56% made</div><div class="small" style="margin-top:3px">Watch it back to check the calls</div></div>
  </div>
 </div>

 <div class="pad" style="position:relative;margin-top:12px">
  <div class="card brk" style="padding-bottom:14px">
   <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px 10px">
    <div class="mono" style="color:var(--text)">Watch it back</div>
    <div style="display:flex;gap:10px;align-items:center;font-size:14px;color:var(--mut)">
     <span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;background:var(--mint)"></i>Make</span>
     <span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;border:2.5px solid var(--coral)"></i>Miss</span>
     <span style="display:flex;gap:5px;align-items:center"><i style="width:9px;height:9px;background:var(--amber);transform:rotate(45deg)"></i>Unclear</span>
    </div>
   </div>

   <div style="position:relative;width:356px;margin:0 auto;height:331px;overflow:hidden;background:#000;border-top:1px solid var(--cyline);border-bottom:1px solid var(--cyline)">
    <img src="${FOOTAGE}" width="358" height="331" alt="Gym footage, ball in the net" style="display:block;margin-left:-1px">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,6,14,.4),rgba(0,0,0,0) 28%,rgba(0,0,0,0) 70%,rgba(2,6,14,.5))"></div>
    <!-- tracker overlay, HUD look -->
    <div style="position:absolute;left:10px;top:10px;${plate};padding:4px 12px 6px;display:flex;align-items:baseline;gap:10px;border-radius:3px">
     <span class="num" style="font-size:38px;color:#fff">4<span style="color:var(--cy)">/</span>7</span>
     <span class="num" style="font-size:22px;color:var(--cy)">57%</span>
     <span class="mono" style="font-size:12px;color:#fff;letter-spacing:.06em">${clock(NOW)}</span>
    </div>
    <div style="position:absolute;right:10px;top:12px;${plate};padding:6px 10px;display:flex;align-items:center;gap:7px;border-radius:3px"><i style="width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 8px var(--mint)"></i><span class="mono" style="font-size:12px;color:#fff;letter-spacing:.06em">Ball tracked</span></div>
    <svg style="position:absolute;left:0;top:0" width="356" height="331" viewBox="0 0 356 331" aria-hidden="true">
     <path d="M182 56 C 164 62, 146 70, 133 83" fill="none" stroke="#5CE1FF" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>
     <g stroke="#3DF5A0" stroke-width="3" fill="none" stroke-linecap="square" style="filter:drop-shadow(0 0 5px #3DF5A0)">
      <path d="M97 62 H110 M97 62 V75"/><path d="M158 62 H145 M158 62 V75"/><path d="M97 111 H110 M97 111 V98"/><path d="M158 111 H145 M158 111 V98"/>
     </g>
     <circle cx="127" cy="86" r="21" fill="none" stroke="#3DF5A0" stroke-width="1.5" stroke-dasharray="3 4" opacity=".9"/>
     <path d="M127 117 V132 M127 132 H96" fill="none" stroke="#3DF5A0" stroke-width="1.5"/>
    </svg>
    <div style="position:absolute;left:10px;top:132px;${plate};border-color:rgba(61,245,160,.8);padding:5px 14px 6px 12px;border-radius:3px;display:flex;align-items:center;gap:8px;box-shadow:0 0 18px rgba(61,245,160,.35)">
     <span class="disp" style="font-size:34px;color:var(--mint);text-shadow:0 0 14px rgba(61,245,160,.6)">MAKE</span><span style="font-size:24px;color:var(--mint)">${ico('check', 'bold')}</span>
    </div>
    <div style="position:absolute;left:10px;bottom:12px;display:flex;gap:5px">
     ${[1, 0, 1, 1, 0, 0, 1].map((m) => `<i style="width:12px;height:12px;border-radius:50%;${m ? 'background:var(--mint);box-shadow:0 0 6px var(--mint)' : 'border:3px solid var(--coral);background:rgba(0,0,0,.4)'}"></i>`).join('')}
    </div>
    <div style="position:absolute;right:10px;bottom:10px;width:44px;height:44px;display:grid;place-items:center;font-size:22px;color:#fff;${plate};border-radius:8px">${ico('arrows-out', 'bold')}</div>
   </div>

   <div style="padding:6px 16px 0">
    <div style="position:relative;height:30px;margin-top:6px">${SHOTS.map(pin).join('')}</div>
    <div style="position:relative;height:44px;margin-top:-6px">
     <div style="position:absolute;left:0;right:0;top:20px;height:4px;background:#5C6E86;border-radius:2px"></div>
     <div style="position:absolute;left:0;width:${px(NOW)}px;top:19px;height:6px;background:linear-gradient(90deg,var(--cy),#fff);border-radius:3px;box-shadow:0 0 10px rgba(92,225,255,.7)"></div>
     <div style="position:absolute;left:${px(NOW) - 11}px;top:11px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(92,225,255,.7),0 0 14px var(--cy)"></div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
     <button class="btn" style="width:52px;height:48px;border-radius:10px;font-size:24px">${ico('play', 'fill')}</button>
     ${['skip-back', 'skip-forward'].map((i) => `<button class="btn btn2" style="width:44px;height:44px;border-radius:10px;font-size:20px">${ico(i, 'fill')}</button>`).join('')}
     <div class="num" style="font-size:20px;flex:1;text-align:center;white-space:nowrap">${clock(NOW)} <span style="color:var(--mut);font-size:15px">/ ${clock(DUR)}</span></div>
     <button class="btn btn2" style="width:48px;height:44px;font-size:16px;border-radius:10px">1×</button>
    </div>
   </div>

   <div style="margin:12px 16px 0;padding-top:12px;border-top:1px solid var(--cyline)">
    <div style="display:flex;justify-content:space-between;align-items:center">
     <div><div class="disp" style="font-size:21px">Shot 7 <span style="color:var(--mut);font-weight:600">· ${clock(NOW)}</span></div><div class="small" style="font-size:14px">Tracker said Make. Tap to change.</div></div>
     <div class="mono" style="display:flex;gap:6px;align-items:center;color:var(--text);height:44px;letter-spacing:.04em"><span style="font-size:17px">${ico('trash', 'bold')}</span>Not a shot</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
     <button class="btn" style="height:52px;background:linear-gradient(100deg,#7BFFC4,var(--mint));box-shadow:0 0 22px rgba(61,245,160,.4),inset 0 1px 0 rgba(255,255,255,.5)">${ico('check', 'bold')}Make</button>
     <button class="btn btn2" style="height:52px;border-color:var(--coral);box-shadow:0 0 16px rgba(255,99,119,.2);color:#FFB3BC">${ico('x', 'bold')}Miss</button>
    </div>
   </div>
  </div>
 </div>

 <div class="pad" style="position:relative;margin-top:16px;padding-bottom:20px">
  <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="mono" style="color:var(--text)">Every call · 9</div><div class="small" style="font-size:14px">Tap a time to watch that shot</div></div>
  <div class="card" style="margin-top:8px;padding:10px 14px;display:flex;align-items:center;gap:12px">
   <span class="mono">#6</span><span class="num" style="font-size:20px;display:flex;align-items:center;gap:6px"><span style="font-size:16px">${ico('play', 'fill')}</span>0:27</span><span class="mono" style="margin-left:auto;color:var(--coral)">Miss</span>
  </div>
 </div>
</div>`;
}
