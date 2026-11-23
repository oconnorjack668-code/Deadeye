// Opening B, "Swish": a ball arcs in, slows at the rim, swishes through a net that moves, and lands as the logo ball.
// Two finishes: B1 the ball settles and the brackets lock on; B2 the hoop becomes the mark (the backboard's red target square
// is the logo's brackets, which fly down and lock on). The ball IS the logo ball, so there is no crossfade.
// The hoop is drawn small and far (rim 168 px, ball 103 px); the ball grows as it falls toward the camera.
// Used by 2026-11-22-loading-build-open.mjs. The net is the only non-transform animation: a small SVG path morph (SMIL).

export function makeSwish({ D, CY, S, html, brackets, P, f1 }) {
  const NX = 195, RIM_Y = 118, RIM_RX = 84, RIM_RY = 11, J = 7, DY = 15, NCOL = 7;
  const BS = 0.62; // ball scale at the hoop
  const KEYS = [[100, -110, 0.62], [520, RIM_Y, 0.38], [980, 285, 0.3], [1280, CY, 0]];
  const ballY = (t) => {
    if (t <= KEYS[0][0]) return KEYS[0][1];
    if (t >= 1280) return CY;
    let i = 0;
    while (t > KEYS[i + 1][0]) i++;
    const [t0, y0, v0] = KEYS[i], [t1, y1, v1] = KEYS[i + 1];
    const h = t1 - t0, u = (t - t0) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    return h00 * y0 + h10 * h * v0 + h01 * y1 + h11 * h * v1;
  };
  const ballX = (t) => (t >= 520 ? 0 : t <= 100 ? -62 : -62 * (1 - (t - 100) / 420) ** 2);
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const ballS = (t) => BS + (1 - BS) * ease((t - 980) / 300);
  const timeAt = (y) => { for (let t = 0; t <= 1300; t += 2) if (ballY(t) >= y) return t; return 1300; };
  const hw = (j) => 84 - 38 * (j / J) ** 0.9;

  const nodes = (t) => {
    const grid = [];
    const yb = ballY(t), BR = (D / 2) * ballS(t);
    for (let j = 0; j <= J; j++) {
      const row = [];
      const cnt = j % 2 === 0 ? NCOL : NCOL - 1;
      const rowY = RIM_Y + RIM_RY + j * DY;
      const tau = t - timeAt(rowY);
      const w = j / J;
      const ripple = tau > 0 ? Math.exp(-tau / 170) * Math.cos((2 * Math.PI * tau) / 320) : 0;
      const kick = tau > 0 ? -7 * Math.exp(-tau / 190) * Math.sin((2 * Math.PI * tau) / 320) * w : 0;
      const stretch = 8 * w * Math.exp(-(((tau + 60) / 95) ** 2));
      let k = 1;
      if (j > 0) {
        const dyb = rowY - yb;
        if (Math.abs(dyb) < BR + 8) {
          const b = (Math.sqrt(Math.max(0, BR * BR - Math.min(dyb * dyb, BR * BR))) + 5) / hw(j);
          k = (1 + b + Math.sqrt((1 - b) ** 2 + 0.02)) / 2;
        }
      }
      for (let i = 0; i < cnt; i++) {
        const u = j % 2 === 0 ? -1 + (2 * i) / (NCOL - 1) : -1 + (2 * i + 1) / (NCOL - 1);
        const x = u * hw(j) * k * (1 + ripple * 0.12 * (0.35 + 0.65 * w));
        const y = (j === 0 ? RIM_Y + RIM_RY * Math.sqrt(Math.max(0, 1 - u * u)) : rowY) + kick + stretch;
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
        const targets = j % 2 === 0 ? [i - 1, i] : [i, i + 1];
        targets.forEach((k) => { if (k >= 0 && k < b.length) d += `M${f1(x)} ${f1(y)}L${f1(b[k][0])} ${f1(b[k][1])}`; });
      });
    }
    d += 'M' + g[J].map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L');
    return d;
  };
  const STEP = 24, TMAX = 1800;
  const samples = [];
  for (let t = 0; t <= TMAX; t += STEP) samples.push(netD(t));
  const netAnim = `<animate attributeName="d" dur="${TMAX / 1000}s" begin="0s" fill="freeze" calcMode="linear" values="${samples.join(';')}"/>`;
  const netSvg = (inner) => `<svg viewBox="${NX - 110} 0 220 260" width="220" height="260" aria-hidden="true">${inner}</svg>`;
  const rimBack = `<path d="M${NX - RIM_RX} ${RIM_Y} A${RIM_RX} ${RIM_RY} 0 0 1 ${NX + RIM_RX} ${RIM_Y}" fill="none" stroke="#7d0d18" stroke-width="5" stroke-linecap="round"/>`;
  const rimFront = `<defs><linearGradient id="rmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5361"/><stop offset="1" stop-color="#e01a2d"/></linearGradient></defs><path d="M${NX - RIM_RX} ${RIM_Y} A${RIM_RX} ${RIM_RY} 0 0 0 ${NX + RIM_RX} ${RIM_Y}" fill="none" stroke="url(#rmg)" stroke-width="6" stroke-linecap="round"/><path d="M${NX - RIM_RX + 10} ${RIM_Y + 2.2} A${RIM_RX - 10} ${RIM_RY - 3} 0 0 0 ${NX + RIM_RX - 10} ${RIM_Y + 2.2}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>`;
  const netG = `<defs><linearGradient id="ntg" gradientUnits="userSpaceOnUse" x1="0" y1="${RIM_Y}" x2="0" y2="${RIM_Y + 125}"><stop offset="0" stop-color="#f4f4f5" stop-opacity=".92"/><stop offset="1" stop-color="#f4f4f5" stop-opacity=".5"/></linearGradient></defs>`;
  const cornerPath = (sx, sy, cxq, cyq, half, arm, th) => {
    const ox = cxq + sx * half, oy = cyq + sy * half, dx = -sx, dy = -sy;
    const p = [[0, 0], [arm, 0], [arm, th], [th, th], [th, arm], [0, arm]].map(([x, y]) => `${f1(ox + dx * x)} ${f1(oy + dy * y)}`);
    return `<path d="M${p.join('L')}Z" fill="#ff2436"/>`;
  };
  // Black glossy backboard, a red base edge and a red target square (B1 draws it here; in B2 the logo's brackets are the square).
  const boardSvg = (withSquare) => `<svg viewBox="0 0 390 140" width="390" height="140" aria-hidden="true"><defs>
<linearGradient id="bdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1f25"/><stop offset="1" stop-color="#0a0a0d"/></linearGradient>
<linearGradient id="bdl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".075"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="bdr" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#ff2436" stop-opacity=".16"/><stop offset="1" stop-color="#ff2436" stop-opacity="0"/></radialGradient>
<clipPath id="bdc"><rect x="83" y="14" width="224" height="84" rx="10"/></clipPath></defs>
<ellipse cx="195" cy="70" rx="190" ry="70" fill="url(#bdr)"/>
<rect x="83" y="14" width="224" height="84" rx="10" fill="url(#bdg)" stroke="#34343b" stroke-width="1.5"/>
<g clip-path="url(#bdc)"><polygon points="60,0 150,0 110,120 20,120" fill="url(#bdl)"/><polygon points="190,0 215,0 175,120 150,120" fill="url(#bdl)" opacity=".6"/><rect x="83" y="95.5" width="224" height="2.5" fill="#ff2436" opacity=".85"/></g>
<path d="M93 15.2H297" stroke="#fff" stroke-opacity=".16"/>
${withSquare ? [-1, 1].flatMap((sx) => [-1, 1].map((sy) => cornerPath(sx, sy, 195, 56, 28, 11, 3))).join('') : ''}
<path d="M176 98h38v7q0 3-3 3h-32q-3 0-3-3z" fill="#101013" stroke="#ff2436" stroke-opacity=".6"/></svg>`;

  const END_DROP = 1300;
  const dropKf = (() => {
    let k = '@keyframes drop{';
    for (let t = 0; t <= END_DROP; t += 16) k += `${f1((t / END_DROP) * 100)}%{transform:translate(${f1(ballX(t))}px,${f1(ballY(t) - CY)}px) scale(${ballS(t).toFixed(3)})}`;
    return k + '100%{transform:translate(0,0) scale(1)}}';
  })();
  const FX_END = 1700;
  const fxKf = (() => {
    let k = '@keyframes ballfx{';
    for (let t = 0; t <= FX_END; t += 20) {
      const q = t - END_DROP;
      const sq = q > 0 ? Math.exp(-q / 120) * Math.cos((2 * Math.PI * q) / 300) : 0; // landing squash that settles
      k += `${f1((t / FX_END) * 100)}%{transform:scale(${(1 + 0.05 * sq).toFixed(3)},${(1 - 0.06 * sq).toFixed(3)})}`;
    }
    return k + '100%{transform:none}}';
  })();
  // Backspin: about 0.83 of a turn over the whole flight, eased out so it slows through the net and comes to rest exactly upright
  // at the landing. Only the seams, bars and dark disc turn; the face lighting and highlight are separate fixed layers.
  const SPIN = -300;
  const spinKf = (() => {
    let k = '@keyframes spin{';
    for (let t = 0; t <= END_DROP; t += 16) {
      const u = Math.min(1, Math.max(0, (t - 100) / (END_DROP - 100 - 20)));
      const p = 1 - (1 - u) ** 1.8;
      k += `${f1((t / END_DROP) * 100)}%{transform:rotate(${f1(SPIN * (1 - p))}deg)}`;
    }
    return k + '100%{transform:rotate(0deg)}}';
  })();
  const swishCss = (opt) => {
    const total = opt === 1 ? 1800 : 1700;
    const hold = opt === 1 ? 62 : 57;
    const gone = opt === 1 ? 80 : 74;
    const finish =
      opt === 1
        ? `.play .bk{animation:bkclose 420ms linear 1200ms backwards,fade 140ms linear 1200ms backwards}
.play .ping{animation:ping 560ms var(--ease) 1560ms forwards}
.play .word{animation:rise 380ms var(--ease) 1420ms backwards}
.play .slogan{animation:rise 380ms var(--ease) 1620ms backwards}
.play .stage{animation:exit 200ms cubic-bezier(.4,0,1,1) 1950ms both}`
        : `@keyframes bksfly{
  0%,52%{transform:translate(0,${f1(56 - CY)}px) scale(${(56 / S).toFixed(3)});animation-timing-function:cubic-bezier(.5,0,.1,1)}
  88%{transform:translate(0,0) scale(1.045);animation-timing-function:cubic-bezier(.3,0,.2,1)}
  100%{transform:translate(0,0) scale(1)}
}
.play .bks{animation:bksfly 1450ms linear 0ms both}
.play .ping{animation:ping 560ms var(--ease) 1380ms forwards}
.play .word{animation:rise 380ms var(--ease) 1340ms backwards}
.play .slogan{animation:rise 380ms var(--ease) 1540ms backwards}
.play .stage{animation:exit 200ms cubic-bezier(.4,0,1,1) 1850ms both}`;
    return `
${dropKf}
${fxKf}
${spinKf}
@keyframes sceneop{0%{opacity:0}13%{opacity:1}${hold}%{opacity:1}${gone}%{opacity:0}100%{opacity:0}}
@keyframes scenemv{0%{transform:translateY(10px);animation-timing-function:cubic-bezier(.2,0,0,1)}13%{transform:translateY(0)}${hold}%{transform:translateY(0);animation-timing-function:cubic-bezier(.4,0,.6,1)}${gone}%{transform:translateY(-26px)}100%{transform:translateY(-26px)}}
.scene{position:absolute;left:0;top:0;width:390px;height:300px;pointer-events:none;opacity:0}
.scene>*{position:absolute}
.board{left:0;top:0}
.netl{left:${NX - 110}px;top:0}
.play .scene{animation:sceneop ${total}ms linear 0ms both,scenemv ${total}ms linear 0ms both}
.play .ballwrap{animation:drop ${END_DROP}ms linear 0ms both}
.ball{position:relative}
.lay{position:absolute;inset:0}
.play .ball{animation:ballfx ${FX_END}ms linear 0ms both}
.play .spin{animation:spin ${END_DROP}ms linear 0ms both}
.play .glow{animation:fade 700ms ease-out ${opt === 1 ? 1180 : 1150}ms backwards}
${finish}
`;
  };
  const buildSwish = (opt) => {
    const sceneBack = `<div class="scene"><div class="board">${boardSvg(opt === 1)}</div><div class="netl">${netSvg(`${rimBack}${netG}<defs><path id="netd" d="${samples[0]}">${netAnim}</path></defs><use href="#netd" fill="none" stroke="#f4f4f5" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`)}</div></div>`;
    const sceneFront = `<div class="scene"><div class="netl">${netSvg(`${netG}<use href="#netd" fill="none" stroke="url(#ntg)" stroke-opacity=".78" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>${rimFront}`)}</div></div>`;
    const bks = opt === 1 ? brackets : `<div class="bks">${brackets}</div>`;
    return html(
      opt === 1 ? 'Opening B1: Swish, settle and lock' : 'Opening B2: Swish, the hoop becomes the mark',
      swishCss(opt),
      `${sceneBack}
<div class="lock" style="z-index:2;pointer-events:none">
  <div class="scope">
    <div class="glow"></div>
    ${bks}
    <div class="ballwrap"><div class="ball">${P.ballLayers}</div></div>
    <div class="ping"></div>
  </div>
  <div class="word">${P.wordBox}</div>
  <div class="slogan">Aim is earned</div>
</div>
<div style="position:absolute;inset:0;z-index:3;pointer-events:none">${sceneFront}</div>`,
      opt === 1 ? ['.scene', '.spin', '.ball', '.ballwrap', '.glow', '.bk', '.ping', '.word', '.slogan'] : ['.scene', '.spin', '.ball', '.ballwrap', '.glow', '.bks', '.ping', '.word', '.slogan'],
      900,
    );
  };
  return { b1: buildSwish(1), b2: buildSwish(2) };
}
