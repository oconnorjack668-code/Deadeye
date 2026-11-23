// Screens 5 and 6: the share cards (files and an overview sheet) and Watch it back in today's look.
import fs from 'node:fs';
import path from 'node:path';
import { ic, page, phone, cap, scene, clock } from './2026-11-22-polish-lib.mjs';
import { sessionCard, rankCard, safeOverlay, scaled, cardPage } from './2026-11-22-polish-cards.mjs';

/* ------------------------------ share cards ------------------------------ */
export function cards({ OUT, write }) {
  const f = (n, html) => fs.writeFileSync(path.join(OUT, `2026-11-22-polish-${n}.html`), html);
  f('share-session-1920', cardPage('Share card: session result, 1080x1920', sessionCard({ h: 1920 })));
  f('share-session-1350', cardPage('Share card: session result, 1080x1350', sessionCard({ h: 1350 })));
  f('share-rank-1920', cardPage('Share card: rank, 1080x1920', rankCard({ h: 1920 })));
  f('share-rank-1350', cardPage('Share card: rank, 1080x1350', rankCard({ h: 1350 })));
  f('share-safezone-1920', cardPage('Share card: session result with the safe zone marked', `<div class="relative" style="width:1080px;height:1920px">${sessionCard({ h: 1920 })}${safeOverlay}</div>`));

  const k = 0.3;
  const item = (label, html, w, h, tone = 'after') => `<div>${`<p class="mb-2 text-sm font-semibold ${tone === 'after' ? 'text-orange-300' : 'text-zinc-300'}" style="width:${w * k}px">${label}</p>`}<div class="overflow-hidden rounded-[18px] border border-zinc-700">${scaled(html, w, h, k)}</div></div>`;
  const beforeImg = `<img src="2026-11-20-review-before-sharecard-rank.png" style="width:1080px;height:1350px;object-fit:cover;object-position:left top" alt="Today's rank share card">`;
  write(
    'share-overview',
    page({
      title: 'Polish: share cards, today and polished',
      body: `<div class="mx-auto p-6" style="width:1470px">
        <div class="flex items-start gap-6">
          ${item('Today: the rank card (live, 1080 x 1350)', beforeImg, 1080, 1350, 'before')}
          ${item('Session result, 1080 x 1920', sessionCard({ h: 1920 }), 1080, 1920)}
          ${item('Rank, 1080 x 1920', rankCard({ h: 1920 }), 1080, 1920)}
          ${item('Session result with the story safe zone (red = covered by the app)', `<div class="relative" style="width:1080px;height:1920px">${sessionCard({ h: 1920 })}${safeOverlay}</div>`, 1080, 1920)}
        </div>
        <div class="mt-8 flex items-start gap-6">
          ${item('Session result, feed 1080 x 1350', sessionCard({ h: 1350 }), 1080, 1350)}
          ${item('Same card with "Show my name" on (made-up first name)', sessionCard({ h: 1350, name: 'Sam' }), 1080, 1350)}
          ${item('Rank, feed 1080 x 1350', rankCard({ h: 1350 }), 1080, 1350)}
          <p class="text-sm text-zinc-300" style="width:420px">Made-up data and a made-up first name. The name is off by default (founder, 22 Nov): with it off the card shows only the date and the Deadeye mark; the switch in the share sheet adds a first name beside the date. No face, school or place, ever. The shot chart is the player's own zones (same data as the app's shot chart), so every card is theirs and nobody else's.</p>
        </div></div>`,
    })
  );
}

/* ------------------------------ Watch it back ------------------------------ */
const DUR = 48;
const SHOTS = [
  { n: 1, t: 4, k: 'make' }, { n: 2, t: 9, k: 'miss' }, { n: 3, t: 13, k: 'make' }, { n: 4, t: 18, k: 'make' }, { n: 5, t: 23, k: 'unclear' },
  { n: 6, t: 27, k: 'miss' }, { n: 7, t: 31, k: 'make' }, { n: 8, t: 37, k: 'make' }, { n: 9, t: 43, k: 'miss' },
];
const score = (T) => { const c = SHOTS.filter((s) => s.t <= T); const m = c.filter((s) => s.k === 'make').length; return { m, a: c.length, pct: c.length ? Math.round((m / c.length) * 100) : 0 }; };

