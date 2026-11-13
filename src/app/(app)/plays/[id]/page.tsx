// src/app/(app)/plays/[id]/page.tsx
// One play: the animated court with its steps and "Show my role", the
// coaching points, who it suits, and a save button. A Pro play on Free shows
// what it is and that it is Pro, not the play itself.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { ProLock } from '@/components/ProGate';
import { PlayPlayer } from '@/components/plays/PlayPlayer';
import { SavePlayButton } from '@/components/plays/SavePlayButton';
import { ageLabel, categoryLabel } from '@/lib/plays/catalog';
import { ageRuleWarnings } from '@/lib/plays/ageRules';
import { opensFor, PLAY_COLUMNS, toPlay, type PlayRow } from '@/lib/plays/rows';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Play - Deadeye' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Anything else would only reach the database as an error
  if (!UUID.test(id)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  // Row-level security returns library plays and the player's own, nothing else
  const [{ data: row }, { data: savedRow }, isPro] = await Promise.all([
    supabase.from('plays').select(PLAY_COLUMNS).eq('id', id).maybeSingle() as unknown as Promise<{ data: PlayRow | null }>,
    supabase.from('play_saves').select('play_id').eq('user_id', user.id).eq('play_id', id).maybeSingle(),
    getHasPro(),
  ]);
  if (!row) notFound();
  const play = toPlay(row);
  const locked = play ? !opensFor(play, isPro) : false;
  const warnings = play ? ageRuleWarnings({ min_age: play.minAge, category: play.category, tags: play.tags, diagram: play.diagram }) : [];

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/plays" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> Plays
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">{row.title}</h1>
              {play && (
                <p className="mt-1 text-sm text-zinc-400">
                  {categoryLabel(play.category)} · {ageLabel(play.minAge)}
                </p>
              )}
            </div>
            {play && !locked && <SavePlayButton playId={play.id} userId={user.id} initial={!!savedRow} />}
          </div>

          {row.description && <p className="text-sm text-zinc-300">{row.description}</p>}

          {!play ? (
            <p role="alert" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              This play could not be shown. Try another one from the library.
            </p>
          ) : locked ? (
            <ProLock title="This play is part of Pro">
              <p>
                Pro opens every play in the library, with the animated court, each step by name and your own role in it.
                The free plays are marked in the library.
              </p>
            </ProLock>
          ) : (
            <>
              {warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" /> {w}
                </p>
              ))}

              <PlayPlayer diagram={play.diagram} title={play.title} />

              {play.coachingPoints.length > 0 && (
                <section aria-labelledby="coaching-points" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <h2 id="coaching-points" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Coaching points
                  </h2>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-300">
                    {play.coachingPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
