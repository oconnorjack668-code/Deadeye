// src/app/page.tsx
// The landing page: what Deadeye is, what it does, what it costs and how to
// get it onto a phone. It is the website, so it shows to everyone, signed in
// or not - it used to send signed-in players straight to their dashboard,
// which meant the person running Deadeye could never see their own website.
// Signed-in visitors get "Open Deadeye" where everyone else gets "Start free".
// The installed app still opens on the dashboard: see StandaloneRedirect.
import React from 'react';
import Link from 'next/link';
import {
  Activity,
  Brain,
  Check,
  ChevronDown,
  ClipboardList,
  Crown,
  Dumbbell,
  Gift,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Video,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { InstallGuide } from '@/components/InstallGuide';
import { InAppBrowserNotice } from '@/components/InAppBrowserNotice';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingDemo } from '@/components/LandingDemo';
import { StandaloneRedirect } from '@/components/StandaloneRedirect';
import { getCurrentUser } from '@/lib/auth';
import { FREE_PLAN, PRO_PLAN, PRO_PRICE_FALLBACK, WHY_PRO_COSTS } from '@/lib/plans';
import { proPriceLabels, stripeConfigured } from '@/lib/stripe';
import { FOUNDER_PRICE_FALLBACK, FOUNDING_MONTHS, FOUNDING_PLACES, showPlacesLeft } from '@/lib/founding';
import { getFoundingOffer } from '@/lib/foundingServer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Deadeye - the basketball app that watches your shot',
  description:
    'Point your phone at the hoop and Deadeye counts every make and miss. Form check, training programs, an AI coach and basketball IQ, free to start.',
};

const TRACKER_POINTS = [
  'No sensors, no wearables, no special ball. Just your phone on a tripod or a bag.',
  'Live from the camera, or from a video you filmed earlier.',
  'Can call every make and miss out loud, so you never walk back to check the phone.',
  'Every shot can be corrected before it is saved, so your numbers stay honest.',
];

const FEATURES = [
  {
    icon: Target,
    title: 'Shot tracking',
    desc: 'Makes, misses and percentage counted automatically, with shot charts and hot and cold zones.',
  },
  {
    icon: ScanEye,
    title: 'Form check',
    desc: 'Film your jumper and see your knee bend, elbow, release angle and timing. The video never leaves your phone.',
  },
  {
    icon: Sparkles,
    title: 'AI coach',
    desc: 'Feedback on every session: what went well, what to fix, and what to do next. Ask it anything about your game.',
  },
  {
    icon: ClipboardList,
    title: 'Training programs',
    desc: 'Plans that build week by week for shooting, handles, finishing and athleticism: 4 free, 18 with Pro. Plus 150 drills.',
  },
  {
    icon: Dumbbell,
    title: 'Gym and athletic tests',
    desc: 'A gym logger with 160+ exercises and personal records, plus vertical jump, sprint and agility tests.',
  },
  {
    icon: Brain,
    title: 'Basketball IQ',
    desc: 'Study sections on offense, defense, reads and rules, with quizzes and a free question every day.',
  },
  {
    icon: Trophy,
    title: 'Compete',
    desc: 'Weekly challenges, badges, streaks, XP ranks from Rookie to GOAT, friends and an opt-in leaderboard.',
  },
  {
    icon: Users,
    title: 'Teams and coaches',
    desc: 'Join your team with a code. Coaches post assignments, and you can ask your coach about a read in your own film.',
  },
];

/**
 * The questions that stop people signing up, answered. Every answer has to be
 * true of the app as it stands (checked against the code, the terms and the
 * privacy policy on 21 Oct 2026) - change it when what it describes changes.
 * The same text feeds the FAQ markup Google reads, so the two cannot differ.
 */
