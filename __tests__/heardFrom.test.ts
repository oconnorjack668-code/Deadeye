// __tests__/heardFrom.test.ts
// The optional "Where did you hear about Deadeye?" answer: only listed answers
// are kept, so nothing typed or edited in can reach the counts file.
import { describe, it, expect, vi } from 'vitest';
import { normaliseHeardFrom, heardFromLabel, heardFromToClear } from '@/lib/heardFrom';
import { clearExpiredHeardFrom } from '@/lib/heardFrom-server';
import { buildLabel } from '@/lib/build';

describe('normaliseHeardFrom', () => {
  it('keeps listed answers, whatever the case', () => {
    expect(normaliseHeardFrom('friend')).toBe('friend');
    expect(normaliseHeardFrom(' TikTok ')).toBe('tiktok');
  });

  it('drops anything not on the list', () => {
    for (const bad of ['sean_murphy', 'st_marys_u14', 'jo@example.com', '', null, undefined, 3]) {
      expect(normaliseHeardFrom(bad)).toBeNull();
    }
  });

  it('labels answers as the player saw them, and no answer as "Didn\'t say"', () => {
    expect(heardFromLabel('radio-press')).toBe('Radio or a newspaper');
    expect(heardFromLabel(null)).toBe("Didn't say");
  });
});

describe('buildLabel', () => {
  it('names the commit, the environment and the build time in UTC', () => {
    expect(buildLabel({ sha: 'a1b2c3d', env: 'production', time: '2026-11-13T14:02:31.000Z' })).toBe(
      'a1b2c3d · production · 2026-11-13 14:02 UTC'
    );
  });

  it('still reads when built locally with no time', () => {
    expect(buildLabel({ sha: 'local', env: 'local', time: '' })).toBe('local · local');
  });
});

describe('heardFromToClear (12-month retention, re-review F1)', () => {
  const now = new Date('2027-12-01T12:00:00Z');
  const user = (id: string, created_at: string, heard_from?: unknown) => ({
    id,
    created_at,
    user_metadata: heard_from === undefined ? { display_name: 'P' } : { display_name: 'P', heard_from },
  });

  it('picks accounts over 365 days old that still hold an answer, listed or not', () => {
    expect(
      heardFromToClear(
        [
          user('old-answer', '2026-11-20T00:00:00Z', 'friend'),
          user('old-edited', '2026-11-20T00:00:00Z', 'something typed in'),
          user('new-answer', '2027-06-01T00:00:00Z', 'tiktok'),
          user('old-skipped', '2026-11-20T00:00:00Z'),
          user('old-cleared', '2026-11-20T00:00:00Z', null),
        ],
        now
      )
    ).toEqual(['old-answer', 'old-edited']);
  });

  it('keeps an answer until the full 365 days have passed', () => {
    expect(heardFromToClear([user('a', '2026-12-01T12:00:01Z', 'friend')], now)).toEqual([]);
    expect(heardFromToClear([user('b', '2026-12-01T11:59:59Z', 'friend')], now)).toEqual(['b']);
  });
});

describe('clearExpiredHeardFrom', () => {
  it('reads every page of accounts and sends only heard_from: null for the due ones', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `u${i}`, created_at: '2027-11-01T00:00:00Z', user_metadata: { heard_from: 'friend' } }));
    page1[3] = { id: 'due-1', created_at: '2026-01-01T00:00:00Z', user_metadata: { heard_from: 'friend' } };
    const page2 = [{ id: 'due-2', created_at: '2026-01-01T00:00:00Z', user_metadata: { heard_from: 'event' } }];
    const updates: Array<[string, unknown]> = [];
    const admin = {
      auth: {
        admin: {
          listUsers: vi.fn(async ({ page }: { page: number }) => ({ data: { users: page === 1 ? page1 : page2 }, error: null })),
          updateUserById: vi.fn(async (id: string, attrs: unknown) => {
            updates.push([id, attrs]);
            return { data: {}, error: null };
          }),
        },
      },
    };
    const result = await clearExpiredHeardFrom(admin as never, new Date('2027-12-01T00:00:00Z'));
    expect(result).toEqual({ cleared: 2, failed: 0 });
    expect(admin.auth.admin.listUsers).toHaveBeenCalledTimes(2);
    expect(updates).toEqual([
      ['due-1', { user_metadata: { heard_from: null } }],
      ['due-2', { user_metadata: { heard_from: null } }],
    ]);
  });

  it('counts and logs accounts it could not clear', async () => {
    const users = [
      { id: 'a', created_at: '2026-01-01T00:00:00Z', user_metadata: { heard_from: 'friend' } },
      { id: 'b', created_at: '2026-01-01T00:00:00Z', user_metadata: { heard_from: 'tiktok' } },
    ];
    const admin = {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users }, error: null }),
          updateUserById: async (id: string) => ({ data: {}, error: id === 'b' ? { message: 'down' } : null }),
        },
      },
    };
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await clearExpiredHeardFrom(admin as never, new Date('2027-12-01T00:00:00Z'))).toEqual({ cleared: 1, failed: 1 });
    expect(logged).toHaveBeenCalledWith('Sign-up answer clean-up: 1 of 2 accounts could not be cleared');
    logged.mockRestore();
  });
});
