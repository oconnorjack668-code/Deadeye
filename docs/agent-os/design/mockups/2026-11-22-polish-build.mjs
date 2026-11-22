// Builds the 2026-11-22 polish mockups (static HTML, the app's Tailwind classes) next to this file.
// Run: node 2026-11-22-polish-build.mjs   then shoot with 2026-11-20-direction-shot.mjs (WIDTH env for wide sheets).
import fs from 'node:fs';
import path from 'node:path';
import { ic, page, phone, beforeShot, cap, note, tabBar, logButton, court, scene, clock, logo, LOGO, HERE } from './2026-11-22-polish-lib.mjs';

const OUT = process.argv[2] ?? HERE;
const P = '2026-11-22-polish-';
const write = (name, html) => fs.writeFileSync(path.join(OUT, `${P}${name}.html`), html);

const INPUT = 'flex h-11 items-center gap-2.5 rounded-xl border border-zinc-500/70 bg-zinc-900/90 px-3.5 text-sm';
const PRIMARY = 'flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 font-semibold text-white shadow-md shadow-orange-950/20';

/* =====================================================================================
   1. LANDING
   ===================================================================================== */
function landing() {
  const proof = `<div class="relative mx-4 mt-5 overflow-hidden rounded-2xl border border-zinc-700 bg-black" style="height:282px;box-shadow:0 0 70px -22px rgba(249,115,22,.6)">
    ${scene(358, 282, { rimTone: 'make' })}
    <div class="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent"></div>
    <div class="absolute left-3 top-2 text-white"><div class="flex items-end gap-2"><span class="text-5xl font-black leading-none tabular-nums drop-shadow-lg">7<span class="text-3xl text-zinc-300">/9</span></span><span class="mb-1 text-2xl font-black leading-none text-orange-400 tabular-nums drop-shadow-lg">78%</span></div></div>
    <div class="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-700/95 px-2.5 py-1 text-xs font-bold text-white"><span class="h-2 w-2 rounded-full bg-current"></span>Ball tracked</div>
    <div class="absolute inset-0 bg-emerald-500/20"></div>
    <div class="absolute font-black uppercase leading-none tracking-tight text-3xl text-emerald-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]" style="left:75%;top:42%;transform:translateY(-50%)">Make</div>
    <div class="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8"><span class="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-white text-zinc-950">${ic('play', 'h-5 w-5 translate-x-0.5', 2, true)}</span><span class="text-sm font-semibold text-white">Watch it call real shots</span></div>
  </div>
  <p class="mx-4 mt-2 text-sm text-zinc-400">In the build: the existing tracker clip, muted, with the real poster. Drawn here as a stand-in.</p>`;

  const after = `<div class="relative h-full">
   <div class="pointer-events-none absolute inset-x-0 top-0 h-72" style="background:radial-gradient(60% 70% at 50% 0%,rgba(249,115,22,.13),transparent)"></div>
   <header class="relative border-b border-zinc-900 bg-zinc-950/90">
     <div class="flex items-center justify-between gap-3 px-4 py-2"><div class="flex items-center gap-2"><img src="${LOGO}" class="h-7 w-7 rounded-full shadow-lg shadow-black/40" alt="Deadeye logo"><span class="text-lg font-black uppercase tracking-tight text-white">Deadeye</span></div>
       <div class="flex items-center gap-1"><span class="flex h-11 items-center px-3 text-sm font-medium text-zinc-300">Log in</span><span class="flex h-11 items-center rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white">Start free</span></div></div>
     <div class="flex gap-1.5 overflow-hidden border-t border-zinc-900/80 px-4 py-2 text-sm font-semibold">
       <span class="whitespace-nowrap rounded-full bg-orange-600/15 px-3 py-1.5 text-orange-300">Get the app</span><span class="whitespace-nowrap rounded-full border border-zinc-600 px-3 py-1.5 text-zinc-200">For clubs</span><span class="whitespace-nowrap px-3 py-1.5 text-zinc-400">Features</span><span class="whitespace-nowrap px-3 py-1.5 text-zinc-400">Pricing</span></div>
   </header>
   <div class="relative px-4 pt-7 text-center">
     <div class="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-400">${ic('crosshair', 'h-4 w-4')} Aim is earned</div>
     <h1 class="mt-2 text-3xl font-black tracking-tight text-white">The basketball app that watches your shot</h1>
     <p class="mt-3 text-base text-zinc-300">Point your phone at the hoop and Deadeye counts your makes and misses for you. Then it shows you what to work on next.</p>
     <a class="${PRIMARY} mt-5 h-12 text-base">Create a free account ${ic('arrow-right', 'h-5 w-5')}</a>
     <p class="mt-2 text-sm text-zinc-400">Free to start. For players aged 13 and over. No ads.</p>
   </div>
   <div class="relative">${proof}</div>
   <a class="relative mx-4 mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-500/70 text-sm font-semibold text-zinc-100">${ic('smartphone', 'h-4 w-4')} How to get the app</a>
   <a class="relative mx-4 mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"><span class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 text-white ring-1 ring-inset ring-white/15">${ic('trophy', 'h-5 w-5')}</span>
     <span class="min-w-0 flex-1"><span class="block text-sm font-bold text-white">10 players win Pro for life</span><span class="block text-sm text-zinc-400">Free to enter. Closes 31 December.</span></span>${ic('chevron-right', 'h-5 w-5 flex-none text-zinc-400')}</a>
   <p class="relative mx-4 mt-2 text-sm text-zinc-400">Ages 13 and over. Under 18? A parent or guardian approves your entry. No purchase needed.</p>
   <div class="relative mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">${ic('gift', 'h-5 w-5 flex-none text-amber-400')}<span class="text-sm font-semibold text-amber-200">Founding offer: the first 100 players get 3 months of Pro free</span></div>
   <div class="relative px-4 pt-8"><div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-300">${ic('activity', 'h-4 w-4')} Get the app</div><div class="mt-1 text-2xl font-black text-white">Add Deadeye to your home screen</div></div>
  </div>`;

  write(
    'landing',
    page({
      title: 'Polish: website landing, today and polished',
      body: `<div class="mx-auto flex w-[852px] gap-6 p-6">
        <div>${cap('Today (live, 20 Nov)')}${beforeShot('2026-11-20-review-before-home-390.png', 1240)}
          ${note('Red-tinted hero, a big logo, three orange buttons (header, hero, competition) in two different oranges, and the clip about 2,500 px down.')}</div>
        <div>${cap('Polished', 'after')}${phone(after, { h: 1240 })}
          ${note('Logo, top bar and section strip kept. Black page. Proof (the tracker clip) right under the one orange button; the competition is one row. The red slogan stays: red is the brand.')}</div>
      </div>`,
    })
  );
}