function hud(T, flash) {
  const s = score(T);
  return `<div class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent"></div>
  <div class="absolute left-3 top-2 text-white"><div class="flex items-end gap-2"><span class="text-5xl font-black leading-none tabular-nums drop-shadow-lg">${s.m}<span class="text-3xl text-zinc-300">/${s.a}</span></span><span class="mb-1 text-2xl font-black leading-none text-orange-400 tabular-nums drop-shadow-lg">${s.pct}%</span></div><div class="mt-1 text-sm font-semibold tabular-nums text-zinc-300 drop-shadow">${clock(T)}</div></div>
  <div class="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${flash ? 'bg-emerald-700/95 text-white' : 'bg-black/55 text-zinc-100'}"><span class="h-2 w-2 rounded-full bg-current"></span>${flash ? 'Ball tracked' : 'Watching the hoop'}</div>
  ${flash ? `<div class="absolute inset-0 bg-emerald-500/25"></div><div class="absolute font-black uppercase leading-none tracking-tight text-3xl text-emerald-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]" style="left:71%;top:42%;transform:translateY(-50%)">Make</div>` : ''}
  <div class="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm">${ic('maximize', 'h-5 w-5')}</div>`;
}
function pin(s, cur) {
  const left = (s.t / DUR) * 100;
  const ring = cur ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : '';
  const inner = s.k === 'make' ? `<span class="block h-3 w-3 rounded-full bg-emerald-400 ${ring}"></span>` : s.k === 'miss' ? `<span class="block h-3 w-3 rounded-full border-2 border-red-400 ${ring}"></span>` : `<span class="block h-2.5 w-2.5 rotate-45 bg-amber-400 ${ring}"></span>`;
  return `<span class="absolute top-[6px] flex -translate-x-1/2 items-center justify-center" style="left:${left}%">${inner}</span>`;
}
const rail = (T, cur) => { const f = (T / DUR) * 100; return `<div class="relative h-11 select-none"><div class="absolute inset-x-[10px] top-0 h-full">${SHOTS.map((s) => pin(s, s.n === cur)).join('')}<div class="absolute inset-x-0 top-[25px] h-1.5 rounded-full bg-zinc-500"><div class="h-full rounded-full bg-white" style="width:${f}%"></div></div><div class="absolute top-[18px] h-5 w-5 -translate-x-1/2 rounded-full bg-white shadow-md ring-2 ring-zinc-900" style="left:${f}%"></div></div></div>`; };
const sec = 'flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-100';
function watchCard(kind) {
  const T = kind === 'shot' ? 31.4 : 34.2;
  const flash = kind === 'shot';
  const strip = kind === 'shot'
    ? `<div class="flex items-center justify-between gap-2"><div class="min-w-0"><p class="text-sm font-semibold text-white">Shot 7 <span class="font-normal tabular-nums text-zinc-400">· 0:31</span></p><p class="text-sm text-zinc-400">Tracker said Make. Tap to change.</p></div><span class="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-sm text-zinc-300">${ic('x', 'h-4 w-4')} Not a shot</span></div>
       <div class="mt-3 grid grid-cols-2 gap-2"><span class="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 font-semibold text-white" style="box-shadow:0 0 26px -8px rgba(16,185,129,.6)">${ic('check', 'h-4 w-4', 2.5)} Make</span><span class="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-red-500/70 font-semibold text-red-300">${ic('x', 'h-4 w-4', 2.5)} Miss</span></div>`
    : `<div><p class="text-sm font-semibold text-white">No call here</p><p class="text-sm text-zinc-400">Paused at <span class="tabular-nums">0:34</span>. Missed one? Add it.</p></div>
       <div class="mt-3 grid grid-cols-2 gap-2"><span class="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/70 text-sm font-semibold text-emerald-300">${ic('plus', 'h-4 w-4', 2.5)} Add a make here</span><span class="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-red-500/70 text-sm font-semibold text-red-300">${ic('plus', 'h-4 w-4', 2.5)} Add a miss here</span></div>`;
  return `<section class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
    <div class="flex items-center justify-between px-4 pb-2 pt-3"><h2 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">${ic('video', 'h-4 w-4')} Watch it back</h2>
      <div class="flex items-center gap-3 text-xs text-zinc-400"><span class="flex items-center gap-1"><span class="block h-2.5 w-2.5 rounded-full bg-emerald-400"></span>Make</span><span class="flex items-center gap-1"><span class="block h-2.5 w-2.5 rounded-full border-2 border-red-400"></span>Miss</span><span class="flex items-center gap-1"><span class="block h-2 w-2 rotate-45 bg-amber-400"></span>Unclear</span></div></div>
    <div class="relative overflow-hidden bg-black" style="width:358px;height:201px">${scene(358, 201, { rimTone: flash ? 'make' : null })}${hud(T, flash)}</div>
    <div class="px-3 pt-1">${rail(T, kind === 'shot' ? 7 : null)}</div>
    <div class="flex items-center gap-2 px-3 pb-3"><span class="flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-950">${ic('play', 'h-5 w-5 translate-x-0.5', 2, true)}</span><span class="${sec} h-11 w-11">${ic('skip-back', 'h-5 w-5', 2, true)}</span><span class="${sec} h-11 w-11">${ic('skip-forward', 'h-5 w-5', 2, true)}</span><span class="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-zinc-300">${clock(T)} <span class="font-normal text-zinc-400">/ ${clock(DUR)}</span></span><span class="${sec} h-11 w-14 text-sm font-bold tabular-nums">1×</span></div>
    <div class="border-t border-zinc-800 px-3 py-3" style="min-height:124px">${strip}</div></section>`;
}
const verdict = `<div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-center"><div class="text-4xl font-black tabular-nums text-orange-400">5/9</div><div class="text-sm text-zinc-400">56% · watch it back to check the calls</div><div class="mt-1 text-sm font-semibold text-amber-400">1 shot the tracker could not call: watch and set it below</div></div>`;
const pb = `<div class="flex items-start gap-3 rounded-2xl border border-emerald-600/40 bg-emerald-600/10 p-4"><span class="mt-0.5 flex-shrink-0 text-emerald-400">${ic('trophy', 'h-5 w-5')}</span><div><p class="font-bold text-white">New personal best: 56%</p><p class="mt-1 text-sm text-zinc-300">Your best before was 50% (4/8). Save the session to keep it.</p></div></div>`;
const head = `<div class="flex items-end justify-between px-4 pb-3 pt-4"><div><p class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Hoops</p><h1 class="text-xl font-black tracking-tight text-white">Shot tracker</h1></div><p class="pb-0.5 text-sm text-zinc-400">Review</p></div>`;

