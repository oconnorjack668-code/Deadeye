// src/app/(app)/plays/[id]/quiz/page.tsx
// The role quiz for a play: three questions worked out from the drawing.
// When the play was set by the player's coach, the page says plainly what the
// coach will see.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { ProLock } from '@/components/ProGate';
import { PlayQuiz } from '@/components/plays/PlayQuiz';
import { fromCoach } from '@/lib/plays/access';
import { UUID_PATTERN } from '@/lib/plays/input';
import { COACH_SEES_LINE } from '@/lib/plays/progress';
import { buildQuiz } from '@/lib/plays/quiz';
import { opensFor, PLAY_COLUMNS, toPlay, type PlayRow } from '@/lib/plays/rows';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Play quiz - Deadeye' };

export default async function PlayQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  await requireUser();
  const supabase = await createClient();
  const [{ data: row }, isPro, coach] = await Promise.all([
    supabase.from('plays').select(PLAY_COLUMNS).eq('id', id).maybeSingle() as unknown as Promise<{ data: PlayRow | null }>,
    getHasPro(),
    fromCoach(supabase, id),
  ]);
  if (!row) notFound();
  const play = toPlay(row);
  const locked = play ? !opensFor(play, isPro, coach.assigned || coach.playbookTeams.length > 0) : false;
  const questions = play && !locked ? buildQuiz(play.diagram) : [];

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href={`/plays/${id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> {row.title}
          </Link>
          <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">Quiz: {row.title}</h1>

          {coach.assigned && (
            <p className="flex items-start gap-2 text-sm text-zinc-400">
              <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" /> {COACH_SEES_LINE}
            </p>
          )}

          {!play ? (
            <p role="alert" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              This play could not be shown. Try another one from the library.
            </p>
          ) : locked ? (
            <ProLock title="This play is part of Pro">
              <p>Pro opens every play in the library, each with a quiz on your role.</p>
            </ProLock>
          ) : questions.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              This play has no quiz yet: nobody moves to a named spot on the court.
            </p>
          ) : (
            <PlayQuiz playId={play.id} title={play.title} diagram={play.diagram} questions={questions} />
          )}
        </div>
      </div>
    </div>
  );
}