/* =====================================================================================
   2. AUTH: sign up, check your email, sign in
   ===================================================================================== */
function authHead({ eyebrow = true } = {}) {
  return `<div class="text-center">${logo(52)}<div class="mt-3 text-2xl font-black uppercase tracking-tight text-white">Deadeye</div>${eyebrow ? `<div class="text-xs font-semibold uppercase tracking-wider text-red-400">Aim is earned</div>` : ''}</div>`;
}
const field = (label, icon, ph, { hint = '', dim = true, trail = '' } = {}) => `<label class="block"><span class="text-sm font-semibold text-zinc-200">${label}</span>
  <span class="mt-1.5 ${INPUT} ${dim ? 'text-zinc-500' : 'text-zinc-200'}">${ic(icon, 'h-[18px] w-[18px] flex-none text-zinc-400')}<span class="flex-1">${ph}</span>${trail}</span>${hint ? `<span class="mt-1 block text-sm text-zinc-400">${hint}</span>` : ''}</label>`;
const radio = (t, s, on = false) => `<div class="flex min-h-14 items-center gap-3 rounded-xl border ${on ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-500/70 bg-zinc-950/60'} p-3"><span class="flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${on ? 'border-orange-400' : 'border-zinc-400'}">${on ? '<span class="h-2.5 w-2.5 rounded-full bg-orange-400"></span>' : ''}</span><span><span class="block text-sm font-semibold text-white">${t}</span><span class="block text-sm text-zinc-400">${s}</span></span></div>`;

