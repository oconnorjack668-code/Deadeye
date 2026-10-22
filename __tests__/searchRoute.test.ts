// @vitest-environment node
// __tests__/searchRoute.test.ts
// /api/search: content results under the player's own session, a cleaned
// search inside every filter, and the coaching side asking only for drills
// and guides.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { user: { id: 'player-1', email: 'p@example.com' } as { id: string; email: string } | null };
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => auth.user }));

const rows: Record<string, unknown[]> = {};
const asked: Array<{ table: string; or: string }> = [];
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        or: (filter: string) => {
          asked.push({ table, or: filter });
          return query;
        },
        limit: async () => ({ data: rows[table] ?? [], error: null }),
      };
      return query;
    },
  }),
}));

import { GET } from '@/app/api/search/route';

async function search(q: string, mode = 'playing') {
  const res = await GET(new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}&mode=${mode}`));
  return { status: res.status, body: (await res.json()) as { groups: Array<{ id: string; results: Array<{ title: string; href: string }> }> } };
}

beforeEach(() => {
  auth.user = { id: 'player-1', email: 'p@example.com' };
  for (const k of Object.keys(rows)) delete rows[k];
  asked.length = 0;
});

describe('GET /api/search', () => {
  it('finds drills, exercises, lessons, programmes and guides, with links to each', async () => {
    rows.drills = [{ slug: 'form-shooting', name: 'Form shooting', skill: 'shooting', level: 'beginner' }];
    rows.exercise_library = [{ id: 'e1', name: 'Box jump', primary_muscle: 'legs' }];
    rows.study_topics = [{ id: 't1', title: 'Shot selection' }];
    rows.training_programs = [{ slug: 'shooter', name: 'Become a shooter', weeks: 6 }];
    rows.guides = [{ slug: 'warm-up', title: 'Warming up', reading_minutes: 4 }];
    const { status, body } = await search('sho');
    expect(status).toBe(200);
    expect(body.groups.map((g) => [g.id, g.results[0].href])).toEqual([
      ['drills', '/drills/form-shooting'],
      ['exercises', '/workouts/exercises?muscle=legs&open=e1#ex-e1'],
      ['lessons', '/study/t1'],
      ['programmes', '/programs/shooter'],
      ['guides', '/guides/warm-up'],
    ]);
  });

  it('puts only the cleaned search inside each filter', async () => {
    await search('free throw),name.eq.x');
    expect(asked.length).toBeGreaterThan(0);
    for (const a of asked) {
      expect(a.or).toContain('*free throw name eq x*');
      expect(a.or).not.toContain('),name');
    }
    expect(asked.find((a) => a.table === 'drills')?.or).toContain('sub_skill.ilike."*free_throw_name_eq_x*"');
  });

  it('asks the coaching side for drills and guides only', async () => {
    await search('defence', 'coaching');
    expect(asked.map((a) => a.table).sort()).toEqual(['drills', 'guides']);
  });

  it('asks nothing for one letter, and leaves empty groups out', async () => {
    expect((await search('a')).body.groups).toEqual([]);
    expect(asked).toEqual([]);
    expect((await search('zz')).body.groups).toEqual([]);
  });

  it('asks a signed-out visitor to log in', async () => {
    auth.user = null;
    expect((await search('shooting')).status).toBe(401);
  });
});
