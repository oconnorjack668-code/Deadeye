// __tests__/personalBest.test.ts
import { describe, it, expect, vi } from 'vitest';
import { bestShootingPct, loadShootingBest, personalBest, tallyBySession, MIN_PB_ATTEMPTS } from '@/lib/video/personalBest';

describe('bestShootingPct', () => {
  it('ignores sessions with too few shots to mean anything', () => {
    expect(bestShootingPct([{ makes: 3, attempts: 3 }])).toBeNull();
    expect(bestShootingPct([{ makes: 3, attempts: 3 }, { makes: 12, attempts: 20 }])).toEqual({ makes: 12, attempts: 20 });
  });

  it('takes the best fraction, and the bigger session on a tie', () => {
    expect(bestShootingPct([{ makes: 13, attempts: 20 }, { makes: 30, attempts: 50 }])).toEqual({ makes: 13, attempts: 20 });
    expect(bestShootingPct([{ makes: 13, attempts: 20 }, { makes: 26, attempts: 40 }])).toEqual({ makes: 26, attempts: 40 });
    expect(bestShootingPct([])).toBeNull();
  });
});

describe('personalBest', () => {
  const before = { makes: 13, attempts: 20 }; // 65%

  it('says so when the % shown beats the best', () => {
    expect(personalBest({ makes: 15, attempts: 21 }, before)).toEqual({ kind: 'new', pct: 71, previous: { makes: 13, attempts: 20, pct: 65 } });
  });

  it('never claims a best on the same % as shown', () => {
    // 65.4% rounds to the same 65% the old best shows
    expect(personalBest({ makes: 17, attempts: 26 }, before)).toEqual({ kind: 'none' });
    expect(personalBest({ makes: 10, attempts: 20 }, before)).toEqual({ kind: 'none' });
  });

  it('needs enough shots, and a known best', () => {
    expect(personalBest({ makes: 19, attempts: 19 }, before)).toEqual({ kind: 'none' });
    expect(personalBest({ makes: 15, attempts: 20 }, undefined)).toEqual({ kind: 'none' });
  });

  it('sets the first best when there is nothing to beat', () => {
    expect(personalBest({ makes: 9, attempts: MIN_PB_ATTEMPTS }, null)).toEqual({ kind: 'first', pct: 45 });
  });
});

describe('loading the best', () => {
  const rows = [
    { session_id: 'a', shooting_entries: [{ makes: 6, attempts: 10 }, { makes: 7, attempts: 10 }] },
    { session_id: 'a', shooting_entries: [] },
    { session_id: 'b', shooting_entries: [{ makes: 9, attempts: 30 }] },
    { session_id: 'c', shooting_entries: null },
  ];

  it('adds each session up across its drills and spots', () => {
    expect(tallyBySession(rows)).toEqual([
      { makes: 13, attempts: 20 },
      { makes: 9, attempts: 30 },
      { makes: 0, attempts: 0 },
    ]);
  });

  function client(user: { id: string } | null, result: { data: unknown; error: unknown }) {
    const eq = vi.fn(() => ({ limit: async () => result }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    return { c: { auth: { getUser: async () => ({ data: { user } }) }, from } as never, from, eq };
  }

  it("reads only the player's own sessions", async () => {
    const { c, from, eq } = client({ id: 'u1' }, { data: rows, error: null });
    expect(await loadShootingBest(c)).toEqual({ makes: 13, attempts: 20 });
    expect(from).toHaveBeenCalledWith('session_drills');
    // A coach can read their players' sessions: this must not be one of them
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('claims nothing when it cannot know', async () => {
    expect(await loadShootingBest(client(null, { data: rows, error: null }).c)).toBeUndefined();
    expect(await loadShootingBest(client({ id: 'u1' }, { data: null, error: { message: 'offline' } }).c)).toBeUndefined();
  });
});
