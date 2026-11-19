// @vitest-environment node
// __tests__/competition-server.test.ts
// The two server jobs in src/lib/competition-server.ts that act on their own:
// emailing a parent (never before launch or after closing) and the daily
// clean-up that makes the deletion dates in the rules and privacy policy true.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { COMPETITION_CLOSES_AT, ENTRIES_DELETED_FROM, PARENT_DETAILS_CLEARED_FROM } from '@/lib/competition';

const sent: Array<{ to: string; subject: string; text: string }> = [];
vi.mock('@/lib/email', () => ({
  emailConfigured: () => true,
  sendEmail: async (m: { to: string; subject: string; text: string }) => void sent.push(m),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));

import { applyCompetitionRetention, sendParentLink } from '@/lib/competition-server';

type Call = { op: string; values?: Record<string, unknown>; filter?: unknown[] };
const calls: Call[] = [];
let isSixteenPlus = false;

/** A stand-in admin client that records what is written. */
function fakeAdmin() {
  return {
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq: () => chain,
          maybeSingle: async () => {
            if (table === 'competition_entries') {
              return { data: { user_id: 'u1', parent_name: 'Mary', parent_email: 'mary@example.ie', status: 'pending_parent' } };
            }
            if (table === 'age_checks') return { data: { is_16_plus: isSixteenPlus } };
            return { data: { display_name: 'Aoife Byrne' } };
          },
        };
        return chain;
      },
      update: (values: Record<string, unknown>) => {
        const call: Call = { op: 'update', values };
        calls.push(call);
        const chain = {
          eq: async () => ({ error: null }),
          not: async (...filter: unknown[]) => ((call.filter = filter), { error: null }),
        };
        return chain;
      },
      delete: () => ({ not: async (...filter: unknown[]) => (calls.push({ op: 'delete', filter }), { error: null }) }),
    }),
  } as never;
}

describe('emailing a parent', () => {
  beforeEach(() => {
    sent.length = 0;
    calls.length = 0;
    isSixteenPlus = false;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('sends nothing before launch, and nothing after closing', async () => {
    vi.stubEnv('COMPETITION_LIVE', '');
    expect(await sendParentLink(fakeAdmin(), 'e1', 'https://deadeye.test')).toBe('off');
    vi.stubEnv('COMPETITION_LIVE', '1');
    vi.setSystemTime(COMPETITION_CLOSES_AT);
    expect(await sendParentLink(fakeAdmin(), 'e1', 'https://deadeye.test')).toBe('off');
    expect(sent).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it('when live, emails a fresh link built on the request address, and marks it sent after', async () => {
    vi.stubEnv('COMPETITION_LIVE', '1');
    expect(await sendParentLink(fakeAdmin(), 'e1', 'https://deadeye.test')).toBe('sent');
    const token = calls[0].values?.parent_token as string;
    expect(calls[0].values).toMatchObject({ parent_token_sent_at: null });
    expect(sent[0].to).toBe('mary@example.ie');
    expect(sent[0].text).toContain(`https://deadeye.test/parents/competition/${token}`);
    expect(sent[0].text).toContain('https://deadeye.test/privacy');
    expect(sent[0].text).toMatch(/You are the parent or guardian who approved Aoife's Deadeye account/);
    expect(calls[1].values?.parent_token_sent_at).toBeTruthy();
  });

  it('tells the parent of a 16 or 17 year old that the player gave their address', async () => {
    vi.stubEnv('COMPETITION_LIVE', '1');
    isSixteenPlus = true;
    await sendParentLink(fakeAdmin(), 'e1', 'https://deadeye.test');
    expect(sent[0].text).toMatch(/Aoife gave us your email address to ask your permission/);
  });
});

describe('the daily clean-up of entries', () => {
  beforeEach(() => (calls.length = 0));

  it('does nothing before closing', async () => {
    expect(await applyCompetitionRetention(fakeAdmin(), new Date('2026-12-01T12:00:00Z'))).toEqual({ step: 'none', failed: 0 });
    expect(calls).toHaveLength(0);
  });

  it('clears parent links from closing', async () => {
    await applyCompetitionRetention(fakeAdmin(), COMPETITION_CLOSES_AT);
    expect(calls).toEqual([{ op: 'update', values: { parent_token: null }, filter: ['parent_token', 'is', null] }]);
  });

  it('clears parent names and emails after the offer ends', async () => {
    await applyCompetitionRetention(fakeAdmin(), PARENT_DETAILS_CLEARED_FROM);
    expect(calls.map((c) => c.values)).toEqual([{ parent_token: null }, { parent_email: null, parent_name: null }]);
  });

  it('deletes every entry after 30 September 2027', async () => {
    await applyCompetitionRetention(fakeAdmin(), ENTRIES_DELETED_FROM);
    expect(calls).toEqual([{ op: 'delete', filter: ['id', 'is', null] }]);
  });
});
