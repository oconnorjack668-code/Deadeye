// src/lib/ai/context.ts
// SERVER-ONLY: builds a compact, plain-text summary of a player's recent training for the AI
// (coach chat and weekly report). Every query filters by userId, so it is safe with either the
// player's own client or the service-role client used by the weekly cron job.
// Session notes are included only for the player's own chat, never in shared features.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { formatAmount, setAmount, setModeOf } from '@/lib/exercises';

// These queries use PostgREST's embedded-resource syntax (e.g. `session_drills(session_id)`),
// which this hand-written schema doesn't model (that needs real foreign-key metadata from
// `supabase gen types`). The real shape is asserted once per query here instead of casting
// the whole client or every result to `any`.
interface ZoneRow {
  shot_zone: string;
  makes: number;
  attempts: number;
  session_drills: { session_id: string } | null;
}
interface WorkoutRow {
  id: string;
  workout_date: string;
  workout_type: string;
  duration_minutes: number;
  rpe: number;
  workout_sets: Array<{
    exercise_name: string;
    reps: number | null;
    duration_seconds: number | null;
    distance_meters: number | null;
    weight_kg: number | null;
    is_personal_record: boolean;
  }>;
}
interface EnrollmentRow {
  started_at: string;
  training_programs: { name: string } | null;
}
interface StyleMatch {
  name: string;
  archetype: string;
}

export interface PlayerContext {
  text: string;
  /** Numbers the weekly report also shows in the app */
  week: { sessions: number; workouts: number; minutes: number; makes: number; attempts: number; trainingDays: number };
}

const day = (d: Date) => d.toISOString().slice(0, 10);

function pct(makes: number, attempts: number) {
  return attempts > 0 ? `${Math.round((makes / attempts) * 100)}%` : 'n/a';
}

