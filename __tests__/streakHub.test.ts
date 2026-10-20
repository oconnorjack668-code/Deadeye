// __tests__/streakHub.test.ts
import { describe, it, expect } from 'vitest';
import { streakState } from '@/lib/achievements';
import { monthCalendar, shiftMonth, weeklyGoalStreak } from '@/lib/streakHub';

describe('streak calendar', () => {
  // Trained 1-7 September, rest day on the 8th, freeze on the 9th, back on the 10th
  const days = ['01', '02', '03', '04', '05', '06', '07', '10'].map((d) => `2026-09-${d}`);

  it('marks the rest day and the frozen day that kept the streak', () => {
    const { kept } = streakState(days, '2026-09-10');
    expect(kept).toEqual({ '2026-09-08': 'rest', '2026-09-09': 'frozen' });
  });

  it('marks days off in the gap the streak is in now, but not today', () => {
    const { kept } = streakState(days.slice(0, 7), '2026-09-10');
    expect(kept).toEqual({ '2026-09-08': 'rest', '2026-09-09': 'frozen' });
  });

  it('lays out a month in Monday-first weeks with each day marked', () => {
    const { kept } = streakState(days, '2026-09-12');
    const weeks = monthCalendar('2026-09', new Set(days), kept, '2026-09-12');
    // 1 September 2026 is a Tuesday, so the first week starts on 31 August
    expect(weeks[0][0]).toMatchObject({ date: '2026-08-31', inMonth: false, status: 'missed' });
    const byDate = Object.fromEntries(weeks.flat().map((d) => [d.date, d.status]));
    expect(byDate['2026-09-01']).toBe('trained');
    expect(byDate['2026-09-08']).toBe('rest');
    expect(byDate['2026-09-09']).toBe('frozen');
    expect(byDate['2026-09-11']).toBe('rest');
    expect(byDate['2026-09-12']).toBe('open');
    expect(byDate['2026-09-13']).toBe('future');
    expect(weeks.at(-1)!.at(-1)!.date).toBe('2026-10-04');
  });

  it('moves between months across a year end', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});

describe('weekly goal streak', () => {
  // Weeks starting Mondays 7, 14 and 21 September 2026
  const week = (monday: number, count: number) =>
    Array.from({ length: count }, (_, i) => `2026-09-${String(monday + i).padStart(2, '0')}`);

  it('counts weeks in a row that hit the goal, and does not break on a week still going', () => {
    const days = [...week(7, 4), ...week(14, 5), ...week(21, 1)];
    expect(weeklyGoalStreak(days, '2026-09-22', 4)).toEqual({ current: 2, best: 2, thisWeek: 1, target: 4 });
    // Once this week hits the goal it counts too
    expect(weeklyGoalStreak([...days, ...week(22, 3)], '2026-09-24', 4).current).toBe(3);
  });

  it('breaks on a finished week that missed the goal, but keeps the best', () => {
    const days = [...week(7, 4), ...week(14, 2), ...week(21, 4)];
    expect(weeklyGoalStreak(days, '2026-09-28', 4)).toMatchObject({ current: 1, best: 1 });
    const longer = [...week(7, 4), ...week(14, 4), ...week(21, 1)];
    expect(weeklyGoalStreak(longer, '2026-10-05', 4)).toMatchObject({ current: 0, best: 2 });
  });
});
