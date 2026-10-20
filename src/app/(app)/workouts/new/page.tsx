// src/app/(app)/workouts/new/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ExercisePicker } from '@/components/workouts/ExercisePicker';
import { localDateString } from '@/lib/dates';
import {
  SET_MODE_UNIT,
  WORKOUT_TYPES,
  categoryForMuscle,
  defaultSetMode,
  formatAmount,
  isAmountRecord,
  isPersonalRecord,
  muscleLabel,
  setAmount,
  setModeOf,
  type LibraryExercise,
  type SetMode,
} from '@/lib/exercises';
import {
  asMeasurementSystem,
  displayWeight,
  inputWeightToKg,
  weightUnitLabel,
  type MeasurementSystem,
} from '@/lib/units';
import { workoutSchema } from '@/lib/validation';
import {
  enqueue,
  getUserIdForSave,
  isNetworkError,
  isOffline,
  newId,
  saveWorkout as saveWorkoutRecord,
  type WorkoutSavePayload,
} from '@/lib/offline';
import { SavedOfflineCard } from '@/components/SavedOfflineCard';
import { ArrowLeft, Check, Plus, Trash2, Timer, Trophy, X } from 'lucide-react';

interface HistorySet {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
}

interface LoggedSet {
  weight: string; // in the player's unit
  reps: string; // reps, seconds or metres, by the exercise's mode
  done: boolean;
  isPR: boolean;
}

interface LoggedExercise {
  key: string;
  exerciseId: string | null;
  name: string;
  primaryMuscle: string | null;
  /** Reps, time or distance. Missing on workouts saved before it existed. */
  mode?: SetMode;
  previous: HistorySet[]; // sets from the last workout with this exercise
  history: HistorySet[]; // all earlier sets (for PR detection)
  sets: LoggedSet[];
}

interface Draft {
  startedAt: number;
  workoutDate: string;
  workoutType: string;
  exercises: LoggedExercise[];
}

const DRAFT_KEY = 'hoopiq-workout-draft-v1';
const REST_KEY = 'hoopiq-rest-seconds';
const LIBRARY_CACHE_KEY = 'hoopiq-exercise-cache-v1';


