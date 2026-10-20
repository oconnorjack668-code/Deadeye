// src/app/(app)/workouts/[id]/EditWorkout.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { SET_MODE_UNIT, WORKOUT_TYPES, recordFlags, setAmount, setModeOf, type SetMode } from '@/lib/exercises';
import { displayWeight, inputWeightToKg, weightUnitLabel, type MeasurementSystem } from '@/lib/units';
import { workoutSchema } from '@/lib/validation';
import type { WorkoutSavePayload } from '@/lib/offline';

export interface EditableSet {
  id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  is_personal_record: boolean;
  created_at: string;
}

interface Row {
  set: EditableSet;
  mode: SetMode;
  weight: string;
  amount: string;
  removed: boolean;
}

/**
 * Fix or remove a logged workout: its date, type, length and effort, and the
 * weight and reps (or seconds, or metres) of each set. Records are worked out
 * again for the sets that are kept, so a typo does not stay a PR.
 */
export function EditWorkout({
  userId,
  workout,
  sets,
  units,
}: {
  userId: string;
  workout: { id: string; workout_date: string; workout_type: string; duration_minutes: number; rpe: number; notes: string | null };
  sets: EditableSet[];
  units: MeasurementSystem;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => ({
    date: workout.workout_date,
    type: workout.workout_type,
    minutes: String(workout.duration_minutes),
    rpe: String(workout.rpe),
    notes: workout.notes || '',
    rows: sets.map((s) => {
      const mode = setModeOf(s);
      return {
        set: s,
        mode,
        weight: s.weight_kg === null ? '' : String(displayWeight(Number(s.weight_kg), units)),
        amount: String(setAmount(s, mode) ?? ''),
        removed: false,
      } as Row;
    }),
  });
  const [form, setForm] = useState(start);
  const unit = weightUnitLabel(units);

  function updateRow(id: string, change: Partial<Row>) {
    setForm((f) => ({ ...f, rows: f.rows.map((r) => (r.set.id === id ? { ...r, ...change } : r)) }));
  }

  async function remove() {
    if (!window.confirm('Delete this workout and all its sets? This cannot be undone.')) return;
    setBusy(true);
    const { error: deleteError } = await createClient().from('workouts').delete().eq('id', workout.id);
    if (deleteError) {
      setBusy(false);
      setError(`Could not delete: ${deleteError.message}`);
      return;
    }
    router.push('/workouts');
    router.refresh();
  }

  async function save() {
    setError(null);
    const parsed = workoutSchema.safeParse({
      workoutDate: form.date,
      workoutType: form.type,
      durationMinutes: Number(form.minutes),
      rpe: Number(form.rpe),
      notes: form.notes.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    const kept = form.rows.filter((r) => !r.removed);
    for (const r of kept) {
      const amount = Number(r.amount);
      const weight = r.weight === '' ? 0 : Number(r.weight);
      const okAmount =
        r.mode === 'distance'
          ? Number.isFinite(amount) && amount > 0 && amount <= 10000
          : Number.isInteger(amount) && amount >= 1 && amount <= (r.mode === 'time' ? 3600 : 500);
      if (!okAmount || !Number.isFinite(weight) || weight < 0 || weight > 2000) {
        setError(`${r.set.exercise_name}, set ${r.set.set_number}: check the numbers.`);
        return;
      }
    }

    setBusy(true);
    const supabase = createClient();
    const { error: workoutError } = await supabase
      .from('workouts')
      .update({
        workout_date: form.date,
        workout_type: form.type as WorkoutSavePayload['workout']['workout_type'],
        duration_minutes: Number(form.minutes),
        rpe: Number(form.rpe),
        notes: form.notes.trim() || null,
      })
      .eq('id', workout.id);
    if (workoutError) {
      setBusy(false);
      setError(`Could not save: ${workoutError.message}`);
      return;
    }

    const removed = form.rows.filter((r) => r.removed).map((r) => r.set.id);
    if (removed.length) {
      const { error: removeError } = await supabase.from('workout_sets').delete().in('id', removed);
      if (removeError) {
        setBusy(false);
        setError(`Could not remove sets: ${removeError.message}`);
        return;
      }
    }

    // The new numbers, then the records worked out again against everything
    // logged before this workout
    const next = kept.map((r) => {
      const amount = Number(r.amount);
      const original = r.set.weight_kg === null ? '' : String(displayWeight(Number(r.set.weight_kg), units));
      return {
        row: r,
        weight_kg: r.weight === '' ? null : r.weight === original ? r.set.weight_kg : inputWeightToKg(Number(r.weight), units),
        reps: r.mode === 'reps' ? amount : null,
        duration_seconds: r.mode === 'time' ? amount : null,
        distance_meters: r.mode === 'distance' ? amount : null,
      };
    });
    const firstLogged = sets.reduce((min, s) => (s.created_at < min ? s.created_at : min), sets[0]?.created_at ?? new Date().toISOString());
    const names = [...new Set(next.map((n) => n.row.set.exercise_name))];
    const earlierByName = new Map<string, Array<{ weight_kg: number | null; reps: number | null; duration_seconds: number | null; distance_meters: number | null }>>();
    await Promise.all(
      names.map(async (name) => {
        const { data } = await supabase
          .from('workout_sets')
          .select('weight_kg, reps, duration_seconds, distance_meters')
          .eq('user_id', userId)
          .eq('exercise_name', name)
          .neq('workout_id', workout.id)
          .lt('created_at', firstLogged)
          .limit(500);
        earlierByName.set(name, data || []);
      })
    );

    const updates: PromiseLike<{ error: { message: string } | null }>[] = [];
    for (const name of names) {
      const mine = next.filter((n) => n.row.set.exercise_name === name);
      const flags = recordFlags(mine, earlierByName.get(name) || []);
      mine.forEach((n, i) => {
        const change = {
          set_number: i + 1,
          weight_kg: n.weight_kg,
          reps: n.reps,
          duration_seconds: n.duration_seconds,
          distance_meters: n.distance_meters,
          is_personal_record: flags[i],
        };
        const s = n.row.set;
        const same =
          s.set_number === change.set_number &&
          s.weight_kg === change.weight_kg &&
          s.reps === change.reps &&
          s.duration_seconds === change.duration_seconds &&
          s.distance_meters === change.distance_meters &&
          s.is_personal_record === change.is_personal_record;
        if (!same) updates.push(supabase.from('workout_sets').update(change).eq('id', s.id));
      });
    }
    const failed = (await Promise.all(updates)).find((r) => r.error);
    setBusy(false);
    if (failed?.error) {
      setError(`Some sets could not be saved: ${failed.error.message}`);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        {error && <Alert variant="error">{error}</Alert>}
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setForm(start());
            setEditing(true);
          }}
        >
          <Pencil className="h-4 w-4" /> Edit workout
        </Button>
        <Button variant="ghost" className="gap-2 text-red-400 hover:text-red-300" onClick={() => void remove()} disabled={busy}>
          <Trash2 className="h-4 w-4" /> {busy ? 'Deleting…' : 'Delete workout'}
        </Button>
      </div>
    );
  }

  const groups: Array<{ name: string; rows: Row[] }> = [];
  for (const r of form.rows) {
    const last = groups[groups.length - 1];
    if (last && last.name === r.set.exercise_name) last.rows.push(r);
    else groups.push({ name: r.set.exercise_name, rows: [r] });
  }
  const field = 'w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-white';

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
      <h2 className="font-bold text-white">Edit workout</h2>
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-zinc-400">
          Date
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`mt-1 ${field}`} />
        </label>
        <label className="text-xs text-zinc-400">
          Type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`mt-1 ${field}`}>
            {WORKOUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Minutes
          <input inputMode="numeric" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} className={`mt-1 ${field}`} />
        </label>
        <label className="text-xs text-zinc-400">
          Effort (RPE 1-10)
          <input inputMode="numeric" value={form.rpe} onChange={(e) => setForm({ ...form, rpe: e.target.value })} className={`mt-1 ${field}`} />
        </label>
      </div>
      <label className="block text-xs text-zinc-400">
        Notes
        <textarea
          value={form.notes}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={`mt-1 h-16 ${field}`}
        />
      </label>

      {groups.map((g) => (
        <div key={g.name} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <h3 className="mb-2 text-sm font-bold text-white">{g.name}</h3>
          <div className="space-y-1.5">
            {g.rows.map((r) => (
              <div key={r.set.id} className={`grid grid-cols-[3rem_1fr_1fr_2.25rem] items-center gap-2 ${r.removed ? 'opacity-40' : ''}`}>
                <span className="text-xs text-zinc-500">Set {r.set.set_number}</span>
                <input
                  inputMode="decimal"
                  value={r.weight}
                  disabled={r.removed}
                  placeholder={unit}
                  onChange={(e) => updateRow(r.set.id, { weight: e.target.value })}
                  aria-label={`${g.name} set ${r.set.set_number} weight in ${unit}`}
                  className={`${field} text-center`}
                />
                <div className="relative">
                  <input
                    inputMode={r.mode === 'distance' ? 'decimal' : 'numeric'}
                    value={r.amount}
                    disabled={r.removed}
                    onChange={(e) => updateRow(r.set.id, { amount: e.target.value })}
                    aria-label={`${g.name} set ${r.set.set_number} ${SET_MODE_UNIT[r.mode]}`}
                    className={`${field} pr-9 text-center`}
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">{SET_MODE_UNIT[r.mode]}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateRow(r.set.id, { removed: !r.removed })}
                  aria-label={r.removed ? `Keep set ${r.set.set_number}` : `Remove set ${r.set.set_number}`}
                  aria-pressed={r.removed}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => void save()} isLoading={busy}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
