// src/app/api/share/[kind]/route.tsx
// Share cards: 1080×1350 PNGs (Instagram/TikTok portrait) of a session, workout or rank.
// Uses the player's own login (RLS), so only their own data can be drawn.
//   /api/share/session?id=<training_session id>
//   /api/share/workout?id=<workout id>
//   /api/share/game?id=<game id>
//   /api/share/rank
import React from 'react';
import { ImageResponse } from 'next/og';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { loadAchievements } from '@/lib/achievements-server';
import { ZONE_LABELS } from '@/lib/court';
import { asMeasurementSystem, displayWeight, weightUnitLabel } from '@/lib/units';
import { formatAmount, setAmount, setModeOf } from '@/lib/exercises';
import { CARD_HEIGHT, CARD_WIDTH, Frame, GameCard, RankCard, SessionCard, WorkoutCard, titleCase } from '@/lib/shareCards';

export const dynamic = 'force-dynamic';

async function iconData(origin: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/icon-192.png`);
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Please log in', { status: 401 });

  const { kind } = await params;
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  const supabase = await createClient();
  const [{ data: profile }, icon] = await Promise.all([
    supabase.from('profiles').select('display_name, measurement_system').eq('id', user.id).maybeSingle(),
    iconData(url.origin),
  ]);
  const name = profile?.display_name || 'Deadeye player';
  let body: React.ReactNode;

  if (kind === 'session') {
    const { data: session } = await supabase
      .from('training_sessions')
      .select('session_date, session_type, duration_minutes, session_drills(shooting_entries(shot_zone, makes, attempts))')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!session) return new Response('Not found', { status: 404 });
    // session_drills(shooting_entries(...)) is a two-level embed, which this
    // hand-written schema doesn't model relationship metadata for.
    const typedSession = session as unknown as {
      session_date: string;
      session_type: string;
      duration_minutes: number;
      session_drills: Array<{ shooting_entries: Array<{ shot_zone: string; makes: number; attempts: number }> }>;
    };
    const zones = new Map<string, { makes: number; attempts: number }>();
    for (const d of typedSession.session_drills || []) {
      for (const e of d.shooting_entries || []) {
        const z = zones.get(e.shot_zone) || { makes: 0, attempts: 0 };
        z.makes += e.makes;
        z.attempts += e.attempts;
        zones.set(e.shot_zone, z);
      }
    }
    body = (
      <SessionCard
        date={typedSession.session_date}
        type={typedSession.session_type}
        minutes={typedSession.duration_minutes}
        drills={(typedSession.session_drills || []).length}
        zones={[...zones.entries()].map(([zone, z]) => ({ label: ZONE_LABELS[zone as keyof typeof ZONE_LABELS] || titleCase(zone), ...z }))}
      />
    );
  } else if (kind === 'workout') {
    const { data: workout } = await supabase
      .from('workouts')
      .select('workout_date, workout_type, duration_minutes, workout_sets(exercise_name, reps, duration_seconds, distance_meters, weight_kg, is_personal_record)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!workout) return new Response('Not found', { status: 404 });
    const units = asMeasurementSystem(profile?.measurement_system);
    const sets = (workout.workout_sets || []) as unknown as Array<{
      exercise_name: string;
      reps: number | null;
      duration_seconds: number | null;
      distance_meters: number | null;
      weight_kg: number | null;
      is_personal_record: boolean;
    }>;
    const best = new Map<string, { weight: number | null; reps: string; pr: boolean }>();
    for (const s of sets) {
      const cur = best.get(s.exercise_name);
      const pr = s.is_personal_record || !!cur?.pr;
      const mode = setModeOf(s);
      if (!cur || (s.weight_kg || 0) > (cur.weight || 0))
        best.set(s.exercise_name, { weight: s.weight_kg, reps: formatAmount(setAmount(s, mode), mode), pr });
      else if (pr) cur.pr = true;
    }
    body = (
      <WorkoutCard
        date={workout.workout_date}
        type={workout.workout_type}
        minutes={workout.duration_minutes}
        sets={sets.length}
        volume={displayWeight(sets.reduce((n, s) => n + (s.weight_kg || 0) * (s.reps || 0), 0), units)}
        unit={weightUnitLabel(units)}
        prs={sets.filter((s) => s.is_personal_record).length}
        best={[...best.entries()].map(([exercise, b]) => ({
          exercise,
          weight: b.weight ? displayWeight(b.weight, units) : null,
          reps: b.reps,
          pr: b.pr,
        }))}
      />
    );
  } else if (kind === 'game') {
    const { data: g } = await supabase.from('games').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (!g) return new Response('Not found', { status: 404 });
    const shot = (m: number, a: number) => `${m}/${a}${a ? ` (${Math.round((m / a) * 100)}%)` : ''}`;
    const line = [
      { label: 'Field goals', value: shot(g.fgm2 + g.fgm3, g.fga2 + g.fga3) },
      { label: 'Three-pointers', value: shot(g.fgm3, g.fga3) },
      { label: 'Free throws', value: shot(g.ftm, g.fta) },
      { label: 'Steals · Blocks', value: `${g.stl} · ${g.blk}` },
    ];
    if (g.minutes != null) line.push({ label: 'Minutes', value: `${g.minutes}` });
    body = (
      <GameCard
        date={g.game_date}
        opponent={g.opponent}
        result={g.result}
        score={g.team_score != null && g.opponent_score != null ? `${g.team_score}-${g.opponent_score}` : null}
        points={g.points}
        rebounds={g.oreb + g.dreb}
        assists={g.ast}
        line={line}
      />
    );
  } else if (kind === 'rank') {
    const a = await loadAchievements(user.id);
    body = (
      <RankCard
        rank={a.level.tier}
        level={a.level.level}
        xp={a.xp}
        streak={a.stats.currentStreak}
        sessions={a.stats.totalSessions + a.stats.totalWorkouts}
        badges={a.badges.filter((b) => b.earned).length}
        makes={a.stats.totalMakes}
      />
    );
  } else {
    return new Response('Unknown card', { status: 404 });
  }

  return new ImageResponse(<Frame icon={icon} name={name}>{body}</Frame>, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
