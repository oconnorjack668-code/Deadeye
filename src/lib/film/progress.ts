// src/lib/film/progress.ts
// What a head coach sees for film they set (plan section 7, and the founder's
// choice in section 11): for each player, not started, started or done, with
// their score; for each question, how the team split across the answers, as
// totals. Never which player picked what: the database hands the coach only
// scores (film_attempts, without its answers column) and the totals
// (film_assignment_split, 00062).
import type { FilmClip } from './rows';
import type { FilmQuestion } from './questions';

export type FilmStatus = 'not_started' | 'started' | 'done';

export const FILM_STATUS_LABELS: Record<FilmStatus, string> = {
  not_started: 'Not started',
  started: 'Started',
  done: 'Done',
};

export interface FilmAttemptLite {
  user_id: string;
  clip_id: string;
  score: number;
  total: number;
  completed_at: string;
}

export interface FilmPlayerProgress {
  status: FilmStatus;
  /** Clips answered, out of the clips set. */
  clipsDone: number;
  clips: number;
  /** Right answers on each clip first try since it was set, out of the questions on those clips. */
  score: number;
  total: number;
}

/**
 * One player on film set for the team. Each clip counts once, by its first
 * attempt since the film was set (the same attempts the team split counts).
 * Ticking the assignment off counts as done, without a score.
 */
export function filmPlayerProgress(
  userId: string,
  attempts: ReadonlyArray<FilmAttemptLite>,
  clipIds: readonly string[],
  ticked: ReadonlySet<string>,
  since: string
): FilmPlayerProgress {
  const sinceMs = Date.parse(since);
  const firsts = new Map<string, FilmAttemptLite>();
  for (const a of attempts) {
    if (a.user_id !== userId || !clipIds.includes(a.clip_id) || Date.parse(a.completed_at) < sinceMs) continue;
    const seen = firsts.get(a.clip_id);
    if (!seen || a.completed_at < seen.completed_at) firsts.set(a.clip_id, a);
  }
  const done = [...firsts.values()];
  const score = done.reduce((n, a) => n + a.score, 0);
  const total = done.reduce((n, a) => n + a.total, 0);
  const clips = clipIds.length;
  const status: FilmStatus = (clips > 0 && done.length >= clips) || ticked.has(userId) ? 'done' : done.length > 0 ? 'started' : 'not_started';
  return { status, clipsDone: done.length, clips, score, total };
}

export function filmStatusCounts(list: FilmPlayerProgress[]): Record<FilmStatus, number> {
  const counts: Record<FilmStatus, number> = { not_started: 0, started: 0, done: 0 };
  for (const p of list) counts[p.status]++;
  return counts;
}

export interface FilmSplitRow {
  clip_id: string;
  question_key: string;
  pick: string;
  players: number;
}

export interface FilmQuestionSplit {
  question: FilmQuestion;
  answered: number;
  /** Each answer given, most picked first. */
  picks: Array<{ pick: string; label: string; players: number; right: boolean }>;
}

/** The totals for each current question of each clip; rows for questions since removed are left out. */
export function splitFilmQuestions(clips: FilmClip[], rows: FilmSplitRow[]): Array<{ clip: FilmClip; questions: FilmQuestionSplit[] }> {
  return clips.map((clip) => ({
    clip,
    questions: clip.questions.map((q) => {
      const picks = rows
        .filter((r) => r.clip_id === clip.id && r.question_key === q.key && r.players > 0)
        .flatMap((r) => {
          const index = Number(r.pick);
          const label = Number.isInteger(index) ? q.options[index] : undefined;
          return label === undefined ? [] : [{ pick: r.pick, label, players: r.players, right: index === q.correct_index }];
        })
        .sort((a, b) => b.players - a.players || Number(b.right) - Number(a.right) || a.label.localeCompare(b.label));
      return { question: q, answered: picks.reduce((n, p) => n + p.players, 0), picks };
    }),
  }));
}
