// src/app/(app)/film/layout.tsx
// Every Film page goes through here. Until Film is open (src/lib/film/live.ts:
// FILM_LIVE=true, or the owner), players see a plain "on the way" card and
// the one film feature that already exists, asking a coach about their own
// clip. No clip, pack, note or attempt is read for them.
import React from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { filmOpenForMe } from '@/lib/film/live';
import { PageHeader } from '@/components/layout/PageHeader';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { IqTabs } from '@/components/study/IqTabs';

export default async function FilmLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  if (await filmOpenForMe()) return <>{children}</>;

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <PageHeader tone="iq" icon={BookOpen} title="Basketball IQ" subtitle="Watch the game and learn to read it" />
        <IqTabs active="film" />

        <div className="max-w-3xl space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="font-bold text-white">Film is on the way</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Short clips that stop at the key moment and ask what the right read is. They are not open yet.
            </p>
          </section>

          <Link
            href="/film-questions"
            className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">Was that the right read?</span>
              <span className="block text-sm text-zinc-400">Ask a coach about one decision in your own game film</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}
