// Builds the Watch it back mockups (static HTML, Tailwind v4 browser build, the app's own classes
// and src/app/theme.css). Draft only, made-up data, no real player. Run: node <this file>
// It writes 2026-11-20-watch-it-back-*.html next to itself. The PNGs are screenshots of those pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url));
const P = '2026-11-20-watch-it-back-';

const DUR = 48;
const SHOTS = [
  { n: 1, t: 4, k: 'make' },
  { n: 2, t: 9, k: 'miss' },
  { n: 3, t: 13, k: 'make' },
  { n: 4, t: 18, k: 'make' },
  { n: 5, t: 23, k: 'unclear' },
  { n: 6, t: 27, k: 'miss' },
  { n: 7, t: 31, k: 'make' },
  { n: 8, t: 37, k: 'make' },
  { n: 9, t: 43, k: 'miss' },
];
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const madeOf = (s) => s.k === 'make';
function score(T, shots = SHOTS) {
  const c = shots.filter((s) => s.t <= T);
  return { makes: c.filter(madeOf).length, attempts: c.length, recent: c.slice(-8).map(madeOf) };
}

const ICON = {
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  back: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>',
  fwd: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/>',
  max: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
  min: '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  redo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
};
const svg = (name, cls = 'h-5 w-5', fill = false) =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

function page({ title, theme = 'dark', body, width = 390 }) {
  return `<!doctype html>
<html lang="en-IE" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<!-- Designer mockup, draft only. Uses the app's own Tailwind v4 classes and src/app/theme.css, so the builder can lift it. Made-up data, no real player. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3"></script>
<style type="text/tailwindcss">
@theme {
  --color-zinc-500: #8b8b94;
  --color-orange-600: oklch(55.3% 0.195 38.402);
  --color-emerald-600: oklch(50.8% 0.118 165.612);
  --font-sans: 'Geist', system-ui, sans-serif;
}
</style>
<link rel="stylesheet" href="../../../../src/app/theme.css">
<style>
  html, body { margin: 0; }
  body { font-family: 'Geist', system-ui, sans-serif; background: var(--background); color: var(--foreground); -webkit-font-smoothing: antialiased; }
  .frame { width: ${width}px; margin: 0; }
  .mx-auto { margin-left: 0 !important; margin-right: 0 !important; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

/* ---------- the picture: a made-up empty court, no people ---------- */
function scene(W, H, { ball = null, trail = [], rimTone = null } = {}) {
  const rim = { x0: 0.56, x1: 0.68, y: 0.42 };
  const colour = rimTone === 'make' ? '#34d399' : rimTone === 'miss' ? '#f87171' : '#f97316';
  const rx0 = rim.x0 * W, rx1 = rim.x1 * W, ry = rim.y * H;
  const u = Math.min(W, H) / 360;
  const trailSvg = trail.length > 1
    ? trail.map((p, i) => {
        if (i === 0) return '';
        const a = i / (trail.length - 1);
        return `<line x1="${trail[i - 1][0] * W}" y1="${trail[i - 1][1] * H}" x2="${p[0] * W}" y2="${p[1] * H}" stroke="rgba(255,${Math.round(255 - 110 * a)},${Math.round(255 - 200 * a)},${0.15 + 0.6 * a})" stroke-width="${(1.5 + 4 * a) * u}" stroke-linecap="round"/>`;
      }).join('')
    : '';
  const ballSvg = ball
    ? `<circle cx="${ball[0] * W}" cy="${ball[1] * H}" r="${8 * u}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="${4 * u}"/><circle cx="${ball[0] * W}" cy="${ball[1] * H}" r="${8 * u}" fill="none" stroke="#fff" stroke-width="${2 * u}"/>`
    : '';
  const physBall = ball
    ? `<circle cx="${ball[0] * 160}" cy="${ball[1] * 90}" r="2.6" fill="#b4562a"/><path d="M${ball[0] * 160 - 2.6} ${ball[1] * 90}h5.2M${ball[0] * 160} ${ball[1] * 90 - 2.6}v5.2" stroke="#2a1a12" stroke-width=".35"/>`
    : '';
  return `
  <svg class="absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="160" height="90" fill="#46505c"/>
    <rect width="160" height="16" fill="#2c333b"/>
    <rect x="0" y="16" width="160" height="2" fill="#586472"/>
    <rect y="68" width="160" height="22" fill="#6a5238"/>
    <rect y="68" width="160" height="1.3" fill="#8b6f4b"/>
    <rect x="104" y="20" width="22" height="21" rx="1" fill="#d7dce2" stroke="#8d97a3" stroke-width=".7"/>
    <rect x="109" y="28" width="12" height="9" fill="none" stroke="#8d97a3" stroke-width=".6"/>
    <line x1="${rim.x0 * 160}" y1="${rim.y * 90}" x2="${rim.x1 * 160}" y2="${rim.y * 90}" stroke="#4b4f55" stroke-width="1"/>
    <path d="M${rim.x0 * 160 + 1} ${rim.y * 90}l3 9M${rim.x0 * 160 + 4} ${rim.y * 90}l1.5 9M${rim.x0 * 160 + 7} ${rim.y * 90}l0 9M${rim.x0 * 160 + 10} ${rim.y * 90}l-1.5 9M${rim.x1 * 160 - 1} ${rim.y * 90}l-3 9" stroke="rgba(255,255,255,.35)" stroke-width=".4"/>
    <rect x="12" y="40" width="26" height="28" fill="#39424d"/>
    <rect x="132" y="30" width="20" height="38" fill="#39424d"/>
    ${physBall}
  </svg>
  <svg class="absolute inset-0 h-full w-full" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${trailSvg}
    <g stroke-linecap="round">
      <line x1="${rx0}" y1="${ry}" x2="${rx1}" y2="${ry}" stroke="${rimTone ? colour + '66' : 'rgba(0,0,0,.45)'}" stroke-width="${(rimTone ? 9 : 6) * u}"/>
      <line x1="${rx0}" y1="${ry}" x2="${rx1}" y2="${ry}" stroke="${colour}" stroke-width="${3 * u}"/>
      <circle cx="${rx0}" cy="${ry}" r="${4 * u}" fill="${colour}"/><circle cx="${rx1}" cy="${ry}" r="${4 * u}" fill="${colour}"/>
    </g>
    ${ballSvg}
  </svg>`;
}

