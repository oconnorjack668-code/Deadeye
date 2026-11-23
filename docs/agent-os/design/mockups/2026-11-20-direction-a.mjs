// Direction A: ARENA. Broadcast scoreboard. Condensed italic display type, flat hot colour, chamfered plates, speed stripes.
import { ico, court, LOGO, FOOTAGE, SHOTS, DUR, NOW, clock } from './2026-11-20-direction-common.mjs';

export const styleA = `
:root{--bg:#0B0B0E;--panel:#16161B;--panel2:#1F1F26;--line:#6F6F7C;--hair:#2B2B34;--red:#FF2D4A;--or:#FF6B1A;--or2:#FF9A1F;--amber:#FFC933;
--text:#F7F7F9;--mut:#B8B8C4;--make:#35E08A;--miss:#FF5468;--ink:#0B0B0E}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg)}
body{width:390px;font-family:'Barlow',system-ui,sans-serif;color:var(--text);font-weight:500;-webkit-font-smoothing:antialiased}
.ph{width:1em;height:1em;flex:none;display:block}
.screen{position:relative;width:390px;min-height:844px;overflow:hidden;background:
 linear-gradient(115deg,transparent 0 62%,rgba(255,107,26,.13) 62% 74%,transparent 74% 78%,rgba(255,45,74,.10) 78% 83%,transparent 83%) 0 0/100% 260px no-repeat,var(--bg)}
.pad{padding:0 16px}
.d{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;text-transform:uppercase;letter-spacing:.005em;line-height:.95}
.num{font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;font-variant-numeric:tabular-nums;line-height:.9}
.lbl{font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.09em;font-size:13px;color:var(--mut)}
.cut{clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}
.cut-s{clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
.plate{background:linear-gradient(160deg,#1D1D24,#131318);position:relative}
.plate::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.035) 0 2px,transparent 2px 14px);pointer-events:none}
.bar{position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,var(--or2),var(--red))}
.tag{display:inline-block;transform:skewX(-14deg);padding:3px 12px}
.tag>span{display:block;transform:skewX(14deg)}
.tile{width:34px;height:34px;display:grid;place-items:center;font-size:20px;color:var(--ink);background:linear-gradient(135deg,var(--or2),var(--or));clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;border:0;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;text-transform:uppercase;letter-spacing:.03em;font-size:22px;color:var(--ink);background:linear-gradient(100deg,var(--or2),var(--or) 60%,#FF4A1A);clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)}
.btn .ph{font-size:24px}
.btn2{background:var(--line);color:var(--text);height:48px;font-size:20px;position:relative}
.btn2::after{content:"";position:absolute;inset:2px;background:#16161B;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);z-index:0}
.btn2>*{position:relative;z-index:1}
.nav{position:absolute;left:0;right:0;bottom:0;height:76px;background:#0F0F13;border-top:1px solid var(--hair);display:flex;padding:6px 8px 10px}
.nav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--mut);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;position:relative}
.nav a .ph{font-size:26px}
.nav a.on{color:var(--text)}
.nav a.on .ph{color:var(--or)}
.nav a.on::before{content:"";position:absolute;top:-7px;left:22%;right:22%;height:4px;background:var(--or);transform:skewX(-30deg)}
.fab{position:absolute;right:16px;bottom:92px;width:58px;height:58px;display:grid;place-items:center;color:var(--ink);font-size:30px;background:linear-gradient(135deg,var(--or2),var(--or) 55%,#FF4A1A);clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);filter:drop-shadow(0 4px 0 #000)}
.seg{display:flex;gap:4px}
.seg i{flex:1;height:12px;background:#2A2A33;transform:skewX(-24deg)}
.seg i.f{background:linear-gradient(90deg,var(--or2),var(--or))}
.hex{width:56px;height:62px;display:grid;place-items:center;clip-path:polygon(50% 0,100% 22%,100% 78%,50% 100%,0 78%,0 22%)}
.hex.lock{background:#2A2A33;color:#8C8C99}
.hex.bronze{background:linear-gradient(160deg,#FFC37A,#C8631F 60%,#8B3F10);color:#2A1204}
.small{font-size:14px;line-height:1.4;color:var(--mut)}
`;

