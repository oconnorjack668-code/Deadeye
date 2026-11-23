// src/app/clubs/page.tsx
// Deadeye for clubs: the page a club committee, a head coach or a club's
// safeguarding officer opens from an outreach email, usually on a phone.
// It says what the club gets, how young players are kept safe, what it costs
// and how to start. Public, so src/lib/supabase/middleware.ts lists '/clubs'
// (only the exact path: /clubs/<id> is a club board and needs an account).
//
// Every claim here has to be true of the app as it stands (checked against the
// code on 18 Nov 2026: coach home, assignments, the club board, leagues, coach
// setup, the friends rules), and matches the pricing sheet
// (docs/sales/deadeye-club-plans.html). Prices come from src/lib/plans.ts,
// never typed here, so this page, the homepage and the sheet cannot disagree.
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarCheck,
  Check,
  ClipboardList,
  Download,
  Gift,
  Mail,
  ReceiptText,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { InAppBrowserNotice } from '@/components/InAppBrowserNotice';
import { getCurrentUser } from '@/lib/auth';
import { CLUB_PLANS, CLUB_PLANS_PDF, DRILL_COUNT, FOUNDING_CLUB_OFFER } from '@/lib/plans';
import { competitionLive } from '@/lib/competition';

const TITLE = 'Deadeye for clubs: players train between sessions, coaches see it';
const DESCRIPTION =
  'A basketball training app for Irish clubs. Coaches set the work and see who trained this week; a club board brings every team together. Coaching a team is free.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: 'Deadeye',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Deadeye' }],
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

const SECTIONS = [
  { id: 'benefits', label: 'What you get' },
  { id: 'safeguarding', label: 'Safeguarding' },
  { id: 'prices', label: 'Prices' },
  { id: 'start', label: 'Get started' },
] as const;

const BENEFITS = [
  {
    icon: CalendarCheck,
    title: 'Training between sessions, and coaches see it',
    text: 'Coaches post an assignment to the whole team. Coach home shows who trained this week and who has been quiet for 7 days or more, so nobody has to chase.',
  },
  {
    icon: Target,
    title: 'Players get more out of the time',
    text: `The phone counts makes and misses, so players see their numbers move. There are ${DRILL_COUNT} drills, training programmes and an AI coach.`,
  },
  {
    icon: Trophy,
    title: 'A club board for all your teams',
    text: "Head coaches post notices and set a club challenge, and teams race each week on training. It shows team totals, never a single player.",
  },
  {
    icon: Users,
    title: 'Leagues and age groups',
    text: "Each team picks its age group, U9 to Senior, and its league from a list of Irish competitions.",
  },
  {
    icon: ClipboardList,
    title: 'No extra admin for volunteer coaches',
    text: 'Players log their own training, so there is nothing for a coach to mark or type in. Setting up a team takes about two minutes, and Deadeye writes the message for parents.',
  },
  {
    icon: ReceiptText,
    title: 'One bill for the club',
    text: 'On the Club plan, every team in the club is covered by one yearly bill.',
  },
];

/** Word for word the safeguarding facts on the pricing sheet (page 2). */
const SAFEGUARDING = [
  'Head coaches are 18 or over and confirm Garda vetting when they set up.',
  'No private messages. Coaches post to the whole team.',
  'Coaches see weekly training totals. More only if a player chooses to share, and never their notes or videos.',
  "Players under 16 need a parent or guardian's approval.",
  "Coaches and players under 18 can't be friends on Deadeye.",
  'A team joins its club board only after we check with the club.',
  'Shot tracking runs on the phone, so videos stay there unless a player uploads one.',
  'Players can download or delete all their data at any time.',
];

const STEPS = [
  ['A coach signs up free', 'Create an account, choose "I coach" and set up the team. It takes about two minutes.'],
  ['Share the team code', 'Send the code, QR code or link. Deadeye writes the message for parents.'],
  ['Players join free', 'They start logging sessions straight away, and coach home fills up as they train.'],
  ['Move to a paid plan when ready', "A Team Pass or the Club plan, when you want every player on Pro. Players keep everything they've logged."],
] as const;

const sectionLabel = 'flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-400';
const heading = 'mt-2 text-3xl font-black tracking-tight text-white';

