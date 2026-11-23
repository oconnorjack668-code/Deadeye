// Screens 3 and 4: Today (new player, after the first session) with the Log menu, and the first-session result.
import { ic, page, phone, cap, note, tabBar, logButton, court, logo, LOGO } from './2026-11-22-polish-lib.mjs';
import { sessionCard, scaled } from './2026-11-22-polish-cards.mjs';
import { shotChart } from './2026-11-22-shotchart-lib.mjs';

const PRIMARY_TODAY = 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-md shadow-orange-950/20';

/* ------------------------------ Today ------------------------------ */
function stepBefore(title, detail) {
  return `<div class="flex items-center gap-3 rounded-xl px-2 py-2"><span class="h-6 w-6 flex-shrink-0 rounded-full border-2 border-zinc-600"></span><span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-white">${title}</span><span class="block text-xs text-zinc-500">${detail}</span></span>${ic('chevron-right', 'h-4 w-4 flex-shrink-0 text-zinc-500')}</div>`;
}
function stepAfter(title, detail) {
  return `<div class="flex items-center gap-3 rounded-xl px-2 py-2"><span class="h-6 w-6 flex-shrink-0 rounded-full border-2 border-zinc-500"></span><span class="min-w-0 flex-1"><span class="block text-sm font-semibold text-white">${title}</span><span class="block text-sm text-zinc-400">${detail}</span></span>${ic('chevron-right', 'h-4 w-4 flex-shrink-0 text-zinc-400')}</div>`;
}
const STEPS = [
  ['Add Deadeye to your home screen', 'It opens full screen, like any app. Reminders work on iPhone.'],
  ['Watch the tracker call a session', 'A 30-second sample clip. No court or ball needed.'],
  ["Answer today's IQ question", 'One question a day about reads, rules and decisions.'],
  ['Log your first shots', 'Tap where you shot from, then how many went in.'],
];

function todayNew(p) {
  const head = p
    ? `<h1 class="mb-4 flex items-center gap-2 text-xl font-black tracking-tight text-white">Sam<span class="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-sm font-semibold text-zinc-300">${ic('flame', 'h-3.5 w-3.5 text-zinc-400')}Start a streak today</span></h1>`
    : `<h1 class="mb-4 text-xl font-black tracking-tight text-white">Sam<span class="ml-2 align-middle text-sm font-semibold text-zinc-500">Start a streak today</span></h1>`;
  const todayCard = p
    ? `<div class="mb-4 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
        <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-300">${ic('target', 'h-4 w-4')} Today</div>
        <div class="mt-1 text-xl font-black text-white">Log your first shots</div>
        <div class="text-sm text-zinc-300">Tap where you shoot from, then how many went in. Your shot chart starts with the first spot.</div>
        <a class="${PRIMARY_TODAY} mt-3">${ic('plus', 'h-4 w-4')} Log shots</a>
        <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300"><span class="flex items-center gap-1.5">${ic('camera', 'h-4 w-4 text-zinc-400')}<u class="font-semibold underline-offset-2">Track with the camera</u></span><span class="flex items-center gap-1.5">${ic('list-checks', 'h-4 w-4 text-zinc-400')}<u class="font-semibold underline-offset-2">See shooting programs</u></span></p></div>`
    : `<div class="mb-4 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
        <div class="text-xs font-bold uppercase tracking-wider text-orange-300">Today</div>
        <div class="mt-1 text-xl font-black text-white">Log your first shots</div>
        <div class="text-sm text-zinc-300">Tap where you shoot from, then how many went in. Your shot chart starts with the first spot.</div>
        <a class="${PRIMARY_TODAY} mt-3">Log shots</a>
        <p class="mt-3 text-xs text-zinc-400">Or <u class="font-semibold text-zinc-300">track with the camera</u> · <u class="font-semibold text-zinc-300">see shooting programs</u></p></div>`;
  const steps = `<div class="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wider text-amber-300">Starting steps · 0 of 4</p><p class="mt-0.5 text-sm text-zinc-300">Finish all four for a <span class="font-bold text-amber-300">+50 XP</span> bonus.</p></div><span class="p-1 text-zinc-${p ? 400 : 500}">${ic('x', 'h-4 w-4')}</span></div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div class="h-full w-0 rounded-full bg-amber-400"></div></div>
      <div class="mt-3 space-y-1.5">${STEPS.map(([t, d]) => (p ? stepAfter(t, d) : stepBefore(t, d))).join('')}</div></div>`;
  const founding = `<div class="mb-4 rounded-2xl border border-amber-500/40 bg-zinc-900/70 p-5"><p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">${ic('gift', 'h-4 w-4')} Founding member offer</p><p class="mt-1 text-lg font-black text-white">The first 100 players get 3 months of Pro free</p><p class="mt-1 text-sm text-zinc-300">Every Pro feature, with no card and nothing to cancel.</p></div>`;
  return `<div class="p-4 ${p ? 'pb-28' : ''}">${head}${todayCard}${steps}${founding}</div>${tabBar({ polished: p })}${logButton({ polished: p })}`;
}