/* The HUD as TrackerHud / drawHud lay it out (live look). big = full screen sizes. */
function hud({ T, big = false, flash = null, tracked = true, fsButton = true }) {
  const s = score(T);
  const pct = s.attempts ? Math.round((s.makes / s.attempts) * 100) : 0;
  const wash = flash ? (flash.made ? 'bg-emerald-500/25' : 'bg-red-500/20') : '';
  const word = flash ? (flash.made ? 'Make' : 'Miss') : '';
  const wordCls = flash ? (flash.made ? 'text-emerald-300' : 'text-red-300') : '';
  const dots = s.recent
    .map((m) => `<span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/40 ${m ? 'bg-emerald-400' : 'bg-red-400'}"></span>`)
    .join('');
  return `
  <div class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent"></div>
  <div class="absolute left-3 top-2 text-white">
    <div class="flex items-end gap-2">
      <span class="${big ? 'text-6xl' : 'text-5xl'} font-black leading-none tabular-nums drop-shadow-lg">${s.makes}<span class="${big ? 'text-4xl' : 'text-3xl'} text-zinc-300">/${s.attempts}</span></span>
      <span class="mb-1 ${big ? 'text-3xl' : 'text-2xl'} font-black leading-none text-orange-400 tabular-nums drop-shadow-lg">${pct}%</span>
    </div>
    <div class="mt-1 flex items-center gap-2 text-sm font-semibold tabular-nums text-zinc-300 drop-shadow">${clock(T)}</div>
  </div>
  <div class="absolute right-3 top-3">
    <div class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tracked ? 'bg-emerald-500/90 text-white' : 'bg-black/55 text-zinc-100'}"><span class="h-2 w-2 rounded-full bg-current"></span>${tracked ? 'Ball tracked' : 'Watching the hoop'}</div>
  </div>
  <div class="absolute bottom-3 left-3 flex items-center gap-1.5">${dots}</div>
  ${
    flash
      ? `<div class="absolute inset-0 ${wash}"></div>
  <div class="absolute flex flex-col items-start" style="left:${(0.68 + 0.03) * 100}%;top:${0.42 * 100}%;transform:translateY(-50%)">
    <span class="block whitespace-nowrap font-black uppercase leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${big ? 'text-5xl sm:text-6xl' : 'text-3xl'} ${wordCls}">${word}</span>
    ${flash.unsure ? '<span class="mt-2 block whitespace-nowrap rounded-full bg-amber-500/90 px-2.5 py-0.5 text-xs font-bold uppercase text-zinc-950">check this one</span>' : ''}
  </div>`
      : ''
  }
  ${
    fsButton
      ? `<div class="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm">${svg(big ? 'min' : 'max')}</div>`
      : ''
  }`;
}