function faqItems(proPrice: string): Array<{ q: string; a: string }> {
  return [
    {
      q: 'Does Deadeye work on my phone?',
      a: "Yes, on iPhone and Android. Deadeye runs in Safari or Chrome, so there's nothing to download from an app store. Add it to your home screen once and it opens full screen, like any other app.",
    },
    {
      q: 'Do I have to hold my phone while I shoot?',
      a: 'No. Prop it on a tripod, a bag or a bench, 3 to 6 metres from the hoop and off to one side, with the whole ring in shot. Tap the two sides of the rim once, then just shoot: Deadeye counts every make and miss.',
    },
    {
      q: 'How accurate is the shot tracker?',
      a: 'It calls every shot as a make or a miss, and you can fix any call before you save, so your numbers stay honest. Good light and the whole ring and net in shot help most. You can watch it count a real session further up this page.',
    },
    {
      q: 'Do my videos get uploaded?',
      a: 'Not unless you choose to. Shot tracking and form check run on your phone itself, so a video you analyse never leaves it. You can upload a clip on purpose, for example to ask your coach about it.',
    },
    {
      q: 'Is Deadeye safe for under-16s?',
      a: 'Players under 16 need a parent or guardian to approve their account, and the parent can withdraw that at any time. Profiles are private by default, there are no ads and no messaging between players, and we never sell data.',
    },
    {
      q: "What's free, and what does Pro add?",
      a: `Shot tracking, logging and your history, all 150 drills, form check, 4 training programs and the social features are free, with no time limit. Pro (${proPrice}) adds every program and IQ section, unlimited AI coaching with a weekly report, your all-time shot chart and form trends, and teams.`,
    },
    {
      q: 'Can I cancel Pro?',
      a: 'Yes, any time, in Profile → Deadeye Pro → Manage subscription. You keep Pro until the end of the period you paid for. You can also withdraw within 14 days of buying and get a full refund.',
    },
    {
      q: "What if there's no signal at the court?",
      a: "Sessions you log with no signal are kept on your phone and upload by themselves when you're back online.",
    },
    {
      q: 'Can coaches use Deadeye?',
      a: 'Yes. A coach creates a team, players join with a code, and the coach can post assignments and see the training each player chooses to share. Players always join for free.',
    },
    {
      q: 'How do I delete my account?',
      a: 'Any time, in Settings → Delete account. Your data is deleted straight away, apart from crash reports, which go within 90 days, and the payment records the law requires. You can download a copy of your data on the same page first.',
    },
  ];
}

