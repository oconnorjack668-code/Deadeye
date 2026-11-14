// src/lib/plays/ageRules.ts
// Plain warnings when a play breaks the underage rules for the youngest grade
// it is marked for. From Basketball Ireland's National Underage Rules
// (updated August 2024, https://ireland.basketball/uploads/ed/Underage%20Rules%20Changes%202024-25.pdf):
//   - U11 and under: no ball screens; no pressing.
//   - U11 to U14: no zone defence, man-to-man only, so a zone offence is
//     never needed below U15.
//   - U15 to U18: any defence, full FIBA rules.
// Check the 2026-27 version before launch (plan section 3, point 7).
import { ageRank, type AgeGrade } from './catalog';
import type { Diagram } from './diagram';

export interface AgeRuleInput {
  min_age: AgeGrade;
  category: string;
  tags: readonly string[];
  diagram: Diagram;
}

/** True when some step has a screen set for the player holding the ball. */
export function hasBallScreen(d: Diagram): boolean {
  return d.frames.some((frame, k) => k > 0 && frame.actions.some((a) => a.type === 'screen' && a.to === d.frames[k - 1].ball));
}

function isZoneOffence(play: AgeRuleInput): boolean {
  return play.category === 'zone_offence' || play.tags.some((t) => /\bzone\b/i.test(t));
}

/** Warnings for the play as marked; an empty list means it suits its youngest grade. */
export function ageRuleWarnings(play: AgeRuleInput): string[] {
  const age = ageRank(play.min_age);
  const warnings: string[] = [];
  if (age <= ageRank('U11') && hasBallScreen(play.diagram)) {
    warnings.push('Ball screens are not allowed at U11 and under, so this play is for U12 and up.');
  }
  if (age <= ageRank('U11') && play.category === 'press_break') {
    warnings.push('Pressing is not allowed at U11 and under, so a press break is for U12 and up.');
  }
  if (age <= ageRank('U14') && isZoneOffence(play)) {
    warnings.push('Teams at U14 and under play man-to-man only, so a zone offence is for U15 and up.');
  }
  return warnings;
}