function stage({ T, W = 358, H = 201, flash = null, ball = null, trail = [], rimTone = null, tracked = true, idle = false }) {
  return `<div class="relative bg-black overflow-hidden" style="width:${W}px;height:${H}px">
    ${scene(W, H, { ball, trail, rimTone })}
    ${idle ? '' : hud({ T, flash, tracked })}
    ${
      idle
        ? `<div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent"></div>
    <div class="absolute inset-0 flex items-center justify-center"><div class="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30">${svg('play', 'h-7 w-7 translate-x-0.5', true)}</div></div>
    <div class="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">${clock(DUR)} · ${SHOTS.length} calls</div>
    <div class="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm">${svg('max')}</div>`
        : ''
    }
  </div>`;
}

/* ---------- the scrub rail with call pins ---------- */
function markHtml(s, dur, { crowded = false, current = false }) {
  const left = (s.t / dur) * 100;
  const ring = current ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-125' : '';
  let inner;
  if (crowded) {
    const h = s.k === 'miss' ? 'h-2' : 'h-3.5';
    const c = current ? 'bg-white' : s.k === 'make' ? 'bg-emerald-400' : s.k === 'miss' ? 'bg-red-400' : 'bg-amber-400';
    inner = `<span class="block w-[3px] ${h} translate-y-[3px] rounded-sm ${c}"></span>`;
  } else if (s.k === 'make') inner = `<span class="block h-2.5 w-2.5 rounded-full bg-emerald-400 ${ring}"></span>`;
  else if (s.k === 'miss') inner = `<span class="block h-2.5 w-2.5 rounded-full border-2 border-red-400 ${ring}"></span>`;
  else inner = `<span class="block h-2 w-2 rotate-45 bg-amber-400 ${ring}"></span>`;
  return `<span class="absolute top-[7px] flex -translate-x-1/2 items-center justify-center" style="left:${left}%">${inner}</span>`;
}
function rail({ pos, current = null, shots = SHOTS, crowded = false, dur = DUR, thumb = true, readonly = false, fill = 'bg-white' }) {
  const f = (pos / dur) * 100;
  return `<div class="relative h-11 select-none" ${
    readonly ? '' : `role="slider" tabindex="0" aria-label="Position in the clip" aria-valuemin="0" aria-valuemax="${dur}" aria-valuenow="${pos}" aria-valuetext="${clock(pos)}${current ? `, shot ${current}` : ''}"`
  }>
    <div class="absolute inset-x-[10px] top-0 h-full">
      ${shots.map((s) => markHtml(s, dur, { crowded, current: current === s.n })).join('')}
      <div class="absolute inset-x-0 top-[25px] h-1.5 rounded-full bg-zinc-500"><div class="h-full rounded-full ${fill}" style="width:${f}%"></div></div>
      ${thumb ? `<div class="absolute top-[18px] h-5 w-5 -translate-x-1/2 rounded-full bg-white shadow-md ring-2 ring-zinc-900" style="left:${f}%"></div>` : ''}
    </div>
  </div>`;
}

const btn = 'flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-100';
function controls({ T, playing, speed = '1×', prevOff = false, nextOff = false, ended = false }) {
  return `<div class="flex items-center gap-2 px-3 pb-2">
    <button class="${btn} h-12 w-12" aria-label="${ended ? 'Watch again' : playing ? 'Pause' : 'Play'}">${svg(ended ? 'redo' : playing ? 'pause' : 'play', 'h-5 w-5', !ended)}</button>
    <button class="${btn} h-11 w-11 ${prevOff ? 'opacity-40' : ''}" aria-label="Previous shot">${svg('back', 'h-5 w-5', true)}</button>
    <button class="${btn} h-11 w-11 ${nextOff ? 'opacity-40' : ''}" aria-label="Next shot">${svg('fwd', 'h-5 w-5', true)}</button>
    <div class="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-zinc-300">${clock(T)} <span class="font-normal text-zinc-400">/ ${clock(DUR)}</span></div>
    <button class="${btn} h-11 w-14 text-sm font-bold tabular-nums" aria-label="Playback speed ${speed}">${speed}</button>
  </div>`;
}

