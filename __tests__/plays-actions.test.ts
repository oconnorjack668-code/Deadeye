// @vitest-environment node
// __tests__/plays-actions.test.ts
// The plays server actions: saving a coach's play is checked on the server
// (signed in, a coach, a diagram that passes the shared validator) and the
// Free limit comes back in plain words; edits and deletes touch only the
// coach's own rows; a quiz is marked on the server from the play itself, and
// a Pro play opens for the quiz when the player's coach set it.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LIBRARY_PLAYS } from '@/data/plays/library';
import { setupDiagram } from '@/lib/plays/setups';
import { fakeClient, fakeState, type FakeState } from './support/supabaseFake';

const auth = vi.hoisted(() => ({ user: { id: 'coach-1' } as { id: string } | null, waiting: false, pro: false }));
const db = vi.hoisted(() => ({ state: null as unknown as FakeState }));

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => auth.user,
  awaitingParentApproval: async () => auth.waiting,
  getHasPro: async () => auth.pro,
  PARENT_APPROVAL_NEEDED: 'A parent or guardian needs to approve your account first.',
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(db.state) }));

import { deletePlay, savePlay, submitQuizAttempt } from '@/app/(app)/plays/actions';

const PLAY_ID = '00000000-0000-4000-8000-000000000001';
const floppy = LIBRARY_PLAYS.find((p) => p.slug === 'floppy')!;
const fourOut = LIBRARY_PLAYS.find((p) => p.slug === 'four-out-one-in')!;
const libraryRow = (p: typeof floppy, id: string) => ({ id, owner_id: null, ...p, slug: undefined });

const input = (over: Record<string, unknown> = {}) => ({
  title: 'Horns flare',
  category: 'half_court',
  minAge: 'U12',
  description: '',
  coachingPoints: ['Wide'],
  diagram: setupDiagram('horns'),
  ...over,
});

beforeEach(() => {
  auth.user = { id: 'coach-1' };
  auth.waiting = false;
  auth.pro = false;
  db.state = fakeState();
  db.state.tables.coach_profiles = [{ user_id: 'coach-1' }];
});

describe('savePlay', () => {
  it('saves a new play owned by the coach, from the checked input', async () => {
    const result = await savePlay(input() as never);
    expect(result).toEqual({ ok: true, id: 'new-play-id' });
    const write = db.state.writes.find((w) => w.table === 'plays')!;
    expect(write.op).toBe('insert');
    expect(write.values).toMatchObject({ owner_id: 'coach-1', title: 'Horns flare', min_age: 'U12', coaching_points: ['Wide'], copied_from: null });
    expect(write.values).not.toHaveProperty('is_free');
  });

  it('refuses someone signed out, waiting for a parent, or not a coach', async () => {
    auth.user = null;
    expect(await savePlay(input() as never)).toMatchObject({ ok: false });
    auth.user = { id: 'player-1' };
    auth.waiting = true;
    expect(await savePlay(input() as never)).toEqual({ ok: false, error: 'A parent or guardian needs to approve your account first.' });
    auth.waiting = false;
    expect(await savePlay(input() as never)).toEqual({ ok: false, error: 'Only coaches can draw plays. Finish coach setup first.' });
    expect(db.state.writes).toEqual([]);
  });

  it('refuses a diagram that does not make sense, before touching the database', async () => {
    const broken = setupDiagram('horns');
    broken.frames[1].positions.o2 = { x: 30, y: 10 };
    const result = await savePlay(input({ diagram: broken }) as never);
    expect(result.ok).toBe(false);
    expect(db.state.writes).toEqual([]);
  });

  it('says the Free limit in plain words when the database refuses a sixth play', async () => {
    db.state.writeErrors.plays = { message: 'Free coaches keep 5 plays', hint: 'play_limit' };
    const result = await savePlay(input() as never);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/On Free you can keep 5 plays/) });
  });

  it('keeps the link to the copied play only when the coach can read it', async () => {
    db.state.tables.plays = [libraryRow(fourOut, PLAY_ID)];
    await savePlay(input({ copiedFrom: PLAY_ID }) as never);
    expect(db.state.writes.at(-1)?.values).toMatchObject({ copied_from: PLAY_ID });
    await savePlay(input({ copiedFrom: '00000000-0000-4000-8000-000000000099' }) as never);
    expect(db.state.writes.at(-1)?.values).toMatchObject({ copied_from: null });
  });

  it('edits only a play the coach owns', async () => {
    db.state.tables.plays = [{ id: PLAY_ID, owner_id: 'coach-1', title: 'Old' }];
    expect(await savePlay(input({ id: PLAY_ID }) as never)).toEqual({ ok: true, id: PLAY_ID });
    const write = db.state.writes.at(-1)!;
    expect(write.op).toBe('update');
    expect(write.filters).toEqual([
      ['id', PLAY_ID],
      ['owner_id', 'coach-1'],
    ]);
    db.state.tables.plays = [{ id: PLAY_ID, owner_id: 'someone-else' }];
    expect(await savePlay(input({ id: PLAY_ID }) as never)).toMatchObject({ ok: false, error: expect.stringMatching(/could not be found/) });
  });
});