const nav = (on = 'Home') => `<nav class="nav" aria-label="Main">
 ${[['Home', 'house'], ['Hoops', 'basketball'], ['Gym', 'barbell'], ['Train', 'lightning'], ['IQ', 'brain']]
   .map(([n, i]) => `<a class="${n === on ? 'on' : ''}">${ico(i, 'fill')}${n}</a>`).join('')}
</nav>`;

export function todayA() {
  return `<div class="screen">
 <header class="pad" style="display:flex;align-items:center;gap:12px;padding-top:20px;padding-bottom:16px">
  <img src="${LOGO}" width="44" height="44" alt="">
  <div style="flex:1">
   <div class="d" style="font-size:32px">Hey Sam</div>
   <div class="lbl" style="color:var(--amber);margin-top:3px">Level 1 · Rookie</div>
  </div>
  <div class="tag" style="background:var(--amber);color:var(--ink)"><span class="lbl" style="color:var(--ink);font-size:15px">0 / 60 XP</span></div>
 </header>

 <section class="pad">
  <div class="plate cut" style="padding:20px 18px 18px 22px;overflow:hidden">
   <span class="bar"></span>
   <div style="position:absolute;right:-30px;top:-14px;width:132px;height:176px;background:linear-gradient(160deg,var(--or2),var(--red));transform:skewX(-14deg);opacity:.95"></div>
   <div style="position:absolute;right:4px;top:16px;font-size:84px;color:var(--ink);opacity:.9">${ico('basketball', 'fill')}</div>
   <div style="position:relative">
    <div class="tag" style="background:var(--or)"><span class="lbl" style="color:var(--ink);font-size:14px">Today</span></div>
    <h1 class="d" style="font-size:42px;margin:12px 0 10px;max-width:215px">Log your first shots</h1>
    <p class="small" style="max-width:215px;margin-bottom:18px">About five minutes. Every shot builds your chart.</p>
   </div>
   <div style="position:relative;display:grid;gap:10px">
    <button class="btn">${ico('pencil-simple', 'fill')}Log shots</button>
    <button class="btn btn2">${ico('camera', 'fill')}<span>Track with camera</span></button>
   </div>
  </div>
 </section>

 <section class="pad" style="margin-top:16px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
   ${[['Makes', '0', 'target'], ['Day streak', '0', 'fire'], ['Accuracy', '--', 'chart-line-up']].map(([l, n, i]) => `
   <div class="plate cut-s" style="padding:12px 12px 12px 16px"><span class="bar" style="width:4px"></span>
    <div class="tile">${ico(i, 'fill')}</div>
    <div class="num" style="font-size:46px;margin-top:10px">${n}</div>
    <div class="lbl" style="margin-top:4px">${l}</div>
   </div>`).join('')}
  </div>
  <p class="small" style="margin-top:10px">Your first session fills these in.</p>
 </section>

 <section class="pad" style="margin-top:14px;padding-bottom:158px">
  <div class="plate cut" style="padding:16px 16px 16px 22px"><span class="bar"></span>
   <div style="display:flex;justify-content:space-between;align-items:baseline">
    <div class="d" style="font-size:26px">Level 1 <span style="color:var(--amber)">Rookie</span></div>
    <div class="lbl">60 XP to Level 2</div>
   </div>
   <div class="seg" style="margin:10px 0 8px">${'<i></i>'.repeat(12)}</div>
   <p class="small" style="margin-bottom:12px">Your first session is worth 20 XP and a badge.</p>
   <div style="display:flex;gap:14px">
    ${[['First Session', 'target'], ['Heating Up', 'fire'], ['First 100', 'basketball']].map(([n, i]) => `
    <div style="flex:1;display:grid;justify-items:center;gap:6px;text-align:center">
     <div class="hex lock" style="font-size:26px">${ico('lock-simple', 'fill')}</div>
     <div class="lbl" style="font-size:13px;letter-spacing:.05em">${n}</div>
    </div>`).join('')}
   </div>
  </div>
 </section>

 <div class="fab" aria-label="Log">${ico('plus', 'bold')}</div>
 ${nav('Home')}
</div>`;
}

