// src/components/TodayFirstStep.tsx
// The Today card for a player who has never logged a session: one thing to do.
//
// It used to offer three equal-looking choices (log shots, the camera, a
// program) above a four-step checklist and the reminders card, and nothing
// recorded which one a new player picked, so the funnel could not tell a
// player who chose nothing from one who chose the camera and gave up there.
// Now logging shots is the one button and the others are quiet links, and
// each records a marker (src/lib/events.ts).
'use client';

import Link from 'next/link';
import { track } from '@/lib/events';

// The primary Button's look (src/components/ui/Button.tsx) on a link, so the
// tap target is one element (no button inside a link) and 44px tall
const PRIMARY =
  'inline-flex h-11 w-full items-center justify-center rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-md shadow-orange-950/20 transition-all duration-150 hover:brightness-110 active:scale-[0.98] active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:w-auto';

const QUIET = 'font-semibold text-zinc-300 underline underline-offset-2 hover:text-white';

export function TodayFirstStep({ programHref, programLabel }: { programHref: string; programLabel: string }) {
  return (
    <>
      <div className="mt-1 text-xl font-black text-white">Log your first shots</div>
      <div className="text-sm text-zinc-300">
        Tap where you shoot from, then how many went in. Your shot chart starts with the first spot.
      </div>
      <Link href="/basketball/new" className={`${PRIMARY} mt-3`} onClick={() => track('today_log_tapped')}>
        Log shots
      </Link>
      <p className="mt-3 text-xs text-zinc-400">
        Or{' '}
        <Link href="/video" className={QUIET} onClick={() => track('today_track_tapped')}>
          track with the camera
        </Link>{' '}
        ·{' '}
        <Link href={programHref} className={QUIET} onClick={() => track('today_program_tapped')}>
          {programLabel}
        </Link>
      </p>
    </>
  );
}
