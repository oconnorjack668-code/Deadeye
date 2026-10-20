// __tests__/exercises.test.ts
import { describe, it, expect } from 'vitest';
import {
  isPersonalRecord,
  setScore,
  categoryForMuscle,
  muscleLabel,
  defaultSetMode,
  formatAmount,
  isAmountRecord,
  setAmount,
  setModeOf,
} from '@/lib/exercises';

describe('PR detection', () => {
  const history = [
    { weight_kg: 100, reps: 5 },
    { weight_kg: 90, reps: 8 },
  ];

  it('scores weighted sets by estimated 1RM and bodyweight sets by reps', () => {
    expect(setScore(100, 5)).toBeCloseTo(116.67, 1);
    expect(setScore(null, 12)).toBe(12);
    expect(setScore(100, 0)).toBe(0);
  });

  it('flags a set that beats every earlier set', () => {
    expect(isPersonalRecord(105, 5, history)).toBe(true);
    expect(isPersonalRecord(100, 6, history)).toBe(true);
  });

  it('does not flag ties, lighter sets, or the first time an exercise is logged', () => {
    expect(isPersonalRecord(100, 5, history)).toBe(false);
    expect(isPersonalRecord(80, 5, history)).toBe(false);
    expect(isPersonalRecord(60, 5, [])).toBe(false);
  });

  it('compares bodyweight sets only with bodyweight sets', () => {
    const mixed = [...history, { weight_kg: null, reps: 15 }];
    expect(isPersonalRecord(null, 16, mixed)).toBe(true);
    expect(isPersonalRecord(null, 15, mixed)).toBe(false);
  });
});

describe('muscle groups', () => {
  it('maps muscle groups to library categories and labels', () => {
    expect(categoryForMuscle('chest')).toBe('upper_body_push');
    expect(categoryForMuscle('hamstrings')).toBe('legs');
    expect(categoryForMuscle('injury_prevention')).toBe('recovery');
    expect(muscleLabel('forearms')).toBe('Forearms & Grip');
    expect(muscleLabel(null)).toBe('Other');
  });
});

describe('timed and distance sets', () => {
  it('measures holds in time and carries in distance by default', () => {
    expect(defaultSetMode('Front Plank')).toBe('time');
    expect(defaultSetMode('Wall Sit')).toBe('time');
    expect(defaultSetMode("Farmer's Carry")).toBe('distance');
    expect(defaultSetMode('Goblet Squat')).toBe('reps');
  });

  it('reads how a saved set was measured', () => {
    expect(setModeOf({ weight_kg: null, reps: null, duration_seconds: 45 })).toBe('time');
    expect(setModeOf({ weight_kg: 32, reps: null, distance_meters: 20 })).toBe('distance');
    expect(setModeOf({ weight_kg: 60, reps: 8 })).toBe('reps');
    expect(setAmount({ weight_kg: null, reps: null, duration_seconds: 45 })).toBe(45);
  });

  it('formats an amount for its mode', () => {
    expect(formatAmount(45, 'time')).toBe('45s');
    expect(formatAmount(90, 'time')).toBe('1:30');
    expect(formatAmount(20, 'distance')).toBe('20 m');
    expect(formatAmount(8, 'reps')).toBe('8');
    expect(formatAmount(null, 'reps')).toBe('—');
  });

  it('calls a longer hold or a heavier carry over the same distance a record, but not a trade-off', () => {
    const holds = [{ weight_kg: null, amount: 40 }];
    expect(isAmountRecord(null, 45, holds)).toBe(true);
    expect(isAmountRecord(null, 40, holds)).toBe(false);
    const carries = [{ weight_kg: 32, amount: 30 }];
    expect(isAmountRecord(36, 30, carries)).toBe(true);
    expect(isAmountRecord(40, 20, carries)).toBe(false);
    // The first time is not a record
    expect(isAmountRecord(null, 60, [])).toBe(false);
  });
});