/* ---------- the strip under the controls ---------- */
const mk = (on) => (on === true ? 'bg-emerald-600 text-white' : 'border border-emerald-600/50 text-emerald-300');
const ms = (on) => (on === false ? 'bg-red-600 text-white' : 'border border-red-600/50 text-red-300');
function strip({ kind, shot = 7, made = true, sub = '', at = 31, hint }) {
  const wrap = (inner) => `<div class="min-h-[124px] border-t border-zinc-800 px-3 py-3" aria-live="polite">${inner}</div>`;
  if (kind === 'playing')
    return wrap(`<div class="flex min-h-[100px] items-center"><p class="text-sm text-zinc-400">${hint ?? 'Tap the picture to pause. Then fix a call, or add a shot the tracker missed.'}</p></div>`);
  if (kind === 'ended')
    return wrap(`<div class="flex h-11 items-center"><p class="text-sm font-semibold text-white">End of clip <span class="font-normal text-zinc-400">· 5 of 9 made</span></p></div>
      <button class="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 font-semibold text-zinc-100">${svg('redo', 'h-4 w-4')} Watch again</button>`);
  const addRow = `<div class="mt-2 grid grid-cols-2 gap-2">
      <button class="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/50 text-sm font-semibold text-emerald-300">${svg('plus', 'h-4 w-4')} Add a make here</button>
      <button class="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-red-600/50 text-sm font-semibold text-red-300">${svg('plus', 'h-4 w-4')} Add a miss here</button>
    </div>`;
  if (kind === 'add')
    return wrap(`<div class="flex h-11 items-center"><div><p class="text-sm font-semibold text-white">No call here</p><p class="text-xs text-zinc-400">Paused at <span class="tabular-nums">${clock(at)}</span>. Missed one? Add it.</p></div></div>${addRow}`);
  if (kind === 'removed')
    return wrap(`<div class="flex h-11 items-center justify-between gap-2"><div class="min-w-0"><p class="text-sm font-semibold text-white">Shot ${shot} removed</p><p class="text-xs text-zinc-400">It no longer counts.</p></div>
      <button class="flex h-11 items-center gap-1.5 rounded-xl border border-zinc-500 px-4 text-sm font-semibold text-white">${svg('redo', 'h-4 w-4')} Undo</button></div>${addRow}`);
  if (kind === 'held')
    return wrap(`<div class="flex h-11 items-center"><div><p class="text-sm font-semibold text-white">No call here</p><p class="text-xs text-zinc-400">The tracker was paused here while the hoop was re-set.</p></div></div>${addRow}`);
  const unclear = kind === 'unclear';
  const subLine = unclear
    ? '<p class="text-xs font-semibold text-amber-400">Unclear. The tracker was not sure.</p>'
    : `<p class="text-xs text-zinc-400">${sub}</p>`;
  return wrap(`<div class="flex h-11 items-center justify-between gap-2"><div class="min-w-0"><p class="text-sm font-semibold text-white">Shot ${shot} <span class="font-normal tabular-nums text-zinc-400">· ${clock(at)}</span></p>${subLine}</div>
    <button class="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-sm text-zinc-300">${svg('trash', 'h-4 w-4')} Not a shot</button></div>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <button aria-pressed="${made === true}" class="flex h-12 items-center justify-center gap-1.5 rounded-xl font-semibold ${mk(unclear ? null : made)}">${svg('check', 'h-4 w-4')} Make</button>
      <button aria-pressed="${made === false}" class="flex h-12 items-center justify-center gap-1.5 rounded-xl font-semibold ${ms(unclear ? null : made)}">${svg('x', 'h-4 w-4')} Miss</button>
    </div>`);
}

const legend = `<div class="flex items-center gap-3 text-xs text-zinc-400">
  <span class="flex items-center gap-1"><span class="block h-2.5 w-2.5 rounded-full bg-emerald-400"></span>Make</span>
  <span class="flex items-center gap-1"><span class="block h-2.5 w-2.5 rounded-full border-2 border-red-400"></span>Miss</span>
  <span class="flex items-center gap-1"><span class="block h-2 w-2 rotate-45 bg-amber-400"></span>Unclear</span>
</div>`;

function player({ T, playing = false, flash = null, ball = null, trail = [], rimTone = null, tracked = true, idle = false, stripArgs, current = null, speed = '1×', ended = false, prevOff = false, nextOff = false }) {
  return `<section aria-label="Watch it back" class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
    <div class="flex items-center justify-between px-4 pb-2 pt-3"><h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Watch it back</h2>${legend}</div>
    ${stage({ T, flash, ball, trail, rimTone, tracked, idle })}
    <div class="px-3 pt-1">${rail({ pos: T, current })}</div>
    ${controls({ T, playing, speed, ended, prevOff, nextOff })}
    ${strip(stripArgs)}
  </section>`;
}

