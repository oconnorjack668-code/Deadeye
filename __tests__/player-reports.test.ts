// __tests__/player-reports.test.ts
// POST /api/reports: a signed-in player reporting a problem in their own words.
// It must store what they wrote and nothing it should not, refuse anyone signed
// out, and never say "sent" when the report was not stored.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let user: { id: string } | null = { id: 'user-1' };
let reportsToday = 0;
let insertError: { message: string } | null = null;
const inserted: Array<Record<string, unknown>> = [];
const countFilters: Array<[string, string, unknown]> = [];

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => user }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe('player_reports');
      return {
        select: () => {
          const chain = {
            eq: (col: string, value: unknown) => (countFilters.push(['eq', col, value]), chain),
            gte: async (col: string, value: unknown) => (countFilters.push(['gte', col, value]), { count: reportsToday }),
          };
          return chain;
        },
        insert: async (row: Record<string, unknown>) => {
          inserted.push(row);
          return { error: insertError };
        },
      };
    },
  }),
}));

async function send(body: unknown, headers: Record<string, string> = {}) {
  const { POST } = await import('@/app/api/reports/route');
  const res = await POST(
    new Request('http://localhost/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  );
  return { status: res.status, body: await res.json() };
}

describe('POST /api/reports', () => {
  beforeEach(() => {
    user = { id: 'user-1' };
    reportsToday = 0;
    insertError = null;
    inserted.length = 0;
    countFilters.length = 0;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('stores what the player wrote, where they were and their device', async () => {
    const { status, body } = await send(
      { message: '  The tracker called my make a miss  ', context: 'x'.repeat(400), url: '/video' },
      { 'user-agent': 'Mozilla/5.0 (iPhone)' }
    );
    expect(status).toBe(201);
    expect(body).toEqual({ ok: true });
    expect(inserted).toEqual([
      {
        user_id: 'user-1',
        message: 'The tracker called my make a miss',
        context: 'x'.repeat(300),
        url: '/video',
        user_agent: 'Mozilla/5.0 (iPhone)',
      },
    ]);
  });

  it('refuses anyone signed out, and stores nothing', async () => {
    user = null;
    const { status, body } = await send({ message: 'Broken' });
    expect(status).toBe(401);
    expect(body.error).toMatch(/Log in/);
    expect(inserted).toHaveLength(0);
  });

  it('asks for the problem when the box is empty', async () => {
    expect((await send({ message: '   ' })).status).toBe(400);
    expect((await send({})).status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('stops at 10 reports from one player in a day', async () => {
    reportsToday = 10;
    const { status, body } = await send({ message: 'Another one' });
    expect(status).toBe(429);
    expect(body.error).toMatch(/tomorrow/);
    expect(inserted).toHaveLength(0);
    // Counted for this player, over the last 24 hours
    expect(countFilters[0]).toEqual(['eq', 'user_id', 'user-1']);
    const since = Date.parse(countFilters[1][2] as string);
    expect(Date.now() - since).toBeGreaterThan(86_400_000 - 5_000);
    expect(Date.now() - since).toBeLessThan(86_400_000 + 5_000);
  });

  it('says so when the report could not be stored', async () => {
    insertError = { message: 'relation "player_reports" does not exist' };
    const { status, body } = await send({ message: 'Broken' });
    expect(status).toBe(500);
    expect(body.error).toMatch(/could not be sent/);
  });

  it('never claims a report was sent when nothing can store it', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { status } = await send({ message: 'Broken' });
    expect(status).toBe(503);
    expect(inserted).toHaveLength(0);
  });
});