/* after the first session, a player with no program yet */
function tile({ p, label, icon, value, pill, pillTone, hint, bar }) {
  if (!p) {
    const tone = { orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30', red: 'bg-red-500/15 text-red-400 border-red-500/30', green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }[pillTone.before];
    const col = { orange: 'text-orange-400', red: 'text-red-400', green: 'text-emerald-400', cyan: 'text-cyan-400' }[pillTone.before];
    return `<div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div class="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">${label}</div>
      <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><span class="text-2xl font-black leading-none ${col}">${value}</span><span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}">${pill.before}</span></div>
      <div class="mt-2 text-xs text-zinc-500">${hint.before}</div>${bar ? '<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div class="h-full w-1/3 bg-gradient-to-r from-orange-500 to-amber-400"></div></div>' : ''}</div>`;
  }
  const tone = { orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30', neutral: 'bg-zinc-800 text-zinc-300 border-zinc-600/60', green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }[pillTone.after];
  return `<div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">${ic(icon, 'h-4 w-4 text-zinc-400')}${label}</div>
    <div class="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span class="text-3xl font-black leading-none tabular-nums text-white">${value}</span><span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}">${pill.after}</span></div>
    ${bar ? '<div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div class="h-full w-1/3 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"></div></div>' : ''}
    <div class="mt-2 text-sm text-zinc-400">${hint.after}</div></div>`;
}
function todayAfterFirst(p) {
  const head = p
    ? `<h1 class="mb-4 flex items-center gap-2 text-xl font-black tracking-tight text-white">Sam<span class="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-sm font-semibold text-orange-300">${ic('flame', 'h-3.5 w-3.5')}1-day streak</span></h1>`
    : `<h1 class="mb-4 text-xl font-black tracking-tight text-white">Sam<span class="ml-2 align-middle text-sm font-semibold text-zinc-500">1-day streak</span></h1>`;
  const todayCard = p
    ? `<div class="mb-4 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
        <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-300">${ic('target', 'h-4 w-4')} Today</div>
        <div class="mt-1 text-lg font-bold text-white">What are you working on today?</div>
        <div class="mt-1 text-sm text-zinc-300">You said you want to work on <span class="font-semibold text-orange-300">shooting</span>.</div>
        <a class="${PRIMARY_TODAY} mt-3">${ic('list-checks', 'h-4 w-4')} See shooting programs</a>
        <a class="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-500/70 text-sm font-semibold text-zinc-100">${ic('zap', 'h-4 w-4')} Build a quick workout</a></div>`
    : `<div class="mb-4 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
        <div class="text-xs font-bold uppercase tracking-wider text-orange-300">Today</div>
        <div class="mt-1 text-lg font-bold text-white">What are you working on today?</div>
        <div class="mt-1 text-sm text-zinc-300">You said you want to work on <span class="font-semibold text-orange-300">shooting</span>.</div>
        <div class="mt-3 flex flex-wrap gap-2"><span class="inline-flex h-8 items-center rounded-xl bg-orange-600 px-3 text-xs font-medium text-white shadow-md shadow-orange-950/20">See shooting programs</span><span class="inline-flex h-8 items-center rounded-xl border border-zinc-700 px-3 text-xs font-medium text-zinc-200">Build a quick workout</span></div></div>`;
  const grid = `<div class="grid grid-cols-2 gap-3">
    ${tile({ p, label: 'This week', icon: 'calendar-check', value: 1, pill: { before: 'sessions', after: 'session' }, pillTone: { before: 'orange', after: 'orange' }, hint: { before: 'Goal: 3 days', after: 'Goal: 3 days' }, bar: true })}
    ${tile({ p, label: 'Shooting %', icon: 'crosshair', value: p ? '60%' : '60.0%', pill: { before: 'career', after: 'career' }, pillTone: { before: 'red', after: 'neutral' }, hint: { before: '1 zones tracked', after: '1 zone tracked' } })}
    ${tile({ p, label: 'Streak', icon: 'flame', value: 1, pill: { before: 'days', after: 'day' }, pillTone: { before: 'green', after: 'green' }, hint: { before: 'Safe - a rest day will not break it', after: 'A rest day is safe' } })}
    ${tile({ p, label: 'Consistency', icon: 'trending-up', value: 1, pill: { before: 'days', after: 'day' }, pillTone: { before: 'cyan', after: 'neutral' }, hint: { before: 'Your % shows after your first week', after: 'Your % shows after week 1' } })}</div>`;
  const level = p
    ? `<div class="mt-3 rounded-2xl border border-zinc-600/50 bg-gradient-to-br from-zinc-500/15 to-transparent p-4"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2.5"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 text-white ring-1 ring-inset ring-white/15">${ic('star', 'h-5 w-5')}</span><div><div class="font-black text-white">Level 2 <span class="text-sm font-bold text-zinc-300">Rookie</span></div><div class="text-sm text-zinc-400">68 XP to Level 3</div></div></div><div class="text-right"><span class="text-xl font-black tabular-nums text-white">72</span><span class="text-sm text-zinc-400"> XP</span></div></div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800"><div class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style="width:15%"></div></div></div>`
    : `<div class="mt-3 rounded-2xl border border-zinc-600/50 bg-gradient-to-br from-zinc-500/15 to-transparent p-4"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2.5"><span class="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-500/20 text-zinc-200">${ic('star', 'h-5 w-5')}</span><div><div class="font-black text-white">Level 2 <span class="text-sm font-bold text-zinc-300">Rookie</span></div><div class="text-xs text-zinc-400">68 XP to Level 3</div></div></div><div class="text-right"><span class="text-xl font-black text-white">72</span><span class="text-xs text-zinc-500"> XP</span></div></div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800"><div class="h-full rounded-full bg-gradient-to-r from-zinc-400 to-zinc-300" style="width:15%"></div></div></div>`;
  return `<div class="p-4">${head}${todayCard}${grid}${level}</div>${tabBar({ polished: p })}${logButton({ polished: p })}`;
}

/* ------------------------------ Log menu ------------------------------ */
const ACTIONS = [
  ['Hoops session', 'Drills and shooting', 'target', 'orange'],
  ['Gym workout', 'Sets, reps and tests', 'dumbbell', 'emerald'],
  ['Track with camera', 'Counts shots on your phone', 'camera', 'cyan'],
  ['Game stats', 'Box score from a real game', 'trophy', 'amber'],
];
const TONE = {
  orange: ['border-orange-500/30', 'from-orange-600 to-orange-700'],
  emerald: ['border-emerald-500/30', 'from-emerald-600 to-emerald-700'],
  cyan: ['border-cyan-500/30', 'from-cyan-600 to-cyan-700'],
  amber: ['border-amber-500/30', 'from-amber-600 to-amber-700'],
};
function logMenu(kind, h = 520) {
  const rows = ACTIONS.map(([t, hint, icon, tone]) => {
    if (kind === 'before')
      return `<div class="flex items-center gap-3 rounded-2xl border border-zinc-700/70 bg-zinc-900 p-3 shadow-xl"><span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-${tone}-600">${ic(icon, 'h-5 w-5 text-white')}</span><span><span class="block text-sm font-bold text-white">${t}</span><span class="block text-xs text-zinc-400">${hint}</span></span></div>`;
    const [border, grad] = kind === 'sections' ? TONE[tone] : ['border-zinc-700', TONE.orange[1]];
    return `<div class="flex min-h-16 items-center gap-3 rounded-2xl border ${border} bg-zinc-900 p-3 shadow-xl"><span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white ring-1 ring-inset ring-white/20">${ic(icon, 'h-5 w-5')}</span><span class="min-w-0 flex-1"><span class="block text-sm font-bold text-white">${t}</span><span class="block text-sm text-zinc-400">${hint}</span></span>${ic('chevron-right', 'h-5 w-5 flex-none text-zinc-500')}</div>`;
  }).join('');
  const p = kind !== 'before';
  return `<div class="absolute inset-0 bg-black/60"></div><div class="absolute bottom-36 left-4 right-4 space-y-2">${rows}</div>${logButton({ polished: p, open: true })}${tabBar({ polished: p })}`;
}

export function today({ write }) {
  const w = (n, c) => `<div>${n}${c}</div>`;
  const sections = phone(logMenu('sections'), { h: 520 });
  write(
    'today',
    page({
      title: 'Polish: Today for a new player, after the first session, and the Log menu',
      body: `<div class="mx-auto w-[1566px] p-6">
      <div class="flex gap-6">
        ${w(cap('Today, new player (rebuilt from the real classes)'), phone(todayNew(false), { h: 844, measure: false }))}
        ${w(cap('Today, after the first session (rebuilt)'), phone(todayAfterFirst(false), { h: 844, measure: false }))}
        ${w(cap('Log menu today (rebuilt)'), phone(logMenu('before'), { h: 520, measure: false }))}
      </div>
      <div class="mt-8 flex gap-6">
        ${w(cap('Polished: new player', 'after'), phone(todayNew(true), { h: 844 }))}
        ${w(cap('Polished: after the first session', 'after'), phone(todayAfterFirst(true), { h: 844 }))}
        <div>${cap('Polished Log menu: each row in its section colour (decided by the founder, 22 Nov)', 'after')}${sections}</div>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-6 text-sm text-zinc-300">
        <p>Order, cards and words are today's. Kept as is: Today card, Starting steps, the Pro offer. Fixed: the 12px lines are 14px; the number and its unit sit together; the Log button no longer sits on the content (the page gets bottom padding); every tab has its icon; the active tab keeps today's brand red.</p>
        <p>The four numbers are white and heavy. The unit pill moves next to its number (it used to be pushed to the far edge and crowded "60.0%"). Pills keep colour only where it means something: orange for the weekly goal, green for a safe streak. Career % loses its red (red is a miss).</p>
        <p>Log menu: same four rows and words, icons kept in a gradient tile, hint 14px, a chevron, rows 64px high. Section colours are today's (orange, green, blue, amber), as the founder decided. The button is orange: logging is an action, and orange is the action colour.</p>
      </div></div>`,
    })
  );
}

/* ------------------------------ First-session result ------------------------------ */
function hubBefore() {
  return `<div class="px-4 pt-4"><div class="mb-4 flex items-center gap-3"><span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white">${ic('target', 'h-6 w-6')}</span><div><div class="text-2xl font-black text-white">Hoops</div><div class="text-sm text-zinc-400">Drills, shooting and game minutes</div></div></div>
    <div class="mb-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-transparent p-5">
      <div class="flex items-center gap-3">${ic('party-popper', 'h-8 w-8 flex-shrink-0 text-emerald-300')}<div><p class="text-xl font-black text-white">First session logged!</p><p class="text-sm font-semibold text-amber-300">+20 XP</p></div></div>
      <ul class="mt-4 space-y-2 text-sm text-zinc-200">
        <li class="flex gap-2.5">${ic('chart-no-axes-column', 'mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300')}Your shot chart and hot and cold zones, on the dashboard</li>
        <li class="flex gap-2.5">${ic('flame', 'mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300')}Day one of your streak. Train again tomorrow to keep it going</li>
        <li class="flex gap-2.5">${ic('sparkles', 'mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300')}The AI coach can now read your numbers and tell you what to work on</li></ul>
      <p class="mt-4 text-sm font-semibold text-emerald-300">See it on your dashboard →</p></div>
    <div class="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4"><div class="font-bold text-white">Train with a friend</div><p class="mt-1 text-sm text-zinc-300">It&rsquo;s easier to keep going with someone to beat.</p><span class="mt-3 inline-flex h-9 items-center rounded-xl bg-cyan-600 px-3 text-sm font-semibold text-white">Invite a friend</span></div>
    <a class="${PRIMARY_TODAY}">+ New session</a></div>${tabBar({ polished: false, active: 'Hoops' })}${logButton({ polished: false })}`;
}

const medal = `<span class="relative flex h-14 w-14 flex-none items-center justify-center rounded-full text-white" style="background:linear-gradient(145deg,#d97706,#92400e);box-shadow:0 0 22px -4px rgba(217,119,6,.6), inset 0 0 0 3px rgba(255,255,255,.18), inset 0 0 0 7px rgba(0,0,0,.18)">${ic('target', 'h-6 w-6', 2.25)}</span>`;

function resultAfter({ dim = false } = {}) {
  const chart = shotChart({ id: 'res', zones: [{ zone: 'mid-center', makes: 6, attempts: 10 }], scale: 'classic', renderW: 318, pctPx: 16, subPx: 12, yMax: 40, yMin: 9, xRange: [50, 450], below: ['mid-center'], cls: 'block h-auto w-full' });
  return `<div class="px-4 pb-4 pt-5"><div class="flex items-center justify-between"><span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">${ic('check', 'h-4 w-4', 2.5)} First session logged</span><span class="text-sm text-zinc-400">20 Nov</span></div>
    <div class="relative mt-3 overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-600/25 via-zinc-900 to-zinc-950 p-5">
      <div class="pointer-events-none absolute left-1/2 top-0 h-64 w-80 -translate-x-1/2" style="background:radial-gradient(closest-side,rgba(249,115,22,.35),transparent)"></div>
      <div class="relative text-center"><div class="font-black leading-none tabular-nums tracking-tight text-white" style="font-size:104px;letter-spacing:-0.04em;text-shadow:0 0 44px rgba(249,115,22,.55)">6<span class="text-zinc-500">/</span>10</div>
        <div class="mt-2 flex items-center justify-center gap-2"><span class="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xl font-black tabular-nums text-emerald-300">60%</span><span class="text-sm text-zinc-300">from Mid top</span></div></div>
      <div class="relative mt-3">${chart}</div></div>
    <div class="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div class="flex items-center gap-3">${medal}<div class="min-w-0 flex-1"><div class="text-xs font-semibold uppercase tracking-wider text-zinc-300">New badge</div><div class="font-black text-white">First Session</div></div><span class="text-sm font-bold text-amber-300">+50 XP</span></div>
      <div class="mt-4 flex items-center justify-between text-sm"><span class="font-black text-white">Level 2 <span class="font-bold text-zinc-300">Rookie</span></span><span class="text-zinc-400">68 XP to Level 3</span></div>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"><div class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400" style="width:15%"></div></div></div>
    <a class="${PRIMARY_TODAY} mt-4 h-12 text-base">${ic('rotate-ccw', 'h-4 w-4')} Go again</a>
    <a class="mt-2 flex h-12 w-full items-center justify-center rounded-xl border border-zinc-500/70 text-base font-semibold text-zinc-100">Done for today</a>
    <a class="mt-1 flex h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-zinc-200">${ic('share-2', 'h-4 w-4')} Share this result</a></div>`;
}

function shareSheet() {
  const toggle = `<span class="relative h-7 w-12 flex-none rounded-full border border-zinc-500 bg-zinc-800"><span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-zinc-300"></span></span>`;
  return `<div class="absolute inset-0 bg-black/70"></div>
   <div class="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-zinc-700 bg-zinc-900 p-4 pb-6">
     <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-600"></div>
     <div class="flex gap-4"><div class="flex-none overflow-hidden rounded-xl border border-zinc-700">${scaled(sessionCard({ h: 1920 }), 1080, 1920, 0.1)}</div>
       <div class="min-w-0 flex-1"><div class="text-lg font-black text-white">Share your result</div><p class="mt-1 text-sm text-zinc-400">Only what you choose is on the card. No face, school or place.</p>
         <div class="mt-3 flex min-h-11 items-center justify-between gap-3"><span><span class="block text-sm font-semibold text-white">Show my name</span><span class="block text-sm text-zinc-400">Off until you turn it on</span></span>${toggle}</div></div></div>
     <a class="${PRIMARY_TODAY} mt-4 h-12 text-base">${ic('share-2', 'h-4 w-4')} Share</a>
     <a class="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-500/70 text-sm font-semibold text-zinc-100">${ic('download', 'h-4 w-4')} Save image</a>
     <a class="mt-1 flex h-11 w-full items-center justify-center text-sm font-semibold text-zinc-300">Not now</a></div>`;
}

export function result({ write }) {
  write(
    'result',
    page({
      title: 'Polish: the first-session result',
      body: `<div class="mx-auto flex w-[1278px] gap-6 p-6">
        <div>${cap('Today: after the first save (live screen, rebuilt)')}${phone(hubBefore(), { h: 800, measure: false })}
          <p class="mt-3 text-sm text-zinc-300" style="width:390px">The player's own number (6 of 10) is nowhere on the screen. Three colours (green, cyan, orange) compete, and an invite comes before the result.</p></div>
        <div>${cap('Polished: the result', 'after')}${phone(resultAfter(), { h: 800 })}
          <p class="mt-3 text-sm text-zinc-300" style="width:390px">Their number is the screen: one hero card with a soft orange glow on the 6/10, the new shot chart with the zone filled, the badge and level they just earned, one orange next step. "Go again" and "Done for today" are the same size.</p></div>
        <div>${cap('Polished: what "Share this result" opens', 'after')}${phone(`<div class="opacity-60">${resultAfter()}</div>${shareSheet()}`, { h: 800 })}
          <p class="mt-3 text-sm text-zinc-300" style="width:390px">A bottom sheet with the card, the name switch off by default, and Share and Save image. (The page behind is dimmed, so the orange Share is the one orange here.)</p></div>
      </div>`,
    })
  );
}
