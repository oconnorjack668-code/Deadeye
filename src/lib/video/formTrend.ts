// src/lib/video/formTrend.ts
// Turns a run of saved form checks into a trend per measure.
//
// analyzeShot already measures a shot well and FormCheck already saves every
// result to video_analyses, so the history has been accumulating all along with
// nothing reading it back. A single release angle is a number; the same number
// across eight checks is the only way to see whether anything actually changed,
// which is the question a player is really asking.
//
// No competitor researched shows a trend for these - they report per-session
// values at best - so this is built on data already collected rather than a new
// capability.
import type { ShotMechanics } from './mechanics';
import { spreadOf, type Spread } from './consistency';

/** The four measures analyzeShot always produces; the other two are nullable. */
export const TRACKED = [
  { key: 'releaseAngleDeg', label: 'Release angle', unit: '°' },
  { key: 'elbowAngleAtSetPointDeg', label: 'Elbow at set point', unit: '°' },
  { key: 'kneeBendDeg', label: 'Knee bend at the dip', unit: '°' },
  { key: 'releaseTimeMs', label: 'Dip to release', unit: ' ms' },
] as const;

export type TrackedKey = (typeof TRACKED)[number]['key'];

export interface FormCheckRecord {
  /** ISO timestamp the check was saved. */
  at: string;
  mechanics: ShotMechanics;
}

export interface MeasureTrend {
  key: TrackedKey;
  label: string;
  unit: string;
  points: Array<{ at: string; value: number }>;
  first: number;
  last: number;
  /** Least-squares change per check. Positive means rising over time. */
  slopePerCheck: number;
  spread: Spread;
}

/**
 * Fewest checks before a trend is drawn.
 *
 * Two points make a line out of anything, including two readings of a stroke
 * that never changed. Four is the smallest number where a direction means
 * something, and the same restraint the consistency numbers use: a teenager
 * told their form is drifting will change it, so the claim has to be worth
 * acting on.
 */
export const MIN_CHECKS = 4;

/** Oldest first, so a chart reads left to right. */
function inOrder(records: FormCheckRecord[]): FormCheckRecord[] {
  return [...records].sort((a, b) => a.at.localeCompare(b.at));
}

/** Least-squares slope of value against position in the run. */
function slopeOf(values: number[]): number {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let top = 0;
  let bottom = 0;
  for (let i = 0; i < n; i++) {
    top += (i - meanX) * (values[i] - meanY);
    bottom += (i - meanX) ** 2;
  }
  return bottom === 0 ? 0 : top / bottom;
}

/** A trend per measure, or null until there are enough checks to mean anything. */
export function formTrends(records: FormCheckRecord[]): MeasureTrend[] | null {
  const ordered = inOrder(records);
  if (ordered.length < MIN_CHECKS) return null;

  return TRACKED.map(({ key, label, unit }) => {
    const points = ordered.map((r) => ({ at: r.at, value: r.mechanics[key] }));
    const values = points.map((p) => p.value);
    return {
      key,
      label,
      unit,
      points,
      first: values[0],
      last: values[values.length - 1],
      slopePerCheck: slopeOf(values),
      // Non-null: spreadOf only returns null for an empty list, and MIN_CHECKS
      // has already been met
      spread: spreadOf(values)!,
    };
  });
}

/**
 * Whether a trend is worth putting in words.
 *
 * Measured against the stroke's own spread, not in raw degrees. Two degrees of
 * drift means nothing on a release that varies by fifteen and a lot on one that
 * varies by three - the same test the make/miss comparison uses, for the same
 * reason: without it the feature reports noise as a finding and has a player
 * change something that was fine.
 */
export const NOTABLE_DRIFT_SDS = 0.75;

export function isNotable(trend: MeasureTrend): boolean {
  if (trend.spread.sd === 0) return false;
  const movedBy = Math.abs(trend.last - trend.first);
  return movedBy / trend.spread.sd >= NOTABLE_DRIFT_SDS;
}

/**
 * One sentence on what moved, or null when nothing did.
 *
 * Quotes both ends so the player can check it against their own checks, the
 * same rule the AI coach now follows: a claim you cannot trace to a number is
 * indistinguishable from one that was invented.
 */
export function trendSentence(trend: MeasureTrend): string | null {
  if (!isNotable(trend)) return null;
  const direction = trend.last > trend.first ? 'up' : 'down';
  const round = (n: number) => (trend.key === 'releaseTimeMs' ? Math.round(n) : Math.round(n * 10) / 10);
  return `${trend.label} is ${direction}, ${round(trend.first)}${trend.unit} to ${round(trend.last)}${trend.unit} across ${trend.points.length} checks.`;
}