export function resultA() {
  const cz = court({ line: '#C9C9D4', rim: '#FF6B1A', zoneA: '#FF9A1F', zoneB: '#FF2D4A', make: '#35E08A', miss: '#FF5468', lineW: 1.8, id: 'a' });
  return `<div class="screen">
 <div style="position:relative;height:318px;background:linear-gradient(120deg,#FF9A1F,#FF5A1A 55%,#FF2D4A);clip-path:polygon(0 0,100% 0,100% 88%,0 100%)">
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(0,0,0,.07) 0 3px,transparent 3px 22px)"></div>
  <div style="position:absolute;right:-30px;top:-40px;font-size:300px;color:#0B0B0E;opacity:.09">${ico('basketball', 'fill')}</div>
  <button aria-label="Close" style="position:absolute;right:12px;top:14px;width:44px;height:44px;border:0;display:grid;place-items:center;font-size:22px;color:var(--text);background:var(--ink);clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)">${ico('x', 'bold')}</button>
  <div style="position:absolute;left:16px;top:20px"><div class="tag" style="background:var(--ink)"><span class="lbl" style="color:var(--text);font-size:15px">First session logged</span></div></div>
  <div class="num" style="position:absolute;left:12px;top:56px;font-size:178px;color:var(--ink);letter-spacing:-.01em">6<span style="color:rgba(11,11,14,.75)">/</span>10</div>
  <div style="position:absolute;left:16px;top:236px;display:flex;align-items:baseline;gap:12px;color:var(--ink)">
   <span class="num" style="font-size:54px">60%</span><span class="d" style="font-size:24px">from Mid top</span>
  </div>
 </div>

 <div class="pad" style="margin-top:-6px;display:flex;gap:8px">
  <div class="tag" style="background:var(--panel2)"><span class="lbl" style="color:var(--text);font-size:16px">Day 1</span></div>
  <div class="tag" style="background:var(--amber)"><span class="lbl" style="color:var(--ink);font-size:16px">+20 XP</span></div>
 </div>

 <div class="pad" style="margin-top:14px;display:grid;grid-template-columns:1.25fr 1fr;gap:8px">
  <div class="plate cut-s" style="padding:12px 10px 10px 14px"><span class="bar" style="width:4px"></span>
   <div class="lbl">Your shot chart</div>
   <div style="margin-top:4px">${cz}</div>
  </div>
  <div class="plate cut-s" style="padding:12px 10px 12px 14px;display:grid;justify-items:center;align-content:space-between;text-align:center"><span class="bar" style="width:4px"></span>
   <div class="lbl">Badge earned</div>
   <div class="hex bronze" style="width:70px;height:78px;font-size:34px;margin:6px 0">${ico('target', 'fill')}</div>
   <div><div class="d" style="font-size:22px">First Session</div><div class="lbl" style="color:var(--amber)">+50 XP · Level 2</div></div>
  </div>
 </div>
 <div class="pad" style="margin-top:8px">
  <div class="plate cut-s" style="padding:10px 14px 12px 18px"><span class="bar" style="width:4px"></span>
   <div style="display:flex;justify-content:space-between;align-items:baseline"><div class="d" style="font-size:22px">Level 2 <span style="color:var(--amber)">reached</span></div><div class="lbl">70 / 140 XP to Level 3</div></div>
   <div class="seg" style="margin-top:8px">${'<i class="f"></i>'.repeat(7)}${'<i></i>'.repeat(5)}</div>
  </div>
 </div>
 <p class="pad small" style="margin-top:12px;padding-bottom:190px">Your shot chart has its first spot. Next time, try a different spot and see how the chart fills in.</p>

 <div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 14px;background:linear-gradient(0deg,#0B0B0E 70%,rgba(11,11,14,0))">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
   <button class="btn" style="height:52px">${ico('arrow-clockwise', 'bold')}Go again</button>
   <button class="btn btn2" style="height:52px"><span>Done for today</span></button>
  </div>
  <div style="display:flex;justify-content:center;align-items:center;gap:8px;height:44px;margin-top:4px;color:var(--text);font-family:'Barlow Condensed';font-weight:700;font-size:18px;letter-spacing:.06em;text-transform:uppercase;text-decoration:underline;text-underline-offset:4px">${ico('export', 'bold')}Share this result</div>
 </div>
</div>`;
}

