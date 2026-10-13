// src/lib/video/consistency.ts
// Turns several shots' mechanics into what a player can act on: how repeatable
// their stroke was, whether it drifted over the session, and what actually
// differed between the ones that went in and the ones that did not.
//
// analyzeShot in mechanics.ts already measures one shot well. The thing it
// cannot tell you is whether you do the same thing twice - and for a shooter
// that is most of the point. A single release angle is a number; eleven of them
// with a 14-degree spread is a coaching cue.
import type { ShotMechanics } from './mechanics';

export interface MechanicsSample {
  /** Where this shot came in the session, from 0, for measuring drift. */
  index: number;
  made: boolean;
  mechanics: ShotMechanics;
}

export interface Spread {
  mean: number;
  min: number;
  max: number;
  /** max - min. The number a player feels; sd is for comparing sessions. */
  range: number;
  sd: number;
}

/**
 * Fewest shots before a spread is worth showing.
 *
 * Under this the range is mostly whichever two shots happened to be measured.
 * Players start at 13 here, and telling one their release is inconsistent on the
 * evidence of three shots is both wrong and discouraging.
 */
export const MIN_SHOTS_FOR_SPREAD = 5;

/**
 * Fewest of each outcome before makes and misses are compared.
 *
 * Higher than the above on purpose: a difference between two groups needs
 * enough of both, and this comparison is the one most likely to be read as
 * cause and effect.
 */
export const MIN_PER_OUTCOME = 4;

export function spreadOf(values: number[]): Spread | null {
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Population sd: these are every shot measured, not a sample of a larger set
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, min, max, range: max - min, sd: Math.sqrt(variance) };
}

/**
 * Least-squares slope of a measure against shot order, per shot.
 *
 * Positive means it grew as the session went on. Fatigue shows up here before a
 * player notices it: a release time that creeps later, knees that bend less.
 */
export function driftPerShot(samples: Array<{ index: number; value: number }>): number | null {
  if (samples.length < MIN_SHOTS_FOR_SPREAD) return null;
  const n = samples.length;
  const meanX = samples.reduce((a, s) => a + s.index, 0) / n;
  const meanY = samples.reduce((a, s) => a + s.value, 0) / n;
  let top = 0;
  let bottom = 0;
  for (const s of samples) {
    top += (s.index - meanX) * (s.value - meanY);
    bottom += (s.index - meanX) ** 2;
  }
  // Every shot at the same index carries no trend
  if (bottom === 0) return null;
  return top / bottom;
}

/**
 * The measures tracked across a session, as keys of ShotMechanics.
 *
 * Deliberately the four that analyzeShot always produces. ShotMechanics also
 * carries jumpHeightCm and landingBalancePct, which are nullable - jump height
 * needs the player's height on file - and mixing those in means every spread,
 * drift and outcome gap has to decide what a missing value means. These four
 * describe the stroke, which is what a shooter is trying to repeat.
 */
const MEASURES = [
  'releaseAngleDeg',
  'releaseTimeMs',
  'elbowAngleAtSetPointDeg',
  'kneeBendDeg',
] as const;

export type Measure = (typeof MEASURES)[number];

export interface OutcomeGap {
  measure: Measure;
  madeMean: number;
  missedMean: number;
  /** madeMean - missedMean. */
  gap: number;
  /**
   * The gap as a multiple of the overall spread.
   *
   * A two-degree difference means nothing on a stroke that varies by fifteen,
   * and a lot on one that varies by three. Comparing the gap to the spread is
   * what stops the first being reported as a finding.
   */
  gapInSds: number;
}

export interface SessionConsistency {
  shots: number;
  /** Null until MIN_SHOTS_FOR_SPREAD shots have been measured. */
  spreads: Partial<Record<Measure, Spread>> | null;
  /** Per-shot trend for each measure, null when there are too few shots. */
  drift: Partial<Record<Measure, number>> | null;
  /**
   * How makes differed from misses, largest difference first, or null when
   * either outcome has fewer than MIN_PER_OUTCOME shots.
   */
  outcomeGaps: OutcomeGap[] | null;
}

export function sessionConsistency(samples: MechanicsSample[]): SessionConsistency {
  const shots = samples.length;
  if (shots < MIN_SHOTS_FOR_SPREAD) {
    return { shots, spreads: null, drift: null, outcomeGaps: null };
  }

  const spreads: Partial<Record<Measure, Spread>> = {};
  const drift: Partial<Record<Measure, number>> = {};
  for (const measure of MEASURES) {
    const spread = spreadOf(samples.map((s) => s.mechanics[measure]));
    if (spread) spreads[measure] = spread;
    const slope = driftPerShot(samples.map((s) => ({ index: s.index, value: s.mechanics[measure] })));
    if (slope !== null) drift[measure] = slope;
  }

  const made = samples.filter((s) => s.made);
  const missed = samples.filter((s) => !s.made);
  let outcomeGaps: OutcomeGap[] | null = null;
  if (made.length >= MIN_PER_OUTCOME && missed.length >= MIN_PER_OUTCOME) {
    outcomeGaps = MEASURES.flatMap((measure) => {
      const madeSpread = spreadOf(made.map((s) => s.mechanics[measure]));
      const missedSpread = spreadOf(missed.map((s) => s.mechanics[measure]));
      const overall = spreads[measure];
      if (!madeSpread || !missedSpread || !overall) return [];
      const gap = madeSpread.mean - missedSpread.mean;
      return [
        {
          measure,
          madeMean: madeSpread.mean,
          missedMean: missedSpread.mean,
          gap,
          // A stroke with no spread at all cannot have a meaningful gap
          gapInSds: overall.sd === 0 ? 0 : gap / overall.sd,
        },
      ];
    }).sort((a, b) => Math.abs(b.gapInSds) - Math.abs(a.gapInSds));
  }

  return { shots, spreads, drift, outcomeGaps };
}

/**
 * Whether an outcome gap is worth putting in front of a player.
 *
 * Half a standard deviation is a deliberately high bar. Anything smaller is
 * indistinguishable from which shots happened to be measured, and a shooting
 * cue given on noise makes a player change something that was not wrong.
 */
export const NOTABLE_GAP_SDS = 0.5;

export function notableGaps(gaps: OutcomeGap[] | null): OutcomeGap[] {
  return (gaps || []).filter((g) => Math.abs(g.gapInSds) >= NOTABLE_GAP_SDS);
}
