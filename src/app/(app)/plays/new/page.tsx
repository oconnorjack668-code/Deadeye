// src/app/(app)/plays/new/page.tsx
// Draw a new play, or copy one ("Copy and edit", ?from=<play id>). For coach
// accounts; a coach on Free keeps 5 plays, so at the limit this says so
// instead of opening an editor whose play could not be saved.
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { ProNote } from '@/components/ProGate';
import { PlayEditor } from '@/components/plays/PlayEditor';
import { coachAccess, fromCoach } from '@/lib/plays/access';
import { draftFrom, UUID_PATTERN } from '@/lib/plays/input';
import { canDrawAnother, FREE_COACH_PLAYS } from '@/lib/plays/limits';
import { opensFor, PLAY_COLUMNS, toPlay, type Play, type PlayRow } from '@/lib/plays/rows';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Draw a play - Deadeye' };

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/coach/playbook" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> Playbook
          </Link>
          <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function NewPlayPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const user = await requireUser();
  const { from } = await searchParams;
  const supabase = await createClient();
  const [{ isCoach }, isPro, { count }] = await Promise.all([
    coachAccess(supabase, user.id),
    getHasPro(),
    supabase.from('plays').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
  ]);

  if (!isCoach) {
    return (
      <Shell title="Draw a play">
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          Drawing plays is for coaches.{' '}
          <Link href="/coach/setup" className="font-semibold text-orange-400 hover:underline">
            Set up as a coach
          </Link>{' '}
          to draw your own and share them with your team.
        </p>
      </Shell>
    );
  }

  if (!canDrawAnother(count ?? 0, isPro)) {
    return (
      <Shell title="Draw a play">
        <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          <p>
            You have {FREE_COACH_PLAYS} plays, which is what Free keeps. Delete one from your{' '}
            <Link href="/coach/playbook" className="font-semibold text-orange-400 hover:underline">
              playbook
            </Link>{' '}
            to draw another.
          </p>
          <ProNote>Pro keeps as many plays as you like.</ProNote>
        </div>
      </Shell>
    );
  }

  // Copy and edit: only a play this coach can open
  let source: Play | null = null;
  if (from && UUID_PATTERN.test(from)) {
    const [{ data: row }, coach] = await Promise.all([
      supabase.from('plays').select(PLAY_COLUMNS).eq('id', from).maybeSingle() as unknown as Promise<{ data: PlayRow | null }>,
      fromCoach(supabase, from),
    ]);
    const play = row ? toPlay(row) : null;
    if (play && opensFor(play, isPro, coach.assigned || coach.playbookTeams.length > 0)) source = play;
  }

  return (
    <Shell title={source ? 'Copy and edit' : 'Draw a play'}>
      {source && <p className="text-sm text-zinc-400">A copy of {source.title}. Change anything; the original stays as it is.</p>}
      <PlayEditor initialDiagram={source?.diagram} initialDraft={source ? draftFrom(source) : undefined} copiedFrom={source?.id ?? null} />
    </Shell>
  );
}
