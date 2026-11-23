// Builds the 2026-11-23 setup mockups (mockup E for backlog D4): static HTML with the app's own Tailwind classes.
// "Today" columns are rebuilt from src/app/(app)/onboarding/page.tsx, the Navbar, BottomNav and ui/ components.
// Run: node 2026-11-23-setup-build.mjs   then shoot each file with 2026-11-20-direction-shot.mjs (WIDTH env, see the doc).
// Draft only. Made-up first name and numbers, no photo, no real player. Lucide icons (ISC) inlined.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ic as polishIc, page, cap, note, LOGO, HERE } from './2026-11-22-polish-lib.mjs';

const EXTRA = JSON.parse(fs.readFileSync(path.join(HERE, '2026-11-23-setup-icons.json'), 'utf8'));
const OUT = process.argv[2] ?? HERE;
const P = '2026-11-23-setup-';
const write = (name, html) => fs.writeFileSync(path.join(OUT, `${P}${name}.html`), html);

function ic(name, cls = 'h-5 w-5', sw = 2) {
  if (EXTRA[name]) {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRA[name]}</svg>`;
  }
  return polishIc(name, cls, sw);
}

/** A phone frame. h omitted = as tall as the content (the real page scrolls). data-measure feeds the contrast script. */
const frame = (inner, { w = 390, h = null } = {}) =>
  `<div class="relative overflow-hidden rounded-[24px] border border-zinc-700 bg-zinc-950" style="width:${w}px;${h ? `height:${h}px` : ''}" data-measure>${inner}</div>`;

/* ============================================================================================
   TODAY, rebuilt from the real classes
   ============================================================================================ */
const T_LABEL = 'block text-xs font-semibold uppercase tracking-wider text-zinc-300';
const T_BOX = 'flex h-11 w-full items-center rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm';
const tIn = (label, ph, val = '') =>
  `<div class="w-full space-y-1.5"><span class="${T_LABEL}">${label}</span><div class="${T_BOX} ${val ? 'text-zinc-100' : 'text-zinc-500'}">${val || ph}</div></div>`;
const tSel = (label, val, dim = false) =>
  `<div class="w-full space-y-1.5"><span class="${T_LABEL}">${label}</span><div class="relative"><div class="${T_BOX} pr-9 ${dim ? 'text-zinc-100' : 'text-zinc-100'}">${val}</div>${ic('chevron-down', 'pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-zinc-400')}</div></div>`;

/** Navbar.tsx at 390 px: logo, wordmark and slogan (10px), search, profile pill (name hidden under sm), settings. */
const tNav = () => `<header class="w-full border-b border-zinc-800/80 bg-zinc-950"><div class="flex h-16 items-center justify-between px-4">
  <div class="flex items-center gap-2.5"><img src="${LOGO}" class="rounded-full shadow-lg shadow-black/40" style="width:36px;height:36px" alt="Deadeye logo"><div class="flex flex-col"><span class="text-base font-black uppercase leading-none tracking-tight text-white">Deadeye</span><span class="mt-0.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-red-400">Aim is earned</span></div></div>
  <div class="flex items-center gap-2"><span class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400">${ic('search', 'h-4 w-4')}</span>
  <span class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-100">S</span></span>
  <span class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400">${ic('settings', 'h-4 w-4')}</span></div></div></header>`;
const TAB_ITEMS = [['Home', 'layout-dashboard'], ['Hoops', 'target'], ['Gym', 'dumbbell'], ['Train', 'calendar-check'], ['IQ', 'book-open']];
const tTabs = () => `<div class="absolute inset-x-0 bottom-0 border-t border-zinc-800/90 bg-zinc-950"><div class="grid grid-cols-5 px-1 pb-2 pt-1.5">${TAB_ITEMS.map(([l, i]) => `<div class="flex flex-col items-center justify-center rounded-xl py-1.5 text-zinc-400">${ic(i, 'h-6 w-6')}<span class="mt-0.5 text-xs tracking-tight">${l}</span></div>`).join('')}</div></div>`;

const tHead = (step) => `<div class="flex items-center justify-between"><div class="flex items-center gap-2"><img src="${LOGO}" class="rounded-full shadow-lg shadow-black/40" style="width:36px;height:36px" alt=""><div><h2 class="text-sm font-black uppercase tracking-wider text-white">Deadeye Setup</h2><p class="text-sm text-zinc-400">Step ${step} of 3</p></div></div>
  <div class="flex gap-1.5">${[1, 2, 3].map((s) => `<div class="h-1.5 w-8 rounded-full ${s <= step ? 'bg-orange-500' : 'bg-zinc-800'}"></div>`).join('')}</div></div>`;
const tCardHead = (icon, eyebrow, title, desc) => `<div class="flex flex-col space-y-1.5 p-5 pb-3"><div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">${ic(icon, 'h-4 w-4')} ${eyebrow}</div><h3 class="text-xl font-bold leading-none tracking-tight text-zinc-100">${title}</h3><p class="text-sm leading-relaxed text-zinc-400">${desc}</p></div>`;
const T_CARD = 'rounded-2xl border border-zinc-800 bg-zinc-900/90 text-zinc-100 shadow-2xl';
const T_FOOT = 'flex items-center border-t border-zinc-800/60 p-5 pt-4 mt-4';
const T_BTN = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium';
const tPage = (step, card) => `${tNav()}<div class="flex flex-col items-center" style="padding:48px 16px 128px"><div class="w-full space-y-6">${tHead(step)}${card}</div></div>${tTabs()}`;

function todayStep1() {
  const toggle = `<div><span class="${T_LABEL} mb-1.5">Units</span><div class="inline-flex rounded-xl border border-zinc-700/80 bg-zinc-900/90 p-1"><span class="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white">Imperial (ft, lbs)</span><span class="rounded-lg px-4 py-1.5 text-xs font-semibold text-zinc-400">Metric (cm, kg)</span></div></div>`;
  return tPage(1, `<div class="${T_CARD}">${tCardHead('user', 'Athlete Profile', 'Tell us about your game', 'So your plans, drills and coaching fit you.')}
    <div class="space-y-4 p-5 pt-0">
      ${tIn('Display Name / Jersey Name', 'e.g. Marcus Smart', 'Sam')}
      <div class="grid grid-cols-2 gap-3">${tSel('Position', 'Guard (Combo)')}${tSel('Dominant Hand', 'Right Hand')}</div>
      ${toggle}
      <div class="grid grid-cols-2 gap-3"><div class="grid grid-cols-2 gap-2">${tIn('Height (ft)', '6')}${tIn('(in)', '1')}</div>${tSel('Age Bracket', '<span class="text-zinc-300">Choose…</span>')}</div>
    </div>
    <div class="${T_FOOT} justify-end"><span class="${T_BTN} bg-orange-600 text-white shadow-md shadow-orange-950/20">Next: Experience &amp; Level ${ic('arrow-right', 'h-4 w-4 ml-1')}</span></div></div>`);
}
const LEVELS_TODAY = [
  ['Beginner', 'Developing fundamentals, basic footwork, and shooting mechanics'],
  ['Intermediate / High School', 'Active team or competitive rec league player training regularly'],
  ['Advanced / Academy', 'Varsity, prep school, or regional club player with dedicated skill training'],
  ['College / Pro Pipeline', 'University, NCAA, semi-pro, or professional contract player'],
];
function todayStep2() {
  const rows = LEVELS_TODAY.map(([t, d], i) => {
    const on = i === 1;
    return `<div class="w-full rounded-xl border p-4 text-left ${on ? 'border-orange-500 bg-orange-600/10 text-white ring-1 ring-orange-500/30' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}"><div class="flex items-center justify-between"><div class="text-sm font-bold text-zinc-100">${t}</div>${on ? ic('check', 'h-4 w-4 text-orange-400') : ''}</div><div class="mt-1 text-xs text-zinc-400">${d}</div></div>`;
  }).join('');
  return tPage(2, `<div class="${T_CARD}">${tCardHead('activity', 'Playing Level', 'What level do you play at?', 'So your plans start at the right level.')}
    <div class="space-y-3 p-5 pt-0">${rows}</div>
    <div class="${T_FOOT} justify-between"><span class="${T_BTN} border border-zinc-700 text-zinc-200">${ic('arrow-left', 'h-4 w-4 mr-1')} Back</span><span class="${T_BTN} bg-orange-600 text-white shadow-md shadow-orange-950/20">Next: Goals &amp; Focus ${ic('arrow-right', 'h-4 w-4 ml-1')}</span></div></div>`);
}
const GOALS = [
  ['Consistent Training Habit', 'Consistent training habit'],
  ['3-Point Shooting Consistency', '3-point shooting consistency'],
  ['Vertical Jump & Explosiveness', 'Vertical jump and explosiveness'],
  ['Finishing Through Contact', 'Finishing through contact'],
  ['Pick & Roll Decision Making', 'Pick and roll decisions'],
  ['Lockdown On-Ball Defense', 'Lockdown on-ball defence'],
  ['Mid-Range Pull-Up Mastery', 'Mid-range pull-up'],
  ['Off-Hand Ball Handling & Flow', 'Off-hand ball handling'],
];
const FOCUS = [
  ['Shooting Arc & Dip', 'Shooting arc and dip'],
  ['Floater Range & Touch', 'Floater range and touch'],
  ['First Step Acceleration', 'First-step speed'],
  ['Defensive Lateral Slide Speed', 'Defensive slide speed'],
  ['Strong Ankles & Knees', 'Strong ankles and knees'],
  ['Free Throw Routine', 'Free-throw routine'],
  ['Off-Ball Spacing & Cuts', 'Off-ball spacing and cuts'],
];
const STRENGTHS = [
  ['Catch & Shoot Accuracy', 'Catch-and-shoot accuracy'],
  ['Court Vision & Passing', 'Court vision and passing'],
  ['High Motor / Hustle', 'Hustle and high motor'],
  ['Rebounding & Positioning', 'Rebounding and positioning'],
  ['Open Court Speed', 'Open-court speed'],
  ['On-Ball Perimeter Defense', 'On-ball perimeter defence'],
];
const amp = (s) => s.replace(/&/g, '&amp;');

function todayStep3() {
  const group = (label, count, opts, picked, tone) => `<div class="space-y-2"><span class="block text-xs font-bold uppercase tracking-wider text-zinc-300">${label}${count ? ` <span class="text-zinc-500">· ${count}</span>` : ''}</span><div class="flex flex-wrap gap-2">${opts
    .map(([v]) => {
      const on = picked.includes(v);
      return `<span class="rounded-lg border px-3 py-1.5 text-xs transition-all ${on ? `${tone} font-semibold` : 'border-zinc-800 bg-zinc-900 text-zinc-400'}">${amp(v)}</span>`;
    })
    .join('')}</div></div>`;
  return tPage(3, `<div class="${T_CARD}">${tCardHead('target', 'Focus Areas', 'What are you working on right now?', 'Select your current training targets and specific development cues.')}
    <div class="space-y-5 p-5 pt-0">
      ${group('Primary Goals (Select 1-3)', '2/3', GOALS, ['Consistent Training Habit', '3-Point Shooting Consistency'], 'border-orange-500 bg-orange-500/20 text-orange-300')}
      ${group('Immediate Focus Areas (Select 1-3)', '1/3', FOCUS, ['Shooting Arc & Dip'], 'border-amber-500 bg-amber-500/20 text-amber-300')}
      ${group('Existing Strengths', '', STRENGTHS, ['Catch & Shoot Accuracy'], 'border-emerald-500 bg-emerald-500/20 text-emerald-300')}
    </div>
    <div class="${T_FOOT} justify-between"><span class="${T_BTN} border border-zinc-700 text-zinc-200">${ic('arrow-left', 'h-4 w-4 mr-1')} Back</span><span class="${T_BTN} gap-2 bg-orange-600 text-white shadow-md shadow-orange-950/20">${ic('sparkles', 'h-4 w-4')} Finish setup</span></div></div>`);
}

/* ============================================================================================
   NEW: one slim header, no tab bar, no search, a sticky footer with full-width Next / Finish
   ============================================================================================ */
const LABEL = 'text-sm font-semibold text-zinc-200';
const HINT = 'mt-1.5 text-sm text-zinc-400';
const FIELD = 'flex h-11 w-full items-center gap-2.5 rounded-xl border border-zinc-500/70 bg-zinc-900/90 px-3.5 text-sm';
const OFF = 'border-zinc-500/70 bg-zinc-900/90 text-zinc-300';
const ON = 'border-orange-500 bg-orange-600/10 text-white font-semibold';

const STEP_NAME = ['About you', 'Your level', 'Your focus'];
function head({ step = 0, edit = false }) {
  const right = edit
    ? `<span data-tap class="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-500/70 text-zinc-100" aria-label="Close">${ic('x', 'h-5 w-5')}</span>`
    : `<span data-tap class="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-500/70 text-zinc-300" aria-label="Settings">${ic('settings', 'h-5 w-5')}</span>`;
  const bars = step
    ? `<div class="mt-4 px-4"><div class="flex items-center justify-between text-sm"><span class="font-semibold text-zinc-200">Step ${step} of 3</span><span class="text-zinc-400">${STEP_NAME[step - 1]}</span></div><div class="mt-2 flex gap-1.5" role="progressbar" aria-valuemin="1" aria-valuemax="3" aria-valuenow="${step}" aria-label="Setup progress">${[1, 2, 3].map((s) => `<div class="h-1.5 flex-1 rounded-full ${s <= step ? 'bg-orange-500' : 'bg-zinc-800'}"></div>`).join('')}</div></div>`
    : '';
  return `<header class="flex items-center justify-between px-4 pt-3"><div class="flex items-center gap-2.5"><img src="${LOGO}" class="rounded-full shadow-lg shadow-black/40" style="width:36px;height:36px" alt="Deadeye logo"><div><div class="text-base font-black uppercase leading-none tracking-tight text-white">${edit ? 'Edit player info' : 'Deadeye setup'}</div><div class="mt-1 text-xs font-semibold uppercase leading-none tracking-wider text-red-400">${edit ? 'Your details' : 'Aim is earned'}</div></div></div>${right}</header>${bars}`;
}
const cardHead = (icon, title, desc) => `<div class="flex items-start gap-3"><span class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-zinc-800 text-orange-300 ring-1 ring-inset ring-white/10">${ic(icon, 'h-5 w-5')}</span><div class="min-w-0"><h1 class="text-xl font-black tracking-tight text-white">${title}</h1><p class="mt-0.5 text-sm text-zinc-400">${desc}</p></div></div>`;
const CARD = 'mx-4 mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4';
const body = (card, extra = '') => `<div class="pb-32">${card}${extra}</div>`;

/** Sticky footer: Back (steps 2 and 3) beside a full-width Next / Finish. */
function footer({ back = false, label = 'Next', icon = 'arrow-right', lead = false, loading = false }) {
  const b = back ? `<span data-tap class="inline-flex h-13 items-center justify-center gap-1.5 rounded-xl border border-zinc-500/70 px-4 text-base font-semibold text-zinc-100">${ic('arrow-left', 'h-5 w-5')} Back</span>` : '';
  const inner = loading
    ? `<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg><span>Loading...</span>`
    : `${lead ? ic(icon, 'h-5 w-5') : ''}<span>${label}</span>${lead ? '' : ic(icon, 'h-5 w-5')}`;
  return `<div class="absolute inset-x-0 bottom-0 flex gap-2 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-5 pt-3">${b}<span data-tap="main" class="inline-flex h-13 flex-1 items-center justify-center gap-2.5 rounded-xl bg-orange-600 text-base font-semibold text-white shadow-md shadow-orange-950/20 ${loading ? 'opacity-50' : ''}">${inner}</span></div>`;
}

const dot = (on) => `<span class="flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${on ? 'border-orange-400' : 'border-zinc-400'}">${on ? '<span class="h-2.5 w-2.5 rounded-full bg-orange-400"></span>' : ''}</span>`;
const ageCards = (picked, err = false) => `<fieldset><legend class="${LABEL}">How old are you?</legend>
  <p class="mt-0.5 text-sm text-zinc-400">You said you are 16 or older when you signed up.</p>
  <div class="mt-2 grid grid-cols-2 gap-2">${['16 or 17', '18 or older'].map((t) => `<span data-tap class="flex h-14 items-center gap-3 rounded-xl border px-3.5 text-sm ${picked === t ? ON : err ? 'border-red-500 bg-zinc-900/90 text-zinc-200' : OFF}">${dot(picked === t)}${t}</span>`).join('')}</div>
  ${err ? `<p class="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-400">${ic('circle-alert', 'mt-0.5 h-4 w-4 flex-none')} Choose 16 or 17, or 18 or older.</p>` : ''}
  <p class="${HINT}">Why we ask: players under 18 get extra protections, like a parent saying yes to competition entries.</p></fieldset>`;

const handRow = (hand = 'Right') => `<fieldset><legend class="${LABEL}">Dominant hand</legend><div class="mt-1.5 grid grid-cols-3 gap-2">${['Right', 'Left', 'Both'].map((t) => `<span data-tap class="flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm ${hand === t ? ON : OFF}">${hand === t ? ic('check', 'h-4 w-4 text-orange-400') : ''}${t}</span>`).join('')}</div></fieldset>`;
const heightRow = (imperial = false, val = '') => `<div><div class="flex items-center justify-between"><span class="${LABEL}">Height <span class="font-normal text-zinc-400">(optional)</span></span><u data-tap class="flex items-center py-1.5 text-sm text-zinc-300">${imperial ? 'Use centimetres' : 'Use feet and inches'}</u></div>
  ${imperial
    ? `<div class="mt-1.5 grid grid-cols-2 gap-2"><span class="${FIELD}"><span class="flex-1 text-zinc-100">${val ? '6' : '<span class="text-zinc-500">6</span>'}</span><span class="text-zinc-400">ft</span></span><span class="${FIELD}"><span class="flex-1 text-zinc-100">${val ? '1' : '<span class="text-zinc-500">1</span>'}</span><span class="text-zinc-400">in</span></span></div>`
    : `<span class="mt-1.5 ${FIELD}"><span class="flex-1 ${val ? 'text-zinc-100' : 'text-zinc-500'}">${val || '188'}</span><span class="text-zinc-400">cm</span></span>`}</div>`;
const nameRow = (val = 'Sam') => `<label class="block"><span class="${LABEL}">Your name or a nickname</span><span class="mt-1.5 ${FIELD}">${ic('user', 'h-[18px] w-[18px] flex-none text-zinc-400')}<span class="flex-1 text-zinc-100">${val}</span></span><span class="block ${HINT}">Shown on leaderboards. A first name or a nickname is fine.</span></label>`;
const positionRow = `<label class="block"><span class="${LABEL}">Position</span><span class="mt-1.5 ${FIELD} justify-between"><span class="text-zinc-100">Guard (combo)</span>${ic('chevron-down', 'h-4 w-4 text-zinc-400')}</span></label>`;

function newStep1({ ageMode = '16plus', ageErr = false, picked = null, edit = false, imperial = false, hand = 'Right' }) {
  const age = ageMode === '16plus' ? ageCards(picked, ageErr) : '';
  return `${head({ step: 1, edit })}${body(`<div class="${CARD}">${cardHead('user', 'Tell us about your game', 'So your plans, drills and coaching fit you.')}
    <div class="mt-5 space-y-5">${nameRow()}${age}${positionRow}${handRow(hand)}${heightRow(imperial, imperial || edit ? '188' : '')}</div></div>`)}${footer({ label: edit ? 'Next' : 'Next' })}`;
}

const LEVELS_NEW = [
  ['Just starting', 'Learning the basics: footwork, shooting form and ball handling.'],
  ['School or club team', 'Playing for a team or in a league and training most weeks.'],
  ['Top club or academy', 'Regional or national squads, or an academy with extra skills sessions.'],
  ['Senior or pro', 'Senior team, university, semi-pro or professional.'],
];
function newStep2() {
  const rows = LEVELS_NEW.map(([t, d], i) => {
    const on = i === 1;
    const bars = [6, 10, 14, 18].map((h, k) => `<span class="w-1 rounded-full ${k <= i ? (on ? 'bg-orange-400' : 'bg-zinc-400') : 'bg-zinc-700'}" style="height:${h}px"></span>`).join('');
    return `<span data-tap class="flex min-h-[76px] items-center gap-3 rounded-xl border p-4 ${on ? 'border-orange-500 bg-orange-600/10 ring-1 ring-orange-500/30' : 'border-zinc-500/70 bg-zinc-900/90'}">${dot(on)}<span class="min-w-0 flex-1"><span class="block text-base font-bold text-white">${t}</span><span class="mt-0.5 block text-sm text-zinc-400">${d}</span></span><span class="flex h-5 flex-none items-end gap-0.5" aria-hidden="true">${bars}</span></span>`;
  }).join('');
  return `${head({ step: 2 })}${body(`<div class="${CARD}">${cardHead('activity', 'What level do you play at?', 'So your plans start at the right level.')}<div class="mt-5 space-y-2.5" role="radiogroup">${rows}</div></div>`)}${footer({ back: true })}`;
}

const TONE = {
  orange: ['border-orange-500 bg-orange-500/15 text-orange-200', 'text-orange-300'],
  amber: ['border-amber-500 bg-amber-500/15 text-amber-200', 'text-amber-300'],
  emerald: ['border-emerald-500 bg-emerald-500/15 text-emerald-200', 'text-emerald-300'],
};
const chip = (label, state, tone) =>
  `<span data-tap class="inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm ${state === 'on' ? `${TONE[tone][0]} font-semibold` : state === 'cap' ? 'border-zinc-800 bg-zinc-900/50 text-zinc-500' : OFF}">${state === 'on' ? ic('check', `h-4 w-4 ${TONE[tone][1]}`) : ''}${label}</span>`;
function groupBlock({ icon, title, hint, count, opts, picked, tone, cap: capN = 3, err = '' }) {
  const atCap = capN && picked.length >= capN;
  return `<section><div class="flex items-center justify-between gap-2"><h2 class="flex items-center gap-2 text-sm font-semibold text-white">${ic(icon, 'h-4 w-4 text-zinc-400')}${title} <span class="font-normal text-zinc-400">${hint}</span></h2>${count ? `<span class="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold tabular-nums text-zinc-200">${picked.length}/${capN}</span>` : ''}</div>
  <div class="mt-2.5 flex flex-wrap gap-2">${opts.map(([v, l]) => chip(l, picked.includes(v) ? 'on' : atCap && capN ? 'cap' : 'off', tone)).join('')}</div>
  ${err ? `<p class="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-400">${ic('circle-alert', 'mt-0.5 h-4 w-4 flex-none')} ${err}</p>` : ''}</section>`;
}
function strengthsBlock(open, picked) {
  if (!open) {
    return `<section><span data-tap class="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-zinc-500/70 bg-zinc-900/90 px-3.5 py-2"><span class="flex items-center gap-3"><span class="text-zinc-400">${ic('zap', 'h-4 w-4')}</span><span><span class="block text-sm font-semibold text-white">Your strengths <span class="font-normal text-zinc-400">(optional)</span></span><span class="block text-sm text-zinc-400">${STRENGTHS.filter(([v]) => picked.includes(v)).map(([, l]) => l).join(', ') || 'None picked'}</span></span></span>${ic('chevron-down', 'h-4 w-4 flex-none text-zinc-400')}</span></section>`;
  }
  return `<section><span data-tap class="flex min-h-11 items-center justify-between"><span class="flex items-center gap-2 text-sm font-semibold text-white">${ic('zap', 'h-4 w-4 text-zinc-400')}Your strengths <span class="font-normal text-zinc-400">(optional)</span></span>${ic('chevron-up', 'h-4 w-4 text-zinc-400')}</span><div class="mt-1 flex flex-wrap gap-2">${STRENGTHS.map(([v, l]) => chip(l, picked.includes(v) ? 'on' : 'off', 'emerald')).join('')}</div></section>`;
}
function newStep3({ goals = ['Consistent Training Habit', '3-Point Shooting Consistency'], focus = ['Shooting Arc & Dip'], strengths = ['Catch & Shoot Accuracy'], open = false, alert = '', loading = false, goalErr = '' } = {}) {
  const al = alert ? `<div class="mx-4 mt-4 flex gap-3 rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-sm leading-relaxed text-red-200" role="alert">${ic('circle-alert', 'mt-0.5 h-4 w-4 flex-none text-red-400')}<div class="min-w-0 flex-1 space-y-1"><h5 class="font-semibold leading-none tracking-tight">Could not save</h5><div class="break-words opacity-90">${alert}</div></div></div>` : '';
  return `${head({ step: 3 })}${al}${body(`<div class="${CARD}">${cardHead('target', 'What are you working on?', 'You can change these later in your profile.')}
    <div class="mt-5 space-y-6">
      ${groupBlock({ icon: 'target', title: 'Goals', hint: 'Pick 1 to 3', count: true, opts: GOALS, picked: goals, tone: 'orange', err: goalErr })}
      ${groupBlock({ icon: 'crosshair', title: 'Focus areas', hint: 'Pick 1 to 3', count: true, opts: FOCUS, picked: focus, tone: 'amber' })}
      ${strengthsBlock(open, strengths)}
    </div></div>`)}${footer({ back: true, label: 'Finish setup', icon: 'sparkles', lead: true, loading })}`;
}

function newRole() {
  const rows = [
    ['user', "I'm a player", 'Track your shots, train and get better.'],
    ['clipboard-check', 'I coach', 'Set up your team and see who is training.'],
    ['users', 'I play and coach', 'Switch between your own training and your team.'],
  ].map(([i, t, d]) => `<span data-tap class="flex min-h-[72px] items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4"><span class="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-zinc-800 text-orange-300 ring-1 ring-inset ring-white/10">${ic(i, 'h-5 w-5')}</span><span class="min-w-0 flex-1"><span class="block text-base font-bold text-white">${t}</span><span class="block text-sm text-zinc-400">${d}</span></span>${ic('chevron-right', 'h-5 w-5 flex-none text-zinc-400')}</span>`).join('');
  return `${head({ step: 0 })}<div class="px-4 pb-8 pt-6"><h1 class="text-2xl font-black tracking-tight text-white">How will you use Deadeye?</h1><p class="mt-1 text-sm text-zinc-400">You can change this later in Settings.</p><div class="mt-5 space-y-3">${rows}</div></div>`;
}

/* ============================================================================================
   SHEETS
   ============================================================================================ */
const col = (label, inner, n = '', tone = 'before', w = 390) => `<div style="width:${w}px">${cap(label, tone)}${inner}${n ? note(n, w) : ''}</div>`;
const sheet = (title, w, cols) => page({ title, body: `<div class="mx-auto flex gap-6 p-6" style="width:${w}px">${cols.join('')}</div>`, note: 'Setup (D4 mockup E), 2026-11-23.' });

write('step1', sheet('Setup step 1: today, new for a 16 or older sign-up, new for a 13 to 15 sign-up', 1266, [
  col('Today (rebuilt from the real classes)', frame(todayStep1()), 'Navbar with search, profile and settings, and the tab bar, over a form. Name asked again. A second age question: for a 13 to 15 sign-up the options are "13" and "14 - 17 (High School)". Imperial by default. Labels in capitals; "(in)" has no unit; the unit toggle is 30 px high; Next is small and on the right.'),
  col('New: signed up as 16 or older', frame(newStep1({})), 'The age question is cut to the one thing sign-up did not ask: 16 or 17, or 18 or older. Nothing is chosen for the player. Required fields come first; position, hand and height are quick. Metric first.', 'after'),
  col('New: signed up as 13 to 15', frame(newStep1({ ageMode: 'none' })), 'No age question at all: sign-up already asked and a parent has approved the account. The step is one field shorter.', 'after'),
]));

write('step2', sheet('Setup step 2: today and new', 852, [
  col('Today (rebuilt from the real classes)', frame(todayStep2()), 'US words: "High School", "Varsity", "NCAA", "College". Descriptions are 12 px. Only the chosen row shows a mark; the unchosen rows have no circle.'),
  col('New', frame(newStep2()), 'School, club, senior. A circle on every row, 16 px titles, 14 px descriptions, a four-bar level mark on the right. Footer: Back and a full-width Next, always on screen.', 'after'),
]));

write('step3', sheet('Setup step 3: today and new', 852, [
  col('Today (rebuilt from the real classes)', frame(todayStep3()), '21 chips in 12 px text, Title Case, 32 px high, "Defense". Three long capital-letter labels. Border 1.2:1, under the 3:1 a control needs.'),
  col('New', frame(newStep3({})), 'Sentence case, 14 px, 44 px chips with a check on the chosen ones, "defence". Strengths (optional) fold away behind one row that shows what is saved. Finish stays on screen.', 'after'),
]));

write('states', sheet('Setup states: role choice, errors, cap and strengths open, loading, edit mode', 1680, [
  `<div style="width:390px">${cap('How will you use Deadeye? (new accounts only)', 'after')}${frame(newRole())}${note('Same slim header, no tab bar. Today shows the full Navbar and the tab bar here too.', 390)}
   ${cap('Finish pressed (saving)', 'after').replace('mb-2', 'mb-2 mt-6')}${frame(`<div style="height:84px"></div>${footer({ back: true, label: 'Finish setup', icon: 'sparkles', lead: true, loading: true })}`, { h: 84 })}${note('The Button component\'s own loading state: spinner and "Loading...", disabled.', 390)}</div>`,
  col('Step 1: age not chosen (a 16 or older sign-up)', frame(newStep1({ ageErr: true })), 'The message sits at the field, red border plus an icon and words (never colour alone). The page scrolls to it. Next is never disabled, so nothing is a silent no.', 'after'),
  col('Step 3: at the cap, strengths open, save failed', frame(newStep3({ goals: ['Consistent Training Habit', '3-Point Shooting Consistency', 'Finishing Through Contact'], focus: ['Shooting Arc & Dip', 'Strong Ankles & Knees', 'Free Throw Routine'], strengths: ['Catch & Shoot Accuracy', 'Court Vision & Passing'], open: true, alert: 'Failed to save profile. Please try again.' })), 'At 3 of 3 the other chips dim and cannot be tapped, as today, and the counter says why. The one Alert is for a failed save; its text is 14 px (today 12 px).', 'after'),
  col('Edit player info (from Profile), feet and inches', frame(newStep1({ ageMode: '16plus', picked: '18 or older', edit: true, imperial: true })), 'Same steps, prefilled. A close button replaces the settings button. A player who prefers feet and inches taps "Use feet and inches" (kept for later visits).', 'after'),
]));

write('360', sheet('Setup at 360 px: step 1 and step 3', 792, [
  col('Step 1 at 360 px (16 or older)', frame(newStep1({}), { w: 360 }), '', 'after', 360),
  col('Step 3 at 360 px', frame(newStep3({}), { w: 360 }), '', 'after', 360),
]));
console.log('built setup html in', OUT);
