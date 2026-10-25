// @vitest-environment node
// __tests__/account-export.test.ts
// The data export hands a player everything stored about them. The steps they
// reached in the app (app_events, 00045) are one of the things stored, so they
// are in it, with only that player's rows asked for.
import { describe, it, expect, vi } from 'vitest';

const asked = vi.hoisted(() => [] as Array<{ table: string; column: string; value: unknown }>);
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => ({ id: 'player-1', email: 'p@example.com' }) }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById: async () => ({ data: { user: { created_at: '2026-10-01T00:00:00Z' } } }) } },
    from: (table: string) => {
      const rows = table === 'app_events' ? [{ id: 'e1', user_id: 'player-1', name: 'welcome_later', day: '2026-10-25' }] : [];
      const done = { data: rows, error: null };
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (column: string, value: unknown) => {
          asked.push({ table, column, value });
          return q;
        },
        or: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve(done),
      };
      return q;
    },
  }),
}));

import { GET } from '@/app/api/account/export/route';

describe('GET /api/account/export', () => {
  it('includes the steps the player reached, and asks only for their own rows', async () => {
    const res = await GET();
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.app_events).toEqual([{ id: 'e1', user_id: 'player-1', name: 'welcome_later', day: '2026-10-25' }]);
    expect(asked.filter((a) => a.table === 'app_events')).toEqual([{ table: 'app_events', column: 'user_id', value: 'player-1' }]);
  });
});
