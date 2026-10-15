// __tests__/programWeeks.test.ts
import { describe, it, expect } from 'vitest';
import { weekPhase, weekSummaries } from '@/lib/programs';

const day = (week: number, dayNo: number, focus: string, minutes: number) => ({
  week,
  day: dayNo,
  focus,
  estimated_minutes: minutes,
});

describe('weekPhase', () => {
  it('reads the phase the content already names', () => {
    expect(weekPhase('Week 1 (Foundation): test standing, approach and broad jump')).toBe('Foundation');
    expect(weekPhase('Week 6 (Peak): maximal intent')).toBe('Peak');
  });

  it('returns nothing when a week was written without one', () => {
    // Plenty of the seeded content is this shape, and inventing a phase for it
    // would be worse than showing none
    expect(weekPhase('Week 2: balance through the finish')).toBeNull();
    expect(weekPhase('')).toBeNull();
    expect(weekPhase('Shooting off the catch')).toBeNull();
  });

  it('is not fooled by a bracket somewhere else in the line', () => {
    expect(weekPhase('Week 3: floaters (both hands) and contact finishes')).toBeNull();
  });
});

describe('weekSummaries', () => {
  const days = [
    day(1, 1, 'Week 1 (Foundation): landing mechanics', 30),
    day(1, 2, 'Week 1 (Foundation): ankle stiffness', 30),
    day(2, 1, 'Week 2 (Build): triple extension', 40),
    day(2, 2, 'Week 2 (Build): reactive strength', 44),
  ];

  it('totals each week and names its phase', () => {
    const [w1, w2] = weekSummaries(days);
    expect(w1).toMatchObject({ week: 1, sessions: 2, minutes: 60, phase: 'Foundation' });
    expect(w2).toMatchObject({ week: 2, sessions: 2, minutes: 84, phase: 'Build' });
  });

  it('measures each week against the first, so the arc is visible', () => {
    const [w1, w2] = weekSummaries(days);
    expect(w1.loadVsFirst).toBe(1);
    expect(w2.loadVsFirst).toBeCloseTo(1.4);
  });

  it('reports a flat program as flat rather than inventing a climb', () => {
    const flat = [day(1, 1, 'Week 1: reps', 40), day(2, 1, 'Week 2: reps', 40)];
    expect(weekSummaries(flat).map((w) => w.loadVsFirst)).toEqual([1, 1]);
    expect(weekSummaries(flat).every((w) => w.phase === null)).toBe(true);
  });

  it('orders weeks even when the rows arrive shuffled', () => {
    expect(weekSummaries([...days].reverse()).map((w) => w.week)).toEqual([1, 2]);
  });

  it('survives a program with no days at all', () => {
    expect(weekSummaries([])).toEqual([]);
  });
});