describe('deletePlay', () => {
  it('deletes only the coach own play', async () => {
    db.state.tables.plays = [{ id: PLAY_ID, owner_id: 'coach-1' }];
    expect(await deletePlay(PLAY_ID)).toEqual({ ok: true });
    expect(db.state.writes.at(-1)?.filters).toEqual([
      ['id', PLAY_ID],
      ['owner_id', 'coach-1'],
    ]);
    expect(await deletePlay('not-an-id')).toMatchObject({ ok: false });
  });
});

describe('submitQuizAttempt', () => {
  beforeEach(() => {
    auth.user = { id: 'player-1' };
  });

  it('marks the answers on the server and keeps the attempt, with the score it worked out', async () => {
    db.state.tables.plays = [libraryRow(fourOut, PLAY_ID)];
    const result = await submitQuizAttempt(PLAY_ID, [
      { key: 'o1:2', pick: 'basket' },
      { key: 'o5:3', pick: 'left-block' },
      { key: 'o2:6', pick: 'top' },
    ]);
    expect(result).toEqual({ ok: true, score: 2, of: 3, knowsIt: true });
    const write = db.state.writes.find((w) => w.table === 'play_quiz_attempts')!;
    expect(write.values).toEqual({
      user_id: 'player-1',
      play_id: PLAY_ID,
      score: 2,
      answers: [
        { key: 'o1:2', pick: 'basket', right: true },
        { key: 'o5:3', pick: 'left-block', right: true },
        { key: 'o2:6', pick: 'top', right: false },
      ],
    });
  });

  it('wants every question answered', async () => {
    db.state.tables.plays = [libraryRow(fourOut, PLAY_ID)];
    expect(await submitQuizAttempt(PLAY_ID, [{ key: 'o1:2', pick: 'basket' }])).toEqual({ ok: false, error: 'Answer every question first.' });
  });

  it('keeps a Pro play locked on Free, unless the coach set it for the team', async () => {
    db.state.tables.plays = [libraryRow(floppy, PLAY_ID)];
    expect(await submitQuizAttempt(PLAY_ID, [])).toEqual({ ok: false, error: 'This play is part of Pro.' });
    db.state.tables.team_assignments = [{ id: 'a1', play_id: PLAY_ID }];
    const result = await submitQuizAttempt(PLAY_ID, []);
    expect(result).toEqual({ ok: false, error: 'Answer every question first.' });
  });

  it('refuses answers it cannot read', async () => {
    expect(await submitQuizAttempt(PLAY_ID, 'nonsense' as never)).toMatchObject({ ok: false });
    expect(await submitQuizAttempt('floppy', [])).toMatchObject({ ok: false });
  });
});
