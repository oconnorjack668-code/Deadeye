// @vitest-environment node
// __tests__/competition-routes.test.ts
// /api/competition (entering), /api/competition/resend and
// /api/parents/competition (a parent's answer). What must hold: an under-18
// entry waits for a parent and the player never gets the parent's link; the
// server, not the form, decides the age route, the session and the team; and
// nothing is saved after the closing time.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompetitionState } from '@/lib/competition-server';
import { COMPETITION_CLOSES_AT } from '@/lib/competition';

const FEEDBACK = 'I liked the shot tracker. I would change how long the camera takes to start.';
const TEAM = '11111111-2222-4333-8444-555555555555';
const TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

let user: { id: string; email: string | null } | null;
let state: CompetitionState;
let emailOn = true;
let sendResult: 'sent' | 'off' | 'failed' = 'sent';
const sendCalls: Array<[string, string]> = [];
const inserted: Array<Record<string, unknown>> = [];
const updates: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = [];
let insertError: { code: string } | null = null;
let found: Record<string, unknown> | null = null;

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => user }));
vi.mock('@/lib/email', () => ({ emailConfigured: () => emailOn }));
vi.mock('@/lib/competition-server', () => ({
  loadCompetitionState: async () => state,
  sendParentLink: async (_admin: unknown, id: string, origin: string) => {
    sendCalls.push([id, origin]);
    return sendResult;
  },
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        const result = { data: insertError ? null : { id: 'entry-1' }, error: insertError };
        return Object.assign(Promise.resolve(result), { select: () => ({ single: async () => result }) });
      },
      update: (values: Record<string, unknown>) => {
        const u = { values, filters: [] as Array<[string, unknown]> };
        updates.push(u);
        const chain = {
          eq: (col: string, v: unknown) => (u.filters.push([col, v]), chain),
          select: async () => ({ data: [{ id: 'entry-1' }], error: null }),
          then: (resolve: (r: { error: null }) => void) => resolve({ error: null }),
        };
        return chain;
      },
      select: () => {
        const chain = { eq: () => chain, maybeSingle: async () => ({ data: found }) };
        return chain;
      },
    }),
  }),
}));

function baseState(over: Partial<CompetitionState> = {}): CompetitionState {
  return {
    route: 'adult',
    facts: { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '18-22' },
    accountParentName: null,
    hasSession: true,
    playerEntry: null,
    clubEntry: null,
    coachTeams: null,
    coachClubName: null,
    ...over,
  };
}

async function call(path: 'enter' | 'resend' | 'parent', method: 'POST' | 'PATCH', body: unknown) {
  const mod =
    path === 'enter'
      ? await import('@/app/api/competition/route')
      : path === 'resend'
        ? await import('@/app/api/competition/resend/route')
        : await import('@/app/api/parents/competition/route');
  const handler = (mod as Record<string, (r: Request) => Promise<Response>>)[method];
  const res = await handler(new Request('https://deadeye.test/api/x', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), text };
}

