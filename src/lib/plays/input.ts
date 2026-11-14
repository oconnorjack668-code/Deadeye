// src/lib/plays/input.ts
// What the editor sends to be saved, checked the same way in the browser
// (to show problems as the coach types) and in the server action (which is
// the check that counts). The diagram goes through DiagramSchema, the one
// validator every play shares.
import { z } from 'zod';
import { AGE_GRADES, PLAY_CATEGORIES, type AgeGrade, type PlayCategory } from './catalog';
import { DiagramSchema, type Diagram } from './diagram';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_TITLE = 80;
export const MAX_DESCRIPTION = 600;
export const MAX_POINTS = 12;
export const MAX_POINT_LENGTH = 200;

const categoryIds = PLAY_CATEGORIES.map((c) => c.id) as [PlayCategory, ...PlayCategory[]];

export const PlayInputSchema = z.object({
  /** Set when editing one of the coach's own plays. */
  id: z.string().regex(UUID_PATTERN).optional(),
  title: z.string().trim().min(1, 'Give the play a name.').max(MAX_TITLE, `Keep the name to ${MAX_TITLE} characters.`),
  category: z.enum(categoryIds),
  minAge: z.enum(AGE_GRADES),
  description: z.string().trim().max(MAX_DESCRIPTION, `Keep the description to ${MAX_DESCRIPTION} characters.`),
  coachingPoints: z
    .array(z.string().trim().min(1).max(MAX_POINT_LENGTH, `Keep each coaching point to ${MAX_POINT_LENGTH} characters.`))
    .max(MAX_POINTS, `Up to ${MAX_POINTS} coaching points.`),
  diagram: DiagramSchema,
  /** The play this one was copied from ("Copy and edit"). */
  copiedFrom: z.string().regex(UUID_PATTERN).nullable().optional(),
});

export type PlayInput = z.input<typeof PlayInputSchema>;

export interface PlayDraft {
  title: string;
  category: PlayCategory;
  minAge: AgeGrade;
  description: string;
  /** One per line in the editor. */
  coachingPoints: string;
}

/** The coaching points box, one point per line, as a list. */
export function pointsFromText(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export function toInput(draft: PlayDraft, diagram: Diagram, extra: { id?: string; copiedFrom?: string | null } = {}): PlayInput {
  return {
    ...(extra.id ? { id: extra.id } : {}),
    title: draft.title,
    category: draft.category,
    minAge: draft.minAge,
    description: draft.description,
    coachingPoints: pointsFromText(draft.coachingPoints),
    diagram,
    ...(extra.copiedFrom ? { copiedFrom: extra.copiedFrom } : {}),
  };
}

/** The editor's fields filled in from a play, for editing it or copying it. */
export function draftFrom(play: { title: string; category: PlayCategory; minAge: AgeGrade; description: string; coachingPoints: string[] }): PlayDraft {
  return {
    title: play.title.slice(0, MAX_TITLE),
    category: play.category,
    minAge: play.minAge,
    description: play.description.slice(0, MAX_DESCRIPTION),
    coachingPoints: play.coachingPoints.slice(0, MAX_POINTS).join('\n'),
  };
}

/** The first problem with what would be saved, in words, or null. */
export function firstInputProblem(input: PlayInput): string | null {
  const parsed = PlayInputSchema.safeParse(input);
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message ?? 'Something in the play needs fixing.';
}
