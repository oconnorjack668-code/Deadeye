// src/lib/plays/progress.ts
// What a head coach sees for a play they set (plan section 7, and the
// founder's choice in section 11): for each player, not started, done or
// knows it; for each question, how the team split across the answers, as
// totals. Never which player picked what: the database hands the coach only
// scores (play_quiz_attempts, without its answers column) and the totals
// (play_assignment_split, 00061).
import { knowsIt, targetLabel, type QuizQuestion } from './quiz';

/** Shown to a player wherever their result goes to their coach (plan section 8, rule 10). */
export const COACH_SEES_LINE = 'Your coach sees whether you did it and whether you got it right.';

export type PlayerStatus = 'not_started' | 'done' | 'knows_it';

export const STATUS_LABELS: Record<PlayerStatus, string> = {
  not_started: 'Not started',
  done: 'Done',
  knows_it: 'Knows it',
};

/**
 * A player knows it with any passing attempt; did it with any attempt, or by
 * ticking the assignment off; otherwise has not started.
 */
export function playerStatus(
  userId: string,
  attempts: ReadonlyArray<{ user_id: string; score: number }>,
  ticked: ReadonlySet<string>,
  questions: number
): PlayerStatus {
  const mine = attempts.filter((a) => a.user_id === userId);
  if (mine.some((a) => knowsIt(a.score, questions))) return 'knows_it';
  if (mine.length > 0 || ticked.has(userId)) return 'done';
  return 'not_started';
}

export function statusCounts(statuses: PlayerStatus[]): Record<PlayerStatus, number> {
  const counts: Record<PlayerStatus, number> = { not_started: 0, done: 0, knows_it: 0 };
  for (const s of statuses) counts[s]++;
  return counts;
}

export interface SplitRow {
  question_key: string;
  pick: string;
  players: number;
}

export interface QuestionSplit {
  question: QuizQuestion;
  /** Players who answered it. */
  answered: number;
  /** Each answer given, most picked first. */
  picks: Array<{ pick: string; label: string; players: number; right: boolean }>;
}

/** The totals for each of the play's current questions; rows for older questions are left out. */
export function splitByQuestion(questions: QuizQuestion[], rows: SplitRow[]): QuestionSplit[] {
  return questions.map((q) => {
    const mine = rows.filter((r) => r.question_key === q.key && r.players > 0);
    const picks = mine
      .map((r) => ({ pick: r.pick, label: targetLabel(r.pick), players: r.players, right: r.pick === q.answer }))
      .sort((a, b) => b.players - a.players || Number(b.right) - Number(a.right) || a.label.localeCompare(b.label));
    return { question: q, answered: picks.reduce((n, p) => n + p.players, 0), picks };
  });
}

/** The last day a head coach sees results: 90 days after the due date, or the day it was set. */
export function resultsVisibleUntil(dueDate: string | null, createdAt: string): string {
  const base = new Date(`${dueDate ?? createdAt.slice(0, 10)}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + 90);
  return base.toISOString().slice(0, 10);
}
