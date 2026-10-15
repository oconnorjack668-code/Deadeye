// src/lib/filmQuestions.ts
// "Was that the right read?" - the shared rules for a player asking a coach
// about one decision in their own game film.
//
// The research behind the shape: everything that teaches basketball
// decision-making is coach-mediated or lab-bound, and the tools that do touch a
// player's own film report stats and highlights rather than whether a read was
// right. The gap is a player being able to ask about their own decision and
// get an answer from someone who knows the game.

export const VERDICTS = [
  {
    id: 'good_read',
    label: 'Right read',
    short: 'Right',
    hint: 'The decision was correct, whatever the outcome.',
  },
  {
    id: 'wrong_read',
    label: 'Wrong read',
    short: 'Wrong',
    hint: 'There was a better option available.',
  },
  {
    id: 'depends',
    label: 'Depends',
    short: 'Depends',
    hint: 'Defensible either way - worth talking through.',
  },
] as const;

export type Verdict = (typeof VERDICTS)[number]['id'];

export const MAX_QUESTION = 500;
export const MAX_PLAYER_READ = 500;
export const MAX_COACH_NOTE = 1000;

export interface FilmQuestion {
  id: string;
  player_id: string;
  team_id: string | null;
  video_asset_id: string;
  moment_ms: number;
  question: string;
  player_read: string | null;
  verdict: Verdict | null;
  coach_note: string | null;
  answered_at: string | null;
  created_at: string;
}

export function verdictLabel(verdict: Verdict | null): string {
  return VERDICTS.find((v) => v.id === verdict)?.label ?? 'Waiting on a coach';
}

/**
 * Whether a question is ready to send.
 *
 * The player's own read is required, not optional, and that is the whole
 * mechanism. A player who writes down what they were thinking BEFORE the
 * answer arrives can compare the two; one who does not has just received a
 * coaching tip, which they could have got anywhere. A 2024 study of 14-17 year
 * olds found self-confidence and actual decision competence are frequently
 * mismatched - this is the only part of the exercise that can show a player
 * which side of that they are on.
 */
export function questionProblem(question: string, playerRead: string): string | null {
  if (question.trim().length < 3) return 'Say what you want to ask about this moment.';
  if (question.trim().length > MAX_QUESTION) return `Keep the question under ${MAX_QUESTION} characters.`;
  if (playerRead.trim().length < 3) {
    return 'Write down what you were thinking first - comparing it with the answer is the point.';
  }
  if (playerRead.trim().length > MAX_PLAYER_READ) return `Keep your read under ${MAX_PLAYER_READ} characters.`;
  return null;
}

/** Open questions oldest first: a player waiting longest gets answered first. */
export function coachQueue(questions: FilmQuestion[]): FilmQuestion[] {
  return questions
    .filter((q) => q.answered_at === null && q.team_id !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Answered questions newest first, for a player reading back through them. */
export function answeredFirst(questions: FilmQuestion[]): FilmQuestion[] {
  return [...questions].sort((a, b) => {
    // Unanswered float to the top - they are the ones still in play
    if ((a.answered_at === null) !== (b.answered_at === null)) return a.answered_at === null ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

/**
 * How often the player's own read matched the coach's verdict.
 *
 * Counted only over answered questions where the player committed a read, and
 * reported as a fraction rather than a percentage until there are enough to
 * mean anything. "Depends" counts as neither right nor wrong: the coach is
 * saying the question was good, not that the player was.
 */
export const MIN_ANSWERED_FOR_RATE = 5;

export function readAccuracy(
  questions: FilmQuestion[]
): { right: number; judged: number; rate: number | null } {
  const judged = questions.filter(
    (q) => q.answered_at !== null && q.player_read && (q.verdict === 'good_read' || q.verdict === 'wrong_read')
  );
  const right = judged.filter((q) => q.verdict === 'good_read').length;
  return {
    right,
    judged: judged.length,
    rate: judged.length >= MIN_ANSWERED_FOR_RATE ? right / judged.length : null,
  };
}

/** mm:ss for a moment in a clip. */
export function momentClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
