// __tests__/achievements.test.ts
import { describe, it, expect } from 'vitest';
import { BADGES, challengeProgress, rankFor, streaks, xpFor, type PlayerStats } from '@/lib/achievements';

const base: PlayerStats = {
  totalSessions: 0,
  totalWorkouts: 0,
  totalMakes: 0,
  totalLessons: 0,
  sectionsWithLesson: 0,
  totalPRs: 0,
  programsCompleted: 0,
  videoTracked: 0,
  longestStreak: 0,
  currentStreak: 0,
  week: { trainingDays: 0, makes: 0, lessons: 0, workouts: 0, sessions: 0, programSessions: 0 },
};

describe('achievements', () => {
  it('tracks weekly challenge progress and caps the bar at the target', () => {
    const s = { ...base, week: { ...base.week, trainingDays: 5, makes: 120 } };
    expect(challengeProgress({ metric: 'training_days', target: 4 }, s)).toEqual({ current: 4, target: 4, done: true });
    expect(challengeProgress({ metric: 'makes', target: 200 }, s)).toEqual({ current: 120, target: 200, done: false });
  });

  it('needs a session, a workout and a lesson for a balanced week', () => {
    const two = { ...base, week: { ...base.week, sessions: 2, workouts: 1 } };
    expect(challengeProgress({ metric: 'balanced', target: 3 }, two).done).toBe(false);
    const all = { ...two, week: { ...two.week, lessons: 1 } };
    expect(challengeProgress({ metric: 'balanced', target: 3 }, all).done).toBe(true);
  });

  it('earns badges at their thresholds', () => {
    const s = { ...base, totalSessions: 10, totalMakes: 10000, longestStreak: 7 };
    const earned = BADGES.filter((b) => b.earned(s)).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first-session', 'sessions-10', 'makes-1000', 'makes-10000', 'streak-7']));
    expect(earned).not.toContain('sessions-50');
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });

  it('adds XP and finds the rank with progress to the next one', () => {
    const xp = xpFor({ ...base, totalSessions: 20, totalMakes: 1500 }, 100, 2);
    expect(xp).toBe(20 * 20 + 150 + 100 + 100);
    expect(rankFor(0)).toMatchObject({ name: 'Rookie', next: { name: 'Prospect' } });
    const r = rankFor(750);
    expect(r.name).toBe('Prospect');
    expect(r.progress).toBeCloseTo(0.9, 5);
    expect(rankFor(20000)).toMatchObject({ name: 'GOAT', next: null, progress: 1 });
  });

  it('computes longest and current streaks', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-23', '2026-09-24'];
    // Trained yesterday but not today: the rest day is being used, not spent
    expect(streaks(days, '2026-09-25')).toEqual({ longest: 3, current: 2, atRisk: false });
    // Trained today: safe
    expect(streaks(days, '2026-09-24')).toEqual({ longest: 3, current: 2, atRisk: false });
    // Two days since: rest day spent, so today is the last chance
    expect(streaks(days, '2026-09-26')).toEqual({ longest: 3, current: 2, atRisk: true });
    // Three days since: two missed in a row, gone
    expect(streaks(days, '2026-09-27').current).toBe(0);
  });

  it('lets a rest day through but not two', () => {
    // The rule the app's own advice depends on: trainingLoad tells a player to
    // rest after six straight days, so the streak must survive taking it.
    const everyOtherDay = ['2026-09-20', '2026-09-22', '2026-09-24', '2026-09-26'];
    expect(streaks(everyOtherDay, '2026-09-26').current).toBe(4);
    // Counts days trained, not days elapsed - this run spans a week
    expect(streaks(everyOtherDay, '2026-09-26').longest).toBe(4);

    const twoOff = ['2026-09-20', '2026-09-21', '2026-09-24', '2026-09-25'];
    expect(streaks(twoOff, '2026-09-25')).toMatchObject({ longest: 2, current: 2 });
  });

  it('can be told to allow no rest at all', () => {
    const days = ['2026-09-20', '2026-09-22', '2026-09-24'];
    expect(streaks(days, '2026-09-24', 0)).toMatchObject({ longest: 1, current: 1 });
  });

  it('only flags a streak at risk when there is one to lose', () => {
    const days = ['2026-09-23', '2026-09-24'];
    // No streak left at all - nothing to warn about
    expect(streaks(days, '2026-09-28')).toEqual({ longest: 2, current: 0, atRisk: false });
    // Never trained
    expect(streaks([], '2026-09-27')).toEqual({ longest: 0, current: 0, atRisk: false });
  });

  it('ignores a date in the future rather than counting it', () => {
    // A clock-skewed device, or a session logged with tomorrow's date
    expect(streaks(['2026-09-30'], '2026-09-25').current).toBe(0);
  });
});
