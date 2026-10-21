// src/lib/performanceTests.ts
// Comparing performance test results that were not all logged in the same unit.
// A jump measured on video is saved in the player's own unit (cm for metric
// players), while the manual form used to save inches only, so one player can
// have both. 60 cm is not a better jump than 30 inches.
import type { MeasurementSystem } from '@/lib/units';

const CM_PER_INCH = 2.54;

import type { PerformanceTestType } from '@/lib/supabase/types';

/**
 * Every test a player can log, in the order the app lists them. The same list
 * as the performance_tests.test_type check (00048 added the metre sprints).
 */
export const TEST_TYPES: Array<{ id: Exclude<PerformanceTestType, 'custom'>; label: string; icon: string }> = [
  { id: 'standing_vertical', label: 'Standing Vertical', icon: '📈' },
  { id: 'approach_vertical', label: 'Approach Vertical', icon: '🚀' },
  { id: 'sprint_10m', label: '10 m Sprint', icon: '⚡' },
  { id: 'sprint_20m', label: '20 m Sprint', icon: '💨' },
  { id: 'sprint_three_quarter', label: '3/4 Court Sprint', icon: '⚡' },
  { id: 'sprint_40yd', label: '40 Yard Dash', icon: '💨' },
  { id: 'lane_agility', label: 'Lane Agility', icon: '🔄' },
  { id: 'pro_agility_5_10_5', label: 'Pro Agility (5-10-5)', icon: '↔️' },
  { id: 'standing_broad_jump', label: 'Standing Broad Jump', icon: '🦘' },
];

export const TEST_LABELS: Record<string, string> = Object.fromEntries(TEST_TYPES.map((t) => [t.id, t.label]));

export const LENGTH_TESTS = ['standing_vertical', 'approach_vertical', 'standing_broad_jump'];
export const TIMED_TESTS = ['sprint_10m', 'sprint_20m', 'sprint_three_quarter', 'sprint_40yd', 'lane_agility', 'pro_agility_5_10_5'];

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

/**
 * The personal record flag for each of one test's results, in the order they
 * happened: each one that beats every earlier result. The first counts, as it
 * did when it was logged. Used after a result is edited or deleted, when the
 * flags saved at the time may no longer be true.
 */
export function testRecordFlags(results: TestResult[], lowerIsBetter: boolean): boolean[] {
  return results.map((r, i) => isPersonalBest(r, results.slice(0, i), lowerIsBetter));
}