export async function buildPlayerContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  { includeNotes = true, days = 14 }: { includeNotes?: boolean; days?: number } = {}
): Promise<PlayerContext> {
  const now = new Date();
  const since = day(new Date(now.getTime() - (days - 1) * 86_400_000));
  const since30 = day(new Date(now.getTime() - 29 * 86_400_000));
  const since7 = day(new Date(now.getTime() - 6 * 86_400_000));

  const [profile, sessions, zones30, workouts, goals, enrollment, formCheck, style, games] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, age_bracket, height_cm, position, dominant_hand, playing_level, goals, strengths, focus_areas')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('training_sessions')
      .select('id, session_date, session_type, duration_minutes, intensity_rpe, perceived_quality, notes')
      .eq('user_id', userId)
      .gte('session_date', since)
      .order('session_date', { ascending: false })
      .limit(40),
    supabase
      .from('shooting_entries')
      .select('shot_zone, makes, attempts, session_drills(session_id)')
      .eq('user_id', userId)
      .gte('created_at', `${since30}T00:00:00Z`)
      .limit(2000),
    supabase
      .from('workouts')
      .select('id, workout_date, workout_type, duration_minutes, rpe, workout_sets(exercise_name, reps, duration_seconds, distance_meters, weight_kg, is_personal_record)')
      .eq('user_id', userId)
      .gte('workout_date', since)
      .order('workout_date', { ascending: false })
      .limit(20),
    supabase.from('goals').select('title, target_value, current_value, period').eq('user_id', userId).eq('is_active', true).limit(10),
    supabase
      .from('program_enrollments')
      .select('started_at, training_programs(name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('video_analyses')
      .select('summary, created_at')
      .eq('user_id', userId)
      .eq('kind', 'form_check')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('style_match_results')
      .select('matches')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Missing until migration 00022 runs: the query then just returns an error and is skipped
    supabase
      .from('games')
      .select('game_date, opponent, result, minutes, points, fgm2, fga2, fgm3, fga3, ftm, fta, oreb, dreb, ast, stl, blk, tov')
      .eq('user_id', userId)
      .order('game_date', { ascending: false })
      .limit(10),
  ]);

  const lines: string[] = [];
  const p = profile.data;
  if (p) {
    lines.push(
      `Player: ${p.display_name}; age ${p.age_bracket || 'unknown'}; ${p.height_cm ? `${Math.round(p.height_cm)} cm` : 'height unknown'}; position ${p.position || 'unknown'}; ${p.dominant_hand || 'unknown'}-handed; level ${p.playing_level || 'unknown'}.`
    );
    if (p.goals?.length) lines.push(`Goals: ${p.goals.join(', ')}.`);
    if (p.focus_areas?.length) lines.push(`Focus areas: ${p.focus_areas.join(', ')}.`);
    if (p.strengths?.length) lines.push(`Strengths: ${p.strengths.join(', ')}.`);
  }

  // Shots per session for the recent sessions
  const sessionRows = sessions.data || [];
  const bySession = new Map<string, { makes: number; attempts: number }>();
  const zones = new Map<string, { makes: number; attempts: number }>();
  for (const e of (zones30.data || []) as unknown as ZoneRow[]) {
    const z = zones.get(e.shot_zone) || { makes: 0, attempts: 0 };
    z.makes += e.makes;
    z.attempts += e.attempts;
    zones.set(e.shot_zone, z);
    const sid = e.session_drills?.session_id;
    if (sid) {
      const s = bySession.get(sid) || { makes: 0, attempts: 0 };
      s.makes += e.makes;
      s.attempts += e.attempts;
      bySession.set(sid, s);
    }
  }

  const week = { sessions: 0, workouts: 0, minutes: 0, makes: 0, attempts: 0, trainingDays: 0 };
  const weekDays = new Set<string>();

  lines.push(`\nBasketball sessions (last ${days} days): ${sessionRows.length}`);
  for (const s of sessionRows) {
    const shots = bySession.get(s.id);
    if (s.session_date >= since7) {
      week.sessions += 1;
      week.minutes += s.duration_minutes || 0;
      week.makes += shots?.makes || 0;
      week.attempts += shots?.attempts || 0;
      weekDays.add(s.session_date);
    }
    const note = includeNotes && s.notes ? ` — note: "${String(s.notes).slice(0, 160)}"` : '';
    lines.push(
      `- ${s.session_date} ${s.session_type}, ${s.duration_minutes} min, effort ${s.intensity_rpe}/10, quality ${s.perceived_quality}/5${
        shots?.attempts ? `, shots ${shots.makes}/${shots.attempts} (${pct(shots.makes, shots.attempts)})` : ''
      }${note}`
    );
  }

  if (zones.size) {
    const list = [...zones.entries()]
      .sort((a, b) => b[1].attempts - a[1].attempts)
      .map(([zone, z]) => `${zone} ${z.makes}/${z.attempts} (${pct(z.makes, z.attempts)})`);
    lines.push(`\nShooting by zone (last 30 days): ${list.join('; ')}`);
  }

  const workoutRows = (workouts.data || []) as unknown as WorkoutRow[];
  lines.push(`\nGym workouts (last ${days} days): ${workoutRows.length}`);
  for (const w of workoutRows) {
    if (w.workout_date >= since7) {
      week.workouts += 1;
      week.minutes += w.duration_minutes || 0;
      weekDays.add(w.workout_date);
    }
    const best = new Map<string, { weight: number | null; reps: string; pr: boolean }>();
    for (const set of w.workout_sets || []) {
      const cur = best.get(set.exercise_name);
      const mode = setModeOf(set);
      if (!cur || (set.weight_kg || 0) > (cur.weight || 0))
        best.set(set.exercise_name, { weight: set.weight_kg, reps: formatAmount(setAmount(set, mode), mode), pr: set.is_personal_record });
    }
    const top = [...best.entries()]
      .slice(0, 6)
      .map(([name, b]) => `${name} ${b.weight ? `${b.weight}kg×` : ''}${b.reps}${b.pr ? ' (PR)' : ''}`);
    lines.push(`- ${w.workout_date} ${w.workout_type}, ${w.duration_minutes} min, RPE ${w.rpe}${top.length ? `: ${top.join(', ')}` : ''}`);
  }
  week.trainingDays = weekDays.size;

  const gameRows = games.data || [];
  if (gameRows.length) {
    const avg = (f: (g: (typeof gameRows)[number]) => number) =>
      Math.round((gameRows.reduce((n, g) => n + f(g), 0) / gameRows.length) * 10) / 10;
    lines.push(
      `
Recent games (last ${gameRows.length}): ${avg((g) => g.points)} ppg, ${avg((g) => g.oreb + g.dreb)} rpg, ${avg((g) => g.ast)} apg, ${avg((g) => g.tov)} turnovers per game`
    );
    for (const g of gameRows.slice(0, 5)) {
      lines.push(
        `- ${g.game_date}${g.opponent ? ` vs ${g.opponent}` : ''}${g.result ? ` (${g.result})` : ''}: ${g.points} pts, FG ${g.fgm2 + g.fgm3}/${g.fga2 + g.fga3}, 3P ${g.fgm3}/${g.fga3}, FT ${g.ftm}/${g.fta}, ${g.oreb + g.dreb} reb, ${g.ast} ast, ${g.stl} stl, ${g.tov} TO`
      );
    }
  }

  const goalRows = goals.data || [];
  if (goalRows.length) lines.push(`\nActive goals: ${goalRows.map((g) => `${g.title} (${g.current_value}/${g.target_value} ${g.period})`).join('; ')}`);
  const programName = (enrollment.data as unknown as EnrollmentRow | null)?.training_programs?.name;
  if (programName) lines.push(`Current program: ${programName}.`);
  if (formCheck.data?.summary) {
    lines.push(`Latest shooting form check (${String(formCheck.data.created_at).slice(0, 10)}): ${JSON.stringify(formCheck.data.summary).slice(0, 500)}`);
  }
  const topMatch = (style.data?.matches as StyleMatch[] | undefined)?.[0];
  if (topMatch?.name) lines.push(`Closest NBA style match: ${topMatch.name} (${topMatch.archetype}).`);

  return { text: lines.join('\n'), week };
}
