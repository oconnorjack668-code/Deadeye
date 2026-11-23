// src/lib/slogans.ts
// The lines Deadeye shows under its logo: the opening animation, the page
// loader, and (later) sign in and Today. The founder's picks of 22 Nov 2026
// (docs/agent-os/marketing/2026-11-22-slogans.md, "Founder's picks").
//
// One line per visit, never a live rotation (WCAG 2.2.2, and the founder's
// decision 2 in docs/agent-os/design/2026-11-22-loading.md). The head script
// (OPENING_SCRIPT, src/lib/opening.ts) picks the visit's line before the first
// paint and puts its index on <html data-sl>, so the opening, the loader and
// any other screen show the same line all visit; visitSlogan() reads it.
//
// Quotes are always shown with the speaker's name, so a quote never reads as
// Deadeye's own slogan or as that person backing the app. "Hard work outweighs
// talent" has no source tying it to anyone, so it carries no name (founder,
// 22 Nov). The tracker lines are for the tracker's wait only.

export type SloganKind = 'brand' | 'motivation' | 'quote' | 'tracker';

export type Slogan = { text: string; kind: SloganKind; by?: string };

export const SLOGANS: readonly Slogan[] = [
  { text: 'Aim is earned', kind: 'brand' },
  { text: 'Earn your aim', kind: 'brand' },
  { text: 'Train it. Log it. Earn it.', kind: 'brand' },
  { text: 'Eyes on the rim', kind: 'brand' },
  { text: '1% better every day', kind: 'motivation' },
  { text: 'Small reps add up', kind: 'motivation' },
  { text: 'Rep by rep', kind: 'motivation' },
  { text: 'Off day? Still a rep.', kind: 'motivation' },
  { text: 'Earn the next one', kind: 'motivation' },
  { text: 'Hard work outweighs talent', kind: 'motivation' },
  { text: 'Be quick, but don’t hurry.', kind: 'quote', by: 'John Wooden' },
  { text: 'You play the way you practice.', kind: 'quote', by: 'Larry Bird' },
  { text: 'I can’t accept not trying.', kind: 'quote', by: 'Michael Jordan' },
  { text: 'You work at it, you get better and you just keep going.', kind: 'quote', by: 'Steve Kerr' },
  { text: 'Rest at the end, not in the middle.', kind: 'quote', by: 'Kobe Bryant' },
  { text: 'Checking your clip', kind: 'tracker' },
  { text: 'Following the arc', kind: 'tracker' },
  { text: 'Make or miss, it’s a rep', kind: 'tracker' },
];

/**
 * Lines short enough for one line under the logo on a 360 px phone (26
 * characters, marketing's limit), with no name to show: the opening and the
 * page loader. The visit's index (<html data-sl>) points into this list.
 */
export const SHORT_SLOGANS: readonly Slogan[] = SLOGANS.filter(
  (s) => (s.kind === 'brand' || s.kind === 'motivation') && s.text.length <= 26
);

/** Places with room for two lines (sign in, Today): the short lines plus the quotes. */
export const ROOMY_SLOGANS: readonly Slogan[] = SLOGANS.filter((s) => s.kind !== 'tracker');

/** How a slogan reads on screen: a quote in quote marks with its speaker. */
export function sloganLine(s: Slogan): string {
  return s.by ? `“${s.text}” – ${s.by}` : s.text;
}

/**
 * A new index for this visit: random, but never the one shown last visit
 * (when there is more than one to choose from). rand is in [0, 1).
 */
export function pickSloganIndex(count: number, last: number | null, rand: number): number {
  if (count <= 1) return 0;
  const avoid = last !== null && Number.isInteger(last) && last >= 0 && last < count;
  const k = Math.floor(rand * (avoid ? count - 1 : count));
  return avoid && k >= (last as number) ? k + 1 : k;
}

/**
 * The visit's slogan from a list: the head script's pick when there is one,
 * the first line otherwise (server render, or storage blocked before the
 * script ran). Lists longer than SHORT_SLOGANS wrap the index, so a roomy
 * place still changes line each visit.
 */
export function visitSlogan(list: readonly Slogan[] = SHORT_SLOGANS): Slogan {
  if (typeof document === 'undefined') return list[0];
  const raw = document.documentElement.getAttribute('data-sl');
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 ? list[n % list.length] : list[0];
}
