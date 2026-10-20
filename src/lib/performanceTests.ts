// src/lib/performanceTests.ts
// Comparing performance test results that were not all logged in the same unit.
// A jump measured on video is saved in the player's own unit (cm for metric
// players), while the manual form used to save inches only, so one player can
// have both. 60 cm is not a better jump than 30 inches.
import type { MeasurementSystem } from '@/lib/units';

const CM_PER_INCH = 2.54;

export const LENGTH_TESTS = ['standing_vertical', 'approach_vertical', 'standing_broad_jump'];
export const TIMED_TESTS = ['sprint_three_quarter', 'sprint_40yd', 'lane_agility', 'pro_agility_5_10_5'];

export interface TestResult {
  value: number;
  unit: string;
}

/** The unit a jump is logged and shown in for this player. */
export function lengthUnit(system: MeasurementSystem): 'inches' | 'cm' {
  return system === 'metric' ? 'cm' : 'inches';
}

/**
 * A result in another unit, to one decimal, or null when the two cannot be
 * compared (reps against seconds, say).
 */
export function convertResult(result: TestResult, to: string): number | null {
  const value = Number(result.value);
  if (result.unit === to) return value;
  if (result.unit === 'inches' && to === 'cm') return Math.round(value * CM_PER_INCH * 10) / 10;
  if (result.unit === 'cm' && to === 'inches') return Math.round((value / CM_PER_INCH) * 10) / 10;
  return null;
}

/**
 * Whether a new result beats every earlier one it can be compared with: the
 * personal record flag. Lower is better for timed tests.
 */
export function isPersonalBest(result: TestResult, earlier: TestResult[], lowerIsBetter: boolean): boolean {
  const value = Number(result.value);
  return earlier.every((e) => {
    const before = convertResult(e, result.unit);
    if (before === null) return true;
    return lowerIsBetter ? value < before : value > before;
  });
}