export default async function ClubsPage() {
  const signedIn = !!(await getCurrentUser());
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;
  // A new coach signs up and picks "I coach"; someone already signed in goes
  // straight to coach home, which sends them to coach setup if needed.
  const coachHref = signedIn ? '/coach' : '/signup';
  const coachLabel = signedIn ? 'Set up your team' : 'Sign up free as a coach';
  const mailto = (subject: string) => `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`;

  return (
    <div className="flex-1 bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">
              Open Deadeye
            </Link>
          ) : (
            <div className="flex items-center gap-1">
              <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:text-white">
                Log in
              </Link>
              <Link href="/signup" className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">
                Start free
              </Link>
            </div>
          )}
        </div>
        <nav aria-label="Sections" className="border-t border-zinc-900/80">
          <div className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-400 hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 pb-14 pt-12 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <InAppBrowserNotice />
            <p className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-400">
              <Users className="h-4 w-4" /> For clubs and teams
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Players train between sessions. Coaches see it.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Deadeye is a basketball training app built in Ireland. Players track their shooting with their phone and
              follow real programmes. Coaches set the work and see who did it.
            </p>
            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <Link
                href={coachHref}
                className="flex h-12 items-center justify-center rounded-xl bg-orange-600 px-8 font-semibold text-white hover:brightness-110"
              >
                {coachLabel}
              </Link>
              <a
                href="#prices"
                className="flex h-12 items-center justify-center rounded-xl border border-zinc-700 px-8 font-semibold text-zinc-200 hover:bg-zinc-900"
              >
                See the prices
              </a>
            </div>
            <p className="mt-4 text-sm text-zinc-400">Coaching one team is free today · Paid club plans open soon</p>
          </div>
        </section>

        {/* What the club gets */}
        <section id="benefits" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <p className={sectionLabel}>
              <Check className="h-4 w-4" /> What your club gets
            </p>
            <h2 className={heading}>More training, without more work for coaches</h2>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.title} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-400" aria-hidden="true" />
                    <div>
                      <h3 className="font-bold text-white">{b.title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{b.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-zinc-400">
              Deadeye is for training between sessions. It is not a replacement for your club&apos;s WhatsApp groups or
              club app: keep using those for fixtures, lifts and match-day news.
            </p>
          </div>
        </section>

        {/* Safeguarding */}
        <section id="safeguarding" className="scroll-mt-28 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <p className={sectionLabel}>
              <ShieldCheck className="h-4 w-4" /> Safeguarding
            </p>
            <h2 className={heading}>Built for young players</h2>
            <p className="mt-3 text-zinc-400">What a club&apos;s safeguarding officer usually asks first.</p>
            <ul className="mt-6 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
              {SAFEGUARDING.map((s) => (
                <li key={s} className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-zinc-400">
              The full detail of what Deadeye keeps and who can see it is in the{' '}
              <Link href="/privacy" className="text-orange-400 underline">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Prices */}
        <section id="prices" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <p className={sectionLabel}>
              <ReceiptText className="h-4 w-4" /> Prices
            </p>
            <h2 className={heading}>Priced by the year</h2>
            <p className="mt-3 text-zinc-400">
              Coach Free works today. Paid club plans open soon. All prices in euro.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-3">
              {CLUB_PLANS.map((p) => (
                <li key={p.name} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <p className="mt-1 text-3xl font-black tabular-nums text-white">{p.price}</p>
                  <p className="text-sm text-zinc-400">{p.alt}</p>
                  <p className="mt-2 text-sm text-zinc-300">{p.detail}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Gift className="h-4 w-4" aria-hidden="true" /> First 3 clubs
              </p>
              <p className="mt-1 text-sm text-zinc-200">{FOUNDING_CLUB_OFFER}</p>
            </div>
            <a
              href={CLUB_PLANS_PDF}
              download
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Club pricing sheet (PDF)
            </a>
          </div>
        </section>

        {/* Getting started */}
        <section id="start" className="scroll-mt-28 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-white">Getting started</h2>
            <ol className="mt-6 space-y-3">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-black text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-white">{title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Founding competition: a short mention only. Its own page, /competition,
            has the details and the rules; keep this to the facts there. */}
        <section id="competition" className="scroll-mt-28 border-y border-zinc-900 bg-zinc-900/40 px-4 py-14">
          <div className="mx-auto max-w-3xl">
            <p className={sectionLabel}>
              <Trophy className="h-4 w-4" /> Founding competition
            </p>
            <p className="mt-2 text-zinc-300">
              {competitionLive() ? 'Running a club? Enter our founding competition.' : 'Opening soon: our founding competition.'} The club that gives us the most useful feedback wins a year
              of the Club plan free, and every club that enters gets 25% off its first year. Closes 31 December 2026.
            </p>
            <Link href="/competition" className="mt-4 inline-block text-sm font-semibold text-orange-400 underline">
              How to enter, and the rules
            </Link>
          </div>
        </section>

        {/* Contact and the call to action */}
        <section className="px-4 py-14">
          <div className="mx-auto max-w-3xl rounded-3xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-6 text-center sm:p-8">
            <h2 className="text-3xl font-black tracking-tight text-white">Start with one team</h2>
            <p className="mt-2 text-zinc-300">Coaching a team is free. Bring the rest of the club when it works for you.</p>
            <Link
              href={coachHref}
              className="mx-auto mt-6 flex h-12 max-w-xs items-center justify-center rounded-xl bg-orange-600 font-semibold text-white hover:brightness-110"
            >
              {coachLabel}
            </Link>
            {contactEmail && (
              <a
                href={mailto('Deadeye for our club')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-400 underline"
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> Questions? Email us about your club
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-4 py-8 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Deadeye Basketball Training</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-zinc-300">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              Terms
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
