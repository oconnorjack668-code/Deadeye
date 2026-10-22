// @vitest-environment node
// __tests__/homeClub.test.ts
// A player's home club (00051): found by club, other name or town, saved only
// from the list, and "club not listed" suggestions that carry no contact details.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { user: { id: 'player-1', email: 'p@example.com' } as { id: string; email: string } | null };
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => auth.user }));
const db = { upserts: [] as unknown[], deletes: [] as unknown[], inserts: [] as unknown[], openSuggestions: 0 };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: async (row: unknown) => {
        db.upserts.push(row);
        return { error: null };
      },
      delete: () => ({
        eq: async (_c: string, v: unknown) => {
          db.deletes.push(v);
          return { error: null };
        },
      }),
      insert: async (row: unknown) => {
        db.inserts.push(row);
        return { error: null };
      },
      select: () => ({ eq: () => ({ eq: async () => ({ count: db.openSuggestions }) }) }),
    }),
  }),
}));

import { CLUBS, checkSuggestion, clubById, clubPlace, searchClubs } from '@/lib/clubs';
import { POST as setClub } from '@/app/api/profile/club/route';
import { POST as suggest } from '@/app/api/clubs/suggest/route';

const post = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  auth.user = { id: 'player-1', email: 'p@example.com' };
  db.upserts = [];
  db.deletes = [];
  db.inserts = [];
  db.openSuggestions = 0;
});

describe('the club list', () => {
  it('has every club once, with an id and a name', () => {
    expect(CLUBS.length).toBeGreaterThan(250);
    expect(new Set(CLUBS.map((c) => c.id)).size).toBe(CLUBS.length);
  });

  it('finds clubs by name, by another name and by town', () => {
    expect(searchClubs('gorey')[0].name).toBe('Gorey Basketball Club');
    expect(searchClubs('wexford blazers')[0].name).toBe('Wexford BC');
    expect(searchClubs('enniscorthy').map((c) => c.name)).toContain('Enniscorthy Basketball Club');
    expect(searchClubs('x')).toEqual([]);
  });

  it('says where a club is', () => {
    expect(clubPlace(clubById('gorey-basketball-club-wexford')!)).toBe('Gorey, Wexford');
  });
});

describe('POST /api/profile/club', () => {
  it('saves a club from the list, hidden from the card unless asked', async () => {
    expect((await post(setClub, { clubId: 'wexford-bc-wexford' })).status).toBe(200);
    expect(db.upserts[0]).toMatchObject({ user_id: 'player-1', club_id: 'wexford-bc-wexford', show_on_card: false });
    await post(setClub, { clubId: 'wexford-bc-wexford', showOnCard: true });
    expect(db.upserts[1]).toMatchObject({ show_on_card: true });
  });

  it('refuses a club that is not in the list', async () => {
    expect((await post(setClub, { clubId: 'made-up-club' })).status).toBe(400);
    expect(db.upserts).toEqual([]);
  });

  it('clears the club for "I am not at a club"', async () => {
    expect((await post(setClub, { clubId: null })).status).toBe(200);
    expect(db.deletes).toEqual(['player-1']);
  });

  it('asks a signed-out visitor to log in', async () => {
    auth.user = null;
    expect((await post(setClub, { clubId: 'wexford-bc-wexford' })).status).toBe(401);
  });
});

describe('club not listed', () => {
  it('keeps the club name and where it is, tidied', () => {
    expect(checkSuggestion({ clubName: '  Bunclody   Bulls ', town: 'Bunclody', county: 'Wexford' })).toEqual({
      clubName: 'Bunclody Bulls',
      town: 'Bunclody',
      county: 'Wexford',
    });
  });

  it('refuses an empty name, and anything with contact details', () => {
    expect(checkSuggestion({ clubName: 'a' })).toHaveProperty('error');
    expect(checkSuggestion({ clubName: 'Text me 0871234567' })).toHaveProperty('error');
    expect(checkSuggestion({ clubName: 'Club', town: 'me@example.com' })).toHaveProperty('error');
    expect(checkSuggestion({ clubName: 'See www.club.ie' })).toHaveProperty('error');
  });

  it('saves a suggestion, and stops at 5 open ones per player', async () => {
    expect((await post(suggest, { clubName: 'Bunclody Bulls', town: 'Bunclody' })).status).toBe(200);
    expect(db.inserts[0]).toEqual({ user_id: 'player-1', club_name: 'Bunclody Bulls', town: 'Bunclody', county: null });
    db.openSuggestions = 5;
    expect((await post(suggest, { clubName: 'Another club' })).status).toBe(429);
    expect(db.inserts).toHaveLength(1);
  });
});