/* ---------- the rest of the review screen ---------- */
function header(step = 'Review') {
  return `<div class="flex items-end justify-between px-4 pb-3 pt-4"><div><p class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Hoops</p><h1 class="text-xl font-black tracking-tight text-white">Shot tracker</h1></div><p class="pb-0.5 text-sm text-zinc-400">${step}</p></div>`;
}
function verdict({ makes = 5, total = 9, unresolved = 1 } = {}) {
  return `<div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-center">
    <div class="text-4xl font-black tabular-nums text-orange-400">${makes}/${total}</div>
    <div class="text-sm text-zinc-400">${Math.round((makes / total) * 100)}% · watch it back to check the calls</div>
    ${unresolved ? `<div class="mt-1 text-sm font-semibold text-amber-400">${unresolved} shot the tracker could not call: watch and set it below</div>` : ''}
  </div>`;
}
function row(s, active = false) {
  const k = s.k;
  const mid =
    k === 'unclear'
      ? '<div class="flex flex-1 items-center gap-1.5"><span class="text-xs font-semibold text-amber-400">Unclear</span><span class="flex-1 rounded-md border border-emerald-600/40 py-1 text-center text-xs font-semibold text-emerald-300">Make</span><span class="flex-1 rounded-md border border-red-600/40 py-1 text-center text-xs font-semibold text-red-300">Miss</span></div>'
      : `<span class="flex-1 rounded-md py-1 text-center font-semibold ${k === 'make' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}">${k === 'make' ? 'Make' : 'Miss'}</span>`;
  return `<div class="rounded-lg px-3 py-2 text-sm ${active ? 'bg-zinc-800 ring-1 ring-zinc-500' : 'bg-zinc-900/70'}">
    <div class="flex items-center gap-2"><span class="w-8 text-zinc-500">#${s.n}</span>
    <span class="flex h-9 w-14 items-center gap-1 rounded-md ${active ? 'text-white' : 'text-zinc-400'}">${svg('play', 'h-3.5 w-3.5', true)} <span class="tabular-nums">${clock(s.t)}</span></span>
    ${mid}
    <span class="text-xs text-cyan-400 underline">Form</span><span class="text-zinc-500">${svg('trash', 'h-4 w-4')}</span></div>
  </div>`;
}
function list({ active = null, n = 3, from = 5 }) {
  const shown = SHOTS.filter((s) => s.n >= from).slice(0, n);
  return `<div class="space-y-2">
    <div class="flex items-baseline justify-between"><h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Every call · ${SHOTS.length}</h2><p class="text-sm text-zinc-500">Tap a time to watch that shot</p></div>
    <div class="space-y-1.5">${shown.map((s) => row(s, s.n === active)).join('')}</div></div>`;
}
function review({ player: p, theme, listArgs = {} }) {
  return page({
    title: 'Watch it back, review step, 390 px',
    theme,
    body: `<div class="frame" style="height:844px;overflow:hidden">${header()}<div class="space-y-4 px-4">${verdict()}${p}${list(listArgs)}</div></div>`,
  });
}

const files = {};
const flashMake = { made: true, unsure: false };

const pausedShot = player({
  T: 31.4, flash: flashMake, rimTone: 'make', current: 7,
  stripArgs: { kind: 'shot', shot: 7, made: true, sub: 'Tracker said Make. Tap to change.', at: 31 },
});
files['review-paused-on-shot-390'] = review({ player: pausedShot, theme: 'dark', listArgs: { active: 7, from: 6, n: 3 } });

files['review-playing-390'] = review({
  player: player({
    T: 20.2, playing: true, ball: [0.43, 0.62], trail: [[0.31, 0.78], [0.34, 0.72], [0.37, 0.67], [0.40, 0.64], [0.43, 0.62]],
    stripArgs: { kind: 'playing' },
  }),
  theme: 'dark', listArgs: { active: 4, from: 4, n: 3 },
});

files['review-add-here-390'] = review({
  player: player({ T: 34.2, ball: [0.62, 0.43], tracked: false, stripArgs: { kind: 'add', at: 34 } }),
  theme: 'dark', listArgs: { active: null, from: 6, n: 3 },
});

files['review-unclear-390'] = review({
  player: player({
    T: 23.4, flash: { made: false, unsure: true }, rimTone: 'miss', current: 5,
    stripArgs: { kind: 'unclear', shot: 5, at: 23, made: null },
  }),
  theme: 'dark', listArgs: { active: 5, from: 4, n: 3 },
});

files['review-light-390'] = review({ player: pausedShot, theme: 'light', listArgs: { active: 7, from: 6, n: 3 } });

files['review-first-look-390'] = review({
  player: player({ T: 0, idle: true, prevOff: true, stripArgs: { kind: 'playing', hint: 'Press play. Tap the picture to pause, then fix a call or add a shot the tracker missed.' } }),
  theme: 'dark', listArgs: { active: null, from: 1, n: 3 },
});

