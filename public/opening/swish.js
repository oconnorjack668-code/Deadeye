// public/opening/swish.js
// Opening B2, "Swish, the hoop becomes the mark" (docs/agent-os/design/2026-11-22-loading.md).
// Loaded only on the cold opens that picked B: the head script (OPENING_SCRIPT in
// src/lib/opening.ts) adds it as an async script, so nothing waits for it and the
// other openings never download it. Ported from the designer's prototype
// (docs/agent-os/design/mockups/2026-11-22-loading-swish.mjs).
//
// It draws the backboard, rim and net around the splash's logo (OpeningSplash.tsx),
// samples the ball's path, backspin and landing squash into CSS keyframes (every
// 16 ms, so they are smooth at 60 fps; transform only), and generates the net's
// ripple as an SVG path morph (SMIL: the one non-transform animation; the CSS `d`
// property does not animate in Safari). Then it starts everything in one frame by
// adding html.dd-b-go. Plain ES5 on purpose: it is served as is, not bundled.
(function () {
  'use strict';
  // Stage geometry, the same numbers as OPENING_GEO (src/components/brand/openingArt.ts):
  // ball 174 px, scope 234 px, its top at 218 px on a 390 x 844 box, so the ball's centre is at 335.
  var D = 174, S = 234, CY = 218 + S / 2;
  var NX = 195, RIM_Y = 118, RIM_RX = 84, RIM_RY = 11, J = 7, DY = 15, NCOL = 7;
  var BS = 0.62; // ball scale at the hoop
  var KEYS = [[100, -110, 0.62], [520, RIM_Y, 0.38], [980, 285, 0.3], [1280, CY, 0]];
  var END_DROP = 1300, FX_END = 1700, TMAX = 1800, STEP = 24, SPIN = -300;

  function f1(x) { return Math.round(x * 10) / 10; }

  function ballY(t) {
    if (t <= KEYS[0][0]) return KEYS[0][1];
    if (t >= 1280) return CY;
    var i = 0;
    while (t > KEYS[i + 1][0]) i++;
    var t0 = KEYS[i][0], y0 = KEYS[i][1], v0 = KEYS[i][2];
    var t1 = KEYS[i + 1][0], y1 = KEYS[i + 1][1], v1 = KEYS[i + 1][2];
    var h = t1 - t0, u = (t - t0) / h;
    var h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u;
    var h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    return h00 * y0 + h10 * h * v0 + h01 * y1 + h11 * h * v1;
  }
  function ballX(t) { return t >= 520 ? 0 : t <= 100 ? -62 : -62 * Math.pow(1 - (t - 100) / 420, 2); }
  function smooth(u) { return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u); }
  function ballS(t) { return BS + (1 - BS) * smooth((t - 980) / 300); }
  function timeAt(y) { for (var t = 0; t <= 1300; t += 2) if (ballY(t) >= y) return t; return 1300; }
  function hw(j) { return 84 - 38 * Math.pow(j / J, 0.9); }

  /** The net's knots at time t (ms): rows from the rim down, each row a list of [x, y]. */
  function nodes(t) {
    var grid = [], yb = ballY(t), BR = (D / 2) * ballS(t);
    for (var j = 0; j <= J; j++) {
      var row = [], cnt = j % 2 === 0 ? NCOL : NCOL - 1, rowY = RIM_Y + RIM_RY + j * DY;
      var tau = t - timeAt(rowY), w = j / J;
      var ripple = tau > 0 ? Math.exp(-tau / 170) * Math.cos((2 * Math.PI * tau) / 320) : 0;
      var kick = tau > 0 ? -7 * Math.exp(-tau / 190) * Math.sin((2 * Math.PI * tau) / 320) * w : 0;
      var stretch = 8 * w * Math.exp(-Math.pow((tau + 60) / 95, 2));
      var k = 1;
      if (j > 0) {
        var dyb = rowY - yb;
        if (Math.abs(dyb) < BR + 8) {
          var b = (Math.sqrt(Math.max(0, BR * BR - Math.min(dyb * dyb, BR * BR))) + 5) / hw(j);
          k = (1 + b + Math.sqrt((1 - b) * (1 - b) + 0.02)) / 2;
        }
      }
      for (var i = 0; i < cnt; i++) {
        var u = j % 2 === 0 ? -1 + (2 * i) / (NCOL - 1) : -1 + (2 * i + 1) / (NCOL - 1);
        var x = u * hw(j) * k * (1 + ripple * 0.12 * (0.35 + 0.65 * w));
        var y = (j === 0 ? RIM_Y + RIM_RY * Math.sqrt(Math.max(0, 1 - u * u)) : rowY) + kick + stretch;
        row.push([NX + x, y]);
      }
      grid.push(row);
    }
    return grid;
  }

  /** The net as one SVG path at time t. */
  function netD(t) {
    var g = nodes(t), d = '';
    for (var j = 0; j < J; j++) {
      var a = g[j], b = g[j + 1];
      for (var i = 0; i < a.length; i++) {
        var targets = j % 2 === 0 ? [i - 1, i] : [i, i + 1];
        for (var q = 0; q < 2; q++) {
          var k = targets[q];
          if (k >= 0 && k < b.length) d += 'M' + f1(a[i][0]) + ' ' + f1(a[i][1]) + 'L' + f1(b[k][0]) + ' ' + f1(b[k][1]);
        }
      }
    }
    var last = g[J].map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); });
    return d + 'M' + last.join('L');
  }

  function netValues() {
    var out = [];
    for (var t = 0; t <= TMAX; t += STEP) out.push(netD(t));
    return out.join(';');
  }

  function pct(t, end) { return f1((t / end) * 100) + '%'; }

  /** All of B's keyframes and rules; every one runs only once html has .dd-b-go. */
  function css() {
    var drop = '@keyframes dd-b-drop{', fx = '@keyframes dd-b-fx{', spin = '@keyframes dd-b-spin{', t;
    for (t = 0; t <= END_DROP; t += 16) {
      drop += pct(t, END_DROP) + '{transform:translate(' + f1(ballX(t)) + 'px,' + f1(ballY(t) - CY) + 'px) scale(' + ballS(t).toFixed(3) + ')}';
      // Backspin: about 0.83 of a turn, eased out so it comes to rest upright as it lands
      var u = Math.min(1, Math.max(0, (t - 100) / (END_DROP - 120)));
      spin += pct(t, END_DROP) + '{transform:rotate(' + f1(SPIN * Math.pow(1 - u, 1.8)) + 'deg)}';
    }
    drop += '100%{transform:none}}';
    spin += '100%{transform:none}}';
    for (t = 0; t <= FX_END; t += 20) {
      var q = t - END_DROP, sq = q > 0 ? Math.exp(-q / 120) * Math.cos((2 * Math.PI * q) / 300) : 0; // landing squash
      fx += pct(t, FX_END) + '{transform:scale(' + (1 + 0.05 * sq).toFixed(3) + ',' + (1 - 0.06 * sq).toFixed(3) + ')}';
    }
    fx += '100%{transform:none}}';
    var go = 'html.dd-b-go[data-open=b] ';
    return drop + fx + spin +
      '@keyframes dd-b-bks{0%,52%{transform:translate(0,' + f1(56 - CY) + 'px) scale(' + (56 / S).toFixed(3) + ');animation-timing-function:cubic-bezier(.5,0,.1,1)}' +
      '88%{transform:scale(1.045);animation-timing-function:cubic-bezier(.3,0,.2,1)}100%{transform:none}}' +
      '@keyframes dd-b-sceneop{0%{opacity:0}13%{opacity:1}57%{opacity:1}74%{opacity:0}100%{opacity:0}}' +
      '@keyframes dd-b-scenemv{0%{transform:translateY(10px);animation-timing-function:cubic-bezier(.2,0,0,1)}13%{transform:none}57%{transform:none;animation-timing-function:cubic-bezier(.4,0,.6,1)}74%{transform:translateY(-26px)}100%{transform:translateY(-26px)}}' +
      '.dd-b-scene{position:absolute;left:0;top:0;width:390px;height:300px;pointer-events:none;opacity:0}' +
      '.dd-b-scene>*{position:absolute;left:0;top:0}.dd-b-scene .dd-b-net{left:' + (NX - 110) + 'px}' +
      go + '.dd-b-scene{animation:dd-b-sceneop 1700ms linear both,dd-b-scenemv 1700ms linear both}' +
      go + '.dd-open-ballwrap{animation:dd-b-drop ' + END_DROP + 'ms linear both}' +
      go + '.dd-open-ball{animation:dd-b-fx ' + FX_END + 'ms linear both}' +
      go + '.dd-spin{animation:dd-b-spin ' + END_DROP + 'ms linear both}' +
      go + '.dd-open-bks{animation:dd-b-bks 1450ms linear both}';
  }

  // The board draws no target square: in B2 the logo's own brackets are that square (dd-b-bks flies them down).
  function board() {
    return '<svg class="dd-b-board" viewBox="0 0 390 140" width="390" height="140" aria-hidden="true"><defs>' +
      '<linearGradient id="ddbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1f25"/><stop offset="1" stop-color="#0a0a0d"/></linearGradient>' +
      '<linearGradient id="ddbl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".075"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="ddbr" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#ff2436" stop-opacity=".16"/><stop offset="1" stop-color="#ff2436" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="ddbc"><rect x="83" y="14" width="224" height="84" rx="10"/></clipPath></defs>' +
      '<ellipse cx="195" cy="70" rx="190" ry="70" fill="url(#ddbr)"/>' +
      '<rect x="83" y="14" width="224" height="84" rx="10" fill="url(#ddbg)" stroke="#34343b" stroke-width="1.5"/>' +
      '<g clip-path="url(#ddbc)"><polygon points="60,0 150,0 110,120 20,120" fill="url(#ddbl)"/><polygon points="190,0 215,0 175,120 150,120" fill="url(#ddbl)" opacity=".6"/><rect x="83" y="95.5" width="224" height="2.5" fill="#ff2436" opacity=".85"/></g>' +
      '<path d="M93 15.2H297" stroke="#fff" stroke-opacity=".16"/>' +
      '<path d="M176 98h38v7q0 3-3 3h-32q-3 0-3-3z" fill="#101013" stroke="#ff2436" stroke-opacity=".6"/></svg>';
  }

  function netSvg(inner) {
    return '<svg class="dd-b-net" viewBox="' + (NX - 110) + ' 0 220 260" width="220" height="260" aria-hidden="true">' + inner + '</svg>';
  }

  /** The two layers of the hoop: behind the ball (board, back of the rim, back of the net) and in front of it. */
  function scenes() {
    var netGrad = '<defs><linearGradient id="ddntg" gradientUnits="userSpaceOnUse" x1="0" y1="' + RIM_Y + '" x2="0" y2="' + (RIM_Y + 125) + '"><stop offset="0" stop-color="#f4f4f5" stop-opacity=".92"/><stop offset="1" stop-color="#f4f4f5" stop-opacity=".5"/></linearGradient></defs>';
    var rimBack = '<path d="M' + (NX - RIM_RX) + ' ' + RIM_Y + ' A' + RIM_RX + ' ' + RIM_RY + ' 0 0 1 ' + (NX + RIM_RX) + ' ' + RIM_Y + '" fill="none" stroke="#7d0d18" stroke-width="5" stroke-linecap="round"/>';
    var rimFront = '<defs><linearGradient id="ddrmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5361"/><stop offset="1" stop-color="#e01a2d"/></linearGradient></defs>' +
      '<path d="M' + (NX - RIM_RX) + ' ' + RIM_Y + ' A' + RIM_RX + ' ' + RIM_RY + ' 0 0 0 ' + (NX + RIM_RX) + ' ' + RIM_Y + '" fill="none" stroke="url(#ddrmg)" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M' + (NX - RIM_RX + 10) + ' ' + (RIM_Y + 2.2) + ' A' + (RIM_RX - 10) + ' ' + (RIM_RY - 3) + ' 0 0 0 ' + (NX + RIM_RX - 10) + ' ' + (RIM_Y + 2.2) + '" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1"/>';
    var net = '<defs><path id="ddnetd" d="' + netD(0) + '"><animate id="ddneta" attributeName="d" dur="' + TMAX / 1000 + 's" begin="indefinite" fill="freeze" calcMode="linear" values="' + netValues() + '"/></path></defs>';
    var back = '<div class="dd-b-scene">' + board() +
      netSvg(rimBack + netGrad + net + '<use href="#ddnetd" fill="none" stroke="#f4f4f5" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>') + '</div>';
    var front = '<div class="dd-b-scene">' +
      netSvg('<use href="#ddnetd" fill="none" stroke="url(#ddntg)" stroke-opacity=".78" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' + rimFront) + '</div>';
    return { back: back, front: front };
  }

  /** Builds B into the splash and starts it. Does nothing if the splash is gone or B was not picked. */
  function start() {
    var root = document.documentElement;
    // Two empty hosts in the splash (OpeningSplash.tsx): filling their inner HTML, rather than adding
    // nodes beside React's own, keeps React's hydration happy when this runs first
    var back = document.querySelector('#dd-open .dd-b-back');
    var front = document.querySelector('#dd-open .dd-b-front');
    if (!back || !front || root.getAttribute('data-open') !== 'b' || root.classList.contains('dd-b-go')) return false;
    var style = document.createElement('style');
    style.textContent = css();
    document.head.appendChild(style);
    var sc = scenes();
    back.innerHTML = sc.back;
    front.innerHTML = sc.front;
    var go = function () {
      root.classList.add('dd-b-go');
      var anim = document.getElementById('ddneta');
      if (anim && anim.beginElement) anim.beginElement();
      document.dispatchEvent(new Event('dd-open-go'));
    };
    var frame = function () {
      if (window.requestAnimationFrame) window.requestAnimationFrame(go);
      else go();
    };
    // Waits, like A and C, until the app is on screen (html.dd-open-run, added by
    // OpeningSplashRunner), so B is never half over before anyone can see it
    if (root.classList.contains('dd-open-run')) frame();
    else document.addEventListener('dd-open-run', frame, { once: true });
    return true;
  }

  window.__ddSwish = { ballY: ballY, nodes: nodes, netD: netD, css: css, scenes: scenes, start: start };

  if (document.documentElement.getAttribute('data-open') === 'b') {
    if (document.getElementById('dd-open')) start();
    else document.addEventListener('DOMContentLoaded', start);
  }
})();
