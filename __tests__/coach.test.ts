// __tests__/coach.test.ts
import { describe, it, expect } from 'vitest';
import { summarizeTeam, type RosterStats } from '@/lib/coach';

const base: RosterStats = {
  user_id: 'x',
  display_name: 'X',
  role: 'player',
  share_details: false,
  sessions_7d: 0,
  workouts_7d: 0,
  minutes_7d: 0,
  makes_7d: 0,
  attempts_7d: 0,
  verified_7d: 0,
  last_active: null,
  games: 0,
  ppg: null,
};

describe('coach team summary', () => {
  it('counts the squad sessions a camera watched, players only', () => {
    const s = summarizeTeam(
      [
        { ...base, user_id: 'c', display_name: 'Coach', role: 'coach', sessions_7d: 4, verified_7d: 4 },
        { ...base, user_id: 'a', display_name: 'Aoife', sessions_7d: 3, verified_7d: 2 },
        { ...base, user_id: 'b', display_name: 'Ben', sessions_7d: 2, verified_7d: 1 },
        { ...base, user_id: 'd', display_name: 'Dara', sessions_7d: 2 },
      ],
      '2026-09-26'
    );
    // The coach's own four are not squad training
    expect(s.verifiedSessions).toBe(3);
  });

  it('reads a missing verified count as none, not as a crash', () => {
    // Before migration 00034 the column does not exist and the RPC returns
    // nothing for it; the dashboard has to keep working either way
    const s = summarizeTeam(
      [{ ...base, user_id: 'a', display_name: 'Aoife', sessions_7d: 3, verified_7d: null }],
      '2026-09-26'
    );
    expect(s.verifiedSessions).toBe(0);
  });

  it('summarises players (not coaches) for the week', () => {
    const s = summarizeTeam(
      [
        { ...base, user_id: 'c', display_name: 'Coach', role: 'coach', sessions_7d: 9, minutes_7d: 500 },
        { ...base, user_id: 'a', display_name: 'Aoife', sessions_7d: 3, workouts_7d: 1, minutes_7d: 200, makes_7d: 60, attempts_7d: 100, last_active: '2026-09-25', games: 4, ppg: 12, share_details: true },
        { ...base, user_id: 'b', display_name: 'Ben', sessions_7d: 1, minutes_7d: 40, makes_7d: 10, attempts_7d: 20, last_active: '2026-09-22', games: 2, ppg: 8 },
        { ...base, user_id: 'd', display_name: 'Dara', last_active: '2026-09-10' },
        { ...base, user_id: 'e', display_name: 'Eve' },
      ],
      '2026-09-26'
    );
    expect(s).toMatchObject({ players: 4, activeThisWeek: 2, minutes: 240, makes: 70, attempts: 120, shootingPct: 58.3, avgPpg: 10, sharing: 1 });
    expect(s.quiet.map((q) => q.display_name)).toEqual(['Eve', 'Dara']);
    expect(s.top.map((t) => t.display_name)).toEqual(['Aoife', 'Ben']);
  });

  it('handles an empty team', () => {
    expect(summarizeTeam([], '2026-09-26')).toMatchObject({ players: 0, shootingPct: null, avgPpg: null, quiet: [], top: [] });
  });
});