function sheet(title, intro, items) {
  return page({
    title,
    width: 880,
    body: `<div class="mx-auto px-6 py-6" style="width:880px"><h1 class="mb-1 text-xl font-black tracking-tight text-white">${title}</h1><p class="mb-5 text-sm text-zinc-400">${intro}</p>
    <div class="grid gap-5" style="grid-template-columns:repeat(2,minmax(0,1fr))">${items
      .map(([label, html]) => `<div><p class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">${label}</p><div class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70" style="width:358px">${html}</div></div>`)
      .join('')}</div></div>`,
  });
}
files['strip-states'] = sheet(
  'Watch it back: the strip under the controls',
  'Every state of the area under the controls, at the player card width (358 px). Same height in every state, 124 px, so nothing jumps when the player pauses.',
  [
    ['1 Playing', strip({ kind: 'playing' })],
    ['2 Paused on a make the tracker called', strip({ kind: 'shot', shot: 7, made: true, sub: 'Tracker said Make. Tap to change.', at: 31 })],
    ['3 Same shot after the player flips it', strip({ kind: 'shot', shot: 7, made: false, sub: 'Tracker said Make. You changed it.', at: 31 })],
    ['4 Paused on an unclear shot', strip({ kind: 'unclear', shot: 5, at: 23, made: null })],
    ['5 Paused where there is no call', strip({ kind: 'add', at: 34 })],
    ['6 A shot the player added', strip({ kind: 'shot', shot: 8, made: true, sub: 'Added by you. Tap to change.', at: 34 })],
    ['7 After "Not a shot"', strip({ kind: 'removed', shot: 7 })],
    ['8 Paused while the hoop was re-set (live recording)', strip({ kind: 'held', at: 52 })],
    ['9 End of the clip', strip({ kind: 'ended' })],
  ]
);

/* Decode screen */
const decShots = SHOTS.filter((s) => s.t <= 29);
files['decode-390'] = (() => {
  const pos = DUR * 0.6;
  const m = score(29, decShots);
  return page({
    title: 'Watch it back, decode progress, 390 px',
    body: `<div class="frame" style="height:844px;overflow:hidden">${header('Checking')}
    <div class="space-y-3 px-4">
      <div class="relative overflow-hidden rounded-2xl bg-black" style="width:358px;height:201px">
        ${scene(358, 201, {})}
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent"></div>
        <div class="absolute left-3 top-2 text-white"><div class="flex items-end gap-2"><span class="text-5xl font-black leading-none tabular-nums drop-shadow-lg">${m.makes}<span class="text-3xl text-zinc-300">/${m.attempts}</span></span><span class="mb-1 text-2xl font-black leading-none text-orange-400 tabular-nums drop-shadow-lg">${Math.round((m.makes / m.attempts) * 100)}%</span></div></div>
        <div class="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/50 text-white">${svg('max')}</div>
      </div>
      <div class="space-y-1">
        ${rail({ pos, shots: decShots, thumb: false, readonly: true, fill: 'bg-orange-500' })}
        <div class="flex items-center justify-between text-sm tabular-nums"><span class="text-zinc-300">Checked ${clock(pos)} of ${clock(DUR)}</span><span class="text-zinc-400">${decShots.length} calls so far</span></div>
      </div>
      <div class="space-y-2">
        <p class="text-sm font-semibold text-white">Checking every frame of your clip</p>
        <p class="text-sm text-zinc-500">It does not play the clip, so it is usually quicker than watching it. When it finishes you can watch the clip back with every make and miss marked, and fix any call that looks wrong.</p>
        <button class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 font-semibold text-zinc-100"><span class="block h-3.5 w-3.5 rounded-[3px] border-2 border-current"></span> Stop early and review</button>
      </div>
    </div></div>`,
  });
})();