describe('entering the competition', () => {
  beforeEach(() => {
    user = { id: 'user-1', email: 'kid@example.ie' };
    state = baseState();
    emailOn = true;
    sendResult = 'sent';
    insertError = null;
    found = null;
    sendCalls.length = 0;
    inserted.length = 0;
    updates.length = 0;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    vi.stubEnv('COMPETITION_LIVE', '1');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('takes and changes nothing before launch (COMPETITION_LIVE off)', async () => {
    vi.stubEnv('COMPETITION_LIVE', '');
    const { status, body } = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true });
    expect(status).toBe(403);
    expect(body.error).toMatch(/not open/);
    expect((await call('enter', 'PATCH', { kind: 'player', feedback: FEEDBACK })).status).toBe(403);
    expect((await call('resend', 'POST', {})).status).toBe(403);
    expect(inserted).toHaveLength(0);
    expect(updates).toHaveLength(0);
    expect(sendCalls).toHaveLength(0);
  });

  it('counts an adult entry straight away, with no parent and no email', async () => {
    const { status, body } = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true });
    expect(status).toBe(201);
    expect(body).toEqual({ status: 'valid' });
    expect(inserted[0]).toMatchObject({ user_id: 'user-1', kind: 'player', status: 'valid', parent_email: null, parent_token: null });
    expect(sendCalls).toHaveLength(0);
  });

  it('holds an under-16 entry for the approving parent, emails them, and never returns the link', async () => {
    state = baseState({
      route: 'under16',
      facts: { ageCheck: { is_16_plus: false, consent_status: 'approved', parent_email: 'mam@example.ie' }, ageBracket: '13' },
      accountParentName: 'Mary Byrne',
    });
    // A child cannot redirect the email to themselves through the form
    const { status, body, text } = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true, parentEmail: 'kid2@example.ie' });
    expect(status).toBe(201);
    expect(body).toEqual({ status: 'pending_parent', emailed: true, emailOn: true });
    expect(inserted[0]).toMatchObject({ status: 'pending_parent', parent_email: 'mam@example.ie', parent_name: 'Mary Byrne' });
    expect(sendCalls).toEqual([['entry-1', 'https://deadeye.test']]);
    expect(text).not.toContain(inserted[0].parent_token as string);
    expect(text).not.toMatch(/parents\/competition/);
  });

  it('asks a 16 or 17 year old for a parent, and refuses their own email', async () => {
    state = baseState({ route: 'ask-parent', facts: { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '14-17' } });
    const own = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true, parentConfirm: true, parentName: 'Mary Byrne', parentEmail: 'kid@example.ie' });
    expect(own.status).toBe(400);
    expect(inserted).toHaveLength(0);

    const ok = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true, parentConfirm: true, parentName: 'Mary Byrne', parentEmail: 'mary@example.ie' });
    expect(ok.status).toBe(201);
    expect(inserted[0]).toMatchObject({ status: 'pending_parent', parent_email: 'mary@example.ie' });
  });

  it('keeps the entry waiting when email is not set up yet', async () => {
    state = baseState({ route: 'ask-parent', facts: { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '14-17' } });
    emailOn = false;
    sendResult = 'off';
    const { status, body } = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true, parentConfirm: true, parentName: 'Mary Byrne', parentEmail: 'mary@example.ie' });
    expect(status).toBe(201);
    expect(body).toEqual({ status: 'pending_parent', emailed: false, emailOn: false });
  });

  it('needs a logged session, and one entry per person', async () => {
    state = baseState({ hasSession: false });
    expect((await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true })).status).toBe(400);
    state = baseState();
    insertError = { code: '23505' };
    expect((await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true })).status).toBe(409);
  });

  it('saves nothing after the closing time', async () => {
    vi.setSystemTime(COMPETITION_CLOSES_AT);
    const { status, body } = await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true });
    expect(status).toBe(403);
    expect(body.error).toMatch(/closed/);
    expect((await call('enter', 'PATCH', { kind: 'player', feedback: FEEDBACK })).status).toBe(403);
    expect(inserted).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it('refuses anyone signed out', async () => {
    user = null;
    expect((await call('enter', 'POST', { kind: 'player', feedback: FEEDBACK, agree: true })).status).toBe(401);
  });

  it('lets only an adult head coach enter a club, with a team where a player has trained', async () => {
    const club = { kind: 'club', clubName: 'Wexford Wildcats BC', teamId: TEAM, clubKnows: true, agree: true, feedback: FEEDBACK };
    expect((await call('enter', 'POST', club)).status).toBe(403);

    state = baseState({ coachTeams: [{ id: TEAM, name: 'U16 Girls', clubName: null, playersWhoTrained: 0 }] });
    expect((await call('enter', 'POST', club)).status).toBe(400);

    state = baseState({ coachTeams: [{ id: TEAM, name: 'U16 Girls', clubName: null, playersWhoTrained: 2 }] });
    expect((await call('enter', 'POST', { ...club, teamId: '99999999-2222-4333-8444-555555555555' })).status).toBe(400);
    const ok = await call('enter', 'POST', club);
    expect(ok.status).toBe(201);
    expect(inserted.at(-1)).toMatchObject({ kind: 'club', team_id: TEAM, club_key: 'wexford wildcats', club_knows: true, status: 'valid' });

    insertError = { code: '23505' };
    expect((await call('enter', 'POST', club)).body.error).toMatch(/already been entered/);
  });

  it('changes only the signed-in player’s own feedback', async () => {
    const { status } = await call('enter', 'PATCH', { kind: 'player', feedback: FEEDBACK });
    expect(status).toBe(200);
    expect(updates[0].values).toMatchObject({ feedback: FEEDBACK });
    expect(updates[0].filters).toEqual([
      ['user_id', 'user-1'],
      ['kind', 'player'],
    ]);
  });
});

describe('sending the parent link again', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.stubEnv('COMPETITION_LIVE', '1');
    user = { id: 'user-1', email: 'kid@example.ie' };
    emailOn = true;
    sendResult = 'sent';
    sendCalls.length = 0;
  });

  it('only once the first link ran out unanswered', async () => {
    found = { id: 'entry-1', status: 'pending_parent', parent_token_sent_at: new Date().toISOString(), parent_decided_at: null };
    expect((await call('resend', 'POST', {})).status).toBe(409);
    found = { ...found, parent_token_sent_at: new Date(Date.now() - 8 * 86_400_000).toISOString() };
    const { status, text } = await call('resend', 'POST', {});
    expect(status).toBe(200);
    expect(sendCalls).toHaveLength(1);
    expect(text).not.toMatch(/parents\/competition/);
  });

  it('says so when email is not set up', async () => {
    emailOn = false;
    expect((await call('resend', 'POST', {})).status).toBe(503);
  });
});

describe('a parent answering', () => {
  beforeEach(() => {
    updates.length = 0;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('declines or approves with a live link', async () => {
    found = { id: 'entry-1', status: 'pending_parent', parent_token_sent_at: new Date().toISOString(), parent_decided_at: null };
    const { status, body } = await call('parent', 'POST', { token: TOKEN, decision: 'decline' });
    expect(status).toBe(200);
    expect(body).toEqual({ status: 'declined' });
    expect(updates[0].values).toMatchObject({ status: 'declined' });
    expect(updates[0].values.parent_decided_at).toBeTruthy();
  });

  it('refuses a link that ran out, a bad token and an unknown one', async () => {
    found = { id: 'entry-1', status: 'pending_parent', parent_token_sent_at: new Date(Date.now() - 8 * 86_400_000).toISOString(), parent_decided_at: null };
    expect((await call('parent', 'POST', { token: TOKEN, decision: 'approve' })).status).toBe(409);
    expect((await call('parent', 'POST', { token: 'nope', decision: 'approve' })).status).toBe(400);
    found = null;
    expect((await call('parent', 'POST', { token: TOKEN, decision: 'approve' })).status).toBe(404);
    expect(updates).toHaveLength(0);
  });
});
