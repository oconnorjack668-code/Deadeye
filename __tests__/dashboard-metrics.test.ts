// __tests__/dashboard-metrics.test.ts
import { describe, it, expect } from 'vitest';
import { computeDashboardMetrics, rankZones } from '@/lib/dashboard';
import { fetchAllRows, PAGE_SIZE, totalsByZone } from '@/lib/player-activity';

const base = { zones: [], personalRecords: 0, weeklyGoalTarget: null, totalSessions: 0, today: '2026-09-24', weekStart: '2026-09-21' };

describe('dashboard metrics', () => {
  it('consistency is the share of the last 30 days with training (not always 100%)', () => {
    const m = computeDashboardMetrics({ ...base, sessionDates: ['2026-09-24', '2026-09-24', '2026-09-20'], workoutDates: ['2026-09-22', '2026-08-01'] });
    // 3 distinct days in the last 30 (Aug 1 is outside the window)
    expect(m.consistency).toBe(10);
    expect(computeDashboardMetrics({ ...base, sessionDates: [], workoutDates: [] }).consistency).toBe(0);
  });

  it('shows a day count, not a %, in a player\'s first week', () => {
    const first = computeDashboardMetrics({ ...base, sessionDates: ['2026-09-24'], workoutDates: [] });
    expect(first.consistencyReady).toBe(false);
    expect(first.consistencyDays).toBe(1);
    // Training that started a week or more ago has a % worth showing
    const week = computeDashboardMetrics({ ...base, sessionDates: ['2026-09-24', '2026-09-17'], workoutDates: [] });
    expect(week.consistencyReady).toBe(true);
    expect(computeDashboardMetrics({ ...base, sessionDates: [], workoutDates: [] }).consistencyReady).toBe(false);
  });

  it('streak and weekly goal include gym workouts, like the leaderboard and Goals page', () => {
    const m = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-24', '2026-09-22'],
      workoutDates: ['2026-09-23', '2026-09-21'],
      totalSessions: 2,
    });
    expect(m.currentStreak).toBe(4);
    expect(m.weeklyGoalProgress).toBe(4);
    expect(m.thisWeekSessions).toBe(2);
    expect(m.totalSessions).toBe(2);
    expect(m.weeklyGoalTarget).toBe(4); // default when no goal is set
  });

  it('reports the lifetime total, not just what is inside the date window', () => {
    // The date list is capped at HISTORY_WINDOW_DAYS, so a long-standing player's
    // total must come from the database count rather than the rows that were read.
    const m = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-24', '2026-09-22'],
      workoutDates: [],
      totalSessions: 1843,
    });
    expect(m.totalSessions).toBe(1843);
    // Windowed stats still come from the dates
    expect(m.thisWeekSessions).toBe(2);
  });

  it('streak counts from yesterday when today is not logged yet', () => {
    const m = computeDashboardMetrics({ ...base, sessionDates: ['2026-09-23', '2026-09-22'], workoutDates: [] });
    expect(m.currentStreak).toBe(2);
  });

  it('prefers the database streak, which sees further back than the date window', () => {
    // Migration 00025 present: the window only holds 2 days but the real run is 900
    const m = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-24', '2026-09-23'],
      workoutDates: [],
      dbStreaks: { longest: 900, current: 900 },
    });
    expect(m.currentStreak).toBe(900);
  });

  it('falls back to the windowed dates before the migration has run', () => {
    const m = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-24', '2026-09-23'],
      workoutDates: [],
      dbStreaks: null,
    });
    expect(m.currentStreak).toBe(2);
  });

  it('still knows the streak is at risk when the count came from the database', () => {
    // Two days since the last session, so the rest day is spent and today is
    // the last chance. Answered from the dates, not the database count.
    const atRisk = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-22'],
      workoutDates: [],
      dbStreaks: { longest: 900, current: 900 },
    });
    expect(atRisk.streakAtRisk).toBe(true);

    const safe = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-24'],
      workoutDates: [],
      dbStreaks: { longest: 900, current: 900 },
    });
    expect(safe.streakAtRisk).toBe(false);
  });

  it('does not nag on a rest day it would itself recommend', () => {
    // Trained yesterday, nothing logged yet today. The old rule warned here,
    // every single day, which is how a warning gets ignored.
    const resting = computeDashboardMetrics({
      ...base,
      sessionDates: ['2026-09-23'],
      workoutDates: [],
      dbStreaks: { longest: 900, current: 900 },
    });
    expect(resting.streakAtRisk).toBe(false);
  });

  it('career shooting % comes from the zone totals', () => {
    const zones = totalsByZone([
      { shot_zone: 'paint', makes: 6, attempts: 10 },
      { shot_zone: 'three-top', makes: 1, attempts: 10 },
      { shot_zone: 'paint', makes: 4, attempts: 10 },
    ]);
    const m = computeDashboardMetrics({ ...base, zones, sessionDates: [], workoutDates: [] });
    expect(m.shootingPercentage).toBe(36.7);
    expect(rankZones(zones).map((z) => [z.zone, z.percentage])).toEqual([
      ['paint', 50],
      ['three-top', 10],
    ]);
  });
});

describe('fetchAllRows', () => {
  it('keeps reading past the 1,000-row limit of a single request', async () => {
    const total = PAGE_SIZE * 2 + 5;
    const pages: Array<[number, number]> = [];
    const rows = await fetchAllRows(async (from, to) => {
      pages.push([from, to]);
      const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
      return { data, error: null };
    });
    expect(rows.length).toBe(total);
    expect(pages.length).toBe(3);
  });

  it('stops on an error', async () => {
    const rows = await fetchAllRows(async () => ({ data: null, error: { message: 'x' } }));
    expect(rows).toEqual([]);
  });
});
