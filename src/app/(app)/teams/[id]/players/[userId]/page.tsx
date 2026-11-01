// src/app/(app)/teams/[id]/players/[userId]/page.tsx
// Coach view of one player. The database only returns it when the player chose to share
// details with this team's coaches (coach_player_detail, migration 00024). Never notes or videos.
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ZONE_LABELS } from '@/lib/court';
import { asMeasurementSystem, formatHeight } from '@/lib/units';
import { seasonAverages, type BoxScore } from '@/lib/games';
import { ArrowLeft, Lock, Target, Dumbbell, Trophy, Timer, CheckCircle2, Circle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Player details - Deadeye' };

interface Detail {
  profile: { display_name: string; position: string | null; height_cm: number | null; dominant_hand: string | null; playing_level: string | null };
  sessions: Array<{ session_date: string; session_type: string; duration_minutes: number; intensity_rpe: number; makes: number; attempts: number }>;
  zones: Array<{ shot_zone: string; makes: number; attempts: number }>;
  workouts: Array<{ workout_date: string; workout_type: string; duration_minutes: number; rpe: number; sets: number; prs: number }>;
  tests: Array<{ test_type: string; custom_test_name: string | null; value: number; unit: string; test_date: string }>;
  games: Array<BoxScore & { game_date: string; opponent: string | null; result: string | null; minutes: number | null; points: number }>;
  assignments: Array<{ title: string; due_date: string | null; done: boolean }>;
}

const pct = (m: number, a: number) => (a > 0 ? `${Math.round((m / a) * 100)}%` : '–');
const short = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
const label = (s: string) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default async function CoachPlayerPage({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  await requireUser();
  const [supabase, me] = await Promise.all([createClient(), getCurrentProfile()]);
  const [{ data }, { data: team }] = await Promise.all([
    supabase.rpc('coach_player_detail', { p_team: id, p_user: userId }),
    supabase.from('teams').select('name').eq('id', id).maybeSingle(),
  ]);
  const d = data as Detail | null;
  const units = asMeasurementSystem(me?.measurement_system);

  if (!d) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-xl mx-auto space-y-4">
        <Link href={`/teams/${id}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> {team?.name || 'Team'}
        </Link>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
          <Lock className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
          <p className="font-semibold text-white">Not shared</p>
          <p className="text-sm text-zinc-400">This player hasn&apos;t chosen to share their training details with this team&apos;s coaches.</p>
        </div>
      </div>
    );
  }

  const makes = d.sessions.reduce((n, s) => n + s.makes, 0);
  const attempts = d.sessions.reduce((n, s) => n + s.attempts, 0);
  const minutes = d.sessions.reduce((n, s) => n + s.duration_minutes, 0) + d.workouts.reduce((n, w) => n + w.duration_minutes, 0);
  const days = new Set([...d.sessions.map((s) => s.session_date), ...d.workouts.map((w) => w.workout_date)]).size;
  const g = seasonAverages(d.games);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
        <Link href={`/teams/${id}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> {team?.name || 'Team'}
        </Link>
        <div>
          <h1 className="text-3xl font-black text-white">{d.profile.display_name}</h1>
          <p className="text-sm text-zinc-400">
            {[d.profile.position, formatHeight(d.profile.height_cm, units), d.profile.dominant_hand && `${d.profile.dominant_hand}-handed`, d.profile.playing_level && label(d.profile.playing_level)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { v: `${days}`, l: 'training days (4 wk)' },
            { v: `${minutes}`, l: 'minutes (4 wk)' },
            { v: attempts ? `${makes}/${attempts}` : '–', l: `shots · ${pct(makes, attempts)}` },
            { v: g.games ? `${g.ppg}` : '–', l: `PPG · ${g.games} games` },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="text-xl font-black text-white">{s.v}</div>
              <div className="text-xs text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>

        {d.zones.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-white">
              <Target className="h-4 w-4 text-orange-400" /> Shooting zones (30 days)
            </h2>
            <div className="space-y-2">
              {d.zones.map((z) => (
                <div key={z.shot_zone}>
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span>{ZONE_LABELS[z.shot_zone as keyof typeof ZONE_LABELS] || label(z.shot_zone)}</span>
                    <span>
                      {z.makes}/{z.attempts} · {pct(z.makes, z.attempts)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-zinc-800">
                    <div className="h-2 rounded-full bg-orange-500" style={{ width: `${z.attempts ? Math.max(3, (z.makes / z.attempts) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {d.games.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-2 flex items-center gap-2 font-bold text-white">
              <Trophy className="h-4 w-4 text-amber-400" /> Games
            </h2>
            <p className="mb-2 text-sm text-zinc-400">
              {g.ppg} pts · {g.rpg} reb · {g.apg} ast · FG {g.fgPct ?? '–'}% · 3P {g.threePct ?? '–'}% · FT {g.ftPct ?? '–'}% · TO {g.topg}
            </p>
            <ul className="divide-y divide-zinc-800 text-sm">
              {d.games.map((gm, i) => (
                <li key={`${gm.game_date}-${i}`} className="flex justify-between py-1.5">
                  <span className="text-zinc-300">
                    {short(gm.game_date)} {gm.opponent ? `vs ${gm.opponent}` : ''} {gm.result ? `(${gm.result[0].toUpperCase()})` : ''}
                  </span>
                  <span className="font-semibold text-white">
                    {gm.points} pts · {gm.oreb + gm.dreb} reb · {gm.ast} ast
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-2 flex items-center gap-2 font-bold text-white">
            <Timer className="h-4 w-4 text-cyan-400" /> Recent training (4 weeks)
          </h2>
          {d.sessions.length + d.workouts.length === 0 ? (
            <p className="text-sm text-zinc-500">No training logged in the last 4 weeks.</p>
          ) : (
            <ul className="divide-y divide-zinc-800 text-sm">
              {[
                ...d.sessions.map((s) => ({
                  date: s.session_date,
                  icon: <Target className="h-3.5 w-3.5 text-orange-400" />,
                  text: `${label(s.session_type)} · ${s.duration_minutes} min · effort ${s.intensity_rpe}/10${s.attempts ? ` · ${s.makes}/${s.attempts} (${pct(s.makes, s.attempts)})` : ''}`,
                })),
                ...d.workouts.map((w) => ({
                  date: w.workout_date,
                  icon: <Dumbbell className="h-3.5 w-3.5 text-emerald-400" />,
                  text: `${label(w.workout_type)} workout · ${w.duration_minutes} min · ${w.sets} sets${w.prs ? ` · ${w.prs} PR` : ''}`,
                })),
              ]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((row, i) => (
                  <li key={`${row.date}-${i}`} className="flex items-center gap-2 py-1.5">
                    <span className="w-14 text-xs text-zinc-500">{short(row.date)}</span>
                    {row.icon}
                    <span className="text-zinc-200">{row.text}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {d.tests.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-2 font-bold text-white">Athletic tests (latest)</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {d.tests.map((t, i) => (
                <li key={`${t.test_type}-${i}`} className="rounded-lg bg-zinc-950/60 p-2">
                  <div className="text-xs text-zinc-500">{t.custom_test_name || label(t.test_type)}</div>
                  <div className="font-semibold text-white">
                    {t.value} {t.unit}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {d.assignments.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-2 font-bold text-white">Team assignments</h2>
            <ul className="space-y-1 text-sm">
              {d.assignments.map((a, i) => (
                <li key={`${a.title}-${i}`} className="flex items-center gap-2">
                  {a.done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-zinc-500" />}
                  <span className={a.done ? 'text-zinc-400' : 'text-zinc-200'}>{a.title}</span>
                  {a.due_date && <span className="text-xs text-zinc-500">due {short(a.due_date)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
