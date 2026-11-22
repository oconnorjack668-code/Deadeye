// The two share cards (session result, rank) as HTML at 1080 wide, in the 1080x1920 story size and the 1080x1350 feed size.
// Original art: a glowing half court, heavy Geist numbers, one orange. Made-up data and a made-up first name only.
import { ic, LOGO } from './2026-11-22-polish-lib.mjs';
import { shotChart } from './2026-11-22-shotchart-lib.mjs';

const SAFE_TOP = 270;
const SAFE_BOTTOM = 1500;

/** Everything is placed with absolute tops so a size change is one table. */
const POS = {
  1920: { head: 300, pill: 415, num: 520, numPx: 345, pct: 832, pctPx: 124, sub: 968, court: 1030, courtW: 640 },
  1350: { head: 76, pill: 190, num: 292, numPx: 330, pct: 604, pctPx: 120, sub: 740, court: 800, courtW: 700 },
};

const wrap = (h, inner, extra = '') =>
  `<div class="relative overflow-hidden" style="width:1080px;height:${h}px;background:#09090b;font-family:'Geist',system-ui,sans-serif;color:#fff">
  <div class="absolute inset-0" style="background:radial-gradient(80% 42% at 50% ${h === 1920 ? 38 : 40}%,rgba(249,115,22,.30),transparent 72%),radial-gradient(70% 28% at 50% 100%,rgba(249,115,22,.16),transparent 75%)"></div>
  ${inner}${extra}</div>`;

const header = (top, right) => `<div class="absolute flex items-center justify-between" style="left:90px;right:90px;top:${top}px">
    <div class="flex items-center gap-5"><img src="${LOGO}" alt="" style="width:84px;height:84px;border-radius:9999px"><div><div style="font-size:54px;line-height:1" class="font-black uppercase tracking-tight">Deadeye</div><div style="font-size:26px;margin-top:6px" class="font-semibold uppercase tracking-[0.18em] text-red-400">Aim is earned</div></div></div>
    <div style="font-size:36px" class="font-semibold uppercase tracking-wider text-zinc-300">${right}</div></div>`;

const glowNum = 'text-shadow:0 0 90px rgba(249,115,22,.55),0 0 30px rgba(249,115,22,.25)';

/** Session result card. made-up: 8 of 10, a new personal best, three spots. */
export function sessionCard({ h = 1920, name = null } = {}) {
  const p = POS[h];
  const chart = shotChart({ id: `s${h}`, zones: [{ zone: 'mid-center', makes: 4, attempts: 5 }, { zone: 'mid-left-wing', makes: 2, attempts: 2 }, { zone: 'mid-right-wing', makes: 2, attempts: 3 }], scale: 'classic', renderW: p.courtW, pctPx: 38, subPx: 25, yMax: 39, yMin: 6, xRange: [20, 480], below: ['mid-center'], cls: 'block h-auto' });
  return wrap(
    h,
    `${header(p.head, name ? `${name} &middot; 20 Nov` : '20 Nov')}
    <div class="absolute inset-x-0 flex justify-center" style="top:${p.pill}px"><div class="flex items-center gap-4 rounded-full border border-orange-400/50 bg-orange-500/15 text-orange-300" style="height:84px;padding:0 44px"><span style="width:44px;height:44px">${ic('trophy', 'h-full w-full', 2.2)}</span><span style="font-size:36px" class="font-bold uppercase tracking-[0.14em]">New personal best</span></div></div>
    <div class="absolute inset-x-0 text-center font-black tabular-nums" style="top:${p.num}px;font-size:${p.numPx}px;line-height:.9;letter-spacing:-0.04em;${glowNum}">8<span style="color:#71717a">/</span>10</div>
    <div class="absolute inset-x-0 text-center font-black tabular-nums text-orange-400" style="top:${p.pct}px;font-size:${p.pctPx}px;line-height:1">80%</div>
    <div class="absolute inset-x-0 text-center font-semibold text-zinc-300" style="top:${p.sub}px;font-size:40px">10 shots from 3 spots</div>
    <div class="absolute" style="left:${(1080 - p.courtW) / 2}px;top:${p.court}px;width:${p.courtW}px">${chart}</div>`
  );
}