function rowBefore(s, active) {
  const mid = s.k === 'unclear'
    ? '<div class="flex flex-1 items-center gap-1.5"><span class="text-xs font-semibold text-amber-400">Unclear</span><span class="flex-1 rounded-md border border-emerald-600/40 py-1 text-center text-xs font-semibold text-emerald-300">Make</span><span class="flex-1 rounded-md border border-red-600/40 py-1 text-center text-xs font-semibold text-red-300">Miss</span></div>'
    : `<span class="flex-1 rounded-md py-1 text-center font-semibold ${s.k === 'make' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}">${s.k === 'make' ? 'Make' : 'Miss'}</span>`;
  return `<div class="rounded-lg bg-zinc-900/70 px-3 py-2 text-sm"><div class="flex items-center gap-2"><span class="w-8 text-zinc-500">#${s.n}</span><span class="flex h-9 w-14 items-center gap-1 rounded-md text-zinc-400">${ic('play', 'h-3.5 w-3.5')} ${clock(s.t)}</span>${mid}<span class="text-xs text-cyan-400 underline">Form</span><span class="text-zinc-500">${ic('x', 'h-4 w-4')}</span></div></div>`;
}
function rowAfter(s, active) {
  const mid = s.k === 'unclear'
    ? '<div class="flex flex-1 items-center gap-1.5"><span class="flex items-center gap-1 text-sm font-semibold text-amber-400"><span class="block h-2 w-2 rotate-45 bg-amber-400"></span>Unclear</span></div>'
    : `<span class="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold ${s.k === 'make' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}">${ic(s.k === 'make' ? 'check' : 'x', 'h-4 w-4', 2.5)}${s.k === 'make' ? 'Make' : 'Miss'}</span>`;
  return `<div class="rounded-xl px-3 py-1.5 text-sm ${active ? 'bg-zinc-800 ring-1 ring-zinc-500' : 'bg-zinc-900/70'}"><div class="flex items-center gap-2"><span class="w-7 text-zinc-400">#${s.n}</span><span class="flex h-11 w-[68px] items-center gap-1.5 rounded-lg ${active ? 'text-white' : 'text-zinc-300'}">${ic('play', 'h-3.5 w-3.5', 2, true)}<span class="tabular-nums">${clock(s.t)}</span></span>${mid}<span class="flex h-11 w-11 items-center justify-center text-zinc-400">${ic('x', 'h-4 w-4')}</span></div></div>`;
}
const list = (rows, from, n, active, label) => `<div class="space-y-2"><div class="flex items-baseline justify-between"><h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Every call · 9</h2><p class="text-sm text-zinc-${label === 'after' ? 400 : 500}">Tap a time to watch that shot</p></div><div class="space-y-1.5">${SHOTS.filter((s) => s.n >= from).slice(0, n).map((s) => rows(s, s.n === active)).join('')}</div></div>`;

