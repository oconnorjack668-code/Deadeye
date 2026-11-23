// src/lib/ageBracket.ts
// What profiles.age_bracket means. Since D4 (migrations 00068 and 00069) the
// stored values are 13-15, 16-17 and 18+: sign-up already asks "16 or older",
// so setup only asks a 16-or-older player whether they are 16 or 17, or 18 or
// older. The older values (13, 14-17, 18-22, 23-30, 30+) stay readable until
// 00069 has moved every row, so every rule here accepts both.
import type { AgeBracket } from './supabase/types';

/** The values setup saves from D4 on. */
export const CURRENT_AGE_BRACKETS = ['13-15', '16-17', '18+'] as const;
export type CurrentAgeBracket = (typeof CURRENT_AGE_BRACKETS)[number];

const ADULT = new Set<string>(['18+', '18-22', '23-30', '30+']);
const MINOR = new Set<string>(['13-15', '16-17', '13', '14-17']);

/** 18 or over. Unknown (null) is not adult. */
export function isAdultBracket(bracket: string | null | undefined): boolean {
  return !!bracket && ADULT.has(bracket);
}

/** Under 18. Unknown (null) is not a minor here: callers that must hold back an unknown age check for null themselves. */
export function isMinorBracket(bracket: string | null | undefined): boolean {
  return !!bracket && MINOR.has(bracket);
}

const LABELS: Record<AgeBracket, string> = {
  '13-15': '13 to 15',
  '16-17': '16 or 17',
  '18+': '18 or older',
  '13': '13',
  '14-17': '14 to 17',
  '18-22': '18 or older',
  '23-30': '18 or older',
  '30+': '18 or older',
};

/** What Profile and the AI coach show for a stored bracket. */
export function ageBracketLabel(bracket: string | null | undefined): string | null {
  return bracket ? (LABELS[bracket as AgeBracket] ?? null) : null;
}

/** The choice setup asks a 16-or-older player: never asked of a 13 to 15 sign-up. */
export type SetupAgeAnswer = '16-17' | '18+';

/**
 * The bracket setup saves. A 13 to 15 sign-up (is16Plus false) is 13-15
 * without being asked; a 16-or-older one needs their answer, or null when they
 * have not given it yet. No sign-up answer (null) gives null: the app layout
 * sends that player to /age-check before setup.
 */
export function bracketFromSetup(is16Plus: boolean | null, answer: SetupAgeAnswer | ''): CurrentAgeBracket | null {
  if (is16Plus === false) return '13-15';
  if (is16Plus === true && answer) return answer;
  return null;
}

/** Which choice to show as picked when a 16-or-older player edits setup; '' when the saved bracket does not say. */
export function setupAnswerFrom(saved: string | null | undefined): SetupAgeAnswer | '' {
  if (saved === '16-17') return '16-17';
  if (isAdultBracket(saved)) return '18+';
  return '';
}

/**
 * The backfill in 00069, as a function so the mapping is tested. The
 * sign-up answer (age_checks.is_16_plus) decides first and the younger
 * reading wins whenever the two disagree:
 *  - said under 16 at sign-up: 13-15, whatever the old bracket said
 *  - 18-22, 23-30 or 30+: 18+
 *  - 14-17 and said 16 or older: 16-17
 *  - 13, or 14-17 with no sign-up answer: 13-15
 * New values and null stay as they are.
 */
export function backfillBracket(old: string | null, is16Plus: boolean | null): string | null {
  if (old === null || CURRENT_AGE_BRACKETS.includes(old as CurrentAgeBracket)) return old;
  if (is16Plus === false) return '13-15';
  if (ADULT.has(old)) return '18+';
  if (old === '14-17' && is16Plus === true) return '16-17';
  return '13-15';
}
