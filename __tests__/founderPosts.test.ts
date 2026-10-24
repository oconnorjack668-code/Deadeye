// @vitest-environment node
// __tests__/founderPosts.test.ts
// Founder posts (00050): only the account players can follow (the owner role)
// may post or remove a post, and a post is plain text of at most 500 characters.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { user: null as { id: string; email: string } | null };
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => auth.user }));
const roles = { owners: new Set<string>() };
vi.mock('@/lib/owners-server', () => ({ ownersAmong: async () => roles.owners }));

const db = { inserted: [] as Array<Record<string, unknown>>, deleted: [] as Array<Array<[string, unknown]>> };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        db.inserted.push(row);
        return { select: () => ({ single: async () => ({ data: { id: 'p1', ...row, created_at: '2026-10-22T10:00:00Z' }, error: null }) }) };
      },
      delete: () => {
        const filters: Array<[string, unknown]> = [];
        db.deleted.push(filters);
        const q = {
          eq: (c: string, v: unknown) => {
            filters.push([c, v]);
            return filters.length === 2 ? Promise.resolve({ error: null }) : q;
          },
        };
        return q;
      },
    }),
  }),
}));

import { checkFounderPost, founderNoticeCutoff, FOUNDER_NOTICE_DAYS } from '@/lib/founderPosts';
import { POST, DELETE } from '@/app/api/founder/posts/route';

const FOUNDER = { id: 'founder-1', email: 'founder@example.com' };
const POST_ID = '6f22fc5a-0bbb-41eb-96cc-ddee1ed5666d';

function send(body: unknown) {
  return POST(new Request('http://localhost/api/founder/posts', { method: 'POST', body: JSON.stringify(body) }));
}
function remove(id: string) {
  return DELETE(new Request(`http://localhost/api/founder/posts?id=${id}`, { method: 'DELETE' }));
}

beforeEach(() => {
  auth.user = FOUNDER;
  roles.owners = new Set([FOUNDER.id]);
  db.inserted = [];
  db.deleted = [];
});

describe('checkFounderPost', () => {
  it('keeps a challenge, tip or update, trimmed', () => {
    expect(checkFounderPost({ kind: 'tip', body: '  Follow through.  ' })).toEqual({ kind: 'tip', body: 'Follow through.' });
  });

  it('refuses an unknown kind, an empty post and one over 500 characters', () => {
    expect(checkFounderPost({ kind: 'promo', body: 'x' })).toHaveProperty('error');
    expect(checkFounderPost({ kind: 'tip', body: '   ' })).toHaveProperty('error');
    expect(checkFounderPost({ kind: 'tip', body: 'x'.repeat(501) })).toHaveProperty('error');
    expect(checkFounderPost({ kind: 'tip', body: 'x'.repeat(500) })).not.toHaveProperty('error');
  });
});

describe('a post to every player', () => {
  it('is flagged only when asked for with exactly true', () => {
    expect(checkFounderPost({ kind: 'update', body: 'Hi', everyone: true })).toEqual({ kind: 'update', body: 'Hi', everyone: true });
    expect(checkFounderPost({ kind: 'update', body: 'Hi', everyone: false })).toEqual({ kind: 'update', body: 'Hi' });
    expect(checkFounderPost({ kind: 'update', body: 'Hi', everyone: 'true' })).toEqual({ kind: 'update', body: 'Hi' });
  });

  it('refuses a link, handle or phone number in a post to everyone, but not in a follower post', () => {
    for (const body of ['See https://example.com', 'Visit www.deadeye.ie', 'Try deadeyeapp.vercel.app', 'DM me @hoops', 'Call 087 123 4567', 'Text 0871234567']) {
      expect(checkFounderPost({ kind: 'update', body, everyone: true }), body).toHaveProperty('error');
    }
    expect(checkFounderPost({ kind: 'update', body: 'Visit www.deadeye.ie' })).not.toHaveProperty('error');
  });

  it('allows ordinary numbers and punctuation in a post to everyone', () => {
    for (const body of ['50 free throws a day, 3 to 6 metres out.', 'Week 1: 10 shots, then 25.', 'Deadeye is early, so bugs happen. Sorry!']) {
      expect(checkFounderPost({ kind: 'update', body, everyone: true }), body).not.toHaveProperty('error');
    }
  });

  it('keeps showing for the notice window and no longer', () => {
    const now = new Date('2026-11-14T12:00:00Z');
    expect(FOUNDER_NOTICE_DAYS).toBe(14);
    expect(founderNoticeCutoff(now)).toBe('2026-10-31T12:00:00.000Z');
  });
});

describe('POST /api/founder/posts', () => {
  it('saves a post for every player with the flag, and a follower post without it', async () => {
    const res = await send({ kind: 'update', body: 'Early days, sorry for any bugs.', everyone: true });
    expect(res.status).toBe(200);
    expect(db.inserted[0]).toEqual({ author_id: FOUNDER.id, kind: 'update', body: 'Early days, sorry for any bugs.', everyone: true });
    await send({ kind: 'update', body: 'Followers only.' });
    expect(db.inserted[1]).not.toHaveProperty('everyone');
  });

  it('does not let a player post to everyone', async () => {
    roles.owners = new Set();
    expect((await send({ kind: 'update', body: 'hi', everyone: true })).status).toBe(403);
    expect(db.inserted).toEqual([]);
  });

  it('saves the founder post under their own id', async () => {
    const res = await send({ kind: 'challenge', body: '50 free throws a day this week.' });
    expect(res.status).toBe(200);
    expect(db.inserted).toEqual([{ author_id: FOUNDER.id, kind: 'challenge', body: '50 free throws a day this week.' }]);
  });

  it('refuses a player, and an owner by email without the owner role players follow', async () => {
    roles.owners = new Set();
    expect((await send({ kind: 'tip', body: 'hi' })).status).toBe(403);
    expect(db.inserted).toEqual([]);
  });

  it('refuses a post the rules refuse, before saving', async () => {
    expect((await send({ kind: 'tip', body: '' })).status).toBe(400);
    expect(db.inserted).toEqual([]);
  });

  it('asks a signed-out visitor to log in', async () => {
    auth.user = null;
    expect((await send({ kind: 'tip', body: 'hi' })).status).toBe(401);
  });
});

describe('DELETE /api/founder/posts', () => {
  it('removes only a post the founder wrote', async () => {
    expect((await remove(POST_ID)).status).toBe(200);
    expect(db.deleted).toEqual([
      [
        ['id', POST_ID],
        ['author_id', FOUNDER.id],
      ],
    ]);
  });

  it('refuses a player and a missing id', async () => {
    expect((await remove('not-an-id')).status).toBe(400);
    roles.owners = new Set();
    expect((await remove(POST_ID)).status).toBe(403);
    expect(db.deleted).toEqual([]);
  });
});
