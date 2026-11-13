// src/lib/ai/safety.ts
// A check on the player's own words that does not depend on the AI model.
// The coach prompt (persona.ts COACH_SAFETY) already tells the model to stop
// and point to help; this makes sure the help line is there even if the model
// misses it. Players are 13 and up, so the lines are Irish and free.
//
// Deliberately broad: a support line under a reply that did not need it costs
// little; a missing one could cost a lot. Nothing is stored or sent anywhere
// because of a match.

const SIGNALS: RegExp[] = [
  /\bkill(ing)?\s+my\s?self\b/i,
  /\bsuicid(e|al)\b/i,
  /\bself[\s-]?harm(ing)?\b/i,
  /\b(hurt|hurting|cut|cutting)\s+my\s?self\b/i,
  /\b(want|wanna|going)\s+to\s+die\b/i,
  /\bend\s+(my\s+life|it\s+all)\b/i,
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living)\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\b(being|getting)\s+(abused|bullied)\b/i,
  /\b(abuses|abused|hits|touched|touches)\s+me\b/i,
  /\bstop\s+eating\b/i,
  /\bstarv(e|ing)\s+my\s?self\b/i,
];

export const SUPPORT_LINE =
  'If things feel hard right now, you do not have to deal with it alone. Talk to a parent, coach or another adult you trust today. ' +
  'Childline is free and open any time: call 1800 66 66 66 or text 50101. You can also text HELLO to 50808, or call Samaritans on 116 123. ' +
  'If you are in danger right now, call 112 or 999.';

/** True when the player's message suggests distress, self-harm or abuse. */
export function needsSupportLine(message: string): boolean {
  return SIGNALS.some((re) => re.test(message));
}

/**
 * Pain, injury or illness words in a player's description of their game.
 * Focus Finder answers weaknesses with skill drills, so when the "weakness"
 * may be an injury it says to get it checked first. "chest" alone would catch
 * a chest pass, so only "chest pain" counts.
 */
export function mentionsPain(text: string): boolean {
  return /\b(pain(ful)?|hurts?|hurting|injur\w*|sore|aches?|aching|dizz\w*|chest pains?|sprain\w*|swollen|limp(ing)?)\b/i.test(text);
}

/** The reply with the support line added once, at the end, when the message calls for it. */
export function withSupportLine(message: string, reply: string): string {
  if (!needsSupportLine(message) || reply.includes('1800 66 66 66')) return reply;
  return `${reply.trimEnd()}\n\n${SUPPORT_LINE}`;
}
