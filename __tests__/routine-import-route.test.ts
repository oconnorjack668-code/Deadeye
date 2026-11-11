// @vitest-environment node
// __tests__/routine-import-route.test.ts
// POST /api/workouts/import: the free monthly limit holds, a use is given back
// when the read fails or finds nothing, bad input never reaches the AI, and
// only the pasted routine (nothing about the player) is sent.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  used: 0,
  pro: false,
  aiResult: null as unknown,
  aiError: false,
  aiOff: false,
  pruned: [] as unknown[],
  inserted: [] as unknown[],
  deleted: [] as unknown[],
  aiCalls: [] as Array<{ system: string; user: string; image?: unknown }>,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => ({ id: 'player-1', email: 'p@example.com' }),
  awaitingParentApproval: async () => false,
  PARENT_APPROVAL_NEEDED: 'parent approval needed',
}));

vi.mock('@/lib/ai/service', () => ({ hasUnlimitedCredits: async () => state.pro }));

vi.mock('@/lib/ai/config', () => ({
  AINotConfiguredError: class extends Error {
    status = 503;
  },
  getConfiguredAI: () => ({
    config: { apiKey: 'k', model: 'claude-haiku-5-5', maxTokens: 4000, use: 'chat' },
    provider: {
      generateJson: async (system: string, user: string) => {
        state.aiCalls.push({ system, user });
        if (state.aiError) throw new Error('down');
        return state.aiResult;
      },
      generateJsonFromImage: async (system: string, user: string, image: unknown) => {
        state.aiCalls.push({ system, user, image });
        if (state.aiError) throw new Error('down');
        return state.aiResult;
      },
    },
  }),
}));

function query(result: unknown) {
  const q: Record<string, unknown> = {
    select: () => q,
    eq: () => q,
    gte: () => q,
    maybeSingle: async () => result,
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  return q;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'routine_imports') return query({ count: state.used, error: null });
      if (table === 'subscriptions') return query({ data: { plan_type: 'free' }, error: null });
      if (table === 'profiles') return query({ data: { ai_coaching_enabled: !state.aiOff }, error: null });
      if (table === 'exercise_library') return query({ data: [{ id: 'bench', name: 'Barbell Bench Press' }], error: null });
      return query({ data: null, error: null });
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: unknown) => {
        state.inserted.push(row);
        return { select: () => ({ single: async () => ({ data: { id: 'use-1' }, error: null }) }) };
      },
      delete: () => ({
        eq: (col: string, id: unknown) => {
          // delete().eq('user_id', ...).lt('created_at', cutoff) clears old rows;
          // delete().eq('id', ...) gives one use back
          const done = Promise.resolve({ error: null });
          if (col === 'id') state.deleted.push(id);
          return Object.assign(done, {
            lt: async (_c: string, cutoff: unknown) => {
              state.pruned.push({ user: id, cutoff });
              return { error: null };
            },
          });
        },
      }),
    }),
  }),
}));

import { POST } from '@/app/api/workouts/import/route';

function post(body: unknown) {
  return POST(new Request('http://localhost/api/workouts/import', { method: 'POST', body: JSON.stringify(body) }));
}

const GOOD = { name: 'Push', routines: [{ name: 'Push', exercises: [{ name: 'Bench Press (Barbell)', sets: 4, reps: '6-8' }] }] };

beforeEach(() => {
  Object.assign(state, { used: 0, pro: false, aiResult: GOOD, aiError: false, aiOff: false, inserted: [], deleted: [], pruned: [], aiCalls: [] });
});

describe('POST /api/workouts/import', () => {
  it('reads pasted text, matches the library and counts one use', async () => {
    const res = await post({ kind: 'text', text: 'Push\nBench 4x6-8' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.program.routines[0].exercises[0]).toMatchObject({ name: 'Barbell Bench Press', exerciseId: 'bench', sets: 4, reps: '6-8' });
    expect(body).toMatchObject({ remaining: 9, limit: 10 });
    expect(state.inserted).toEqual([{ user_id: 'player-1', source: 'text' }]);
    expect(state.deleted).toEqual([]);
  });

  it('sends only the routine, nothing about the player', async () => {
    await post({ kind: 'text', text: 'Bench 4x6-8' });
    const sent = JSON.stringify(state.aiCalls);
    expect(sent).toContain('Bench 4x6-8');
    expect(sent).not.toContain('player-1');
    expect(sent).not.toContain('p@example.com');
  });

  it('stops at the free limit before calling the AI', async () => {
    state.used = 10;
    const res = await post({ kind: 'text', text: 'Bench 4x6-8' });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/10 routine imports this month/);
    expect(state.aiCalls).toHaveLength(0);
    expect(state.inserted).toHaveLength(0);
  });

  it('gives Pro a higher limit', async () => {
    state.used = 10;
    state.pro = true;
    const res = await post({ kind: 'text', text: 'Bench 4x6-8' });
    expect(res.status).toBe(200);
    expect((await res.json()).limit).toBe(100);
  });

  it('gives the use back when the AI fails', async () => {
    state.aiError = true;
    const res = await post({ kind: 'text', text: 'Bench 4x6-8' });
    expect(res.status).toBe(502);
    expect(state.deleted).toEqual(['use-1']);
  });

  it('gives the use back when nothing is found', async () => {
    state.aiResult = { name: '', routines: [] };
    const res = await post({ kind: 'text', text: 'hello there' });
    expect(res.status).toBe(422);
    expect(state.deleted).toEqual(['use-1']);
  });

  it('turns bad input away before counting or calling the AI', async () => {
    for (const body of [
      {},
      { kind: 'text', text: '   ' },
      { kind: 'text', text: 'x'.repeat(8001) },
      { kind: 'image', mediaType: 'image/gif', data: 'AAAA' },
      { kind: 'image', mediaType: 'image/png', data: 'not base64!' },
      { kind: 'image', mediaType: 'image/png', data: 'A'.repeat(4_100_000) },
    ]) {
      expect((await post(body)).status).toBe(400);
    }
    expect(state.aiCalls).toHaveLength(0);
    expect(state.inserted).toHaveLength(0);
  });

  it('sends nothing to the AI when AI coaching is switched off', async () => {
    state.aiOff = true;
    const res = await post({ kind: 'image', mediaType: 'image/jpeg', data: 'AAAA' });
    expect(res.status).toBe(403);
    expect((await res.json()).aiOff).toBe(true);
    expect(state.aiCalls).toHaveLength(0);
    expect(state.inserted).toHaveLength(0);
  });

  it('deletes the player\'s import-count rows from before last month', async () => {
    await post({ kind: 'text', text: 'Bench 4x6-8' });
    expect(state.pruned).toHaveLength(1);
    expect(state.pruned[0]).toMatchObject({ user: 'player-1' });
  });

  it('reads a screenshot', async () => {
    const res = await post({ kind: 'image', mediaType: 'image/jpeg', data: 'AAAA' });
    expect(res.status).toBe(200);
    expect(state.aiCalls[0].image).toEqual({ mediaType: 'image/jpeg', data: 'AAAA' });
    expect(state.inserted).toEqual([{ user_id: 'player-1', source: 'image' }]);
  });
});
