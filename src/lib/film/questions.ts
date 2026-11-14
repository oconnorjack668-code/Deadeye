// src/lib/film/questions.ts
// The questions on a film clip: the study_items quiz shape (question,
// options, correct_index, explanation) plus a key and moment_s, the second of
// the video the clip stops at to ask it. One schema is used by the owner tool
// (to save), the clip page (to read what was stored) and the server action
// that marks answers, so all three agree on what a question is.
//
// A question is keyed (q1, q2, ...) rather than counted by position, so a
// coach's team split still lines up if the owner later reorders questions.
import { z } from 'zod';

export const MAX_QUESTIONS = 10;
export const MAX_QUESTION_LENGTH = 200;
export const MAX_OPTION_LENGTH = 120;
export const MAX_EXPLANATION_LENGTH = 400;

export const FilmQuestionSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9]{1,12}$/),
    question: z.string().trim().min(1, 'Every question needs its words.').max(MAX_QUESTION_LENGTH, `Keep a question to ${MAX_QUESTION_LENGTH} characters.`),
    options: z
      .array(z.string().trim().min(1, 'Fill in every answer, or remove it.').max(MAX_OPTION_LENGTH, `Keep each answer to ${MAX_OPTION_LENGTH} characters.`))
      .min(2, 'Give each question at least 2 answers.')
      .max(4, 'Up to 4 answers a question.'),
    correct_index: z.number().int().min(0),
    explanation: z.string().trim().max(MAX_EXPLANATION_LENGTH, `Keep an explanation to ${MAX_EXPLANATION_LENGTH} characters.`).default(''),
    // zod 4 numbers are finite already
    moment_s: z.number().min(0),
  })
  .refine((q) => q.correct_index < q.options.length, { message: 'Pick which answer is right.', path: ['correct_index'] });

export type FilmQuestion = z.infer<typeof FilmQuestionSchema>;

/**
 * The stored questions that make sense for a clip running from start to end:
 * each one checks out, stops inside the clip (after its first second, so the
 * player has seen something), and has its own key. Sorted by moment. Anything
 * else is dropped rather than shown broken.
 */
export function parseFilmQuestions(raw: unknown, startS: number, endS: number): FilmQuestion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FilmQuestion[] = [];
  for (const item of raw.slice(0, MAX_QUESTIONS)) {
    const parsed = FilmQuestionSchema.safeParse(item);
    if (!parsed.success) continue;
    const q = parsed.data;
    if (q.moment_s <= startS || q.moment_s > endS || seen.has(q.key)) continue;
    seen.add(q.key);
    out.push(q);
  }
  return out.sort((a, b) => a.moment_s - b.moment_s);
}

export interface FilmAnswer {
  key: string;
  /** The option index picked, as text (the shape film_assignment_split hands back). */
  pick: string;
  right: boolean;
}

/**
 * Marks picks against the clip's questions as they are now. Picks for
 * questions the clip no longer has, or for options that do not exist, are
 * ignored, so a stale page cannot store nonsense.
 */
export function gradeFilm(questions: FilmQuestion[], picks: Array<{ key: string; pick: number }>): { answers: FilmAnswer[]; score: number; total: number } {
  const answers: FilmAnswer[] = [];
  for (const q of questions) {
    const p = picks.find((x) => x.key === q.key);
    if (!p || !Number.isInteger(p.pick) || p.pick < 0 || p.pick >= q.options.length) continue;
    answers.push({ key: q.key, pick: String(p.pick), right: p.pick === q.correct_index });
  }
  return { answers, score: answers.filter((a) => a.right).length, total: questions.length };
}

/** The next unused key for a new question in the owner tool: q1, q2, ... */
export function nextQuestionKey(existing: ReadonlyArray<{ key: string }>): string {
  let n = 1;
  const taken = new Set(existing.map((q) => q.key));
  while (taken.has(`q${n}`)) n++;
  return `q${n}`;
}
