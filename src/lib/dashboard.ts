// src/lib/dashboard.ts
import { createClient } from '@/lib/supabase/server';
import { streakState } from '@/lib/achievements';
import { addDays } from '@/lib/dates';
import { userCalendarNow } from '@/lib/userTime';
import { getPersonalRecordCount, getShotTotals, getStreaksFromDb, getTrainingCounts, getTrainingDates, type ZoneTotal } from '@/lib/player-activity';
import { trainingLoad, type TrainingLoad } from '@/lib/trainingLoad';

export interface DashboardMetrics {
  thisWeekSessions: number;
  shootingPercentage: number;
  currentStreak: number;
  /** A streak is running but today has no training logged yet - still savable. */
  streakAtRisk: boolean;
  /** Streak freezes ready to cover a missed day. */
  streakFreezes: number;
  totalSessions: number;
  personalRecords: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
  /** % of the last 30 days (including today) with any training logged */
  consistency: number;
  /** This week's workload against last week's, in plain language */
  load: TrainingLoad;
}

export const CONSISTENCY_DAYS = 30;

interface MetricsInput {
  /** Only the recent window - see HISTORY_WINDOW_DAYS. Not the full career. */
  sessionDates: string[];
  workoutDates: string[];
  /** Lifetime count, counted in the database (sessionDates is windowed). */
  totalSessions: number;
  /** Streaks from the database over all history; null before migration 00025 runs. */
  dbStreaks?: { longest: number; current: number } | null;
  zones: ZoneTotal[];
  personalRecords: number;
  weeklyGoalTarget: number | null | undefined;
  /** Today's date on the players' calendar ("YYYY-MM-DD") */
  today: string;
  /** Monday of this week ("YYYY-MM-DD") */
  weekStart: string;
}

/** Pure calculation, so it can be unit tested. */
export function computeDashboardMetrics(input: MetricsInput): DashboardMetrics {
  const { sessionDates, workoutDates, zones, today, weekStart } = input;
  const weekEnd = addDays(weekStart, 6);
  const trainingDays = [...sessionDates, ...workoutDates];

  const totalMakes = zones.reduce((sum, z) => sum + z.makes, 0);
  const totalAttempts = zones.reduce((sum, z) => sum + z.attempts, 0);

  // Streak and weekly goal count every training day (hoops session or gym workout), the same
  // rule as the leaderboard, rank card, friends list and Goals page
  // The database knows the whole history; the windowed dates only reach back
  // HISTORY_WINDOW_DAYS. atRisk is answered from the dates either way, since it
  // only looks at the last day or two.
  const windowed = streakState(trainingDays, today);
  // The larger of the two: the windowed walk knows about freezes even before
  // migration 00041 teaches them to the database, and the database knows
  // about anything older than the window
  const current = Math.max(input.dbStreaks?.current ?? 0, windowed.current);
  // Taken from streaks() rather than recomputed here, so the warning follows
  // the same rest-day rule as the streak it is warning about. It used to fire
  // whenever nothing was logged *yet today*, which now means it would go off
  // on a rest day the app itself recommends.
  const atRisk = current > 0 && windowed.atRisk;
  const weekTrainingDays = new Set(trainingDays.filter((d) => d >= weekStart && d <= today)).size;
  const since = addDays(today, -(CONSISTENCY_DAYS - 1));
  const activeDays = new Set(trainingDays.filter((d) => d >= since && d <= today)).size;

  return {
    thisWeekSessions: sessionDates.filter((d) => d >= weekStart && d <= weekEnd).length,
    shootingPercentage: totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 1000) / 10 : 0,
    currentStreak: current,
    streakAtRisk: atRisk,
    streakFreezes: windowed.freezes,
    totalSessions: input.totalSessions,
    personalRecords: input.personalRecords,
    weeklyGoalProgress: weekTrainingDays,
    weeklyGoalTarget: input.weeklyGoalTarget || 4,
    consistency: Math.round((activeDays / CONSISTENCY_DAYS) * 100),
    load: trainingLoad(trainingDays, today),
  };
}

export async function calculateDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const { today, weekStart } = await userCalendarNow();

  // All independent reads run in parallel; the history loaders are shared with the
  // achievements on the same page (cached per request)
  const [{ sessions, workouts }, counts, dbStreaks, zones, personalRecords, { data: weeklyGoal }] = await Promise.all([
    getTrainingDates(userId),
    getTrainingCounts(userId),
    getStreaksFromDb(userId, today),
    getShotTotals(userId),
    getPersonalRecordCount(userId),
    // Weekly goal (most recent if several are active)
    supabase
      .from('goals')
      .select('target_value')
      .eq('user_id', userId)
      .eq('goal_type', 'weekly_training_days')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{ data: { target_value: number } | null }>,
  ]);

  return computeDashboardMetrics({
    sessionDates: sessions,
    workoutDates: workouts,
    totalSessions: counts.sessions,
    dbStreaks,
    zones,
    personalRecords,
    weeklyGoalTarget: weeklyGoal?.target_value,
    today,
    weekStart,
  });
}

/** Career shooting per zone, best percentage first. */
export function rankZones(zones: ZoneTotal[]) {
  return zones
    .map((zone) => ({
      ...zone,
      percentage: zone.attempts > 0 ? Math.round((zone.makes / zone.attempts) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export async function getShootingByZone(userId: string) {
  return rankZones(await getShotTotals(userId));
}