export function watchA() {
  const W = 326;
  const px = (t) => Math.round((t / DUR) * W);
  const pin = (s) => {
    const cur = s.n === 7;
    const base = s.k === 'make'
      ? 'background:var(--make)'
      : s.k === 'miss' ? 'border:3px solid var(--miss)' : 'background:var(--amber);transform:rotate(45deg);border-radius:2px';
    return `<i style="position:absolute;left:${px(s.t) - 8}px;top:${cur ? 2 : 4}px;width:${cur ? 16 : 14}px;height:${cur ? 16 : 14}px;${s.k !== 'unclear' ? 'border-radius:50%;' : ''}${base};${cur ? 'box-shadow:0 0 0 3px #fff;' : ''}"></i>`;
  };
  return `<div class="screen" style="min-height:900px">
 <div class="pad" style="padding-top:18px;display:flex;justify-content:space-between;align-items:flex-end">
  <div><div class="lbl">Hoops</div><div class="d" style="font-size:38px">Shot tracker</div></div>
  <div class="lbl" style="font-size:15px;padding-bottom:6px">Review</div>
 </div>

 <div class="pad" style="margin-top:12px">
  <div class="plate cut" style="padding:12px 16px 12px 22px;display:flex;align-items:center;gap:16px"><span class="bar"></span>
   <div class="num" style="font-size:66px;color:var(--amber)">5/9</div>
   <div><div class="d" style="font-size:26px">56% made</div><div class="small" style="margin-top:2px">Watch it back to check the calls</div></div>
  </div>
 </div>

 <div class="pad" style="margin-top:12px">
  <div class="plate cut" style="padding-bottom:14px"><span class="bar"></span>
   <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px 10px 22px">
    <div class="lbl" style="color:var(--text)">Watch it back</div>
    <div class="lbl" style="font-size:13px;display:flex;gap:10px;align-items:center;text-transform:none;letter-spacing:.02em;font-size:14px">
     <span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;background:var(--make)"></i>Make</span>
     <span style="display:flex;gap:5px;align-items:center"><i style="width:10px;height:10px;border-radius:50%;border:2.5px solid var(--miss)"></i>Miss</span>
     <span style="display:flex;gap:5px;align-items:center"><i style="width:9px;height:9px;background:var(--amber);transform:rotate(45deg)"></i>Unclear</span>
    </div>
   </div>

   <div style="position:relative;width:358px;height:331px;overflow:hidden;background:#000">
    <img src="${FOOTAGE}" width="358" height="331" alt="Gym footage, ball in the net" style="display:block">
    <!-- tracker overlay, Arena look -->
    <div style="position:absolute;left:0;top:0;width:358px;height:331px;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0) 28%,rgba(0,0,0,0) 70%,rgba(0,0,0,.45))"></div>
    <div style="position:absolute;left:10px;top:10px;background:rgba(11,11,14,.84);padding:6px 14px 8px 18px;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);display:flex;align-items:baseline;gap:10px">
     <i style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,var(--or2),var(--red))"></i>
     <span class="num" style="font-size:44px;color:#fff">4<span style="color:var(--or)">/</span>7</span>
     <span class="num" style="font-size:26px;color:var(--amber)">57%</span>
     <span class="lbl" style="color:#fff;font-size:14px">${clock(NOW)}</span>
    </div>
    <div style="position:absolute;right:10px;top:12px;background:rgba(11,11,14,.84);color:#fff;padding:5px 12px 5px 10px;display:flex;align-items:center;gap:7px;transform:skewX(-14deg)"><i style="width:9px;height:9px;border-radius:50%;background:var(--make);transform:skewX(14deg)"></i><span class="lbl" style="color:#fff;font-size:14px;transform:skewX(14deg)">Ball tracked</span></div>
    <!-- rim marker + trail -->
    <svg style="position:absolute;left:0;top:0" width="358" height="331" viewBox="0 0 358 331" aria-hidden="true">
     <circle cx="127.5" cy="86" r="23" fill="none" stroke="#FF6B1A" stroke-width="3.5"/>
     <circle cx="127.5" cy="86" r="23" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1" transform="scale(1)"/>
     ${[[176, 62, 2.6], [166, 70, 3.2], [156, 76, 3.8], [146, 82, 4.4], [137, 87, 5]].map(([x, y, r], k) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.3 + k * 0.15}"/>`).join('')}
    </svg>
    <div style="position:absolute;left:10px;top:122px;background:var(--make);color:var(--ink);padding:3px 22px 3px 14px;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%);display:flex;align-items:center;gap:6px;filter:drop-shadow(0 3px 0 rgba(0,0,0,.6))">
     <span class="d" style="font-size:40px">Make</span><span style="font-size:26px">${ico('check', 'bold')}</span>
    </div>
    <div style="position:absolute;left:10px;bottom:12px;display:flex;gap:5px">
     ${[1, 0, 1, 1, 0, 0, 1].map((m) => `<i style="width:12px;height:12px;border-radius:50%;${m ? 'background:var(--make)' : 'border:3px solid var(--miss);background:rgba(0,0,0,.4)'}"></i>`).join('')}
    </div>
    <div style="position:absolute;right:10px;bottom:10px;width:44px;height:44px;display:grid;place-items:center;font-size:22px;color:#fff;background:rgba(11,11,14,.84);clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)">${ico('arrows-out', 'bold')}</div>
   </div>

   <div style="padding:6px 16px 0">
    <div style="position:relative;height:30px;margin-top:6px">${SHOTS.map(pin).join('')}</div>
    <div style="position:relative;height:44px;margin-top:-6px">
     <div style="position:absolute;left:0;right:0;top:19px;height:6px;background:#5A5A66"></div>
     <div style="position:absolute;left:0;width:${px(NOW)}px;top:19px;height:6px;background:#fff"></div>
     <div style="position:absolute;left:${px(NOW) - 11}px;top:11px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,107,26,.9)"></div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
     <button class="btn" style="width:52px;height:48px;font-size:26px">${ico('play', 'fill')}</button>
     ${['skip-back', 'skip-forward'].map((i) => `<button class="btn btn2" style="width:44px;height:44px;font-size:20px">${ico(i, 'fill')}</button>`).join('')}
     <div class="num" style="font-size:22px;flex:1;text-align:center;font-style:normal;white-space:nowrap">${clock(NOW)} <span style="color:var(--mut);font-size:17px">/ ${clock(DUR)}</span></div>
     <button class="btn btn2" style="width:52px;height:44px;font-size:20px"><span>1×</span></button>
    </div>
   </div>

   <div style="margin:12px 16px 0;padding-top:12px;border-top:1px solid var(--hair)">
    <div style="display:flex;justify-content:space-between;align-items:center">
     <div><div class="d" style="font-size:24px">Shot 7 <span style="color:var(--mut)">· ${clock(NOW)}</span></div><div class="small">Tracker said Make. Tap to change.</div></div>
     <div class="lbl" style="display:flex;gap:6px;align-items:center;color:var(--text);font-size:15px;height:44px">${ico('trash', 'bold')}Not a shot</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
     <button class="btn" style="height:52px;background:var(--make);font-size:24px">${ico('check', 'bold')}Make</button>
     <button class="btn btn2" style="height:52px;font-size:24px;background:var(--miss);color:var(--miss)"><span style="display:flex;gap:8px;align-items:center">${ico('x', 'bold')}Miss</span></button>
    </div>
   </div>
  </div>
 </div>

 <div class="pad" style="margin-top:16px;padding-bottom:20px">
  <div style="display:flex;justify-content:space-between"><div class="lbl" style="color:var(--text)">Every call · 9</div><div class="small" style="font-size:14px">Tap a time to watch that shot</div></div>
  <div class="plate cut-s" style="margin-top:8px;padding:10px 14px 10px 18px;display:flex;align-items:center;gap:12px"><span class="bar" style="width:4px;background:var(--miss)"></span>
   <span class="lbl">#6</span><span class="num" style="font-style:normal;font-size:22px;display:flex;align-items:center;gap:6px">${ico('play', 'fill')}0:27</span><span class="lbl" style="margin-left:auto;color:var(--miss);font-size:16px">Miss</span>
  </div>
 </div>
</div>`;
}
