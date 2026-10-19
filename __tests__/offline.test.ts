// __tests__/offline.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import {
  enqueue,
  isNetworkError,
  markQueueError,
  readQueue,
  removeFromQueue,
  runQueuedSave,
  saveBasketballSession,
  saveWorkout,
  type BasketballSavePayload,
  type WorkoutSavePayload,
} from '@/lib/offline';

type Op = { table: string; op: 'insert' | 'delete'; rows?: unknown; id?: string };
type InsertChain = Promise<{ data: null; error: { message: string } | null }> & {
  select: () => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
};

/**
 * Minimal stand-in for the Supabase client: records calls, can fail a table.
 * It only implements the `.from(table).insert()/.delete()` shape these save
 * functions actually use, so it's cast to the real client type once here
 * rather than loosening those functions' parameter type to `any`.
 */
function fakeSupabase(failOn: Record<string, string> = {}) {
  const ops: Op[] = [];
  const client = {
    from(table: string) {
      const result = () => (failOn[table] ? { data: null, error: { message: failOn[table] } } : { data: null, error: null });
      return {
        insert(rows: unknown) {
          ops.push({ table, op: 'insert', rows });
          const res = result();
          const chain = Promise.resolve(res) as unknown as InsertChain;
          chain.select = () => ({ single: async () => (res.error ? res : { data: { id: 'routine-1' }, error: null }) });
          return chain;
        },
        delete() {
          return {
            eq: async (_col: string, id: string) => {
              ops.push({ table, op: 'delete', id });
              return { error: failOn[`delete:${table}`] ? { message: failOn[`delete:${table}`] } : null };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { client, ops };
}

const hoops: BasketballSavePayload = {
  id: 'session-1',
  session: { session_date: '2026-09-25', session_type: 'shooting', duration_minutes: 45, intensity_rpe: 6, perceived_quality: 3, notes: null },
  drills: [
    { name: 'Spot shooting', category: 'shooting', minutes: null, zones: [{ zone: 'three-top', makes: 6, attempts: 10 }] },
    { name: 'Ball handling', category: 'ball-handling', minutes: 10, zones: [] },
  ],
};

const gym: WorkoutSavePayload = {
  id: 'workout-1',
  workout: { workout_date: '2026-09-25', workout_type: 'strength', duration_minutes: 50, rpe: 7, notes: null },
  sets: [
    { exercise_id: null, exercise_name: 'Squat', exercise_category: 'quads', set_number: 1, reps: 5, weight_kg: 80, is_personal_record: false },
  ],
  routine: null,
};

describe('saveBasketballSession', () => {
  it('saves the session with its own id, drills and zone rows', async () => {
    const { client, ops } = fakeSupabase();
    const result = await saveBasketballSession(client, 'user-1', hoops);
    expect(result).toEqual({ id: 'session-1' });
    expect(ops[0]).toMatchObject({ table: 'training_sessions', op: 'insert', rows: { id: 'session-1', user_id: 'user-1' } });
    const drills = ops.filter((o) => o.table === 'session_drills');
    expect(drills).toHaveLength(1);
    const drillRows = drills[0].rows as Array<{ id: string; drill_name: string; display_order: number }>;
    expect(drillRows.map((d) => [d.drill_name, d.display_order])).toEqual([
      ['Spot shooting', 0],
      ['Ball handling', 1],
    ]);
    const shots = ops.find((o) => o.table === 'shooting_entries')!;
    expect(shots.rows).toEqual([{ drill_id: drillRows[0].id, user_id: 'user-1', shot_zone: 'three-top', makes: 6, attempts: 10 }]);
    expect(ops.some((o) => o.op === 'delete')).toBe(false);
  });

  it('takes three requests however many drills there are', async () => {
    const { client, ops } = fakeSupabase();
    const shooting = hoops.drills[0];
    const many = { ...hoops, drills: [shooting, { ...shooting, name: '5-spot 3s' }, { ...shooting, name: 'Free throws' }, hoops.drills[1]] };
    await saveBasketballSession(client, 'user-1', many);
    expect(ops.map((o) => o.table)).toEqual(['training_sessions', 'session_drills', 'shooting_entries']);
    const shots = ops[2].rows as Array<{ drill_id: string }>;
    const drillIds = (ops[1].rows as Array<{ id: string }>).map((d) => d.id);
    expect(shots.map((s) => s.drill_id)).toEqual(drillIds.slice(0, 3));
  });

  it('skips the shots request when no drill has shots', async () => {
    const { client, ops } = fakeSupabase();
    await saveBasketballSession(client, 'user-1', { ...hoops, drills: [hoops.drills[1]] });
    expect(ops.map((o) => o.table)).toEqual(['training_sessions', 'session_drills']);
  });

  it('undoes the session when a drill fails, and reports a normal error', async () => {
    const { client, ops } = fakeSupabase({ shooting_entries: 'violates check constraint' });
    const result = await saveBasketballSession(client, 'user-1', hoops);
    expect(result.error).toContain('violates');
    expect(result.network).toBe(false);
    expect(ops).toContainEqual({ table: 'training_sessions', op: 'delete', id: 'session-1' });
  });

  it('flags connection failures so the save can be queued', async () => {
    const { client } = fakeSupabase({ training_sessions: 'TypeError: Failed to fetch' });
    const result = await saveBasketballSession(client, 'user-1', hoops);
    expect(result.network).toBe(true);
  });

  it('a retry clears any half-saved copy first (no duplicates)', async () => {
    const { client, ops } = fakeSupabase();
    await saveBasketballSession(client, 'user-1', hoops, true);
    expect(ops[0]).toEqual({ table: 'training_sessions', op: 'delete', id: 'session-1' });
    expect(ops[1]).toMatchObject({ table: 'training_sessions', op: 'insert' });
  });
});

describe('saveWorkout', () => {
  it('saves workout and sets with the workout id', async () => {
    const { client, ops } = fakeSupabase();
    expect(await saveWorkout(client, 'user-1', gym)).toEqual({ id: 'workout-1' });
    const sets = ops.find((o) => o.table === 'workout_sets')!;
    expect((sets.rows as unknown[])[0]).toMatchObject({ workout_id: 'workout-1', user_id: 'user-1', exercise_name: 'Squat' });
    expect(ops.some((o) => o.table === 'workout_routines')).toBe(false);
  });

  it('removes the workout if the sets fail', async () => {
    const { client, ops } = fakeSupabase({ workout_sets: 'bad reps' });
    const result = await saveWorkout(client, 'user-1', gym);
    expect(result.error).toBe('bad reps');
    expect(ops).toContainEqual({ table: 'workouts', op: 'delete', id: 'workout-1' });
  });

  it('saves the optional routine', async () => {
    const { client, ops } = fakeSupabase();
    const withRoutine = {
      ...gym,
      routine: { name: 'Leg day', exercises: [{ exercise_id: null, exercise_name: 'Squat', target_sets: 3, display_order: 0 }] },
    };
    await saveWorkout(client, 'user-1', withRoutine);
    const routineRows = ops.find((o) => o.table === 'routine_exercises')!;
    expect((routineRows.rows as unknown[])[0]).toMatchObject({ routine_id: 'routine-1', user_id: 'user-1' });
  });

  it('runQueuedSave retries with delete-first', async () => {
    const { client, ops } = fakeSupabase();
    await runQueuedSave(client, { id: 'workout-1', kind: 'workout', userId: 'user-1', label: 'x', createdAt: 0, payload: gym });
    expect(ops[0]).toEqual({ table: 'workouts', op: 'delete', id: 'workout-1' });
  });
});

describe('offline queue', () => {
  beforeEach(() => localStorage.clear());

  it('adds, replaces by id, marks errors and removes', () => {
    const item = { id: 'a', kind: 'workout' as const, userId: 'u', label: 'Leg day', createdAt: 1, payload: gym };
    enqueue(item);
    enqueue({ ...item, label: 'Leg day v2' });
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0].label).toBe('Leg day v2');
    markQueueError('a', 'nope');
    expect(readQueue()[0].lastError).toBe('nope');
    removeFromQueue('a');
    expect(readQueue()).toEqual([]);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('hoopiq-offline-queue-v1', '{not json');
    expect(readQueue()).toEqual([]);
  });
});

describe('isNetworkError', () => {
  it('recognises browser connection errors', () => {
    expect(isNetworkError('TypeError: Failed to fetch')).toBe(true);
    expect(isNetworkError('Load failed')).toBe(true);
    expect(isNetworkError('NetworkError when attempting to fetch resource.')).toBe(true);
    expect(isNetworkError('new row violates row-level security policy')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