/* Full screen sideways */
function fsFrame({ T, playing, flash = null, ball = null, trail = [], rimTone = null, tracked = true, actions = '' }) {
  const W = 693, H = 390;
  const s = (T / DUR) * 100;
  return `<div class="relative overflow-hidden bg-black" style="width:844px;height:390px">
    <div class="absolute left-1/2 top-0 -translate-x-1/2" style="width:${W}px;height:${H}px">
      <div class="relative h-full w-full overflow-hidden">
        ${scene(W, H, { ball, trail, rimTone })}
        ${hud({ T, big: true, flash, tracked, fsButton: false })}
      </div>
    </div>
    ${
      playing
        ? `<div class="absolute inset-x-0 bottom-0 h-1 bg-white/25"><div class="h-full bg-white/80" style="width:${s}%"></div></div>
           <div class="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-black/50 text-white">${svg('min')}</div>`
        : `<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-4 pb-2 pt-10">
            ${rail({ pos: T, current: flash ? 7 : null })}
            <div class="flex items-center gap-2">
              <button class="${btn} h-12 w-12" aria-label="Play">${svg('play', 'h-5 w-5', true)}</button>
              <button class="${btn} h-11 w-11">${svg('back', 'h-5 w-5', true)}</button>
              <button class="${btn} h-11 w-11">${svg('fwd', 'h-5 w-5', true)}</button>
              <div class="flex-1 text-center text-sm font-semibold tabular-nums text-zinc-300">${clock(T)} <span class="font-normal text-zinc-400">/ ${clock(DUR)}</span></div>
              <button class="${btn} h-11 w-14 text-sm font-bold tabular-nums">1×</button>
              <button class="${btn} h-11 w-11" aria-label="Leave full screen">${svg('min')}</button>
            </div>
          </div>
          <div class="absolute inset-x-0 flex justify-center gap-2" style="bottom:112px">${actions}</div>`
    }
  </div>`;
}
const pill = 'flex h-12 items-center justify-center gap-1.5 rounded-xl bg-zinc-950/90 px-4 text-sm font-semibold';
const fsActionsShot = `<button aria-pressed="true" class="${pill} !bg-emerald-600 text-white">${svg('check', 'h-4 w-4')} Make</button><button class="${pill} border border-red-600/60 text-red-300">${svg('x', 'h-4 w-4')} Miss</button><button class="${pill} text-zinc-300">${svg('trash', 'h-4 w-4')} Not a shot</button>`;
const fsActionsAdd = `<button class="${pill} border border-emerald-600/60 text-emerald-300">${svg('plus', 'h-4 w-4')} Add a make here</button><button class="${pill} border border-red-600/60 text-red-300">${svg('plus', 'h-4 w-4')} Add a miss here</button>`;
const cap = (t, first = false) => `<p class="mb-1.5 ${first ? '' : 'mt-5'} text-xs font-semibold uppercase tracking-wider text-zinc-400">${t}</p>`;
files['fullscreen-844x390'] = page({
  title: 'Watch it back, full screen sideways, 844 x 390',
  width: 892,
  body: `<div class="mx-auto py-4" style="width:844px">
    ${cap('A. Playing: controls out of the way, a thin line along the bottom shows where you are', true)}
    ${fsFrame({ T: 20.2, playing: true, ball: [0.43, 0.62], trail: [[0.31, 0.78], [0.34, 0.72], [0.37, 0.67], [0.40, 0.64], [0.43, 0.62]] })}
    ${cap('B. Paused on a called shot: Make, Miss and Not a shot float above the bar')}
    ${fsFrame({ T: 31.4, playing: false, flash: flashMake, rimTone: 'make', actions: fsActionsShot })}
    ${cap('C. Paused where the tracker saw nothing: add one here')}
    ${fsFrame({ T: 34.2, playing: false, ball: [0.62, 0.43], tracked: false, actions: fsActionsAdd })}
  </div>`,
});

/* Rail states */
function crowd(n, dur) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ n: i + 1, t: ((i + 0.6) / n) * dur + ((i * 7) % 5) * 0.2, k: i % 7 === 3 ? 'unclear' : i % 3 === 1 ? 'miss' : 'make' });
  return out;
}
const many = crowd(46, DUR);
const railBox = (r) => `<div class="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2" style="width:358px">${r}</div>`;
files['rail-states'] = page({
  title: 'Watch it back, scrub rail',
  width: 420,
  body: `<div class="mx-auto px-6 py-6" style="width:408px">
    <h1 class="mb-1 text-xl font-black tracking-tight text-white">The scrub rail</h1>
    <p class="mb-5 text-sm text-zinc-400">Pins show every call. The shapes differ as well as the colours, so it reads without telling green from red.</p>
    ${cap('A normal session: 9 calls, paused on shot 7', true)}
    ${railBox(rail({ pos: 31, current: 7 }))}
    ${cap('A long session: 46 calls. Pins would pile up, so below 8 px apart each becomes a 3 px bar (Make tall, Miss short, Unclear amber), and the current one turns white')}
    ${railBox(rail({ pos: 22, shots: many, crowded: true, current: 22 }))}
    ${cap('Same session without the crowding rule (what not to ship)')}
    ${railBox(rail({ pos: 22, shots: many, crowded: false, current: 22 }))}
    ${cap('A clip with no calls: only the rail')}
    ${railBox(rail({ pos: 12, shots: [] }))}
    ${cap('Start of the clip')}
    ${railBox(rail({ pos: 0 }))}
  </div>`,
});

