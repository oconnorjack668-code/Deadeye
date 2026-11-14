// src/lib/plays/limits.ts
// What a coach on Free and on Pro can keep (docs/plans/film-and-plays.md
// section 9). The database enforces the same numbers in
// supabase/migrations/00061_play_editor.sql, and src/lib/plans.ts says them
// to players; __tests__/plays-limits.test.ts checks all three agree.

/** Plays a coach on Free can keep (drawn or copied). Pro has no limit. */
export const FREE_COACH_PLAYS = 5;

/** Teams a coach on Free can keep a playbook for. */
export const FREE_PLAYBOOK_TEAMS = 1;

/** Teams a coach on Pro can keep a playbook for (the same as teams they can coach). */
export const PRO_PLAYBOOK_TEAMS = 10;

/** Whether a coach can save another play of their own. */
export function canDrawAnother(ownPlays: number, isPro: boolean): boolean {
  return isPro || ownPlays < FREE_COACH_PLAYS;
}

/** Hints the 00061 triggers raise, turned into words for the coach. */
export function limitMessage(hint: string | null | undefined, fallback: string): string {
  switch (hint) {
    case 'play_limit':
      return `On Free you can keep ${FREE_COACH_PLAYS} plays. Delete one from your playbook, or see what Pro includes.`;
    case 'playbook_limit':
      return `On Free you can keep a playbook for ${FREE_PLAYBOOK_TEAMS} team. Pro keeps playbooks for up to ${PRO_PLAYBOOK_TEAMS} teams.`;
    case 'pro_play':
      return 'This play is part of Pro, so it can only be added or set by a coach with Pro.';
    case 'not_coach':
      return 'Only coaches can draw plays. Finish coach setup first.';
    default:
      return fallback;
  }
}