const quality = `<div class="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"><div class="flex items-center justify-between gap-2 text-xs"><span class="font-semibold uppercase tracking-wider text-zinc-400">Tracking quality</span><span class="tabular-nums text-zinc-400">28 fps analysed</span></div><p class="mt-1.5 text-sm text-zinc-500">Good conditions. The counts below should be close, but check them anyway.</p></div>`;
const todayBefore = `${head}<div class="space-y-4 px-4">${verdict}${pb}${quality}${list(rowBefore, 1, 5, null, 'before')}<div class="rounded-xl border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">A row's ▶ opens a pop-up replay with no score on it. There is no way to watch the whole clip.</div></div>`;

export function watch({ write }) {
  const wrapSpace = (kind, active) => `${head}<div class="space-y-4 px-4">${verdict}${pb}${watchCard(kind)}${list(rowAfter, kind === 'shot' ? 6 : 6, 3, active, 'after')}</div>`;
  write(
    'watch',
    page({
      title: 'Polish: Watch it back, paused on a shot and between shots',
      body: `<div class="mx-auto flex w-[1278px] gap-6 p-6">
        <div>${cap('Today: the review step (rebuilt from ShotTracker.tsx)')}${phone(todayBefore, { h: 1130, measure: false })}
          <p class="mt-3 text-sm text-zinc-300" style="width:390px">Numbers only. The player never sees the tracker's calls on the clip and cannot find a missed shot.</p></div>
        <div>${cap('Polished: paused on a shot', 'after')}${phone(wrapSpace('shot', 7), { h: 1130 })}
          <p class="mt-3 text-sm text-zinc-300" style="width:390px">Same cards and look as today's review. New: the player card between the personal best and the list, a white play button, 14px help text, a lit green Make.</p></div>
        <div>${cap('Polished: paused between shots', 'after')}${phone(wrapSpace('between', null), { h: 1130 })}
          <p class="mt-3 text-sm text-zinc-300" style="width:390px">Same strip height, so nothing jumps. The two add buttons keep the make and miss colours, with a plus, never colour alone.</p></div>
      </div>`,
    })
  );
}
