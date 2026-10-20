// src/app/(app)/workouts/exercise/page.tsx
// One exercise across every workout: best set, progress over time, and each
// time it was done. /workouts/exercise?name=Goblet%20Squat
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { fromDateColumn } from '@/lib/dates';
import { formatAmount, setAmount, setModeOf, setScore, type MeasuredSet, type SetMode } from '@/lib/exercises';
import { asMeasurementSystem, displayWeight, weightUnitLabel } from '@/lib/units';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Exercise History - Deadeye' };

interface SetRow extends MeasuredSet {
  id: string;
  workout_id: string;
  set_number: number;
  is_personal_record: boolean;
  created_at: string;
  workouts: { workout_date: string } | null;
}

/** What one set is worth on the progress chart: est. 1RM, reps, seconds or metres. */
function chartValue(s: MeasuredSet, mode: SetMode, weighted: boolean): number {
  if (mode !== 'reps') return setAmount(s, mode) ?? 0;
  return weighted ? (s.weight_kg && s.weight_kg > 0 ? setScore(Number(s.weight_kg), s.reps) : 0) : (s.reps ?? 0);
}

function shortDate(date: string): string {
  return fromDateColumn(date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export default async function ExerciseHistoryPage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const user = await requireUser();
  const name = ((await searchParams).name || '').trim().slice(0, 120);
  if (!name) notFound();
  const supabase = await createClient();
  const units = asMeasurementSystem((await getCurrentProfile())?.measurement_system);
  const unit = weightUnitLabel(units);

  const { data } = await supabase
    .from('workout_sets')
    .select('id, workout_id, set_number, reps, weight_kg, duration_seconds, distance_meters, is_personal_record, created_at, workouts(workout_date)')
    .eq('user_id', user.id)
    .eq('exercise_name', name)
    .order('created_at', { ascending: false })
    .limit(1000);
  const rows = (data || []) as unknown as SetRow[];

  // Measured the way it was last done; older sets measured another way are
  // listed but left off the chart and the best
  const mode: SetMode = rows[0] ? setModeOf(rows[0]) : 'reps';
  const measured = rows.filter((r) => setModeOf(r) === mode);
  const weighted = mode === 'reps' && measured.some((r) => r.weight_kg && Number(r.weight_kg) > 0);

  // Grouped by workout, newest first
  const workouts: Array<{ id: string; date: string; sets: SetRow[] }> = [];
  for (const r of rows) {
    const last = workouts[workouts.length - 1];
    if (last && last.id === r.workout_id) last.sets.push(r);
    else workouts.push({ id: r.workout_id, date: r.workouts?.workout_date ?? r.created_at.slice(0, 10), sets: [r] });
  }
  workouts.forEach((w) => w.sets.sort((a, b) => a.set_number - b.set_number));

  const best = measured.reduce<SetRow | null>(
    (top, r) => (!top || chartValue(r, mode, weighted) > chartValue(top, mode, weighted) ? r : top),
    null
  );
  const formatSet = (s: MeasuredSet) => {
    const m = setModeOf(s);
    const weight = s.weight_kg && Number(s.weight_kg) > 0 ? `${displayWeight(Number(s.weight_kg), units)} ${unit} × ` : '';
    return `${weight}${m === 'reps' ? `${s.reps ?? '—'}` : formatAmount(setAmount(s, m), m)}`;
  };

  // Progress: the best set of each of the last 20 workouts, oldest first
  const points = workouts
    .map((w) => {
      const values = w.sets.filter((s) => setModeOf(s) === mode).map((s) => chartValue(s, mode, weighted));
      return { date: w.date, value: values.length ? Math.max(...values) : 0 };
    })
    .filter((p) => p.value > 0)
    .slice(0, 20)
    .reverse();
  const shown = (v: number) =>
    mode === 'reps' && weighted ? `${Math.round(displayWeight(v, units))} ${unit}` : mode === 'reps' ? `${v} reps` : formatAmount(v, mode);
  const chartTitle =
    mode === 'time' ? 'Longest set' : mode === 'distance' ? 'Farthest set' : weighted ? 'Estimated one-rep max' : 'Most reps in a set';

  // Chart geometry: a 320 x 150 view box, values on one axis from a floor
  // just under the lowest point
  const W = 320;
  const H = 150;
  const pad = { left: 8, right: 8, top: 16, bottom: 22 };
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, max);
  const floor = Math.max(0, min - (max - min) * 0.25 - max * 0.05);
  const x = (i: number) => pad.left + (points.length === 1 ? (W - pad.left - pad.right) / 2 : (i / (points.length - 1)) * (W - pad.left - pad.right));
  const y = (v: number) => pad.top + (1 - (v - floor) / (max - floor || 1)) * (H - pad.top - pad.bottom);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const bestIndex = values.indexOf(max);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/workouts/exercises"
            aria-label="Back to the exercise library"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black text-white">{name}</h1>
            <p className="text-xs text-zinc-400">Your history</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
            <p className="text-sm text-zinc-300">You have not logged {name} yet.</p>
            <Link href="/workouts/new" className="mt-3 inline-block text-sm font-semibold text-emerald-400">
              Start a workout →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="text-[11px] text-zinc-400">Best set</div>
                <div className="mt-1 text-sm font-black text-white">{best ? formatSet(best) : '—'}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="text-[11px] text-zinc-400">Workouts</div>
                <div className="mt-1 text-sm font-black text-white tabular-nums">{workouts.length}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="text-[11px] text-zinc-400">Last done</div>
                <div className="mt-1 text-sm font-black text-white">{shortDate(workouts[0].date)}</div>
              </div>
            </div>

            {points.length >= 2 && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="text-sm font-bold text-white">{chartTitle}</h2>
                <p className="text-xs text-zinc-400">Best set of each workout, last {points.length}</p>
                <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${chartTitle} over your last ${points.length} workouts`}>
                  {[0, 0.5, 1].map((t) => {
                    const gy = pad.top + t * (H - pad.top - pad.bottom);
                    return <line key={t} x1={pad.left} x2={W - pad.right} y1={gy} y2={gy} stroke="currentColor" className="text-zinc-800" strokeWidth={1} />;
                  })}
                  <path d={path} fill="none" stroke="currentColor" className="text-emerald-400" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {points.map((p, i) => (
                    <g key={`${p.date}-${i}`}>
                      {/* A larger invisible target for hover and tap */}
                      <circle cx={x(i)} cy={y(p.value)} r={10} fill="transparent">
                        <title>{`${shortDate(p.date)}: ${shown(p.value)}`}</title>
                      </circle>
                      <circle
                        cx={x(i)}
                        cy={y(p.value)}
                        r={4}
                        className={i === bestIndex ? 'fill-emerald-300' : 'fill-zinc-900'}
                        stroke="currentColor"
                        strokeWidth={2}
                        style={{ color: '#34d399' }}
                        pointerEvents="none"
                      />
                    </g>
                  ))}
                  <text x={x(bestIndex)} y={y(max) - 8} textAnchor="middle" className="fill-zinc-200 text-[10px] font-semibold">
                    {shown(max)}
                  </text>
                  <text x={pad.left} y={H - 6} className="fill-zinc-500 text-[10px]">
                    {shortDate(points[0].date)}
                  </text>
                  <text x={W - pad.right} y={H - 6} textAnchor="end" className="fill-zinc-500 text-[10px]">
                    {shortDate(points[points.length - 1].date)}
                  </text>
                </svg>
              </section>
            )}

            <section>
              <h2 className="mb-2 text-lg font-bold text-white">Every time</h2>
              <div className="space-y-2">
                {workouts.map((w) => (
                  <Link
                    key={w.id}
                    href={`/workouts/${w.id}`}
                    className="block rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:border-zinc-700"
                  >
                    <div className="text-xs font-semibold text-zinc-400">
                      {fromDateColumn(w.date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {w.sets.map((s) => (
                        <span
                          key={s.id}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                            s.is_personal_record ? 'bg-amber-500/15 text-amber-200' : 'bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          {s.is_personal_record && <Trophy className="h-3 w-3" aria-label="Personal record" />}
                          {formatSet(s)}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
