// @vitest-environment node
// __tests__/visiblePhotos.test.ts
// Photos on the leaderboard and the top-bar avatar. Which photos a viewer may
// see is decided by visible_photo_paths (00049) under the viewer's own session;
// these check the app only links the photos it returns, and shows emojis when
// the database cannot answer.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storage = {
  signed: [] as Array<{ path: string | null; signedUrl: string | null; error: string | null }>,
  asked: [] as string[][],
};
const tables: Record<string, unknown[]> = { profiles: [], player_levels: [] };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => {
          storage.asked.push(paths);
          return { data: storage.signed, error: null };
        },
      }),
    },
    from: (table: string) => ({ select: () => ({ in: async () => ({ data: tables[table] }) }) }),
  }),
}));

import { visiblePhotoUrls } from '@/lib/photos-server';
import { leaderboardLooks } from '@/lib/leaderboard-server';

/** The viewer's own client: visible_photo_paths answers with these rows */
function viewer(rows: Array<{ user_id: string; path: string }> | null, error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: rows, error }));
  return { client: { rpc } as never, rpc };
}

beforeEach(() => {
  storage.signed = [];
  storage.asked = [];
  tables.profiles = [];
  tables.player_levels = [];
});

describe('visiblePhotoUrls', () => {
  it('links only the photos the database says this viewer may see', async () => {
    const { client, rpc } = viewer([
      { user_id: 'b', path: 'b/photo.jpg' },
      { user_id: 'd', path: 'd/photo.jpg' },
    ]);
    storage.signed = [
      { path: 'b/photo.jpg', signedUrl: 'https://cdn/b', error: null },
      { path: 'd/photo.jpg', signedUrl: 'https://cdn/d', error: null },
    ];
    const urls = await visiblePhotoUrls(client, ['b', 'c', 'd', 'b']);
    expect(rpc).toHaveBeenCalledWith('visible_photo_paths', { p_users: ['b', 'c', 'd'] });
    expect(storage.asked).toEqual([['b/photo.jpg', 'd/photo.jpg']]);
    expect([...urls]).toEqual([
      ['b', 'https://cdn/b'],
      ['d', 'https://cdn/d'],
    ]);
  });

  it('leaves out a photo whose link could not be made', async () => {
    const { client } = viewer([{ user_id: 'b', path: 'b/photo.jpg' }]);
    storage.signed = [{ path: 'b/photo.jpg', signedUrl: null, error: 'Object not found' }];
    expect((await visiblePhotoUrls(client, ['b'])).size).toBe(0);
  });

  it('shows emojis when the check is missing, before 00049 is run', async () => {
    const { client } = viewer(null, { message: 'function public.visible_photo_paths does not exist' });
    expect((await visiblePhotoUrls(client, ['b'])).size).toBe(0);
    expect(storage.asked).toEqual([]);
  });

  it('asks nothing for an empty list', async () => {
    const { client, rpc } = viewer([]);
    expect((await visiblePhotoUrls(client, [])).size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('leaderboardLooks', () => {
  it('gives a row a photo only when this viewer may see it, and the emoji either way', async () => {
    tables.profiles = [
      { id: 'b', avatar_emoji: '🏀', avatar_color: 'red' },
      { id: 'c', avatar_emoji: '🔥', avatar_color: 'blue' },
    ];
    tables.player_levels = [{ user_id: 'b', level: 4 }];
    const { client } = viewer([{ user_id: 'b', path: 'b/photo.jpg' }]);
    storage.signed = [{ path: 'b/photo.jpg', signedUrl: 'https://cdn/b', error: null }];

    const looks = await leaderboardLooks(client, ['b', 'c']);
    expect(looks.get('b')).toEqual({ emoji: '🏀', color: 'red', level: 4, photoUrl: 'https://cdn/b' });
    expect(looks.get('c')).toEqual({ emoji: '🔥', color: 'blue', level: null, photoUrl: null });
  });
});
