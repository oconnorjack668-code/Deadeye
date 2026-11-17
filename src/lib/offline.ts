// src/lib/offline.ts
// Offline logging: finished sessions that cannot reach Supabase are kept in a queue on the
// phone and uploaded by <OfflineSync /> when the connection comes back.
//
// Every save carries a client-generated id. A retry first checks whether the server already
// holds the whole save (the first try can succeed with the reply lost to the signal): if so it
// is done and nothing is deleted. Only a half-finished copy is deleted (children cascade) and
// saved again, so a save is never duplicated and a complete one is never put at risk.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SessionType, DrillCategory, ShotZone, WorkoutType } from '@/lib/supabase/types';

type Supabase = SupabaseClient<Database>;

export type QueueKind = 'basketball' | 'workout' | 'game';

export interface BasketballSavePayload {
  id: string;
  session: {
    session_date: string;
    session_type: SessionType;
    duration_minutes: number;
    intensity_rpe: number;
    perceived_quality: number;
    notes: string | null;
  };
  drills: Array<{
    name: string;
    category: DrillCategory;
    minutes: number | null;
    zones: Array<{ zone: ShotZone; makes: number; attempts: number }>;
  }>;
}

export interface WorkoutSavePayload {
  id: string;
  workout: {
    workout_date: string;
    workout_type: WorkoutType;
    duration_minutes: number;
    rpe: number;
    notes: string | null;
  };
  sets: Array<{
    exercise_id: string | null;
    exercise_name: string;
    exercise_category: string | null;
    set_number: number;
    /** Null for a set done for time or distance. */
    reps: number | null;
    duration_seconds?: number | null;
    distance_meters?: number | null;
    weight_kg: number | null;
    is_personal_record: boolean;
  }>;
  routine: {
    name: string;
    exercises: Array<{
      exercise_id: string | null;
      exercise_name: string;
      target_sets: number;
      display_order: number;
      /** Carried over from a routine that had them (00058); left out otherwise so older databases still take the row */
      target_reps?: string;
      notes?: string;
    }>;
  } | null;
}

/** A game is one row: box score plus details (points are calculated by the database) */
export interface GameSavePayload {
  id: string;
  game: Record<string, string | number | null>;
}

export type QueuedSave =
  | { id: string; kind: 'basketball'; userId: string; label: string; createdAt: number; lastError?: string; payload: BasketballSavePayload }
  | { id: string; kind: 'workout'; userId: string; label: string; createdAt: number; lastError?: string; payload: WorkoutSavePayload }
  | { id: string; kind: 'game'; userId: string; label: string; createdAt: number; lastError?: string; payload: GameSavePayload };

export interface SaveResult {
  id?: string;
  error?: string;
  /** true when the failure was the connection, so the save should be queued */
  network?: boolean;
}

const QUEUE_KEY = 'hoopiq-offline-queue-v1';
export const QUEUE_EVENT = 'hoopiq-queue-changed';

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // RFC 4122 v4 fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const NETWORK_MESSAGE = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|timed? ?out/i;

export function isNetworkError(message: string | null | undefined): boolean {
  return isOffline() || (!!message && NETWORK_MESSAGE.test(message));
}

export function readQueue(): QueuedSave[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const items = raw ? (JSON.parse(raw) as QueuedSave[]) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/** false when the phone would not store the queue (storage full or blocked) */
function writeQueue(items: QueuedSave[]): boolean {
  let ok = true;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    ok = false;
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_EVENT));
  return ok;
}

/**
 * Keeps a save on the phone until it can be uploaded. Returns false when the
 * phone would not store it: the caller must keep the draft and say so, never
 * tell the player it was saved.
 */
export function enqueue(item: QueuedSave): boolean {
  return writeQueue([...readQueue().filter((q) => q.id !== item.id), item]);
}

/** Shown when a save could neither reach the server nor be kept on the phone */
export const NOT_KEPT_MESSAGE =
  'No signal, and this phone would not keep a copy (its storage is full or blocked). Nothing was saved: keep this screen open and press save again when you have signal.';

export function removeFromQueue(id: string) {
  writeQueue(readQueue().filter((q) => q.id !== id));
}

export function markQueueError(id: string, message: string) {
  writeQueue(readQueue().map((q) => (q.id === id ? { ...q, lastError: message } : q)));
}

