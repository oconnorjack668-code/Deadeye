// src/app/(app)/plays/layout.tsx
// Every Plays page goes through here (the library, a play, its quiz, drawing
// and editing). While Plays is switched off (src/lib/plays/live.ts:
// PLAYS_LIVE=false, and not the owner), players see a plain card instead and
// no play, save or attempt is read for them.
import React from 'react';
import { BookOpen } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { PLAYS_NOT_OPEN, playsOpenForMe } from '@/lib/plays/live';
import { PageHeader } from '@/components/layout/PageHeader';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { IqTabs } from '@/components/study/IqTabs';

export default async function PlaysLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  if (await playsOpenForMe()) return <>{children}</>;

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <PageHeader tone="iq" icon={BookOpen} title="Basketball IQ" subtitle="Plays to learn step by step, and your job in each" />
        <IqTabs active="plays" />

        <section className="max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="font-bold text-white">{PLAYS_NOT_OPEN}</h2>
          <p className="mt-1 text-sm text-zinc-300">Check back soon. Any quiz you already did is kept.</p>
        </section>
      </div>
    </div>
  );
}
