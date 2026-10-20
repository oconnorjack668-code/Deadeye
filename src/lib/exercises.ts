// src/lib/exercises.ts
// Muscle groups (exercise_library.primary_muscle) and set helpers for the gym logger.

import type { ExerciseCategory } from '@/lib/supabase/types';

export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', category: 'upper_body_push' },
  { id: 'back', label: 'Back', category: 'upper_body_pull' },
  { id: 'shoulders', label: 'Shoulders', category: 'upper_body_push' },
  { id: 'biceps', label: 'Biceps', category: 'upper_body_pull' },
  { id: 'triceps', label: 'Triceps', category: 'upper_body_push' },
  { id: 'forearms', label: 'Forearms & Grip', category: 'upper_body_pull' },
  { id: 'quads', label: 'Quads', category: 'legs' },
  { id: 'hamstrings', label: 'Hamstrings', category: 'legs' },
  { id: 'glutes', label: 'Glutes', category: 'legs' },
  { id: 'calves', label: 'Calves', category: 'legs' },
  { id: 'core', label: 'Core', category: 'core' },
  { id: 'full_body', label: 'Full Body', category: 'legs' },
  { id: 'plyometrics', label: 'Explosiveness & Plyos', category: 'plyometrics' },
  { id: 'mobility', label: 'Mobility', category: 'mobility' },
  { id: 'conditioning', label: 'Conditioning', category: 'conditioning' },
  { id: 'injury_prevention', label: 'Injury Prevention', category: 'recovery' },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id'];

export function muscleLabel(id: string | null | undefined): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.label || 'Other';
}

export function categoryForMuscle(id: string): ExerciseCategory {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.category || 'conditioning';
}

export interface LibraryExercise {
  id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string[];
  description: string | null;
  cues: string[];
  is_basketball_specific: boolean;
  is_system: boolean;
  /** A YouTube video id the owner chose (00042); missing before that migration. */
  demo_video_id?: string | null;
}

/**
 * Score used to detect personal records. Weighted sets use estimated one-rep max
 * (Epley: weight x (1 + reps / 30)); bodyweight sets compare reps.
 */
export function setScore(weightKg: number | null, reps: number | null): number {
  if (!reps || reps <= 0) return 0;
  if (!weightKg || weightKg <= 0) return reps;
  return weightKg * (1 + reps / 30);
}

/** A set is a PR when it beats every earlier set of the same kind (weighted vs bodyweight). */
export function isPersonalRecord(
  weightKg: number | null,
  reps: number | null,
  history: Array<{ weight_kg: number | null; reps: number | null }>
): boolean {
  const score = setScore(weightKg, reps);
  if (score <= 0) return false;
  const weighted = !!weightKg && weightKg > 0;
  const comparable = history.filter((h) => (!!h.weight_kg && h.weight_kg > 0) === weighted);
  if (comparable.length === 0) return false; // first time logging it isn't a "record"
  return comparable.every((h) => score > setScore(h.weight_kg, h.reps));
}

/** How the sets of an exercise are measured. */
export type SetMode = 'reps' | 'time' | 'distance';

/** Held or done for a time: logging "3 x 8" of a plank means nothing. */
const TIMED = new Set([
  'Front Plank',
  'Side Plank',
  'Hollow Body Hold',
  'Copenhagen Plank',
  'Wall Sit',
  'Dead Hang',
  'Plate Pinch Hold',
  'Deep Squat Hold',
  'Spanish Squat',
  'Pigeon Stretch',
  'Frog Stretch',
  'Jump Rope',
  'Air Bike Intervals',
  'Defensive Slide Intervals',
  '17s (Sideline-to-Sideline Sprints)',
  'Suicides (Line Drills)',
  '5-10-5 Pro Agility Shuttle',
]);

/** Done for a distance. */
const DISTANCE = new Set(["Farmer's Carry", 'Suitcase Carry', "Farmer's Walk on Toes", 'Sled Push']);

/** How an exercise is usually measured, before the player has logged it. */
export function defaultSetMode(name: string): SetMode {
  if (TIMED.has(name)) return 'time';
  if (DISTANCE.has(name)) return 'distance';
  return 'reps';
}

export interface MeasuredSet {
  weight_kg: number | null;
  reps: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
}

/** How a set that was saved was measured. */
export function setModeOf(s: MeasuredSet): SetMode {
  if (s.duration_seconds != null && s.reps == null) return 'time';
  if (s.distance_meters != null && s.reps == null) return 'distance';
  return 'reps';
}

/** The reps, seconds or metres of a set, whichever its mode measures. */
export function setAmount(s: MeasuredSet, mode: SetMode = setModeOf(s)): number | null {
  const value = mode === 'time' ? s.duration_seconds : mode === 'distance' ? s.distance_meters : s.reps;
  return value == null ? null : Number(value);
}

export const SET_MODE_UNIT: Record<SetMode, string> = { reps: 'reps', time: 'sec', distance: 'm' };

/** "12", "45s" or "20 m": the amount of a set, short enough for a table cell. */
export function formatAmount(amount: number | null, mode: SetMode): string {
  if (amount == null) return '—';
  if (mode === 'time') return amount >= 60 ? `${Math.floor(amount / 60)}:${String(amount % 60).padStart(2, '0')}` : `${amount}s`;
  if (mode === 'distance') return `${amount} m`;
  return String(amount);
}

/**
 * A timed or distance set is a PR when it beats every earlier set of the same
 * kind (weighted vs bodyweight): at least as long or far with at least as much
 * weight, and more of one of them. A heavier carry over a shorter distance is
 * not a record, so neither is a longer one with less weight.
 */
export function isAmountRecord(weightKg: number | null, amount: number, history: Array<{ weight_kg: number | null; amount: number }>): boolean {
  if (!(amount > 0)) return false;
  const weight = weightKg && weightKg > 0 ? weightKg : 0;
  const comparable = history.filter((h) => h.amount > 0 && (!!h.weight_kg && h.weight_kg > 0) === weight > 0);
  if (comparable.length === 0) return false;
  return comparable.every((h) => {
    const before = h.weight_kg || 0;
    return amount >= h.amount && weight >= before && (amount > h.amount || weight > before);
  });
}

/** The kinds of workout, as the workouts.workout_type column allows. */
export const WORKOUT_TYPES = [
  { value: 'strength', label: 'Strength' },
  { value: 'power_plyos', label: 'Power & Plyos' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'testing', label: 'Testing' },
  { value: 'mixed', label: 'Mixed' },
];

/**
 * Whether each set is a PR against sets from earlier workouts, the way the
 * logger decided when the set was ticked. For a workout that was edited: a
 * typo of 1000 kg should not stay a record once it is fixed.
 */
export function recordFlags(sets: MeasuredSet[], earlier: MeasuredSet[]): boolean[] {
  return sets.map((s) => {
    const mode = setModeOf(s);
    const same = earlier.filter((h) => setModeOf(h) === mode);
    if (mode === 'reps') return isPersonalRecord(s.weight_kg, s.reps, same);
    return isAmountRecord(
      s.weight_kg,
      setAmount(s, mode) ?? 0,
      same.map((h) => ({ weight_kg: h.weight_kg, amount: setAmount(h, mode) ?? 0 }))
    );
  });
}