/** Rank card. made-up: Level 5, Prospect, 412 XP, 88 to Level 6, a 12 day streak. */
export function rankCard({ h = 1920 } = {}) {
  const big = h === 1920;
  const D = big ? 600 : 500;
  const top = big ? 410 : 200;
  const R = D / 2 - 30;
  const C = 2 * Math.PI * R;
  const prog = 0.37;
  const ring = `<svg width="${D}" height="${D}" viewBox="0 0 ${D} ${D}" role="img" aria-label="Level 5, 37 percent of the way to Level 6"><defs><linearGradient id="rg${h}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs>
    <circle cx="${D / 2}" cy="${D / 2}" r="${R}" fill="none" stroke="#27272a" stroke-width="40"/>
    <circle cx="${D / 2}" cy="${D / 2}" r="${R}" fill="none" stroke="url(#rg${h})" stroke-width="40" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - prog)}" transform="rotate(-90 ${D / 2} ${D / 2})"/></svg>`;
  const stat = (n, l, icon) => `<div class="flex flex-col items-center"><span style="width:44px;height:44px" class="text-orange-400">${ic(icon, 'h-full w-full', 2.2)}</span><div class="mt-2 font-black tabular-nums" style="font-size:${big ? 100 : 84}px;line-height:1">${n}</div><div class="mt-2 font-semibold uppercase tracking-[0.14em] text-zinc-400" style="font-size:28px">${l}</div></div>`;
  const statsTop = big ? 1285 : 960;
  return wrap(
    h,
    `${header(big ? 300 : 76, '20 Nov')}
    <div class="absolute" style="left:${(1080 - D) / 2}px;top:${top}px;width:${D}px;height:${D}px">${ring}
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center"><div class="font-semibold uppercase tracking-[0.3em] text-zinc-400" style="font-size:36px">Level</div><div class="font-black tabular-nums" style="font-size:${big ? 310 : 260}px;line-height:.9;${glowNum}">5</div></div></div>
    <div class="absolute inset-x-0 flex justify-center" style="top:${top + D - 50}px"><div class="rounded-full border border-orange-400/50 bg-zinc-950 text-orange-300 font-bold uppercase tracking-[0.16em]" style="font-size:38px;padding:16px 50px">Prospect</div></div>
    <div class="absolute inset-x-0 text-center" style="top:${top + D + 55}px"><span class="font-black tabular-nums" style="font-size:80px">412</span><span class="font-bold text-zinc-300" style="font-size:44px"> XP</span><div class="font-semibold text-zinc-300" style="font-size:38px;margin-top:8px">88 XP to Level 6</div></div>
    <div class="absolute grid grid-cols-3" style="left:90px;right:90px;top:${statsTop}px">${stat(12, 'Day streak', 'flame')}${stat(27, 'Sessions', 'target')}${stat(9, 'Badges', 'award')}</div>`
  );
}

/** Safe-zone guide: dashed lines at y 270 and 1500, shaded outside (story size only). */
export const safeOverlay = `<div class="absolute inset-x-0 top-0" style="height:${SAFE_TOP}px;background:rgba(239,68,68,.22);border-bottom:3px dashed #f87171"></div><div class="absolute inset-x-0 bottom-0" style="top:${SAFE_BOTTOM}px;background:rgba(239,68,68,.22);border-top:3px dashed #f87171"></div>`;

/** Wrap a card so it can be shown smaller inside a sheet. */
export const scaled = (html, w, h, k) => `<div style="width:${w * k}px;height:${h * k}px;overflow:hidden"><div style="width:${w}px;height:${h}px;transform:scale(${k});transform-origin:0 0">${html}</div></div>`;

export const cardPage = (title, card) => `<!doctype html>
<html lang="en-IE"><head><meta charset="utf-8"><title>${title}</title>
<!-- Designer polish round, 2026-11-22. Draft only. Made-up data and a made-up first name; no real player, no footage. -->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11"></script>
<style>html,body{margin:0;background:#000}body{font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased}.tabular-nums{font-variant-numeric:tabular-nums}</style></head>
<body>${card}</body></html>`;
