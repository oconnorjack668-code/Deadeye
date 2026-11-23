// Shared helpers for the 2026-11-22 polish mockups: lucide icons inlined (ISC licence), page head, phone frame,
// bottom tab bar, the drawn court and gym scene. Draft tooling, made-up data, no real footage and no real player.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
const ICONS = JSON.parse(fs.readFileSync(path.join(HERE, '2026-11-22-polish-icons.json'), 'utf8'));

/** Inline lucide icon. Same look as lucide-react: 24 grid, 2 stroke, round caps. */
export function ic(name, cls = 'h-5 w-5', sw = 2, fill = false) {
  if (!ICONS[name]) throw new Error(`icon missing: ${name}`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

export const LOGO = '../../../../public/logo.png';

/** One page: the app's Tailwind v4 classes (browser build), the app's palette overrides from globals.css, Geist. */
export function page({ title, body, bg = '#2a2a2e', note = '' }) {
  return `<!doctype html>
<html lang="en-IE"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Designer polish round, 2026-11-22. Draft only. Made-up data, no real footage, no real player. ${note}
     Built by 2026-11-22-polish-build.mjs from the app's own Tailwind classes (src/, docs/design.md). Lucide icons (ISC) inlined. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11"></script>
<style type="text/tailwindcss">
@theme { --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif; --color-zinc-500:#8b8b94; --color-orange-600: oklch(55.3% 0.195 38.402); --color-emerald-600: oklch(50.8% 0.118 165.612); }
</style>
<style>
  html,body{margin:0}
  body{background:${bg};font-family:'Geist',system-ui,sans-serif;color:#f4f4f5;-webkit-font-smoothing:antialiased}
  .tabnum{font-variant-numeric:tabular-nums}
</style></head>
<body>
${body}
</body></html>`;
}

/** A phone-width frame. measure=true marks it for the contrast script. */
export function phone(inner, { h = 844, measure = true, cls = '' } = {}) {
  return `<div class="relative overflow-hidden rounded-[24px] border border-zinc-700 bg-zinc-950 ${cls}" style="width:390px;height:${h}px" ${measure ? 'data-measure' : ''}>${inner}</div>`;
}

/** A saved screenshot of today's live screen, cropped to a phone frame. */
export function beforeShot(src, h, { zoom = 1.5 } = {}) {
  return `<div class="overflow-hidden rounded-[24px] border border-zinc-700 bg-zinc-950" style="width:390px;height:${h}px"><img src="${src}" class="block" style="width:${390}px" alt="Today's screen"></div>`;
}

export const cap = (t, tone = 'before') =>
  `<p class="mb-2 text-sm font-semibold ${tone === 'after' ? 'text-orange-300' : 'text-zinc-300'}" style="width:390px">${t}</p>`;
export const note = (t, w = 390) => `<p class="mt-3 text-sm text-zinc-300" style="width:${w}px">${t}</p>`;

/** The app's bottom bar (BottomNav.tsx). polished: white active tab with a small orange bar; today: red active tab. */
export function tabBar({ polished = true, active = 'Home' }) {
  const items = [
    ['Home', 'layout-dashboard'], ['Hoops', 'target'], ['Gym', 'dumbbell'], ['Train', 'calendar-check'], ['IQ', 'book-open'],
  ];
  return `<div class="absolute inset-x-0 bottom-0 border-t border-zinc-800/90 bg-zinc-950"><div class="grid grid-cols-5 px-1 pb-2 pt-1.5">${items
    .map(([l, i]) => {
      const on = l === active;
      const colour = on ? 'text-red-500 font-semibold' : 'text-zinc-400';
      return `<div class="relative flex flex-col items-center justify-center rounded-xl py-1.5 ${colour}">${ic(i, 'h-6 w-6')}<span class="mt-0.5 text-xs tracking-tight">${l}</span></div>`;
    })
    .join('')}</div></div>`;
}

/** The round Log button. open=true is the zinc close button. */
export function logButton({ polished = true, open = false }) {
  const tone = open ? 'bg-zinc-700' : polished ? 'bg-orange-600' : 'bg-red-600';
  return `<span class="absolute bottom-[5.5rem] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full ${tone} text-white shadow-2xl ring-1 ring-black/20">${ic(open ? 'x' : 'plus', open ? 'h-6 w-6' : 'h-7 w-7')}</span>`;
}

/* ---------------- the drawn half court (original line art) ---------------- */
const ARC = 'M13 190 V128 A104.5 104.5 0 0 1 207 128 V190';
/**
 * Half court, 220 x 200 units. blobs: [{x,y,r,c}] zone glows (c is a css colour). labels: [{x,y,t,s}].
 * crop: viewBox override (for a shorter chart). line/lineOp style the markings.
 */
export function court({ id = 'c', blobs = [], labels = [], line = '#71717a', lineW = 1.5, lineOp = 1, rim = '#f97316', crop = '0 0 220 200', cls = 'w-full h-auto', label = 'Half court shot chart' } = {}) {
  return `<svg class="${cls}" viewBox="${crop}" role="img" aria-label="${label}">
  <defs>${blobs
    .map((b, i) => `<radialGradient id="${id}b${i}"><stop offset="0" stop-color="${b.c}" stop-opacity="${b.o ?? 0.9}"/><stop offset=".55" stop-color="${b.c}" stop-opacity="${(b.o ?? 0.9) * 0.45}"/><stop offset="1" stop-color="${b.c}" stop-opacity="0"/></radialGradient>`)
    .join('')}</defs>
  ${blobs.map((b, i) => `<circle cx="${b.x}" cy="${b.y}" r="${b.r}" fill="url(#${id}b${i})"/>`).join('')}
  <g fill="none" stroke="${line}" stroke-width="${lineW}" stroke-linecap="round" stroke-linejoin="round" opacity="${lineOp}">
    <path d="M2 190 V10 H218 V190 Z"/>
    <rect x="75" y="106" width="70" height="84"/>
    <path d="M84 106 A26 26 0 0 1 136 106"/>
    <path d="M84 106 A26 26 0 0 0 136 106" stroke-dasharray="3 4" opacity=".6"/>
    <path d="${ARC}"/>
    <path d="M97 173 H123"/>
    <circle cx="110" cy="167" r="6" stroke="${rim}" stroke-width="${lineW + 0.7}" opacity="1"/>
  </g>
  ${labels
    .map(
      (l) => `<text x="${l.x}" y="${l.y}" text-anchor="middle" dominant-baseline="middle" font-family="Geist, system-ui, sans-serif" font-weight="900" font-size="${l.s ?? 15}" fill="#fff" stroke="#09090b" stroke-width="${(l.s ?? 15) * 0.22}" paint-order="stroke">${l.t}</text>${
        l.sub
          ? `<text x="${l.x}" y="${l.y + (l.s ?? 15) * 0.95}" text-anchor="middle" dominant-baseline="middle" font-family="Geist, system-ui, sans-serif" font-weight="700" font-size="${(l.s ?? 15) * 0.62}" fill="#d4d4d8" stroke="#09090b" stroke-width="${(l.s ?? 15) * 0.16}" paint-order="stroke">${l.sub}</text>`
          : ''
      }`
    )
    .join('')}
</svg>`;
}

export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ---------------- a made-up empty gym, no people, no real footage ---------------- */
export function scene(W, H, { rimTone = null, ball = null } = {}) {
  const rim = { x0: 0.56, x1: 0.68, y: 0.42 };
  const colour = rimTone === 'make' ? '#34d399' : rimTone === 'miss' ? '#f87171' : '#f97316';
  const rx0 = rim.x0 * W, rx1 = rim.x1 * W, ry = rim.y * H;
  const u = Math.min(W, H) / 360;
  return `
  <svg class="absolute inset-0 h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="160" height="90" fill="#46505c"/><rect width="160" height="16" fill="#2c333b"/><rect y="16" width="160" height="2" fill="#586472"/>
    <rect y="68" width="160" height="22" fill="#6a5238"/><rect y="68" width="160" height="1.3" fill="#8b6f4b"/>
    <rect x="104" y="20" width="22" height="21" rx="1" fill="#d7dce2" stroke="#8d97a3" stroke-width=".7"/><rect x="109" y="28" width="12" height="9" fill="none" stroke="#8d97a3" stroke-width=".6"/>
    <line x1="${rim.x0 * 160}" y1="${rim.y * 90}" x2="${rim.x1 * 160}" y2="${rim.y * 90}" stroke="#4b4f55" stroke-width="1"/>
    <path d="M${rim.x0 * 160 + 1} ${rim.y * 90}l3 9M${rim.x0 * 160 + 4} ${rim.y * 90}l1.5 9M${rim.x0 * 160 + 7} ${rim.y * 90}l0 9M${rim.x0 * 160 + 10} ${rim.y * 90}l-1.5 9M${rim.x1 * 160 - 1} ${rim.y * 90}l-3 9" stroke="rgba(255,255,255,.35)" stroke-width=".4"/>
    <rect x="12" y="40" width="26" height="28" fill="#39424d"/><rect x="132" y="30" width="20" height="38" fill="#39424d"/>
  </svg>
  <svg class="absolute inset-0 h-full w-full" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <g stroke-linecap="round">
      <line x1="${rx0}" y1="${ry}" x2="${rx1}" y2="${ry}" stroke="${rimTone ? colour + '66' : 'rgba(0,0,0,.45)'}" stroke-width="${(rimTone ? 9 : 6) * u}"/>
      <line x1="${rx0}" y1="${ry}" x2="${rx1}" y2="${ry}" stroke="${colour}" stroke-width="${3 * u}"/>
      <circle cx="${rx0}" cy="${ry}" r="${4 * u}" fill="${colour}"/><circle cx="${rx1}" cy="${ry}" r="${4 * u}" fill="${colour}"/>
    </g>
    ${ball ? `<circle cx="${ball[0] * W}" cy="${ball[1] * H}" r="${8 * u}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="${4 * u}"/><circle cx="${ball[0] * W}" cy="${ball[1] * H}" r="${8 * u}" fill="none" stroke="#fff" stroke-width="${2 * u}"/>` : ''}
  </svg>`;
}

/** The original (red-ringed) Deadeye mark with a soft glow behind it. */
export const logo = (size = 48, glow = true) =>
  `<span class="relative inline-block" style="width:${size}px;height:${size}px">${glow ? `<span class="absolute rounded-full" style="inset:-${size * 0.35}px;background:radial-gradient(closest-side,rgba(249,115,22,0.30),transparent)"></span>` : ''}<img src="${LOGO}" alt="Deadeye" class="relative block rounded-full" style="width:${size}px;height:${size}px"></span>`;
