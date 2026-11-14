// @vitest-environment node
// __tests__/film-actions.test.ts
// The film server actions: answers are marked on the server from the clip as
// it is stored (a Pro clip only for Pro, or when the coach set it), notes are
// capped and private, only coaches build packs, and the owner clip picker
// refuses a video YouTube will not let other sites play.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fakeClient, fakeState, type FakeState } from './support/supabaseFake';

const auth = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null, pro: false, owner: false, waiting: false }));
const db = vi.hoisted(() => ({ state: null as unknown as FakeState, admin: null as unknown as FakeState }));

// Film is open in these tests; film-live.test.ts covers it closed
process.env.FILM_LIVE = 'true';
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => auth.user,
  getHasPro: async () => auth.pro,
  checkIsOwner: async () => auth.owner,
  awaitingParentApproval: async () => auth.waiting,
  PARENT_APPROVAL_NEEDED: 'Waiting for a parent.',
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(db.state) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeClient(db.admin) }));

import { createPack, saveFilmNote, submitFilmAttempt } from '@/app/(app)/film/actions';
import { saveFilmClip } from '@/app/(app)/admin/demo-videos/filmActions';

const CLIP = '00000000-0000-4000-8000-000000000001';
const row = (is_free: boolean) => ({
  id: CLIP,
  youtube_video_id: 'abcdefghijk',
  start_s: 0,
  end_s: 30,
  title: 'Help side',
  channel_name: 'Official League',
  theme: 'help_defence',
  level: 'beginner',
  questions: [
    { key: 'q1', question: 'Where?', options: ['Gap', 'Corner'], correct_index: 0, explanation: '', moment_s: 10 },
    { key: 'q2', question: 'Next?', options: ['Skip', 'Drive'], correct_index: 1, explanation: '', moment_s: 20 },
  ],
  is_free,
});

beforeEach(() => {
  auth.user = { id: 'user-1' };
  auth.pro = false;
  auth.owner = false;
  auth.waiting = false;
  db.state = fakeState();
  db.admin = fakeState();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('submitFilmAttempt', () => {
  it('marks the answers on the server and keeps the attempt with its score and total', async () => {
    db.state.tables.film_clips = [row(true)];
    const res = await submitFilmAttempt(CLIP, [
      { key: 'q1', pick: 0 },
      { key: 'q2', pick: 0 },
    ]);
    expect(res).toEqual({ ok: true, score: 1, total: 2 });
    expect(db.state.writes).toEqual([
      expect.objectContaining({
        table: 'film_attempts',
        op: 'insert',
        values: { user_id: 'user-1', clip_id: CLIP, score: 1, total: 2, answers: [
          { key: 'q1', pick: '0', right: true },
          { key: 'q2', pick: '0', right: false },
        ] },
      }),
    ]);
  });

  it('takes answers on any clip on Free: film is never part of Pro (YouTube III.F.3.a)', async () => {
    db.state.tables.film_clips = [row(false)];
    const picks = [
      { key: 'q1', pick: 0 },
      { key: 'q2', pick: 1 },
    ];
    expect(await submitFilmAttempt(CLIP, picks)).toEqual({ ok: true, score: 2, total: 2 });
  });

  it('refuses half-answered clips, bad ids, and anyone waiting for a parent', async () => {
    db.state.tables.film_clips = [row(true)];
    expect(await submitFilmAttempt(CLIP, [{ key: 'q1', pick: 0 }])).toEqual({ ok: false, error: 'Answer every question first.' });
    expect(await submitFilmAttempt('nope', [])).toMatchObject({ ok: false });
    auth.waiting = true;
    expect(await submitFilmAttempt(CLIP, [])).toEqual({ ok: false, error: 'Waiting for a parent.' });
    expect(db.state.writes).toEqual([]);
  });
});

describe('saveFilmNote', () => {
  it('keeps a note for the signed-in player, and deletes an empty one', async () => {
    expect(await saveFilmNote(CLIP, '  Watch the low man  ')).toEqual({ ok: true });
    expect(db.state.writes[0]).toMatchObject({ table: 'film_notes', op: 'insert', values: { user_id: 'user-1', clip_id: CLIP, body: 'Watch the low man' } });
    expect(await saveFilmNote(CLIP, '   ')).toEqual({ ok: true });
    expect(db.state.writes[1]).toMatchObject({ table: 'film_notes', op: 'delete', filters: [['user_id', 'user-1'], ['clip_id', CLIP]] });
  });

  it('refuses a note over 500 characters', async () => {
    expect(await saveFilmNote(CLIP, 'x'.repeat(501))).toEqual({ ok: false, error: 'Keep a note to 500 characters.' });
    expect(db.state.writes).toEqual([]);
  });
});

describe('createPack', () => {
  it('is for coaches only', async () => {
    expect(await createPack('Help defence')).toEqual({ ok: false, error: 'Only coaches can build packs. Finish coach setup first.' });
    expect(db.state.writes).toEqual([]);
  });

  it('makes a pack owned by the coach, starting with the clip', async () => {
    db.state.tables.coach_profiles = [{ user_id: 'user-1' }];
    expect(await createPack('  Help defence  ', CLIP)).toEqual({ ok: true, id: 'new-play-id' });
    expect(db.state.writes.map((w) => [w.table, w.values])).toEqual([
      ['film_packs', { owner_id: 'user-1', title: 'Help defence' }],
      ['film_pack_clips', { pack_id: 'new-play-id', clip_id: CLIP, position: 0 }],
    ]);
  });
});

describe('saveFilmClip (owner clip picker)', () => {
  const draft = {
    link: 'https://youtu.be/abcdefghijk',
    start: '0:00',
    end: '0:30',
    title: 'Help side',
    channel: 'Official League',
    theme: 'help_defence',
    level: 'beginner',
    isFree: true,
    published: true,
    questions: row(true).questions,
  };

  it('is for the owner only', async () => {
    expect(await saveFilmClip(draft)).toEqual({ ok: false, error: 'Owner only.' });
  });

  it('refuses a video whose channel does not allow embedding, before storing anything', async () => {
    auth.owner = true;
    const fetchMock = vi.fn(async () => new Response('Unauthorized', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await saveFilmClip(draft);
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/does not allow/) });
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(/^https:\/\/www\.youtube\.com\/oembed\?url=/);
    expect(db.admin.writes).toEqual([]);
  });

  it('saves and publishes a video YouTube confirms', async () => {
    auth.owner = true;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ title: 'T', author_name: 'Official League' }), { status: 200 })));
    const res = await saveFilmClip(draft);
    expect(res).toEqual({ ok: true, id: 'new-play-id' });
    expect(db.admin.writes[0]).toMatchObject({
      table: 'film_clips',
      op: 'insert',
      values: { youtube_video_id: 'abcdefghijk', start_s: 0, end_s: 30, is_free: true, published_at: expect.any(String) },
    });
  });
});
