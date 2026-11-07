// src/app/(app)/train/generate/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import {
  generateWorkout,
  COURT_FOCUS,
  type Focus,
  type GenDrill,
  type GenExercise,
  type Level,
  type Location,
} from '@/lib/generator';
import { ArrowLeft, Shuffle, Target, Dumbbell, Clock, Wand2 } from 'lucide-react';

const MINUTE_OPTIONS = [15, 30, 45, 60, 90];
const FOCUS_OPTIONS: Array<{ id: Focus; label: string }> = [
  { id: 'shooting', label: 'Shooting' },
  { id: 'ball_handling', label: 'Handles' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'footwork', label: 'Footwork' },
  { id: 'defense', label: 'Defense' },
  { id: 'conditioning', label: 'Conditioning' },
  { id: 'strength', label: 'Strength' },
  { id: 'athleticism', label: 'Explosiveness' },
];
const LOCATIONS: Array<{ id: Location; label: string }> = [
  { id: 'court_hoop', label: 'Court with a hoop' },
  { id: 'court_no_hoop', label: 'No hoop (driveway, home)' },
  { id: 'gym', label: 'Weights gym' },
];

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export default function WorkoutBuilderPage() {
  const [drills, setDrills] = useState<GenDrill[]>([]);
  const [exercises, setExercises] = useState<GenExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [minutes, setMinutes] = useState(45);
  const [focus, setFocus] = useState<Focus[]>(['shooting', 'ball_handling']);
  const [location, setLocation] = useState<Location>('court_hoop');
  const [level, setLevel] = useState<Level>('intermediate');
  const [withPartner, setWithPartner] = useState(false);
  const [seed, setSeed] = useState(daySeed());

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: d }, { data: e }, { data: profile }] = await Promise.all([
        supabase.from('drills').select('slug, name, skill, level, players, equipment, duration_minutes'),
        supabase.from('exercise_library').select('name, primary_muscle, equipment').eq('is_system', true),
        user ? supabase.from('profiles').select('playing_level').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setDrills((d || []) as GenDrill[]);
      setExercises((e || []) as GenExercise[]);
      const pl = profile?.playing_level;
      if (pl === 'beginner') setLevel('beginner');
      else if (pl === 'advanced' || pl === 'elite' || pl === 'college_pro') setLevel('advanced');
      setLoading(false);
    })();
  }, []);

  const workout = useMemo(
    () => (loading || focus.length === 0 ? null : generateWorkout(drills, exercises, { minutes, focus, location, level, withPartner, seed })),
    [drills, exercises, minutes, focus, location, level, withPartner, seed, loading]
  );

  function toggleFocus(f: Focus) {
    setFocus((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  const courtHref = workout?.drills.length ? `/basketball/new?drills=${workout.drills.map((d) => d.slug).join(',')}` : null;
  const gymHref = workout?.exercises.length
    ? `/workouts/new?exercises=${encodeURIComponent(workout.exercises.map((e) => `${e.name}~${e.sets}`).join('|'))}`
    : null;
  const courtOnlyFocus = location === 'gym' && focus.some((f) => COURT_FOCUS.includes(f));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href="/train" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Train
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-amber-400" /> Workout Builder
        </h1>
        <p className="text-sm text-zinc-400 mt-1 mb-6">Tell us your time and focus, get a workout built from the drill and exercise libraries.</p>

        <section className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-400 mb-2">Time</div>
            <div className="flex gap-2">
              {MINUTE_OPTIONS.map((m) => (
                <button key={m} type="button" onClick={() => setMinutes(m)} className={`flex-1 rounded-xl py-2 text-sm font-semibold ${minutes === m ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-zinc-400 mb-2">Focus (pick one or more)</div>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map((f) => (
                <button key={f.id} type="button" onClick={() => toggleFocus(f.id)} aria-pressed={focus.includes(f.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${focus.includes(f.id) ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-zinc-400 mb-2">Where</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LOCATIONS.map((l) => (
                <button key={l.id} type="button" onClick={() => setLocation(l.id)} className={`rounded-xl py-2 px-3 text-sm font-semibold ${location === l.id ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-zinc-300 flex items-center gap-2">
              Level
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-sm text-white">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="text-sm text-zinc-300 flex items-center gap-2">
              <input type="checkbox" checked={withPartner} onChange={(e) => setWithPartner(e.target.checked)} className="h-4 w-4 accent-orange-500" />
              I have a partner
            </label>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading libraries…</p>
          ) : !workout ? (
            <p className="text-sm text-zinc-500">Pick at least one focus.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-zinc-400" /> About {workout.totalMinutes} minutes
                </h2>
                <button type="button" onClick={() => setSeed((s) => s + 1)} className="flex items-center gap-1 text-xs font-semibold text-orange-400">
                  <Shuffle className="h-3.5 w-3.5" /> Shuffle
                </button>
              </div>
              <p className="text-sm text-zinc-400 mb-3">{workout.warmupMinutes} min warm-up: jog, skips, leg swings, lunges with a twist, form shots close to the rim.</p>
              {courtOnlyFocus && <p className="text-sm text-amber-400 mb-3">Court skills need a court, so this gym workout only includes gym exercises.</p>}

              {workout.drills.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {workout.drills.map((d) => (
                    <Link key={d.slug} href={`/drills/${d.slug}`} className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-950">
                      <span className="flex items-center gap-2 text-white">
                        <Target className="h-4 w-4 text-orange-400" /> {d.name}
                      </span>
                      <span className="text-xs text-zinc-500">{d.duration_minutes}m</span>
                    </Link>
                  ))}
                </div>
              )}

              {workout.exercises.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {workout.exercises.map((e) => (
                    <div key={e.name} className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-white">
                        <Dumbbell className="h-4 w-4 text-emerald-400" /> {e.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {e.sets} × {e.reps}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {workout.drills.length === 0 && workout.exercises.length === 0 && (
                <p className="text-sm text-zinc-500">Nothing fits these settings. Try a longer time or a different location.</p>
              )}

              <div className="mt-4 space-y-2">
                {courtHref && (
                  <Link href={courtHref} className="block">
                    <Button variant="primary" size="lg" className="w-full gap-2">
                      <Target className="h-4 w-4" /> Start court drills
                    </Button>
                  </Link>
                )}
                {gymHref && (
                  <Link href={gymHref} className="block">
                    <Button variant={courtHref ? 'secondary' : 'primary'} size="lg" className="w-full gap-2">
                      <Dumbbell className="h-4 w-4" /> Start gym work
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
