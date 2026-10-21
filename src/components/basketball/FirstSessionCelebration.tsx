// src/components/basketball/FirstSessionCelebration.tsx
// Shown once, straight after a player saves their very first session: the
// moment to say what it unlocked, while they are still looking at the screen.
// The pages show it only with ?saved=1 and a lifetime count of one session.
import React from 'react';
import Link from 'next/link';
import { BarChart3, Flame, PartyPopper, Sparkles } from 'lucide-react';

const UNLOCKED = [
  { icon: BarChart3, text: 'Your shot chart and hot and cold zones, on the dashboard' },
  { icon: Flame, text: 'Day one of your streak. Train again tomorrow to keep it going' },
  { icon: Sparkles, text: 'The AI coach can now read your numbers and tell you what to work on' },
];

export function FirstSessionCelebration({ xp }: { xp: number }) {
  return (
    <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-transparent p-5">
      <div className="deadeye-pop flex items-center gap-3">
        <PartyPopper className="h-8 w-8 flex-shrink-0 text-emerald-300" />
        <div>
          <p className="text-xl font-black text-white">First session logged!</p>
          <p className="text-sm font-semibold text-amber-300">+{xp} XP</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-zinc-200">
        {UNLOCKED.map(({ icon: Icon, text }) => (
          <li key={text} className="flex gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
            {text}
          </li>
        ))}
      </ul>
      <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-emerald-300 hover:text-emerald-200">
        See it on your dashboard →
      </Link>
    </div>
  );
}
