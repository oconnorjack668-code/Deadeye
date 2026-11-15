// src/lib/film/limits.ts
// The film limits, in one place. The database enforces the pack numbers in
// supabase/migrations/00062_film.sql and the note length in its CHECK;
// __tests__/film-rls.test.ts checks they agree.

/** A private note on a clip, in characters. */
export const MAX_NOTE = 500;

/** Packs a coach can keep. */
export const MAX_COACH_PACKS = 30;

/** Clips in one coach pack. */
export const MAX_PACK_CLIPS = 20;

/** Hints the 00062 triggers raise, turned into words for the coach. */
export function filmLimitMessage(hint: string | null | undefined, fallback: string): string {
  switch (hint) {
    case 'not_coach':
      return 'Only coaches can build packs. Finish coach setup first.';
    case 'pack_limit':
      return `You can keep up to ${MAX_COACH_PACKS} packs. Delete one first.`;
    case 'pack_full':
      return `A pack holds up to ${MAX_PACK_CLIPS} clips.`;
    case 'pro_clip':
      return 'This clip is part of Pro, so only a coach with Pro can put it in a pack.';
    case 'pro_film':
      return 'This film is part of Pro, so it can only be set by a coach with Pro.';
    default:
      return fallback;
  }
}
