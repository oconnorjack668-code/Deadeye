// src/lib/plays/quiz.ts
// The role quiz, built from the drawing so a coach writes nothing (plan
// section 3, point 5): "You're 3. In step 2, where do you go?", answered by
// tapping a spot on the court.
//
// The questions come from moves that end on a named spot or at the basket,
// up to three, spread over different players. The same play always gives the
// same questions, so a coach can see how the team split on each one. A
// question is keyed by player and step ("o3:2"), so answers to an older
// version of a play are told apart from the current one.
//
// Knowing a play means 2 of 3 right (or all of them, when a play only has one
// or two questions).
import { HOOP } from '@/lib/court';
import { MOVEMENT_TYPES, type Diagram } from './diagram';
import { roleJob } from './roles';
import { COURT_SPOTS, distance, nearestSpot, type Point } from './spots';

export const QUIZ_LENGTH = 3;

export interface QuizTarget {
  id: string;
  label: string;
  at: Point;
}

/** Where an answer can be tapped: every named spot, and the basket. */
export const QUIZ_TARGETS: readonly QuizTarget[] = [
  ...COURT_SPOTS.map((s) => ({ id: s.id, label: s.label, at: s.at })),
  { id: 'basket', label: 'the basket', at: { x: 25, y: 7 } },
];

const TARGET_BY_ID = new Map(QUIZ_TARGETS.map((t) => [t.id, t]));

/** Within this many feet of the hoop counts as the basket (as describePoint has it). */
const BASKET_RADIUS_FT = 4.5;

/** The target a spot on the court counts as, or null when it is between spots. */
export function targetFor(p: Point): string | null {
  if (p.y < 0) return null;
  if (distance(p, HOOP) <= BASKET_RADIUS_FT) return 'basket';
  return nearestSpot(p)?.id ?? null;
}

export function targetLabel(id: string): string {
  return TARGET_BY_ID.get(id)?.label ?? 'somewhere else';
}

export interface QuizQuestion {
  /** Player and step, e.g. "o3:2". */
  key: string;
  playerId: string;
  /** The player number, e.g. "3". */
  label: string;
  step: number;
  prompt: string;
  /** The target id that is right. */
  answer: string;
  /** Said after answering, right or wrong. */
  explanation: string;
}

/** The questions for a play: up to three, in step order. */
export function buildQuiz(d: Diagram): QuizQuestion[] {
  const candidates: QuizQuestion[] = [];
  for (let k = 1; k < d.frames.length; k++) {
    for (const a of d.frames[k].actions) {
      if (!MOVEMENT_TYPES.includes(a.type)) continue;
      const player = d.players.find((p) => p.id === a.from);
      if (!player || player.side !== 'offence') continue;
      const answer = targetFor(d.frames[k].positions[a.from]);
      // A move between two points that read as the same spot is not worth asking
      if (!answer || answer === targetFor(d.frames[k - 1].positions[a.from])) continue;
      const note = d.frames[k].note;
      candidates.push({
        key: `${a.from}:${k}`,
        playerId: a.from,
        label: player.label,
        step: k,
        prompt: `You're ${player.label}. In step ${k}, where do you go?`,
        answer,
        explanation: `${roleJob(d, k, a.from)}.${note ? ` ${note}` : ''}`,
      });
    }
  }
  // Spread over the play: a different player and a different step each, then
  // a different player, then whatever is left; earliest steps first each time
  const picked: QuizQuestion[] = [];
  const passes: Array<(c: QuizQuestion) => boolean> = [
    (c) => !picked.some((p) => p.playerId === c.playerId || p.step === c.step),
    (c) => !picked.some((p) => p.playerId === c.playerId),
    () => true,
  ];
  for (const fits of passes) {
    for (const c of candidates) {
      if (picked.length >= QUIZ_LENGTH) break;
      if (!picked.includes(c) && fits(c)) picked.push(c);
    }
  }
  return picked.sort((a, b) => a.step - b.step || a.label.localeCompare(b.label));
}

/** How many right answers mean the player knows the play. */
export function passMark(questions: number): number {
  return questions >= QUIZ_LENGTH ? 2 : questions;
}

export function knowsIt(score: number, questions: number): boolean {
  return questions > 0 && score >= passMark(questions);
}

export interface QuizAnswer {
  key: string;
  pick: string;
  right: boolean;
}

/**
 * Marks a set of picks against the questions. Picks for questions the play
 * no longer has, or for targets that do not exist, are ignored.
 */
export function gradeQuiz(questions: QuizQuestion[], picks: Array<{ key: string; pick: string }>): { answers: QuizAnswer[]; score: number } {
  const answers: QuizAnswer[] = [];
  for (const q of questions) {
    const p = picks.find((x) => x.key === q.key);
    if (!p || !TARGET_BY_ID.has(p.pick)) continue;
    answers.push({ key: q.key, pick: p.pick, right: p.pick === q.answer });
  }
  return { answers, score: answers.filter((a) => a.right).length };
}
