// Builds the shot chart redesign mockups: the app's shot chart card, the first-session result hero, and the session share card.
import { ic, page, phone, cap, court } from './2026-11-22-polish-lib.mjs';
import { shotChart, legend, oldHeatMap, oldLegend, SCALES, bandIndex, pctOf, ZONE_LABEL } from './2026-11-22-shotchart-lib.mjs';
import { sessionCard, scaled } from './2026-11-22-polish-cards.mjs';

// made-up month of zone data, spread over the five bands
const ZONES = [
  { zone: 'paint', makes: 14, attempts: 22 }, { zone: 'three-right-corner', makes: 7, attempts: 12 }, { zone: 'mid-right-wing', makes: 11, attempts: 20 },
  { zone: 'free-throw', makes: 6, attempts: 14 }, { zone: 'mid-left-corner', makes: 4, attempts: 10 }, { zone: 'three-top', makes: 8, attempts: 26 },
  { zone: 'mid-left-wing', makes: 5, attempts: 18 }, { zone: 'three-left-wing', makes: 3, attempts: 17 },
];
const OLD_TEXT = (p) => (p >= 50 ? 'text-red-400' : p >= 40 ? 'text-orange-400' : p >= 33 ? 'text-amber-400' : p >= 25 ? 'text-slate-400' : 'text-blue-400');
const sorted = [...ZONES].sort((a, b) => pctOf(b) - pctOf(a));

const head = () => `<div class="mb-3 flex flex-wrap items-center gap-2 text-lg font-bold text-white">${ic('target', 'h-5 w-5 text-orange-400')}Your shot chart<span class="text-xs font-semibold text-zinc-500">last 30 days</span></div>`;
const listBefore = `<div class="mt-4 grid grid-cols-1 gap-x-5 gap-y-1.5">${sorted.map((z) => `<div class="flex items-center justify-between gap-2 text-sm"><span class="truncate text-zinc-300">${ZONE_LABEL[z.zone]}</span><span class="flex-shrink-0 font-semibold"><span class="${OLD_TEXT(pctOf(z))}">${pctOf(z)}%</span> <span class="text-xs text-zinc-500">${z.makes}/${z.attempts}</span></span></div>`).join('')}</div>`;
const listAfter = `<div class="mt-4 space-y-1">${sorted.map((z) => { const b = SCALES.classic.bands[bandIndex(pctOf(z))]; return `<div class="flex min-h-8 items-center gap-2.5 text-sm"><span class="h-3 w-3 flex-none rounded-[4px] ring-1 ring-white/20" style="background:${b.fill}"></span><span class="min-w-0 flex-1 truncate text-zinc-200">${ZONE_LABEL[z.zone]}</span><span class="font-black tabular-nums text-white">${pctOf(z)}%</span><span class="w-12 text-right tabular-nums text-zinc-400">${z.makes}/${z.attempts}</span></div>`; }).join('')}</div>`;

export function shotchart({ write }) {
  const card = (inner) => `<div class="p-4"><div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">${inner}</div></div>`;
  const before = card(`${head()}${oldHeatMap(ZONES)}${oldLegend}${listBefore}`);
  const after = card(`${head()}${shotChart({ id: 'scr', zones: ZONES, scale: 'classic', renderW: 326, pctPx: 14, subPx: 12 })}<div class="mt-3">${legend('classic')}</div>${listAfter}`);
  write('shotchart-screen', page({
    title: 'Shot chart redesign: the shot chart card',
    body: `<div class="mx-auto flex w-[852px] gap-6 p-6">
      <div>${cap('Today (rebuilt from ShotHeatMap.tsx and CourtMarkings.tsx)')}${phone(before, { h: 790, measure: false })}
        <p class="mt-3 text-sm text-zinc-300" style="width:390px">A plain line court, soft blobs, numbers drawn with a dark outline, an 11px key, and one flat tone for the floor.</p></div>
      <div>${cap('New: hardwood, soft-edged zones, a small chip on each', 'after')}${phone(after, { h: 790 })}
        <p class="mt-3 text-sm text-zinc-300" style="width:390px">The 13 real zones are filled on the classic scale (founder, 22 Nov) with soft edges and a little see-through, so the hardwood shows. Each zone gets one small dark chip, percent first and makes/attempts beside it, edged in the zone colour. The corner three is a 3 ft strip, so its chip shows the percent only, against the sideline and inside the court. The key is 12px and has the words.</p></div>
    </div>`,
  }));

  const hero = (chartHtml, w = 390) => `<div class="p-4"><div class="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-600/25 via-zinc-900 to-zinc-950 p-5">
      <div class="pointer-events-none absolute left-1/2 top-0 h-64 w-80 -translate-x-1/2" style="background:radial-gradient(closest-side,rgba(249,115,22,.35),transparent)"></div>
      <div class="relative text-center"><div class="font-black leading-none tabular-nums tracking-tight text-white" style="font-size:${w < 380 ? 96 : 104}px;letter-spacing:-0.04em;text-shadow:0 0 44px rgba(249,115,22,.55)">6<span class="text-zinc-500">/</span>10</div>
        <div class="mt-2 flex items-center justify-center gap-2"><span class="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xl font-black tabular-nums text-emerald-300">60%</span><span class="text-sm text-zinc-300">from Mid top</span></div></div>
      <div class="relative mt-3">${chartHtml}</div></div></div>`;
  const oldChart = court({ id: 'res', crop: '0 6 220 124', lineW: 1.4, line: '#71717a', lineOp: 0.8, cls: 'block h-auto w-full', blobs: [{ x: 110, y: 78, r: 54, c: '#f97316', o: 0.95 }], labels: [{ x: 110, y: 74, t: '60%', s: 19, sub: '6/10' }] });
  const newChart = (w) => shotChart({ id: `rh${w}`, zones: [{ zone: 'mid-center', makes: 6, attempts: 10 }], scale: 'classic', renderW: w - 32 - 40 - 2, pctPx: 16, subPx: 12, yMax: 40, yMin: 9, xRange: [50, 450], below: ['mid-center'] });
  write('shotchart-result', page({
    title: 'Shot chart redesign: the first-session result',
    body: `<div class="mx-auto flex w-[1236px] gap-6 p-6">
      <div>${cap('Before (first polish pass)')}${phone(hero(oldChart), { h: 520, measure: false })}</div>
      <div>${cap('New, at 390 px', 'after')}${phone(hero(newChart(390)), { h: 520 })}</div>
      <div><p class="mb-2 text-sm font-semibold text-orange-300" style="width:360px">New, at 360 px wide</p><div class="relative overflow-hidden rounded-[24px] border border-zinc-700 bg-zinc-950" style="width:360px;height:520px" data-measure>${hero(newChart(360), 360)}</div></div>
    </div>`,
  }));

  const k = 0.42;
  write('shotchart-share', page({
    title: 'Shot chart redesign: the session share card',
    body: `<div class="mx-auto flex gap-6 p-6" style="width:${Math.round(1080 * k * 2 + 100)}px">
      <div><p class="mb-2 text-sm font-semibold text-zinc-300">Before (first polish pass)</p><div class="overflow-hidden rounded-[18px] border border-zinc-700"><img src="2026-11-22-shotchart-before-share-1920.png" style="width:${Math.round(1080 * k)}px" alt="Before"></div></div>
      <div><p class="mb-2 text-sm font-semibold text-orange-300">New (full size: 2026-11-22-polish-share-session-1920.png)</p><div class="overflow-hidden rounded-[18px] border border-zinc-700">${scaled(sessionCard({ h: 1920 }), 1080, 1920, k)}</div></div>
    </div>`,
  }));
}
