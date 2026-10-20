// __tests__/achievements.test.ts
import { describe, it, expect } from 'vitest';
import {
  BADGES,
  BADGE_XP,
  badgeXp,
  challengeProgress,
  levelFor,
  streakDayBonus,
  streakRewards,
  streaks,
  tierFor,
  xpBreakdown,
  xpForLevel,
  MAX_LEVEL,
  STREAK_XP_CAP,
  type PlayerStats,
} from '@/lib/achievements';

const base: PlayerStats = {
  totalSessions: 0,
  totalWorkouts: 0,
  totalMakes: 0,
  totalLessons: 0,
  sectionsWithLesson: 0,
  totalPRs: 0,
  programsCompleted: 0,
  programDays: 0,
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

  it('adds up XP from everything a player does', () => {
    const xp = xpBreakdown(
      { ...base, totalSessions: 20, totalWorkouts: 3, totalMakes: 1500, programDays: 4, programsCompleted: 1, videoTracked: 2 },
      { challengePoints: 100, badgeXp: 150, streakXp: 40 }
    );
    expect(xp.training).toBe(23 * 20);
    expect(xp.makes).toBe(150);
    expect(xp.programs).toBe(4 * 15 + 300);
    expect(xp.video).toBe(50);
    expect(xp.total).toBe(460 + 150 + 360 + 50 + 100 + 150 + 40);
  });

  it('makes the first level-up come quickly and each one after a little harder', () => {
    expect(xpForLevel(1)).toBe(0);
    // About two sessions
    expect(xpForLevel(2)).toBe(60);
    const gaps = Array.from({ length: MAX_LEVEL - 1 }, (_, i) => xpForLevel(i + 2) - xpForLevel(i + 1));
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it('finds the level, its tier, and the way to the next', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, tier: 'Rookie', nextTier: { name: 'Prospect', level: 5 } });
    const mid = levelFor(xpForLevel(12) + 10);
    expect(mid).toMatchObject({ level: 12, tier: 'Rotation Player', into: 10 });
    expect(mid.toNext).toBe(xpForLevel(13) - xpForLevel(12) - 10);
    expect(mid.progress).toBeGreaterThan(0);
    expect(levelFor(10_000_000)).toMatchObject({ level: MAX_LEVEL, tier: 'GOAT', toNext: 0, progress: 1, nextTier: null });
    expect(tierFor(20).name).toBe('All-Star');
  });

  it('keeps every badge players may already have', () => {
    // Stored in reward_events: removing or renaming one takes it off a player
    const legacy = ['first-session', 'sessions-10', 'sessions-50', 'sessions-100', 'makes-1000', 'makes-5000', 'makes-10000', 'streak-7', 'streak-30', 'first-pr', 'prs-10', 'gym-20', 'student', 'scholar', 'program-finisher', 'video-tracker'];
    const ids = new Set(BADGES.map((b) => b.id));
    for (const id of legacy) expect(ids.has(id)).toBe(true);
  });

  it('shows progress towards a badge, and values it by tier', () => {
    const fiveK = BADGES.find((b) => b.id === 'makes-5000')!;
    expect(fiveK.metric({ ...base, totalMakes: 3210 })).toBe(3210);
    expect(fiveK.target).toBe(5000);
    expect(badgeXp(['makes-5000', 'first-session', 'no-longer-exists'])).toBe(BADGE_XP.gold + BADGE_XP.bronze);
  });

  it('pays more for each day a streak goes on, up to a cap', () => {
    expect(streakDayBonus(1)).toBeLessThan(streakDayBonus(5));
    expect(streakDayBonus(1000)).toBe(STREAK_XP_CAP);
  });

  it('pays streak milestones every time a streak reaches them', () => {
    // Two separate 3-day streaks, then a 7-day one
    const days = [
      '2026-09-01', '2026-09-02', '2026-09-03',
      '2026-09-10', '2026-09-11', '2026-09-12',
      '2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26',
    ];
    const r = streakRewards(days, 7);
    expect(r.milestones).toEqual({ 3: 3, 7: 1 });
    const run = (n: number) => Array.from({ length: n }, (_, i) => streakDayBonus(i + 1)).reduce((x, y) => x + y, 0);
    const dayBonus = run(3) + run(3) + run(7);
    expect(r.xp).toBe(dayBonus + 3 * 75 + 200);
    // On a 7-day streak, the next to aim for is 14
    expect(r.next).toEqual({ days: 14, xp: 400, remaining: 7 });
    expect(r.nextDayBonus).toBe(streakDayBonus(8));
  });

  it('counts a streak through a rest day for its rewards, as for the streak itself', () => {
    const everyOtherDay = ['2026-09-20', '2026-09-22', '2026-09-24'];
    expect(streakRewards(everyOtherDay, 3).milestones).toEqual({ 3: 1 });
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
