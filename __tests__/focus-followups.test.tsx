import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// --- module mocks -----------------------------------------------------------

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh, push: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

let currentUser: { id: string } | null = { id: 'user-1' };
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => currentUser }));

/** A Supabase query builder stand-in: records every .eq() and answers at the end. */
function query(result: { data?: unknown; error?: unknown }, log: Array<[string, unknown]>) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'delete']) q[m] = () => q;
  q.eq = (col: string, val: unknown) => {
    log.push([col, val]);
    return q;
  };
  q.maybeSingle = async () => ({ data: result.data ?? null });
  q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: result.error ?? null }).then(ok);
  return q;
}

let ownRow: unknown = { id: 'plan-1' };
const rlsLog: Array<[string, unknown]> = [];
const adminLog: Array<[string, unknown]> = [];
let adminDeletes = 0;
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: () => query({ data: ownRow }, rlsLog) }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      adminDeletes++;
      return query({ error: null }, adminLog);
    },
  }),
}));

import { matchWeaknesses, clauses } from '@/lib/focus/weaknesses';
import { DELETE } from '@/app/api/focus/plan/[id]/route';
import { AiPlanView } from '@/app/(app)/focus/AiPlanView';
import { FocusFinder } from '@/app/(app)/focus/FocusFinder';

// --- matcher: "give up threes" is defence ---------------------------------------

describe('matchWeaknesses in defensive clauses', () => {
  it.each([
    ['We give up open corner threes and never box out', ['closeouts_help', 'boxing_out'], ['catch_shoot']],
    ['they get past us every time', ['on_ball_defense'], ['beat_defender']],
    ['we allow too many offensive rebounds', ['boxing_out'], ['offensive_rebounding']],
    ['teams run fast breaks on us', ['transition_defense'], ['transition_offense']],
    ['they kill us with the pick and roll', ['pnr_defense'], ['pnr_reads']],
    ['opponents hit threes against us', ['closeouts_help'], ['catch_shoot']],
  ])('"%s"', (text, has, hasNot) => {
    const ids = matchWeaknesses(text);
    for (const id of has) expect(ids).toContain(id);
    for (const id of hasNot) expect(ids).not.toContain(id);
  });

  it('leaves attacking clauses alone, even next to a defensive one', () => {
    const ids = matchWeaknesses('I miss open threes. But we also give up layups');
    expect(ids).toContain('catch_shoot');
    expect(ids).toContain('closeouts_help');
    expect(matchWeaknesses('I miss open catch and shoot threes')).toEqual(['catch_shoot']);
  });

  it('does not treat giving up as a mindset as defence', () => {
    const ids = matchWeaknesses('I give up when I miss shots');
    expect(ids).not.toContain('closeouts_help');
  });

  it('splits clauses on punctuation and "but", not on "and"', () => {
    expect(clauses('We give up threes, and turnovers. But rebounding is fine!')).toEqual([
      'We give up threes',
      'and turnovers',
      'rebounding is fine',
    ]);
    expect(clauses('catch and shoot')).toEqual(['catch and shoot']);
  });
});

// --- deleting one plan ----------------------------------------------------------

describe('DELETE /api/focus/plan/[id]', () => {
  const ID = '7da01061-2b13-4ad7-824b-b06a95243bc6';
  const call = (id: string) => DELETE(new Request('http://x'), { params: Promise.resolve({ id }) } as never);

  beforeEach(() => {
    currentUser = { id: 'user-1' };
    ownRow = { id: ID };
    rlsLog.length = 0;
    adminLog.length = 0;
    adminDeletes = 0;
  });

  it('needs a signed-in player', async () => {
    currentUser = null;
    expect((await call(ID)).status).toBe(401);
  });

  it('refuses a plan that is not the player own Focus plan, without touching the admin client', async () => {
    ownRow = null;
    expect((await call(ID)).status).toBe(404);
    expect((await call('not-an-id')).status).toBe(404);
    expect(adminDeletes).toBe(0);
  });

  it('deletes only that row, only for that player, only a Focus plan', async () => {
    const res = await call(ID);
    expect(res.status).toBe(200);
    expect(rlsLog).toEqual(expect.arrayContaining([['id', ID], ['user_id', 'user-1'], ['report_type', 'development_plan']]));
    expect(adminLog).toEqual([['id', ID], ['user_id', 'user-1'], ['report_type', 'development_plan']]);
  });
});

// --- the plan view's two-tap delete ---------------------------------------------

describe('AiPlanView delete', () => {
  const plan = { summary: 'S', focus: [], film: [], drills: [], reads: [], week: [], measure: '' };

  it('asks once more before deleting, then calls the route and reports back', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const onDeleted = vi.fn();
    render(
      <AiPlanView planId="plan-1" plan={plan} drillsById={new Map()} lessonsById={new Map()} guidesBySlug={new Map()} onClose={vi.fn()} onDeleted={onDeleted} />
    );
    fireEvent.click(screen.getByRole('button', { name: /delete this plan/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /tap again to delete/i }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/focus/plan/plan-1', { method: 'DELETE' });
    vi.unstubAllGlobals();
  });

  it('can be backed out of', () => {
    render(
      <AiPlanView planId="plan-1" plan={plan} drillsById={new Map()} lessonsById={new Map()} guidesBySlug={new Map()} onClose={vi.fn()} onDeleted={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /delete this plan/i }));
    fireEvent.click(screen.getByRole('button', { name: /keep it/i }));
    expect(screen.getByRole('button', { name: /delete this plan/i })).toBeTruthy();
  });
});

// --- arrow keys on the For me / For my team switch ---------------------------

describe('For me / For my team switch', () => {
  it('is one tab stop and arrow keys move and choose', () => {
    render(
      <FocusFinder
        content={{ drills: [], lessons: [], guides: [] }}
        signals={[]}
        teams={[{ id: 't1', name: 'Blazers U14', level: null, ageGroup: 'U14' }]}
        initialIds={[]}
        initialMode="player"
        initialTeamId="t1"
        fromCoach={false}
        playerLevel={null}
        savedPlan={null}
        recentPlans={[]}
        aiBlocked="off"
        aiCompany={null}
        reportsLeft={null}
        myId="user-1"
      />
    );
    const me = screen.getByRole('radio', { name: 'For me' });
    const team = screen.getByRole('radio', { name: 'For my team' });
    expect(me.getAttribute('tabindex')).toBe('0');
    expect(team.getAttribute('tabindex')).toBe('-1');

    fireEvent.keyDown(me, { key: 'ArrowRight' });
    expect(team.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(team);
    expect(screen.getByText('What is your team struggling with?')).toBeTruthy();

    fireEvent.keyDown(team, { key: 'ArrowRight' });
    expect(me.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(me);
  });
});
