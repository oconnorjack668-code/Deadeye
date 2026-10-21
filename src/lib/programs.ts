// src/lib/programs.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export type ProgramItem =
  | { type: 'drill'; slug: string; note?: string }
  | { type: 'exercise'; name: string; sets?: number; reps?: string }
  | { type: 'study'; topic_slug: string }
  | { type: 'test'; test_type: string }
  | { type: 'note'; text: string };

export interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  goal: string;
  level: string;
  position: string;
  weeks: number;
  sessions_per_week: number;
  season: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  week: number;
  day: number;
  title: string;
  focus: string;
  estimated_minutes: number;
  items: ProgramItem[];
}

export const GOAL_LABELS: Record<string, string> = {
  shooting: 'Shooting',
  ball_handling: 'Ball Handling',
  finishing: 'Finishing',
  athleticism: 'Athleticism',
  vertical: 'Vertical Jump',
  complete: 'Complete Player',
  in_season: 'In-Season',
};

export function sortDays<T extends { week: number; day: number }>(days: T[]): T[] {
  return [...days].sort((a, b) => a.week - b.week || a.day - b.day);
}

/**
 * The phase a week belongs to, from its focus text, or null.
 *
 * The content already names these - "Week 1 (Foundation): test standing..." -
 * and nothing ever showed them, so a player saw an undifferentiated list of
 * weeks. The single named reason people abandon a training plan is that it
 * stops feeling like it is going anywhere, and a plan that says Foundation,
 * then Build, then Peak is visibly going somewhere.
 */
export function weekPhase(focus: string): string | null {
  const match = /^Week\s+\d+\s*\(([^)]+)\)/i.exec(focus.trim());
  return match ? match[1].trim() : null;
}

export interface WeekSummary {
  week: number;
  sessions: number;
  minutes: number;
  phase: string | null;
  /** Minutes against week one, as a multiple. 1 means no change. */
  loadVsFirst: number;
}

/**
 * Per-week shape of a program, so the arc can be shown rather than asserted.
 *
 * Minutes are the honest escalation signal available from the data as it
 * stands: they come from estimated_minutes on each day and need no new content.
 * A program whose weeks are all the same length will show exactly that, which
 * is the point - this reports the arc, it does not invent one.
 */
export function weekSummaries<T extends { week: number; day: number; focus: string; estimated_minutes: number }>(
  days: T[]
): WeekSummary[] {
  const byWeek = new Map<number, T[]>();
  for (const d of sortDays(days)) {
    const list = byWeek.get(d.week) || [];
    list.push(d);
    byWeek.set(d.week, list);
  }
  const weeks = [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
  const minutesOf = (list: T[]) => list.reduce((sum, d) => sum + (d.estimated_minutes || 0), 0);
  const firstMinutes = weeks.length ? minutesOf(weeks[0][1]) : 0;

  return weeks.map(([week, list]) => ({
    week,
    sessions: list.length,
    minutes: minutesOf(list),
    phase: list.map((d) => weekPhase(d.focus)).find((p): p is string => p !== null) ?? null,
    loadVsFirst: firstMinutes > 0 ? minutesOf(list) / firstMinutes : 1,
  }));
}

/** The first day (in week/day order) that hasn't been completed, or null when the program is finished. */
export function nextDay<T extends { id: string; week: number; day: number }>(days: T[], completedIds: Set<string>): T | null {
  return sortDays(days).find((d) => !completedIds.has(d.id)) || null;
}

/** Deep link that opens the hoops tracker with the day's drills. */
export function courtLink(items: ProgramItem[]): string | null {
  const slugs = items.filter((i): i is Extract<ProgramItem, { type: 'drill' }> => i.type === 'drill').map((i) => i.slug);
  return slugs.length ? `/basketball/new?drills=${slugs.map(encodeURIComponent).join(',')}` : null;
}

/** Deep link that opens the gym logger with the day's exercises and target sets. */
export function gymLink(items: ProgramItem[]): string | null {
  const exercises = items.filter((i): i is Extract<ProgramItem, { type: 'exercise' }> => i.type === 'exercise');
  if (!exercises.length) return null;
  const param = exercises.map((e) => `${e.name}~${e.sets || 3}`).join('|');
  return `/workouts/new?exercises=${encodeURIComponent(param)}`;
}

/** The player's active enrollment with its program, days and completed day ids. */
export async function getActiveProgram(supabase: SupabaseClient<Database>, userId: string) {
  const { data: enrollment } = await supabase
    .from('program_enrollments')
    .select('id, started_at, training_programs(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  // The embedded `training_programs(*)` resource isn't modelled in this hand-written
  // Database type (that needs real foreign-key metadata from `supabase gen types`),
  // so the joined shape is asserted once here instead of casting the client to any.
  const row = enrollment as { id: string; training_programs: Program | null } | null;
  if (!row?.training_programs) return null;

  const program = row.training_programs;
  const [{ data: days }, { data: completions }] = await Promise.all([
    supabase.from('program_days').select('*').eq('program_id', program.id),
    supabase.from('program_day_completions').select('program_day_id').eq('enrollment_id', row.id),
  ]);
  const completedIds = new Set<string>((completions || []).map((c) => c.program_day_id));
  const allDays = sortDays((days || []) as ProgramDay[]);
  return {
    enrollmentId: row.id,
    program,
    days: allDays,
    completedIds,
    next: nextDay(allDays, completedIds),
  };
}

/**
 * Whether a player can start or follow a programme: it is one of the Free
 * four, they have Pro, or they had already started it (00037 lets anyone
 * finish, or restart, a programme they began before it became Pro). The same
 * rule enforce_programme_access() applies in the database.
 */
export function canUseProgram(program: { id: string; is_free: boolean }, isPro: boolean, startedIds: Set<string>): boolean {
  return program.is_free || isPro || startedIds.has(program.id);
}

/** Every programme this player has ever started, whatever its status. */
export async function startedProgramIds(supabase: SupabaseClient<Database>, userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('program_enrollments').select('program_id').eq('user_id', userId);
  return new Set((data || []).map((r) => r.program_id));
}

/**
 * Basketball IQ sections a run of programme days sends the player to.
 *
 * Programmes link to lessons, and the free programmes between them use most
 * of the twelve sections. Opening all eight on Free would undo the point
 * of Pro sections, and leaving them locked would break a free programme
 * halfway through a session. So a section also opens while it is part of the
 * programme the player is following.
 */
export function studySlugsIn(days: Array<{ items: ProgramItem[] | unknown }>): Set<string> {
  const slugs = new Set<string>();
  for (const day of days) {
    if (!Array.isArray(day.items)) continue;
    for (const item of day.items as ProgramItem[]) {
      if (item.type === 'study') slugs.add(item.topic_slug);
    }
  }
  return slugs;
}