/** The signed-in user's id, read from the local session when there is no connection. */
export async function getUserIdForSave(supabase: Supabase): Promise<string | null> {
  if (!isOffline()) {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
    if (error && !isNetworkError(error.message)) return null;
  }
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

function fail(message: string | undefined, fallback: string): SaveResult {
  const text = message || fallback;
  return { error: text, network: isNetworkError(text) };
}

export async function saveBasketballSession(
  supabase: Supabase,
  userId: string,
  p: BasketballSavePayload,
  retry = false
): Promise<SaveResult> {
  if (retry) {
    const { data: row, error } = await supabase.from('training_sessions').select('id').eq('id', p.id).maybeSingle();
    if (error) return fail(error.message, 'Could not reach the server');
    if (row) {
      const { data: savedDrills, error: drillsError } = await supabase.from('session_drills').select('id').eq('session_id', p.id);
      if (drillsError) return fail(drillsError.message, 'Could not reach the server');
      const drillIds = (savedDrills ?? []).map((d) => d.id);
      const expectedShots = p.drills.reduce((n, d) => n + d.zones.length, 0);
      let complete = drillIds.length === p.drills.length;
      if (complete && expectedShots > 0) {
        const { count, error: shotsError } = await supabase
          .from('shooting_entries')
          .select('id', { count: 'exact', head: true })
          .in('drill_id', drillIds);
        if (shotsError) return fail(shotsError.message, 'Could not reach the server');
        complete = count === expectedShots;
      }
      // The first try saved everything; only its reply was lost
      if (complete) return { id: p.id };
      const { error: deleteError } = await supabase.from('training_sessions').delete().eq('id', p.id);
      if (deleteError) return fail(deleteError.message, 'Could not reach the server');
    }
  }

  const { error: sessionError } = await supabase.from('training_sessions').insert({ id: p.id, user_id: userId, ...p.session });
  if (sessionError) return fail(sessionError.message, 'Could not save the session');

  // Drill ids are made here, so every drill goes in one request and every
  // shot in a second. One pair of requests per drill made a four-drill session
  // nine round trips, which is a long wait on mobile data at a court.
  const drills = p.drills.map((drill, i) => ({ id: newId(), drill, order: i }));
  let { error } = await supabase.from('session_drills').insert(
    drills.map(({ id, drill, order }) => ({
      id,
      session_id: p.id,
      user_id: userId,
      drill_name: drill.name.slice(0, 120),
      drill_category: drill.category,
      duration_minutes: drill.minutes,
      display_order: order,
    }))
  );
  const shots = drills.flatMap(({ id, drill }) =>
    drill.zones.map((z) => ({ drill_id: id, user_id: userId, shot_zone: z.zone, makes: z.makes, attempts: z.attempts }))
  );
  if (!error && shots.length > 0) {
    ({ error } = await supabase.from('shooting_entries').insert(shots));
  }
  if (error) {
    // Undo the partial session (drills and shots cascade)
    await supabase.from('training_sessions').delete().eq('id', p.id);
    return fail(error.message, 'Could not save your drills');
  }
  return { id: p.id };
}

export async function saveWorkout(supabase: Supabase, userId: string, p: WorkoutSavePayload, retry = false): Promise<SaveResult> {
  if (retry) {
    const { data: row, error } = await supabase.from('workouts').select('id').eq('id', p.id).maybeSingle();
    if (error) return fail(error.message, 'Could not reach the server');
    if (row) {
      const { count, error: setsError } = await supabase
        .from('workout_sets')
        .select('id', { count: 'exact', head: true })
        .eq('workout_id', p.id);
      if (setsError) return fail(setsError.message, 'Could not reach the server');
      // The first try saved everything (the optional routine is not checked: it never undoes a workout)
      if (count === p.sets.length) return { id: p.id };
      const { error: deleteError } = await supabase.from('workouts').delete().eq('id', p.id);
      if (deleteError) return fail(deleteError.message, 'Could not reach the server');
    }
  }

  const { error: workoutError } = await supabase.from('workouts').insert({ id: p.id, user_id: userId, ...p.workout });
  if (workoutError) return fail(workoutError.message, 'Could not save the workout');

  const { error: setsError } = await supabase
    .from('workout_sets')
    .insert(p.sets.map((s) => ({ ...s, workout_id: p.id, user_id: userId })));
  if (setsError) {
    await supabase.from('workouts').delete().eq('id', p.id);
    return fail(setsError.message, 'Could not save your sets');
  }

  if (p.routine) {
    // Optional extra: a failure here does not undo the workout
    const { data: routine } = await supabase
      .from('workout_routines')
      .insert({ user_id: userId, name: p.routine.name })
      .select('id')
      .single();
    if (routine) {
      await supabase
        .from('routine_exercises')
        .insert(p.routine.exercises.map((e) => ({ ...e, routine_id: routine.id, user_id: userId })));
    }
  }
  return { id: p.id };
}

export async function saveGame(supabase: Supabase, userId: string, p: GameSavePayload, retry = false): Promise<SaveResult> {
  if (retry) {
    // A game is one row: if it is there, the first try saved it
    const { data: row, error } = await supabase.from('games').select('id').eq('id', p.id).maybeSingle();
    if (error) return fail(error.message, 'Could not reach the server');
    if (row) return { id: p.id };
  }
  const { error } = await supabase.from('games').insert({ ...p.game, id: p.id, user_id: userId });
  if (error) return fail(error.message, 'Could not save the game');
  return { id: p.id };
}

export async function runQueuedSave(supabase: Supabase, item: QueuedSave): Promise<SaveResult> {
  if (item.kind === 'basketball') return saveBasketballSession(supabase, item.userId, item.payload, true);
  if (item.kind === 'workout') return saveWorkout(supabase, item.userId, item.payload, true);
  return saveGame(supabase, item.userId, item.payload, true);
}
