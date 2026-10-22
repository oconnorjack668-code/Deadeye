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

import { checkFounderPost } from '@/lib/founderPosts';
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

describe('POST /api/founder/posts', () => {
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