/* Order of the review screen */
const blk = (label, h, cls = '', note = '') => `<div class="flex items-center justify-between gap-2 rounded-xl border px-3 text-sm ${cls}" style="height:${h}px"><span>${label}</span>${note ? `<span class="shrink-0 text-xs font-bold uppercase tracking-wider">${note}</span>` : ''}</div>`;
files['review-order'] = page({
  title: 'Watch it back, order of the review screen',
  width: 780,
  body: `<div class="mx-auto flex gap-8 px-6 py-6" style="width:780px">
    <div style="width:340px">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Today</p>
      <div class="space-y-2">
        ${blk('Verdict: 5/9, 56%', 70, 'border-zinc-700 text-zinc-300')}
        ${blk('Personal best card (if any)', 40, 'border-zinc-700 text-zinc-400')}
        ${blk('Tracking quality', 70, 'border-zinc-700 text-zinc-400')}
        ${blk('Check again from the recording', 70, 'border-zinc-700 text-zinc-400')}
        ${blk('Shooting breakdown', 90, 'border-zinc-700 text-zinc-400')}
        ${blk('Tracker got this wrong? Tell us', 28, 'border-zinc-700 text-zinc-400')}
        ${blk('Shot list, each row with a ▶ that opens a pop-up replay', 150, 'border-zinc-700 text-zinc-300')}
        ${blk('Add a make / miss it missed (no time)', 40, 'border-zinc-700 text-zinc-400')}
        ${blk('Remember this hoop · Spot · Export · Reel', 90, 'border-zinc-700 text-zinc-400')}
        ${blk('Save as a Hoops session', 48, 'border-zinc-700 text-zinc-300')}
      </div>
    </div>
    <div style="width:340px">
      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Proposed</p>
      <div class="space-y-2">
        ${blk('Verdict: 5/9, 56%', 70, 'border-zinc-700 text-zinc-300')}
        ${blk('Personal best card (if any)', 40, 'border-zinc-700 text-zinc-400')}
        ${blk('WATCH IT BACK: picture, pins, controls, edit strip', 232, 'border-white bg-zinc-900 font-semibold text-white', 'New')}
        ${blk('Shot list. ▶ now plays in the player above', 150, 'border-zinc-500 text-zinc-300', 'Changed')}
        ${blk('Tracking quality', 70, 'border-zinc-700 text-zinc-400', 'Moved')}
        ${blk('Check again from the recording', 70, 'border-zinc-700 text-zinc-400', 'Moved')}
        ${blk('Shooting breakdown', 90, 'border-zinc-700 text-zinc-400', 'Moved')}
        ${blk('Tracker got this wrong? Tell us', 28, 'border-zinc-700 text-zinc-400', 'Moved')}
        ${blk('Add buttons: only when there is no video', 40, 'border-dashed border-zinc-700 text-zinc-500', 'Changed')}
        ${blk('Remember this hoop · Spot · Export · Reel', 90, 'border-zinc-700 text-zinc-400')}
        ${blk('Save as a Hoops session', 48, 'border-zinc-700 text-zinc-300')}
      </div>
    </div>
  </div>`,
});

/* Directions */
const box = (t, h, cls = 'border-zinc-700 text-zinc-400') => `<div class="flex items-center justify-center rounded-lg border px-2 text-center text-xs ${cls}" style="height:${h}px">${t}</div>`;
const wf = (label, parts) => `<div style="width:260px"><p class="mb-2 text-sm font-semibold text-white">${label}</p><div class="space-y-1.5 rounded-2xl border border-zinc-800 bg-zinc-950 p-2" style="height:560px">${parts}</div></div>`;
files['directions'] = page({
  title: 'Watch it back, three directions',
  width: 880,
  body: `<div class="mx-auto px-6 py-6" style="width:880px"><h1 class="mb-1 text-xl font-black tracking-tight text-white">Watch it back: three directions</h1><p class="mb-5 text-sm text-zinc-400">Wireframes at phone width. A is recommended.</p>
  <div class="flex gap-6">
    ${wf('A. Player in the page (recommended)', box('Verdict', 44) + box('PLAYER: picture, pins, controls, edit strip', 190, 'border-white bg-zinc-900 text-white') + box('Shot list (▶ plays in the player)', 110) + box('Quality, recheck, breakdown', 60) + box('Export, reel, Save', 60))}
    ${wf('B. Full screen first, list in a sheet', box('Picture fills the screen, HUD on it', 250, 'border-white bg-zinc-900 text-white') + box('Pins and controls over the picture', 40, 'border-zinc-500 text-zinc-300') + box('Bottom sheet: drag up for the shot list', 120, 'border-dashed border-zinc-600 text-zinc-300') + box('Verdict, quality, Save under the sheet', 60))}
    ${wf('C. Extend the pop-up replay', box('Verdict', 44) + box('Shot list, each ▶ opens a pop-up', 110) + box('New button: "Watch the whole clip"', 40, 'border-zinc-500 text-zinc-300') + box('Pop-up player covers the page: pins, Make, Miss', 180, 'border-dashed border-white bg-zinc-900 text-white') + box('Quality, Save', 60))}
  </div></div>`,
});

for (const [name, html] of Object.entries(files)) fs.writeFileSync(path.join(OUT, P + name + '.html'), html);
console.log(Object.keys(files).length, 'files');
