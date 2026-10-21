// src/lib/nameFilter.ts
// Keeps rude display names off Deadeye. Names show on the leaderboard, friend
// lists and team rosters, to players as young as 13, and on 21 Oct 2026 one
// on the public leaderboard was sexual.
//
// Two layers with the same lists:
// - here, so signup, setup and Settings can say "pick another name" instead of
//   saving it;
// - in the database (00044_display_name_filter.sql), a trigger on profiles that
//   turns a blocked name into "Player" whatever wrote it. That is the layer a
//   player cannot get round. __tests__/nameFilter.test.ts fails if the two
//   lists drift apart.
//
// No list catches everything. The owner can reset any name from a player's
// card (/players/[id]); add what slips through to both lists.

/**
 * Blocked anywhere in the name, after it is lowercased, leetspeak is undone
 * (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s), everything but letters is removed
 * and repeated letters are squeezed to one - so "N1pple_tw1ster" and "fuuuck"
 * are both caught. Written here already squeezed, which is why "nipple" is
 * "niple". Only words with no innocent name inside them belong here.
 */
export const BLOCKED_PARTS = [
  'niple', 'penis', 'vagina', 'pusy', 'fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'dildo', 'porn',
  'niga', 'fagot', 'retard', 'wank', 'boloks', 'twat', 'jiz', 'horny', 'testicle', 'scrotum', 'orgasm',
  'masturbat', 'blowjob', 'handjob', 'spunk', 'motherf', 'hitler', 'rapist', 'toser', 'bastard',
];

/**
 * Blocked only as a whole word, because each sits inside ordinary names:
 * Cassidy, Arsenal, Hancock, Dickson, Sexton, Bobby, Nigeria.
 * Matched against the lowercased, de-leeted words of the name.
 */
export const BLOCKED_WORDS = [
  'ass', 'arse', 'cock', 'dick', 'sex', 'anal', 'cum', 'rape', 'nazi', 'prick', 'tit', 'tits', 'fag', 'pedo',
  'paedo', 'kys', 'piss', 'boobs', 'boob', 'nigger', 'niggers',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

function deLeet(name: string): string {
  return name.toLowerCase().replace(/[013457@$]/g, (c) => LEET[c]);
}

/** True when a display name should not be allowed. */
export function nameBlocked(name: string): boolean {
  const plain = deLeet(name);
  const squeezed = plain.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  if (BLOCKED_PARTS.some((part) => squeezed.includes(part))) return true;
  const words = plain.split(/[^a-z]+/).filter(Boolean);
  return words.some((w) => BLOCKED_WORDS.includes(w));
}

/** What the player is told when a name is refused. */
export const NAME_BLOCKED_MESSAGE = "That name isn't allowed on Deadeye. Pick another one.";