function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnits] = useState<MeasurementSystem>('imperial');
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentNames, setRecentNames] = useState<string[]>([]);

  const [draft, setDraft] = useState<Draft>(() => ({
    startedAt: Date.now(),
    workoutDate: localDateString(),
    workoutType: 'strength',
    exercises: [],
  }));

  // A routine or plan opened while an unfinished workout was still saved: held
  // back until the player says which one they want
  const [waiting, setWaiting] = useState<LoggedExercise[] | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  // Finish panel
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [saveAsRoutine, setSaveAsRoutine] = useState(false);
  const [routineName, setRoutineName] = useState('');

  // Rest timer
  const [restSeconds, setRestSeconds] = useState(90);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  /**
   * Shows a validation message and scrolls it into view.
   *
   * Errors render in one slot above the exercise list, and ticking a set off
   * happens down in that list. A bad rep count further down the page set the
   * message somewhere the player could not see, so the tick just failed
   * silently. The finish panel renders its own copy, so leave the page be when
   * it is open.
   */
  function fail(message: string) {
    setError(message);
    if (!finishOpen) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const getSupabase = () => (supabaseRef.current ??= createClient());

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  const loadExerciseHistory = useCallback(async (uid: string, name: string) => {
    const { data } = await getSupabase()
      .from('workout_sets')
      .select('workout_id, weight_kg, reps, duration_seconds, distance_meters, set_number, created_at')
      .eq('user_id', uid)
      .eq('exercise_name', name)
      .order('created_at', { ascending: false })
      .limit(200);
    const rows = (data || []) as Array<HistorySet & { workout_id: string; set_number: number }>;
    const lastWorkoutId = rows[0]?.workout_id;
    const previous = rows
      .filter((r) => r.workout_id === lastWorkoutId)
      .sort((a, b) => a.set_number - b.set_number)
      .map(({ weight_kg, reps, duration_seconds, distance_meters }) => ({ weight_kg, reps, duration_seconds, distance_meters }));
    return {
      previous,
      history: rows.map(({ weight_kg, reps, duration_seconds, distance_meters }) => ({ weight_kg, reps, duration_seconds, distance_meters })),
    };
  }, []);

  const buildExercise = useCallback(
    async (uid: string, exercise: { id: string | null; name: string; primary_muscle: string | null }, targetSets?: number) => {
      const { previous, history } = await loadExerciseHistory(uid, exercise.name);
      const count = Math.max(1, targetSets || previous.length || 3);
      return {
        key: `${exercise.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        exerciseId: exercise.id,
        name: exercise.name,
        primaryMuscle: exercise.primary_muscle,
        // Measured the way it was last time, so a player who logs a plank in
        // reps, or switches an exercise to time, keeps their choice
        mode: previous[0] ? setModeOf(previous[0]) : defaultSetMode(exercise.name),
        previous,
        history,
        sets: Array.from({ length: count }, () => ({ weight: '', reps: '', done: false, isPR: false })),
      } as LoggedExercise;
    },
    [loadExerciseHistory]
  );

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const uid = await getUserIdForSave(supabase);
      if (!uid) {
        router.push('/login');
        return;
      }
      const user = { id: uid };
      setUserId(uid);

      try {
        const stored = Number(localStorage.getItem(REST_KEY));
        if (stored >= 15 && stored <= 600) setRestSeconds(stored);
      } catch {
        // storage unavailable: keep default
      }

      const results = await Promise.all([
        supabase.from('profiles').select('measurement_system').eq('id', user.id).maybeSingle(),
        supabase
          .from('exercise_library')
          .select('id, name, primary_muscle, equipment, description, cues, is_basketball_specific, is_system')
          .order('name'),
        supabase.from('exercise_favorites').select('exercise_id'),
        supabase
          .from('workout_sets')
          .select('exercise_name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(300),
      ]);

      // Keep a copy on the phone so the logger still works with no signal
      let [{ data: profile }, { data: lib }, { data: favs }, { data: recent }] = results;
      if (results.some((r) => r.error && isNetworkError(r.error.message))) {
        try {
          const cached = JSON.parse(localStorage.getItem(LIBRARY_CACHE_KEY) || 'null');
          if (cached?.userId === user.id) ({ profile, lib, favs, recent } = cached);
        } catch {
          // no usable copy
        }
      } else if (lib?.length) {
        try {
          localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify({ userId: user.id, profile, lib, favs, recent }));
        } catch {
          // storage full: the logger still works online
        }
      }

      setUnits(asMeasurementSystem(profile?.measurement_system));
      setLibrary((lib || []) as LibraryExercise[]);
      setFavoriteIds(new Set((favs || []).map((f: { exercise_id: string }) => f.exercise_id)));
      const seen = new Set<string>();
      const names: string[] = [];
      for (const r of (recent || []) as Array<{ exercise_name: string }>) {
        const key = r.exercise_name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          names.push(r.exercise_name);
        }
        if (names.length >= 20) break;
      }
      setRecentNames(names);

      // Resume an unfinished workout, or start from a routine
      const saved = readDraft();
      const params = new URLSearchParams(window.location.search);
      const routineId = params.get('routine');
      // ?exercises=Name~sets|Name~sets (program day / workout generator)
      const exerciseParam = params.get('exercises');
      let requested: LoggedExercise[] | null = null;
      if (exerciseParam) {
        const byName = new Map(((lib || []) as LibraryExercise[]).map((e) => [e.name.toLowerCase(), e]));
        const wanted = exerciseParam
          .split('|')
          .slice(0, 20)
          .map((part) => {
            const [name, sets] = part.split('~');
            return { name: name.trim(), sets: Math.min(10, Math.max(1, Number(sets) || 3)) };
          })
          .filter((w) => w.name);
        requested = await Promise.all(
          wanted.map((w) => {
            const match = byName.get(w.name.toLowerCase());
            return buildExercise(
              user.id,
              { id: match?.id || null, name: match?.name || w.name, primary_muscle: match?.primary_muscle || null },
              w.sets
            );
          })
        );
      } else if (routineId) {
        const { data: routineRows } = await supabase
          .from('routine_exercises')
          .select('exercise_id, exercise_name, target_sets, display_order')
          .eq('routine_id', routineId)
          .order('display_order');
        const byId = new Map(((lib || []) as LibraryExercise[]).map((e) => [e.id, e]));
        requested = await Promise.all(
          ((routineRows || []) as Array<{ exercise_id: string | null; exercise_name: string; target_sets: number }>).map((r) =>
            buildExercise(
              user.id,
              {
                id: r.exercise_id,
                name: r.exercise_name,
                primary_muscle: (r.exercise_id && byId.get(r.exercise_id)?.primary_muscle) || null,
              },
              r.target_sets
            )
          )
        );
      }
      if (saved && saved.exercises.length > 0) {
        setDraft(saved);
        // The unfinished workout used to win without a word, so opening a
        // program day showed yesterday's exercises instead of today's
        if (requested && requested.length > 0) setWaiting(requested);
      } else if (requested) {
        const exercises = requested;
        setDraft((d) => ({ ...d, startedAt: Date.now(), exercises }));
      }
      setReady(true);
    })();
  }, [router, buildExercise]);

  // Autosave the workout on this device so nothing is lost if the app closes
  useEffect(() => {
    if (!ready) return;
    try {
      if (draft.exercises.length > 0) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // storage unavailable: logging still works, just without autosave
    }
  }, [draft, ready]);

  // Keep the screen awake while logging
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, []);

  // Rest timer tick
  useEffect(() => {
    if (!restEndsAt) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= restEndsAt) {
        navigator.vibrate?.([200, 100, 200]);
        setRestEndsAt(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Editing
  // ---------------------------------------------------------------------------
  function updateExercise(key: string, change: (e: LoggedExercise) => LoggedExercise) {
    setDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? change(e) : e)) }));
  }

  function updateSet(key: string, index: number, change: Partial<LoggedSet>) {
    updateExercise(key, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === index ? { ...s, ...change } : s)) }));
  }

  function previousFor(e: LoggedExercise, index: number): HistorySet | undefined {
    const mode = e.mode ?? 'reps';
    // Last time's numbers only help when they were measured the same way
    const same = e.previous.filter((p) => setModeOf(p) === mode);
    return same[index] ?? same[same.length - 1];
  }

  function setMode(e: LoggedExercise, mode: SetMode) {
    if ((e.mode ?? 'reps') === mode) return;
    // Numbers typed for reps mean nothing as seconds, so the sets start again
    updateExercise(e.key, (x) => ({ ...x, mode, sets: x.sets.map((s) => ({ ...s, reps: '', done: false, isPR: false })) }));
  }

  function toggleSetDone(e: LoggedExercise, index: number) {
    const set = e.sets[index];
    if (set.done) {
      updateSet(e.key, index, { done: false, isPR: false });
      return;
    }
    // Empty inputs repeat last time's numbers (one tap for a repeated set)
    const mode = e.mode ?? 'reps';
    const prev = previousFor(e, index);
    const prevAmount = prev ? setAmount(prev, mode) : null;
    const weightText = set.weight || (prev?.weight_kg ? String(displayWeight(prev.weight_kg, units)) : '');
    const repsText = set.reps || (prevAmount ? String(prevAmount) : '');
    const reps = Number(repsText);
    const weight = weightText === '' ? null : Number(weightText);

    if (mode === 'reps' && (!Number.isInteger(reps) || reps < 1 || reps > 500)) {
      fail(`${e.name}: enter the reps for set ${index + 1} (a whole number).`);
      return;
    }
    if (mode === 'time' && (!Number.isInteger(reps) || reps < 1 || reps > 3600)) {
      fail(`${e.name}: enter the seconds for set ${index + 1} (a whole number, up to 3600).`);
      return;
    }
    if (mode === 'distance' && (!Number.isFinite(reps) || reps <= 0 || reps > 10000)) {
      fail(`${e.name}: enter the metres for set ${index + 1}.`);
      return;
    }
    if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 2000)) {
      fail(`${e.name}: weight for set ${index + 1} must be a positive number.`);
      return;
    }
    setError(null);

    const weightKg = weight === null ? null : inputWeightToKg(weight, units);
    // Only compared with earlier sets measured the same way
    const earlier = e.history.filter((h) => setModeOf(h) === mode);
    const pr =
      mode === 'reps'
        ? isPersonalRecord(weightKg, reps, earlier)
        : isAmountRecord(
            weightKg,
            reps,
            earlier.map((h) => ({ weight_kg: h.weight_kg, amount: setAmount(h, mode) ?? 0 }))
          );
    updateSet(e.key, index, { weight: weightText, reps: repsText, done: true, isPR: pr });
    if (pr) {
      setToast(
        `New PR! ${e.name}: ${weight !== null ? `${weight} ${weightUnitLabel(units)} × ` : ''}${
          mode === 'reps' ? `${reps} reps` : formatAmount(reps, mode)
        }`
      );
    }
    setRestEndsAt(Date.now() + restSeconds * 1000);
    setNow(Date.now());
  }

  function addSet(e: LoggedExercise) {
    const last = e.sets[e.sets.length - 1];
    updateExercise(e.key, (x) => ({
      ...x,
      sets: [...x.sets, { weight: last?.weight || '', reps: last?.reps || '', done: false, isPR: false }],
    }));
  }

  async function pickExercise(exercise: LibraryExercise) {
    setPickerOpen(false);
    if (!userId) return;
    const built = await buildExercise(userId, exercise);
    setDraft((d) => ({ ...d, exercises: [...d.exercises, built] }));
  }

  async function toggleFavorite(exercise: LibraryExercise) {
    if (!userId) return;
    const supabase = getSupabase();
    const isFav = favoriteIds.has(exercise.id);
    const next = new Set(favoriteIds);
    if (isFav) next.delete(exercise.id);
    else next.add(exercise.id);
    setFavoriteIds(next);
    const { error: favError } = isFav
      ? await supabase.from('exercise_favorites').delete().eq('exercise_id', exercise.id).eq('user_id', userId)
      : await supabase.from('exercise_favorites').insert({ user_id: userId, exercise_id: exercise.id });
    if (favError) {
      setFavoriteIds(favoriteIds); // roll back
      setError('Could not update favorites.');
    }
  }

  async function createCustomExercise(name: string, primaryMuscle: string) {
    const { data, error: createError } = await getSupabase()
      .from('exercise_library')
      .insert({
        user_id: userId,
        name,
        category: categoryForMuscle(primaryMuscle),
        primary_muscle: primaryMuscle,
        is_system: false,
      })
      .select('id, name, primary_muscle, equipment, description, cues, is_basketball_specific, is_system')
      .single();
    if (createError || !data) {
      setError(`Could not create exercise: ${createError?.message || 'unknown error'}`);
      return;
    }
    setLibrary((l) => [...l, data as LibraryExercise].sort((a, b) => a.name.localeCompare(b.name)));
    await pickExercise(data as LibraryExercise);
  }

  function chooseWorkout(startNew: boolean) {
    if (!waiting) return;
    const ticked = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    if (startNew && ticked > 0 && !window.confirm(`Start the new workout? The ${ticked} sets you ticked in the unfinished one will be lost.`)) return;
    if (startNew) setDraft({ startedAt: Date.now(), workoutDate: localDateString(), workoutType: 'strength', exercises: waiting });
    setWaiting(null);
    // Otherwise a reload would ask again
    window.history.replaceState(null, '', '/workouts/new');
  }

  function discardWorkout() {
    if (!window.confirm('Discard this workout? Logged sets will be lost.')) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    router.push('/workouts');
  }

  function openFinish() {
    const completed = draft.exercises.some((e) => e.sets.some((s) => s.done));
    if (!completed) {
      fail('Tick ✓ on at least one set before finishing.');
      return;
    }
    setError(null);
    const elapsed = Math.round((Date.now() - draft.startedAt) / 60000);
    setDurationMinutes(Math.min(240, Math.max(5, elapsed)));
    setFinishOpen(true);
  }

  async function saveWorkout() {
    const parsed = workoutSchema.safeParse({
      workoutDate: draft.workoutDate,
      workoutType: draft.workoutType,
      durationMinutes: Number(durationMinutes),
      rpe: Number(rpe),
      notes: notes || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    if (!userId) {
      setError('You are offline and not logged in on this phone. Your workout is kept here; save it once you are back online.');
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = getSupabase();

    const payload: WorkoutSavePayload = {
      id: newId(),
      workout: {
        workout_date: draft.workoutDate,
        // draft.workoutType only ever comes from the fixed WORKOUT_TYPES dropdown,
        // whose values are the DB's enum values.
        workout_type: draft.workoutType as WorkoutSavePayload['workout']['workout_type'],
        duration_minutes: Number(durationMinutes),
        rpe: Number(rpe),
        notes: notes || null,
      },
      sets: draft.exercises.flatMap((e) =>
        e.sets
          .filter((s) => s.done)
          .map((s, i) => ({
            exercise_id: e.exerciseId,
            exercise_name: e.name,
            exercise_category: e.primaryMuscle,
            set_number: i + 1,
            reps: (e.mode ?? 'reps') === 'reps' ? Number(s.reps) : null,
            duration_seconds: e.mode === 'time' ? Number(s.reps) : null,
            distance_meters: e.mode === 'distance' ? Number(s.reps) : null,
            weight_kg: s.weight === '' ? null : inputWeightToKg(Number(s.weight), units),
            is_personal_record: s.isPR,
          }))
      ),
      routine:
        saveAsRoutine && routineName.trim()
          ? {
              name: routineName.trim().slice(0, 60),
              exercises: draft.exercises.map((e, i) => ({
                exercise_id: e.exerciseId,
                exercise_name: e.name,
                target_sets: Math.min(20, Math.max(1, e.sets.filter((s) => s.done).length || e.sets.length)),
                display_order: i,
              })),
            }
          : null,
    };

    const result = isOffline() ? { network: true, error: 'offline' } : await saveWorkoutRecord(supabase, userId, payload);
    if (result.error && !result.network) {
      setError(`${result.error}. Nothing was saved, please try again.`);
      setSaving(false);
      return;
    }
    if (result.network) {
      enqueue({
        id: payload.id,
        kind: 'workout',
        userId,
        label: `${draft.workoutType.replace(/_/g, ' ')} workout · ${payload.sets.length} sets`,
        createdAt: Date.now(),
        payload,
      });
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    if (result.network) {
      setSaving(false);
      setFinishOpen(false);
      setSavedOffline(true);
      return;
    }
    router.push(`/workouts/${payload.id}`);
    router.refresh();
  }

  function startAnother() {
    setDraft({ startedAt: Date.now(), workoutDate: localDateString(), workoutType: 'strength', exercises: [] });
    setNotes('');
    setSaveAsRoutine(false);
    setRoutineName('');
    setSavedOffline(false);
  }

  function adjustRest(delta: number) {
    const next = Math.min(600, Math.max(15, restSeconds + delta));
    setRestSeconds(next);
    try {
      localStorage.setItem(REST_KEY, String(next));
    } catch {
      // ignore
    }
    if (restEndsAt) setRestEndsAt(restEndsAt + delta * 1000);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (savedOffline) {
    return <SavedOfflineCard what="workout" backHref="/workouts" onAnother={startAnother} />;
  }

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unit = weightUnitLabel(units);
  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const restRemaining = restEndsAt ? (restEndsAt - now) / 1000 : 0;

  return (
    <div className="flex-1 overflow-auto pb-28">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/workouts" aria-label="Back to workouts" className="h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-800 text-zinc-400">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black text-white">Log Workout</h1>
            <p className="text-xs text-zinc-500">{doneSets} sets done</p>
          </div>
          <Button variant="primary" size="sm" onClick={openFinish}>
            Finish
          </Button>
        </div>

        {waiting && (
          <div role="status" className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-200">You have an unfinished workout</p>
            <p className="mt-1 text-xs text-zinc-400">
              Below is the workout you started earlier, with {doneSets} {doneSets === 1 ? 'set' : 'sets'} done. Carry on with it, or start
              the one you just opened ({waiting.length} {waiting.length === 1 ? 'exercise' : 'exercises'}).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => chooseWorkout(false)}>
                Keep this one
              </Button>
              <Button variant="primary" size="sm" onClick={() => chooseWorkout(true)}>
                Start the new one
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <input
            type="date"
            value={draft.workoutDate}
            onChange={(e) => setDraft((d) => ({ ...d, workoutDate: e.target.value }))}
            aria-label="Workout date"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <select
            value={draft.workoutType}
            onChange={(e) => setDraft((d) => ({ ...d, workoutType: e.target.value }))}
            aria-label="Workout type"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          >
            {WORKOUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Always mounted so fail() can scroll here before the Alert renders */}
        <div ref={errorRef}>
          {error && (
            <Alert variant="error" title="Check this" className="mb-4">
              {error}
            </Alert>
          )}
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {draft.exercises.map((e) => (
            <div key={e.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-white">{e.name}</h3>
                  <p className="text-xs text-zinc-500">{muscleLabel(e.primaryMuscle)}</p>
                  <div role="group" aria-label={`How ${e.name} is measured`} className="mt-1.5 inline-flex rounded-lg bg-zinc-800/70 p-0.5">
                    {(['reps', 'time', 'distance'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(e, m)}
                        aria-pressed={(e.mode ?? 'reps') === m}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                          (e.mode ?? 'reps') === m ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((x) => x.key !== e.key) }))}
                  aria-label={`Remove ${e.name}`}
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-[2rem_1fr_4.5rem_4rem_2.75rem] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase text-zinc-500">
                <span>Set</span>
                <span>Previous</span>
                <span className="text-center">{unit}</span>
                <span className="text-center capitalize">{SET_MODE_UNIT[e.mode ?? 'reps']}</span>
                <span />
              </div>

              {e.sets.map((s, i) => {
                const mode = e.mode ?? 'reps';
                const prev = previousFor(e, i);
                const prevAmount = prev ? setAmount(prev, mode) : null;
                const prevText = prev
                  ? `${prev.weight_kg ? `${displayWeight(prev.weight_kg, units)}×` : ''}${formatAmount(prevAmount, mode)}`
                  : '—';
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[2rem_1fr_4.5rem_4rem_2.75rem] items-center gap-2 rounded-lg px-1 py-1 ${
                      s.done ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <span className="text-sm font-bold text-zinc-400 flex items-center gap-0.5">
                      {i + 1}
                      {s.isPR && <Trophy className="h-3 w-3 text-amber-400" aria-label="Personal record" />}
                    </span>
                    <span className="text-xs text-zinc-500 truncate">{prevText}</span>
                    <input
                      inputMode="decimal"
                      value={s.weight}
                      placeholder={prev?.weight_kg ? String(displayWeight(prev.weight_kg, units)) : '—'}
                      onChange={(ev) => updateSet(e.key, i, { weight: ev.target.value, done: false, isPR: false })}
                      aria-label={`${e.name} set ${i + 1} weight in ${unit}`}
                      className="w-full rounded-lg bg-zinc-800 px-2 py-2 text-center text-sm text-white placeholder:text-zinc-600"
                    />
                    <input
                      inputMode={mode === 'distance' ? 'decimal' : 'numeric'}
                      value={s.reps}
                      placeholder={prevAmount ? String(prevAmount) : '0'}
                      onChange={(ev) => updateSet(e.key, i, { reps: ev.target.value, done: false, isPR: false })}
                      aria-label={`${e.name} set ${i + 1} ${mode === 'time' ? 'seconds' : mode === 'distance' ? 'metres' : 'reps'}`}
                      className="w-full rounded-lg bg-zinc-800 px-2 py-2 text-center text-sm text-white placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSetDone(e, i)}
                      aria-label={s.done ? `Undo set ${i + 1}` : `Complete set ${i + 1}`}
                      aria-pressed={s.done}
                      className={`h-9 w-full flex items-center justify-center rounded-lg ${
                        s.done ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addSet(e)}
                  className="flex-1 rounded-lg bg-zinc-800/70 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  + Add set
                </button>
                {e.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateExercise(e.key, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}
                    className="rounded-lg bg-zinc-800/70 px-3 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
                  >
                    − Remove set
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-600/50 py-4 font-semibold text-emerald-400 hover:bg-emerald-500/5"
        >
          <Plus className="h-5 w-5" /> Add exercise
        </button>

        {draft.exercises.length > 0 && (
          <button type="button" onClick={discardWorkout} className="mt-6 w-full text-center text-xs text-zinc-500 hover:text-red-400">
            Discard workout
          </button>
        )}
      </div>

      {/* Rest timer bar */}
      {restEndsAt && restRemaining > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-600/40 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Timer className="h-5 w-5" />
              <span className="text-2xl font-black tabular-nums">{formatClock(restRemaining)}</span>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => adjustRest(-15)} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200">
                −15s
              </button>
              <button type="button" onClick={() => adjustRest(15)} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200">
                +15s
              </button>
              <button type="button" onClick={() => setRestEndsAt(null)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
                Skip
              </button>
            </div>
          </div>
          <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (restRemaining / restSeconds) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* PR toast */}
      {toast && (
        <div role="status" className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 shadow-2xl flex items-center gap-2">
          <Trophy className="h-4 w-4" /> {toast}
        </div>
      )}

      {pickerOpen && (
        <ExercisePicker
          library={library}
          favoriteIds={favoriteIds}
          recentNames={recentNames}
          onToggleFavorite={toggleFavorite}
          onPick={pickExercise}
          onCreateCustom={createCustomExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Finish panel */}
      {finishOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4">
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Finish workout</h2>
              <button type="button" onClick={() => setFinishOpen(false)} aria-label="Close" className="text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <Alert variant="error" title="Check this">{error}</Alert>}
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-400">Duration (minutes)</span>
              <input
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-400">How hard was it? RPE {rpe}/10</span>
              <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="mt-2 w-full accent-emerald-500" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-400">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full h-16 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={saveAsRoutine} onChange={(e) => setSaveAsRoutine(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
              Save these exercises as a routine
            </label>
            {saveAsRoutine && (
              <input
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="Routine name, e.g. Leg Day"
                maxLength={60}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
              />
            )}
            <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={saveWorkout}>
              Save workout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