export default async function Home() {
  const signedIn = !!(await getCurrentUser());

  const [{ monthly, yearly, founder }, offer] = await Promise.all([proPriceLabels(), getFoundingOffer()]);
  const proPrice = [monthly, yearly].filter(Boolean).join(' or ') || PRO_PRICE_FALLBACK;
  const buyingOpen = stripeConfigured();
  const foundingLine = `The first ${FOUNDING_PLACES} players get ${FOUNDING_MONTHS} months of Pro free`;
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;
  const faq = faqItems(proPrice);

  return (
    <div className="flex-1 bg-zinc-950 text-zinc-100">
      <StandaloneRedirect signedIn={signedIn} />
      <LandingHeader signedIn={signedIn} />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:pt-20">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-red-600/10 blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <InAppBrowserNotice />
            <Logo size={72} className="mx-auto" />
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-red-400">Aim is earned</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-6xl">
              The basketball app that watches your shot
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Point your phone at the hoop and Deadeye counts every make and miss for you. Then it checks your form,
              plans your training and tells you what to work on next.
            </p>
            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href={signedIn ? '/dashboard' : '/signup'}
                className="flex h-12 items-center justify-center rounded-xl bg-orange-600 px-8 font-semibold text-white hover:bg-orange-500"
              >
                {signedIn ? 'Open Deadeye' : 'Create a free account'}
              </Link>
              <a
                href="#get-the-app"
                className="flex h-12 items-center justify-center rounded-xl border border-zinc-700 px-8 font-semibold text-zinc-200 hover:bg-zinc-900"
              >
                How to get the app
              </a>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Free to start · For players aged 13 and over · No ads</p>
            <a href="#try-it" className="mt-3 inline-block text-sm font-semibold text-orange-400 hover:text-orange-300">
              Watch it track real shots, right here ↓
            </a>
            {offer.open && (
              <a
                href="#pricing"
                className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/15"
              >
                <Gift className="h-4 w-4 flex-shrink-0" />
                <span>
                  Founding offer: {foundingLine.charAt(0).toLowerCase() + foundingLine.slice(1)}
                  {offer.counted && showPlacesLeft(offer.placesLeft) ? ` · only ${offer.placesLeft} left` : ''}
                </span>
              </a>
            )}
          </div>
        </section>

        {/* Get the app. Straight after the hero, because most new players arrive
            from a link in TikTok or Instagram and the next thing they need is how
            to put Deadeye on their phone, not more reasons to want it. */}
        <section id="get-the-app" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-14">
          <div className="mx-auto max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-400">
              <Activity className="h-4 w-4" /> Get the app
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Add Deadeye to your home screen</h2>
            <p className="mt-3 text-zinc-400">
              Deadeye runs in your phone&apos;s browser, so there is nothing to download from an app store. Add it to your
              home screen once and it opens full screen, like any other app.
            </p>
            <div className="mt-6">
              <InstallGuide />
            </div>
          </div>
        </section>

        {/* Shot tracker spotlight, with the promo. On a phone the video sits
            between the heading and the points; wider screens give it its own
            column. preload="none" so visitors who never press play don't
            download it; the 720p copy in public/promo is cut from
            docs/brand/deadeye-promo-voice.mp4. */}
        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 sm:items-center">
            <div className="sm:self-end">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-400">
                <Video className="h-4 w-4" /> Automatic shot tracking
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Put the phone down. Shoot.</h2>
              <p className="mt-3 text-zinc-400">
                Tap the two sides of the rim once, and Deadeye follows the ball and calls each shot as it drops - or
                doesn&apos;t.
              </p>
            </div>
            <figure className="mx-auto w-full max-w-[300px] sm:col-start-2 sm:row-span-2 sm:row-start-1">
              <video
                className="aspect-[9/16] w-full rounded-3xl border border-zinc-800 bg-zinc-900 object-cover"
                src="/promo/deadeye-promo.mp4"
                poster="/promo/deadeye-promo-poster.jpg"
                controls
                playsInline
                preload="none"
                aria-label="Deadeye promo: the shot tracker counting makes and misses"
              />
              <figcaption className="mt-2 text-center text-xs text-zinc-500">25 seconds · sound on</figcaption>
            </figure>
            <ul className="space-y-3 sm:self-start">
              {TRACKER_POINTS.map((p) => (
                <li key={p} className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* The tracker itself, on a real clip. The promo shows it; this lets a
              visitor watch it count, in their own browser, before signing up. */}
          <div id="try-it" className="mx-auto mt-14 max-w-xl scroll-mt-28">
            <h3 className="text-2xl font-black tracking-tight text-white">Watch it call real shots</h3>
            <p className="mt-2 mb-5 text-sm text-zinc-400">
              This is the real tracker, running right here in your browser on a clip from a real session. Press play and
              watch it count every make and miss.
            </p>
            <LandingDemo signedIn={signedIn} />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-white">Everything in one app</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-400">
              Your shooting, training, gym work and film in one place, so all of your progress is in one record instead
              of spread across apps and notes.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <Icon className="h-6 w-6 text-orange-400" />
                    <h3 className="mt-3 font-bold text-white">{f.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-white">Up and running in two minutes</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['Create a free account', 'Email and a password. Under 16? A parent approves your account from a link.'],
                ['Add it to your home screen', 'Deadeye is a web app: no app store, no download, and it opens full screen. The steps are near the top of this page.'],
                ['Train', 'Track your shots, follow a program, log the gym, and watch your numbers move.'],
              ].map(([title, desc], i) => (
                <li key={title} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-sm font-black text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-bold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-white">Free to start</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-zinc-400">
              Start training for free. Go Pro when you want your own AI coach with no limits.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
                <div className="text-lg font-bold text-white">{FREE_PLAN.name}</div>
                <div className="text-sm text-zinc-400">{FREE_PLAN.tagline}</div>
                <div className="mt-4 text-3xl font-black text-white">€0</div>
                <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                  {FREE_PLAN.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent p-6">
                <div className="flex items-center gap-2 text-lg font-bold text-white">
                  <Crown className="h-5 w-5 text-amber-400" /> {PRO_PLAN.name}
                </div>
                <div className="text-sm text-amber-200">{PRO_PLAN.tagline}</div>
                <div className="mt-4 text-xl font-black text-white">{proPrice}</div>
                {!buyingOpen && <div className="text-xs text-amber-200/80">Buying Pro opens soon</div>}
                <ul className="mt-5 space-y-2 text-sm text-zinc-200">
                  {PRO_PLAN.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {offer.open && (
              <div className="mt-4 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent p-6">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                  <Gift className="h-4 w-4" /> Founding member offer
                </p>
                <p className="mt-1 text-xl font-black text-white">{foundingLine}</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Every Pro feature for {FOUNDING_MONTHS} months, with no card and nothing to cancel: it simply ends, and you
                  go back to Free. Founding members can then keep Pro for {founder || FOUNDER_PRICE_FALLBACK}, for as long
                  as they stay subscribed. Create a free account and claim it from your dashboard.
                </p>
                {offer.counted && showPlacesLeft(offer.placesLeft) && (
                  <p className="mt-2 text-sm font-bold text-amber-300">
                    Only {offer.placesLeft} place{offer.placesLeft === 1 ? '' : 's'} left
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="font-bold text-white">Why Pro costs money</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {WHY_PRO_COSTS.map((w) => (
                  <li key={w.title} className="text-sm">
                    <span className="block font-semibold text-zinc-100">{w.title}</span>
                    <span className="text-zinc-400">{w.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Parents */}
        <section id="parents" className="scroll-mt-28 px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-400">
              <ShieldCheck className="h-4 w-4" /> For parents
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Built for young players</h2>
            <ul className="mt-6 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
              {[
                'Players under 16 need a parent or guardian to approve their account, and you can withdraw that at any time.',
                'Profiles are private by default. Nothing is shown on the leaderboard unless the player switches it on.',
                'No ads, no selling data, and no chat or messaging between players.',
                'Form check and shot tracking run on the phone itself, so most videos never leave it.',
              ].map((p) => (
                <li key={p} className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-zinc-400">
              Read exactly what Deadeye keeps and who can see it in the{' '}
              <Link href="/privacy" className="text-orange-400 underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* FAQ. Native details/summary: opens and closes with no JavaScript,
            works with a keyboard and a screen reader, and every answer is in
            the page for search engines whether it is open or not. */}
        <section id="faq" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-3xl font-black tracking-tight text-white">Questions</h2>
            <p className="mt-2 text-center text-zinc-400">What players and parents ask before signing up.</p>
            <div className="mt-8 space-y-2">
              {faq.map(({ q, a }) => (
                <details key={q} className="group rounded-xl border border-zinc-800 bg-zinc-950/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-white">
                    {q}
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-6 text-zinc-300">{a}</p>
                </details>
              ))}
            </div>
            {contactEmail && (
              <p className="mt-6 text-center text-sm text-zinc-400">
                Something else?{' '}
                <a href={`mailto:${contactEmail}`} className="text-orange-400 underline">
                  Email us
                </a>
                .
              </p>
            )}
          </div>
          {/* The same questions, for search results (FAQPage structured data).
              '<' is escaped so no answer can ever close the script tag. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
              }).replace(/</g, '\\u003c'),
            }}
          />
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-3xl rounded-3xl border border-orange-600/40 bg-gradient-to-br from-orange-600/20 to-red-600/10 p-8 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white">Aim is earned</h2>
            <p className="mt-2 text-zinc-300">Start tracking your shots today. It&apos;s free.</p>
            <Link
              href={signedIn ? '/dashboard' : '/signup'}
              className="mx-auto mt-6 flex h-12 max-w-xs items-center justify-center rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-500"
            >
              {signedIn ? 'Open Deadeye' : 'Create a free account'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-4 py-8 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Deadeye Basketball Training</span>
          <nav className="flex flex-wrap gap-4">
            <Link href="/install" className="hover:text-zinc-300">
              Install
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              Terms
            </Link>
            <Link href="/account-deletion" className="hover:text-zinc-300">
              Delete an account
            </Link>
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="hover:text-zinc-300">
                Contact
              </a>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
