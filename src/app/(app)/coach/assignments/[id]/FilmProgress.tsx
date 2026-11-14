// src/app/(app)/coach/assignments/[id]/FilmProgress.tsx
// Progress on film set for a team (a clip or a pack), for its head coaches:
// each player not started, started or done with their score, and how the team
// split on each question, as totals. Never a player's own answers, nothing
// for teammates, and no reminders that name anyone (plan sections 7 and 11).
// Assistant coaches, who can be under 18, see that it was set, not who did it.
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { AnswerSplit } from '@/components/coach/AnswerSplit';
import { FILM_CLIP_COLUMNS, toClip, type FilmClip, type FilmClipRow } from '@/lib/film/rows';
import {
  FILM_STATUS_LABELS,
  filmPlayerProgress,
  filmStatusCounts,
  splitFilmQuestions,
  type FilmAttemptLite,
  type FilmSplitRow,
  type FilmStatus,
} from '@/lib/film/progress';
import { COACH_SEES_LINE, resultsVisibleUntil } from '@/lib/plays/progress';
import { cn } from '@/lib/utils';

type Client = Awaited<ReturnType<typeof createClient>>;
type Assignment = Database['public']['Tables']['team_assignments']['Row'];

const STATUS_STYLE: Record<FilmStatus, string> = {
  done: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  started: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
  not_started: 'bg-zinc-800 text-zinc-400 ring-zinc-700',
};

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
}

export async function filmProgressView({ supabase, assignment, isHead }: { supabase: Client; assignment: Assignment; isHead: boolean }): Promise<React.ReactElement> {
  const packId = assignment.film_pack_id;
  const [{ data: team }, { data: pack }, { data: links }] = await Promise.all([
    supabase.from('teams').select('name').eq('id', assignment.team_id).maybeSingle(),
    packId ? supabase.from('film_packs').select('id, title').eq('id', packId).maybeSingle() : Promise.resolve({ data: null }),
    packId ? supabase.from('film_pack_clips').select('clip_id, position').eq('pack_id', packId).order('position') : Promise.resolve({ data: [] as Array<{ clip_id: string; position: number }> }),
  ]);
  const clipIds = assignment.film_clip_id ? [assignment.film_clip_id] : (links ?? []).map((l) => l.clip_id);

  const [{ data: clipRows }, { data: roster }, { data: attempts }, { data: completions }, { data: split }] = await Promise.all([
    clipIds.length
      ? (supabase.from('film_clips').select(FILM_CLIP_COLUMNS).in('id', clipIds) as unknown as Promise<{ data: FilmClipRow[] | null }>)
      : Promise.resolve({ data: [] as FilmClipRow[] }),
    supabase.rpc('team_roster', { p_team: assignment.team_id }),
    // Row-level security returns these to head coaches only, inside the 90 days
    isHead && clipIds.length
      ? supabase.from('film_attempts').select('user_id, clip_id, score, total, completed_at').in('clip_id', clipIds)
      : Promise.resolve({ data: [] as FilmAttemptLite[] }),
    supabase.from('team_assignment_completions').select('user_id').eq('assignment_id', assignment.id),
    isHead ? supabase.rpc('film_assignment_split', { p_assignment: assignment.id }) : Promise.resolve({ data: [] as FilmSplitRow[] }),
  ]);
  const byId = new Map<string, FilmClip>();
  for (const row of clipRows ?? []) {
    const clip = toClip(row);
    if (clip) byId.set(clip.id, clip);
  }
  const clips = clipIds.flatMap((cid) => byId.get(cid) ?? []);
  const players = (roster ?? []).filter((m) => m.role === 'player').sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''));
  const ticked = new Set((completions ?? []).map((c) => c.user_id));
  const progress = players.map((p) => ({
    player: p,
    progress: filmPlayerProgress(p.user_id, (attempts ?? []) as FilmAttemptLite[], clipIds, ticked, assignment.created_at),
  }));
  const counts = filmStatusCounts(progress.map((p) => p.progress));
  const splits = splitFilmQuestions(clips, (split ?? []) as FilmSplitRow[]).filter((s) => s.questions.length > 0);
  const until = resultsVisibleUntil(assignment.due_date, assignment.created_at);
  const opens = assignment.film_clip_id ? { href: `/film/${assignment.film_clip_id}`, name: clips[0]?.title ?? 'the clip' } : packId ? { href: `/film/packs/${packId}`, name: pack?.title ?? 'the pack' } : null;

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/coach/assignments" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> Assignments
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">{assignment.title}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {[team?.name, assignment.due_date ? `Due ${formatDay(assignment.due_date)}` : 'No due date', packId ? `${clipIds.length} clips` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {opens && (
              <Link href={opens.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-orange-400 hover:underline">
                Open {opens.name}
              </Link>
            )}
          </div>

          {!isHead ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              Head coaches see who has watched the film and how they did. Assistants see the assignment and who ticked it off, on the team page.
            </p>
          ) : (
            <>
              <section aria-labelledby="film-who" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 id="film-who" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Players
                </h2>
                <p className="text-sm text-zinc-300">
                  <span className="font-black tabular-nums text-white">{counts.done}</span> done ·{' '}
                  {packId && (
                    <>
                      <span className="font-black tabular-nums text-white">{counts.started}</span> started ·{' '}
                    </>
                  )}
                  <span className="font-black tabular-nums text-white">{counts.not_started}</span> not started
                </p>
                {players.length === 0 ? (
                  <p className="text-sm text-zinc-400">No players on this team yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {progress.map(({ player, progress: p }) => (
                      <li key={player.user_id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-zinc-950/60 px-3 py-2">
                        <span className="min-w-0 truncate text-sm text-white">{player.display_name ?? 'Player'}</span>
                        <span className="flex flex-shrink-0 items-center gap-2">
                          {p.total > 0 && (
                            <span className="text-sm tabular-nums text-zinc-300">
                              {p.score} of {p.total} right
                            </span>
                          )}
                          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1', STATUS_STYLE[p.status])}>
                            {FILM_STATUS_LABELS[p.status]}
                            {packId && p.status === 'started' && ` ${p.clipsDone}/${p.clips}`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm text-zinc-500">
                  Done means they answered the questions on {packId ? 'every clip' : 'the clip'} or ticked it off; the score is their first try. Players are told:
                  &ldquo;{COACH_SEES_LINE}&rdquo;
                </p>
              </section>

              {splits.length > 0 && (
                <section aria-labelledby="film-split" className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div>
                    <h2 id="film-split" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      How the team answered
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">Each player&apos;s first try, as totals. Nobody&apos;s own answers are shown.</p>
                  </div>
                  {splits.map(({ clip, questions }) => (
                    <div key={clip.id} className="space-y-3">
                      {packId && <h3 className="font-bold text-white">{clip.title}</h3>}
                      {questions.map(({ question, answered, picks }) => (
                        <AnswerSplit key={question.key} prompt={question.question} answered={answered} picks={picks} />
                      ))}
                    </div>
                  ))}
                </section>
              )}
              <p className="text-sm text-zinc-500">Results show until {formatDay(until)}, 90 days after the due date.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
