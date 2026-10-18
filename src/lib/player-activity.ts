// src/lib/player-activity.ts
// SERVER-ONLY: the player's training history that several screens need (dashboard, achievements,
// goals, basketball, style match). Each loader is wrapped in React cache(), so the dashboard,
// which shows metrics and achievements together, reads each table once per request instead of
// two or three times.
//
// Supabase returns at most 1,000 rows per request, so long histories are read page by page
// (a single request would silently stop counting after 1,000 rows).
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { addDays, dateInTimeZone } from '@/lib/dates';

export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: unknown };

/** Reads every row of a query, PAGE_SIZE rows at a time. The query must have a stable order. */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows = 50_000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

export interface ZoneTotal {
  zone: string;
  makes: number;
  attempts: number;
}

/** Adds up shooting rows per zone. */
export function totalsByZone(rows: Array<{ shot_zone: string; makes: number; attempts: number }>): ZoneTotal[] {
  const zones = new Map<string, ZoneTotal>();
  for (const r of rows) {
    const z = zones.get(r.shot_zone) || { zone: r.shot_zone, makes: 0, attempts: 0 };
    z.makes += Number(r.makes) || 0;
    z.attempts += Number(r.attempts) || 0;
    zones.set(r.shot_zone, z);
  }
  return [...zones.values()];
}

/**
 * How far back the date loader reads.
 *
 * The dashboard, achievements and goals pages all need training dates, and
 * this used to read the player's entire career on every one of those visits -
 * O(all history) on the three most-visited screens. Everything those pages
 * compute from dates looks at a recent window anyway: this week, the last 30
 * days for consistency, the last 14 for workload, and the current streak.
 *
 * The one exception is the longest-ever streak, which now means "longest in
 * the last two years". That is a deliberate trade: two years is longer than
 * this app has existed, so no player is affected today, and a bounded read
 * keeps the dashboard fast for the player who logs daily for a decade.
 * Totals are not affected - they come from getTrainingCounts below, which
 * counts in the database rather than by reading rows.
 */
export const HISTORY_WINDOW_DAYS = 730;

/**
 * Longest and current training streak, over the player's whole history.
 *
 * Uses the my_training_streaks() database function (migration 00025), which walks every
 * session and workout date server-side and returns two numbers. Until that migration runs
 * this returns null and the caller falls back to counting the windowed date list, where
 * the longest streak is capped at HISTORY_WINDOW_DAYS.
 *
 * Takes the player's calendar date, not the server's: between midnight and 1am Irish time
 * the server (UTC) is still on yesterday, which would make a live streak look broken.
 */
export const getStreaksFromDb = cache(
  async (userId: string, today: string): Promise<{ longest: number; current: number } | null> => {
    void userId; // cache key only; the function reads auth.uid() itself
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('my_training_streaks', { p_today: today });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as { longest_streak: number; current_streak: number };
    return { longest: Number(row.longest_streak) || 0, current: Number(row.current_streak) || 0 };
  }
);

/** Exact lifetime counts, counted in the database rather than by reading rows. */
export const getTrainingCounts = cache(async (userId: string): Promise<{ sessions: number; workouts: number }> => {
  const supabase = await createClient();
  const [{ count: sessions }, { count: workouts }] = await Promise.all([
    supabase.from('training_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  return { sessions: sessions || 0, workouts: workouts || 0 };
});

/** Dates the player logged a session / workout in the last HISTORY_WINDOW_DAYS ("YYYY-MM-DD", repeats kept). */
export const getTrainingDates = cache(async (userId: string): Promise<{ sessions: string[]; workouts: string[] }> => {
  const supabase = await createClient();
  const since = addDays(dateInTimeZone(), -HISTORY_WINDOW_DAYS);
  const [sessions, workouts] = await Promise.all([
    fetchAllRows<{ session_date: string }>((from, to) =>
      supabase
        .from('training_sessions')
        .select('session_date')
        .eq('user_id', userId)
        .gte('session_date', since)
        .order('session_date', { ascending: false })
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<{ workout_date: string }>((from, to) =>
      supabase
        .from('workouts')
        .select('workout_date')
        .eq('user_id', userId)
        .gte('workout_date', since)
        .order('workout_date', { ascending: false })
        .order('id')
        .range(from, to)
    ),
  ]);
  return { sessions: sessions.map((s) => s.session_date), workouts: workouts.map((w) => w.workout_date) };
});

/**
 * Career makes/attempts per court zone. Uses the my_shot_totals() database function
 * (migration 00023, one small row per zone); until that migration runs it adds up the rows here.
 */
export const getShotTotals = cache(async (userId: string): Promise<ZoneTotal[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('my_shot_totals');
  if (!error && Array.isArray(data)) {
    return totalsByZone(data as Array<{ shot_zone: string; makes: number; attempts: number }>);
  }
  const rows = await fetchAllRows<{ shot_zone: string; makes: number; attempts: number }>((from, to) =>
    supabase.from('shooting_entries').select('shot_zone, makes, attempts').eq('user_id', userId).order('id').range(from, to)
  );
  return totalsByZone(rows);
});

/** Shooting rows logged since an instant (e.g. the start of this week). */
export const getShotsSince = cache(async (userId: string, sinceIso: string): Promise<Array<{ makes: number; attempts: number }>> => {
  const supabase = await createClient();
  return fetchAllRows<{ makes: number; attempts: number }>((from, to) =>
    supabase
      .from('shooting_entries')
      .select('makes, attempts')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('id')
      .range(from, to)
  );
});

/**
 * Makes/attempts per zone over the last `days` days. The shot chart on Free
 * covers the last 30; the all-time chart (getShotTotals) is Pro.
 */
export const getRecentZoneTotals = cache(async (userId: string, days: number): Promise<ZoneTotal[]> => {
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = await createClient();
  const rows = await fetchAllRows<{ shot_zone: string; makes: number; attempts: number }>((from, to) =>
    supabase
      .from('shooting_entries')
      .select('shot_zone, makes, attempts')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('id')
      .range(from, to)
  );
  return totalsByZone(rows);
});

/** Personal records across gym sets and athletic tests. */
export const getPersonalRecordCount = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const [{ count: sets }, { count: tests }] = await Promise.all([
    supabase.from('workout_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_personal_record', true),
    supabase.from('performance_tests').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_personal_record', true),
  ]);
  return (sets || 0) + (tests || 0);
});
