// src/app/(app)/welcome/WelcomeClient.tsx
'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { track, trackIfFromDemo } from '@/lib/events';
import { clearInvite, pendingInvite } from '@/lib/friends';
import { REMINDER_TIME_LABEL } from '@/lib/reminders';
import Link from 'next/link';
import { ArrowLeft, Brain, Camera, Check, MapPin, PenLine, PlayCircle, Sofa, UserPlus } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { RemindersCard } from '@/app/(app)/profile/RemindersCard';

type Answer = 'ask' | 'court' | 'later';

/** The placement tips that matter most, from the tracker's own first screen. */
const COURT_TIPS = [
  'Prop the phone up: a tripod, a bag or a bench, not your hand',
  '3 to 6 metres from the hoop, off to one side, at head height or higher',
  'The whole ring and net in shot, big in the picture',
];

export function WelcomeClient({ firstName }: { firstName: string | null }) {
  const [answer, setAnswer] = useState<Answer>('ask');
  // Saved by the login page when they signed up from a friend's invite link.
  // Read after hydration (null on the server), as StarterSteps reads its flags.
  const invite = useSyncExternalStore(noSubscribe, pendingInvite, () => null);

  useEffect(() => {
    track('welcome_seen');
    trackIfFromDemo();
  }, []);

  if (answer === 'court') {
    return (
      <div className="space-y-5">
        <BackButton onClick={() => setAnswer('ask')} />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Let&apos;s count your shots</h1>
          <p className="mt-2 text-zinc-400">
            Set the phone down, tap the two sides of the rim once, and shoot. Deadeye calls every make and miss.
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-4">
          <video
            className="aspect-[9/16] w-full rounded-2xl border border-zinc-800 bg-zinc-900 object-cover"
            src="/promo/rim-taps.mp4"
            poster="/promo/rim-taps-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Tapping the two sides of the rim to set up the tracker"
          />
          <ul className="space-y-2 text-sm text-zinc-300">
            {COURT_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Link
            href="/video"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-600 font-bold text-white hover:bg-orange-500"
          >
            <Camera className="h-5 w-5" /> Track with the camera
          </Link>
          <Link
            href="/basketball/new"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-700 font-semibold text-zinc-200 hover:bg-zinc-900"
          >
            <PenLine className="h-4 w-4" /> Log shots by hand instead
          </Link>
          <p className="text-center text-xs text-zinc-500">
            By hand is two taps a spot: where you shot from, then how many went in.
          </p>
        </div>
      </div>
    );
  }

  if (answer === 'later') {
    return (
      <div className="space-y-5">
        <BackButton onClick={() => setAnswer('ask')} />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">No problem</h1>
          <p className="mt-2 text-zinc-400">
            Pick the days you usually train, and Deadeye will remind you {REMINDER_TIME_LABEL} on those days.
          </p>
        </div>

        <RemindersCard showWeekly={false} />

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-300">While you wait</p>
          <div className="mt-3 space-y-2">
            <Link
              href="/welcome/sample"
              className="flex items-center gap-3 rounded-xl border border-orange-600/40 bg-orange-600/10 p-3 hover:bg-orange-600/15"
            >
              <PlayCircle className="h-6 w-6 flex-shrink-0 text-orange-400" />
              <span>
                <span className="block font-semibold text-white">Watch the tracker call a session</span>
                <span className="block text-xs text-zinc-400">30 seconds, on a sample clip. No court needed.</span>
              </span>
            </Link>
            <Link href="/study" className="flex items-center gap-3 rounded-xl border border-zinc-800 p-3 hover:bg-zinc-900">
              <Brain className="h-6 w-6 flex-shrink-0 text-cyan-400" />
              <span>
                <span className="block font-semibold text-white">Answer today&apos;s IQ question</span>
                <span className="block text-xs text-zinc-400">One question a day about reads and decisions.</span>
              </span>
            </Link>
          </div>
        </div>

        <Link href="/dashboard" className="block text-center text-sm font-semibold text-zinc-400 hover:text-zinc-200">
          Go to my dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 text-center">
      <Logo size={64} className="mx-auto" />
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          {firstName ? `You're in, ${firstName}` : "You're in"}
        </h1>
        <p className="mt-2 text-zinc-400">Are you at a court right now?</p>
      </div>
      <div className="grid gap-3 text-left sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setAnswer('court')}
          className="flex items-center gap-3 rounded-2xl border border-orange-600/50 bg-orange-600/10 p-4 text-left hover:bg-orange-600/20"
        >
          <MapPin className="h-7 w-7 flex-shrink-0 text-orange-400" />
          <span>
            <span className="block text-lg font-bold text-white">Yes, I&apos;m at a court</span>
            <span className="block text-sm text-zinc-400">Start counting shots now</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setAnswer('later')}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:bg-zinc-900"
        >
          <Sofa className="h-7 w-7 flex-shrink-0 text-zinc-300" />
          <span>
            <span className="block text-lg font-bold text-white">Not right now</span>
            <span className="block text-sm text-zinc-400">Set a reminder, see how it works</span>
          </span>
        </button>
      </div>
      {invite && (
        <Link
          href={`/friends/add/${invite}`}
          onClick={clearInvite}
          className="flex items-center gap-3 rounded-2xl border border-cyan-600/40 bg-cyan-600/10 p-4 text-left hover:bg-cyan-600/15"
        >
          <UserPlus className="h-6 w-6 flex-shrink-0 text-cyan-400" />
          <span>
            <span className="block font-semibold text-white">Add the friend who invited you</span>
            <span className="block text-sm text-zinc-400">Then you can see each other&apos;s training and compete.</span>
          </span>
        </Link>
      )}
      <Link href="/dashboard" className="inline-block text-sm text-zinc-500 hover:text-zinc-300">
        Skip to my dashboard
      </Link>
    </div>
  );
}

const noSubscribe = () => () => {};

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}