function auth() {
  const signup = `<div class="px-4 py-8">${authHead()}
    <div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h1 class="text-xl font-black tracking-tight text-white">Create your account</h1><p class="mt-1 text-sm text-zinc-400">Private by default. Takes about a minute.</p>
      <div class="mt-4 space-y-4">
        ${field('Your name or a nickname', 'user', 'e.g. Sam')}
        ${field('Email', 'mail', 'you@example.com')}
        ${field('Password', 'lock', '&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;', { dim: false, hint: 'At least 8 characters, with a capital letter and a number.' })}
        <fieldset><legend class="text-sm font-semibold text-zinc-200">How old are you?</legend><div class="mt-1.5 space-y-2">${radio('16 or older', 'You can start straight away.')}${radio('13, 14 or 15', 'A parent or guardian approves your account first.')}</div><p class="mt-1.5 text-sm text-zinc-400">Deadeye is for players aged 13 and over.</p></fieldset>
        <label class="block"><span class="text-sm font-semibold text-zinc-200">Where did you hear about Deadeye? <span class="font-normal text-zinc-400">(optional)</span></span><span class="mt-1.5 ${INPUT} justify-between text-zinc-300"><span>Choose one, or skip</span>${ic('chevron-down', 'h-4 w-4 text-zinc-400')}</span></label>
        <div class="flex min-h-11 items-center gap-3"><span class="h-6 w-6 flex-none rounded-md border-2 border-zinc-400"></span><span class="text-sm text-zinc-300">I agree to the <u class="text-orange-300">privacy policy</u> and <u class="text-orange-300">terms of use</u></span></div>
      </div>
      <a class="${PRIMARY} mt-4 h-12 text-base">Create account</a>
      <p class="mt-3 text-center text-sm text-zinc-400">Already have an account? <u class="font-semibold text-orange-300">Sign in</u></p>
    </div></div>`;

  const step = (i, t) => `<li class="flex items-start gap-3"><span class="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-zinc-800 text-orange-300 ring-1 ring-inset ring-white/10">${ic(i, 'h-[18px] w-[18px]')}</span><span class="pt-1.5 text-sm text-zinc-300">${t}</span></li>`;
  const verify = `<div class="px-4 py-8">${authHead({ eyebrow: false })}
    <div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-center">
      <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/30 to-orange-600/5 text-orange-300 ring-1 ring-orange-500/40" style="box-shadow:0 0 36px -8px rgba(249,115,22,.55)">${ic('mail', 'h-8 w-8', 1.75)}</span>
      <h1 class="mt-4 text-2xl font-black tracking-tight text-white">Check your email</h1>
      <p class="mt-2 text-base text-zinc-300">We sent a link to <span class="font-bold text-white">sam@example.ie</span>.</p>
      <ol class="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left">${step('mail-open', 'Open the email from Deadeye. Check spam or junk if it is not there.')}${step('arrow-up-right', 'Tap the link. It brings you back here to finish setting up.')}</ol>
      <p class="mt-4 text-sm text-zinc-400">Can&rsquo;t find it? It can take a minute or two to arrive.</p>
      <a class="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-500/70 text-sm font-semibold text-zinc-100">${ic('send', 'h-4 w-4')} Send it again</a>
      <p class="mt-1.5 text-sm text-zinc-400">After a tap it waits 60 seconds before it works again.</p>
      <div class="mt-3 flex items-center justify-between text-sm"><u class="flex min-h-11 items-center text-zinc-300">Wrong email? Start again</u><u class="flex min-h-11 items-center text-zinc-300">Sign in instead</u></div>
    </div></div>`;

  const signin = `<div class="px-4 py-8" style="padding-top:88px">${authHead()}
    <div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h1 class="text-xl font-black tracking-tight text-white">Sign in</h1>
      <div class="mt-4 space-y-4">
        ${field('Email', 'mail', 'you@example.com')}
        <label class="block"><span class="flex items-center justify-between"><span class="text-sm font-semibold text-zinc-200">Password</span><u class="flex min-h-11 items-center text-sm text-orange-300">Forgot password?</u></span><span class="${INPUT} text-zinc-200">${ic('lock', 'h-[18px] w-[18px] flex-none text-zinc-400')}<span>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span></span></label>
      </div>
      <a class="${PRIMARY} mt-4 h-12 text-base">Sign in</a>
      <p class="mt-3 text-center text-sm text-zinc-400">New to Deadeye? <u class="font-semibold text-orange-300">Create an account</u></p>
    </div></div>`;

  const col = (b, a, label) => `<div>${cap(label.b)}${b}${cap(label.a, 'after').replace('mb-2', 'mb-2 mt-6')}${a}</div>`;
  write(
    'auth',
    page({
      title: 'Polish: sign up, check your email, sign in',
      body: `<div class="mx-auto flex w-[1278px] gap-6 p-6">
        ${col(beforeShot('2026-11-20-review-before-signup-390.png', 1060), phone(signup, { h: 1060 }), { b: 'Sign up today', a: 'Sign up polished' })}
        ${col(beforeShot('2026-11-20-review-before-verify-390.png', 1060), phone(verify, { h: 1060 }), { b: 'Check your email today', a: 'Check your email polished' })}
        ${col(beforeShot('2026-11-20-review-before-login-390.png', 1060), phone(signin, { h: 1060 }), { b: 'Sign in today', a: 'Sign in polished' })}
      </div>`,
    })
  );
}

landing();
auth();
const b2 = await import('./2026-11-22-polish-build-2.mjs');
const b3 = await import('./2026-11-22-polish-build-3.mjs');
b2.today({ write });
b2.result({ write });
b3.cards({ OUT, write });
b3.watch({ write });
const b4 = await import('./2026-11-22-shotchart-build.mjs');
b4.shotchart({ write: (n, h) => fs.writeFileSync(path.join(OUT, '2026-11-22-' + n + '.html'), h) });
console.log('built');
