// @vitest-environment node
// __tests__/cronRuns.test.ts
// The scheduled job run log (src/lib/cronRuns.ts, 00056): every run that got
// past the secret is saved with its outcome and numbers, a refused call is not,
// and saving can never break the job itself.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const inserts: Array<Record<string, unknown>> = [];
let insertFails: 'error' | 'throw' | null = null;

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        if (insertFails === 'throw') throw new Error('network down');
        if (insertFails === 'error') return { error: { message: 'relation "cron_runs" does not exist' } };
        inserts.push({ table, ...row });
        return { error: null };
      },
    }),
  }),
}));

import { outcomeOf, summaryOf, withCronLog } from '@/lib/cronRuns';

const request = () => new Request('http://localhost/api/cron/weekly-report');

beforeEach(() => {
  inserts.length = 0;
  insertFails = null;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('outcomeOf', () => {
  it('reads a 2xx as worked, a 2xx with skipped as skipped, and anything else as failed', () => {
    expect(outcomeOf(200, { created: 0 })).toBe('ok');
    expect(outcomeOf(200, { skipped: 'Not 08:30 in Ireland' })).toBe('skipped');
    expect(outcomeOf(500, { error: 'boom' })).toBe('failed');
    expect(outcomeOf(503, { skipped: 'x' })).toBe('failed');
    expect(outcomeOf(200, null)).toBe('ok');
  });
});

describe('summaryOf', () => {
  it('keeps a small object and drops anything else', () => {
    expect(summaryOf({ active: 3, created: 2 })).toEqual({ active: 3, created: 2 });
    expect(summaryOf(null)).toEqual({});
    expect(summaryOf([1, 2])).toEqual({});
    expect(summaryOf('text')).toEqual({});
  });

  it('replaces an answer too long to keep with a note', () => {
    const out = summaryOf({ errors: ['x'.repeat(3000)] }) as { note: string };
    expect(out.note).toMatch(/too long/);
  });
});

describe('withCronLog', () => {
  it('saves a run that worked, with its numbers, and answers as the job did', async () => {
    const GET = withCronLog('weekly-report', async () => Response.json({ active: 4, due: 2, created: 2, failed: 0, pushed: 1 }));
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ active: 4, due: 2, created: 2, failed: 0, pushed: 1 });
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      table: 'cron_runs',
      job: 'weekly-report',
      status: 200,
      outcome: 'ok',
      summary: { active: 4, due: 2, created: 2, failed: 0, pushed: 1 },
    });
    expect(inserts[0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not save a refused call, so nobody can fill the table', async () => {
    const GET = withCronLog('reminders', async () => Response.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(inserts).toHaveLength(0);
  });

  it('saves a skipped run as skipped', async () => {
    const GET = withCronLog('agent-counts', async () => Response.json({ skipped: 'Not 08:30 in Ireland' }));
    await GET(request());
    expect(inserts[0]).toMatchObject({ job: 'agent-counts', outcome: 'skipped' });
  });

  it('saves a job error as failed', async () => {
    const GET = withCronLog('reminders', async () => Response.json({ error: 'VAPID keys missing', removed: 0 }, { status: 503 }));
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(inserts[0]).toMatchObject({ outcome: 'failed', status: 503, summary: { error: 'VAPID keys missing', removed: 0 } });
  });

  it('turns a job that throws into a saved 500 instead of losing it', async () => {
    const GET = withCronLog('weekly-report', async () => {
      throw new Error('AI provider down');
    });
    const res = await GET(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'AI provider down' });
    expect(inserts[0]).toMatchObject({ outcome: 'failed', status: 500, summary: { error: 'AI provider down' } });
  });

  it('still answers when the run cannot be saved (migration not run, or the database is down)', async () => {
    for (const mode of ['error', 'throw'] as const) {
      insertFails = mode;
      const GET = withCronLog('weekly-report', async () => Response.json({ created: 1 }));
      const res = await GET(request());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ created: 1 });
    }
    expect(inserts).toHaveLength(0);
  });

  it('keeps the status of an answer that is not JSON', async () => {
    const GET = withCronLog('reminders', async () => new Response('ok', { status: 200 }));
    await GET(request());
    expect(inserts[0]).toMatchObject({ status: 200, outcome: 'ok', summary: {} });
  });
});
