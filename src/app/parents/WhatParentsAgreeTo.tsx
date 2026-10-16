// src/app/parents/WhatParentsAgreeTo.tsx
// What a parent is agreeing to, in plain words. Consent only counts if it is
// informed, so this is the part of the approval that matters most - keep it in
// step with the privacy policy when either changes.
import React from 'react';
import Link from 'next/link';
import { aiProviderCompany } from '@/lib/ai/config';

export function WhatParentsAgreeTo({ child }: { child: string }) {
  const ai = aiProviderCompany();
  return (
    <section className="space-y-3 text-sm leading-6 text-zinc-300">
      <h2 className="text-base font-bold text-white">What Deadeye is</h2>
      <p>
        Deadeye is a basketball training app. {child} logs training, shooting and gym work, follows training programmes,
        and can film their shot to check their form. Deadeye has no ads, does not sell data, and has no chat or messaging
        between players.
      </p>

      <h2 className="text-base font-bold text-white">What it keeps about {child}</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Email address, a display name, and a player profile: age group, height, position and goals.</li>
        <li>The training they log, and quiz and study progress.</li>
        <li>
          Videos only if they choose to upload one. Form analysis runs on the phone, so most videos never leave the
          device.
        </li>
      </ul>

      <h2 className="text-base font-bold text-white">Who else can see it</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Nobody, by default. The profile is private.</li>
        <li>
          If {child} switches on the public leaderboard: their display name, points, streak and badges. Never their age.
        </li>
        <li>Friends they accept by code: weekly training totals and badges. Never notes, videos or profile details.</li>
        <li>
          Teams they join: the team&apos;s coaches see training totals and game averages. More detail, or a video clip,
          only if {child} chooses to share it with that coach.
        </li>
      </ul>

      <h2 className="text-base font-bold text-white">The AI coach</h2>
      <p>
        When {child} asks for AI feedback, the numbers from that session (never videos) are sent to{' '}
        {ai ? `our AI provider, ${ai},` : 'our AI provider'} to write the feedback. It can be switched off in Settings.
      </p>

      <h2 className="text-base font-bold text-white">You stay in control</h2>
      <p>
        You can withdraw your approval at any time from the link you approve with. The account is then locked straight
        away, and deleted after 30 days unless you approve it again. {child} can also delete the account and everything in
        it at any time. Full details are in the{' '}
        <Link href="/privacy" target="_blank" className="text-red-400 underline">
          privacy policy
        </Link>{' '}
        and{' '}
        <Link href="/terms" target="_blank" className="text-red-400 underline">
          terms
        </Link>
        .
      </p>
    </section>
  );
}
