// src/app/(app)/coach/assignments/[id]/page.tsx
// Progress on a play set for a team, for its head coaches: each player not
// started, done or knows it, and how the team split on each quiz question,
// as totals. Never a player's own answers, nothing for teammates, and no
// reminders that name anyone (plan sections 7 and 11). Assistant coaches,
// who can be under 18, see that it was set, not who knows it.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { UUID_PATTERN } from '@/lib/plays/input';
import {
  COACH_SEES_LINE,
  playerStatus,
  resultsVisibleUntil,
  splitByQuestion,
  STATUS_LABELS,
  statusCounts,
  type PlayerStatus,
  type SplitRow,
} from '@/lib/plays/progress';
import { buildQuiz } from '@/lib/plays/quiz';
import { PLAY_COLUMNS, toPlay, type PlayRow } from '@/lib/plays/rows';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Play progress - Deadeye' };

const STATUS_STYLE: Record<PlayerStatus, string> = {
  knows_it: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  done: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
  not_started: 'bg-zinc-800 text-zinc-400 ring-zinc-700',
};

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default async function PlayProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  const { data: assignment } = await supabase.from('team_assignments').select('*').eq('id', id).maybeSingle();
  if (!assignment || !assignment.play_id) notFound();
  const { data: me } = await supabase.from('team_members').select('role').eq('team_id', assignment.team_id).eq('user_id', user.id).maybeSingle();
  if (me?.role !== 'coach' && me?.role !== 'assistant') notFound();
  const isHead = me.role === 'coach';

  const [{ data: playRow }, { data: team }, { data: roster }, { data: attempts }, { data: completions }, { data: split }] = await Promise.all([
    supabase.from('plays').select(PLAY_COLUMNS).eq('id', assignment.play_id).maybeSingle() as unknown as Promise<{ data: PlayRow | null }>,
    supabase.from('teams').select('name').eq('id', assignment.team_id).maybeSingle(),
    supabase.rpc('team_roster', { p_team: assignment.team_id }),
    // Row-level security returns these to head coaches only, inside the 90 days
    supabase.from('play_quiz_attempts').select('user_id, score').eq('play_id', assignment.play_id),
    supabase.from('team_assignment_completions').select('user_id').eq('assignment_id', id),
    isHead ? supabase.rpc('play_assignment_split', { p_assignment: id }) : Promise.resolve({ data: [] as SplitRow[] }),
  ]);
  const play = playRow ? toPlay(playRow) : null;
  const questions = play ? buildQuiz(play.diagram) : [];
  const players = (roster ?? []).filter((m) => m.role === 'player').sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''));
  const ticked = new Set((completions ?? []).map((c) => c.user_id));
  const statuses = players.map((p) => ({ player: p, status: playerStatus(p.user_id, attempts ?? [], ticked, questions.length) }));
  const counts = statusCounts(statuses.map((s) => s.status));
  const splits = splitByQuestion(questions, (split ?? []) as SplitRow[]);
  const until = resultsVisibleUntil(assignment.due_date, assignment.created_at);

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
              {[team?.name, assignment.due_date ? `Due ${formatDay(assignment.due_date)}` : 'No due date'].filter(Boolean).join(' · ')}
            </p>
            {play && (
              <Link href={`/plays/${play.id}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-orange-400 hover:underline">
                Open {play.title}
              </Link>
            )}
          </div>

          {!isHead ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              Head coaches see who has learned the play. Assistants see the assignment and who ticked it off, on the team page.
            </p>
          ) : (
            <>
              <section aria-labelledby="who" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 id="who" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Players
                </h2>
                <p className="text-sm text-zinc-300">
                  <span className="font-black tabular-nums text-white">{counts.knows_it}</span> know it ·{' '}
                  <span className="font-black tabular-nums text-white">{counts.done}</span> done ·{' '}
                  <span className="font-black tabular-nums text-white">{counts.not_started}</span> not started
                </p>
                {players.length === 0 ? (
                  <p className="text-sm text-zinc-400">No players on this team yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {statuses.map(({ player, status }) => (
                      <li key={player.user_id} className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-zinc-950/60 px-3 py-2">
                        <span className="min-w-0 truncate text-sm text-white">{player.display_name ?? 'Player'}</span>
                        <span className={cn('inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1', STATUS_STYLE[status])}>
                          {status === 'knows_it' && <Check className="h-3 w-3" />}
                          {STATUS_LABELS[status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-sm text-zinc-500">
                  Done means they took the quiz or ticked it off; knows it means {questions.length >= 3 ? '2 of 3' : 'every question'} right.
                  Players are told: &ldquo;{COACH_SEES_LINE}&rdquo;
                </p>
              </section>

              {splits.length > 0 && (
                <section aria-labelledby="split" className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div>
                    <h2 id="split" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      How the team answered
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">Each player&apos;s first try, as totals. Nobody&apos;s own answers are shown.</p>
                  </div>
                  {splits.map(({ question, answered, picks }) => (
                    <div key={question.key} className="space-y-2">
                      <p className="text-sm font-semibold text-white">{question.prompt}</p>
                      {answered === 0 ? (
                        <p className="text-sm text-zinc-500">No answers yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {picks.map((p) => (
                            <li key={p.pick}>
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className={p.right ? 'font-semibold text-emerald-300' : 'text-zinc-300'}>
                                  {p.label}
                                  {p.right && ' (right answer)'}
                                </span>
                                <span className="tabular-nums text-zinc-400">
                                  {p.players} of {answered}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
                                <div
                                  className={cn('h-full rounded-full', p.right ? 'bg-emerald-500' : 'bg-zinc-500')}
                                  style={{ width: `${Math.round((p.players / answered) * 100)}%` }}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
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
