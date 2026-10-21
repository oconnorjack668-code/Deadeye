// __tests__/reset-name.test.ts
// POST /api/admin/reset-name: only the owner may reset a player's display
// name, and only to "Player".
import { describe, it, expect, vi, beforeEach } from 'vitest';

let owner = true;
let updateError: { message: string } | null = null;
const updates: Array<{ row: Record<string, unknown>; id: unknown }> = [];

vi.mock('@/lib/auth', () => ({ checkIsOwner: async () => owner }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe('profiles');
      return {
        update: (row: Record<string, unknown>) => ({
          eq: async (_col: string, id: unknown) => {
            updates.push({ row, id });
            return { error: updateError };
          },
        }),
      };
    },
  }),
}));

const ID = '0b9f1d2e-3c4a-4b5c-8d6e-7f8091a2b3c4';

async function reset(body: unknown) {
  const { POST } = await import('@/app/api/admin/reset-name/route');
  const res = await POST(new Request('http://localhost/api/admin/reset-name', { method: 'POST', body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}

describe('POST /api/admin/reset-name', () => {
  beforeEach(() => {
    owner = true;
    updateError = null;
    updates.length = 0;
  });

  it('resets the name to "Player" for the owner', async () => {
    const { status } = await reset({ userId: ID });
    expect(status).toBe(200);
    expect(updates).toEqual([{ row: { display_name: 'Player' }, id: ID }]);
  });

  it('refuses anyone who is not the owner, and changes nothing', async () => {
    owner = false;
    expect((await reset({ userId: ID })).status).toBe(403);
    expect(updates).toHaveLength(0);
  });

  it('rejects a missing or malformed player id', async () => {
    expect((await reset({})).status).toBe(400);
    expect((await reset({ userId: "1; drop table profiles" })).status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it('says so when the update fails', async () => {
    updateError = { message: 'boom' };
    expect((await reset({ userId: ID })).status).toBe(500);
  });
});
