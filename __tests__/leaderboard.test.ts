// __tests__/leaderboard.test.ts
import { describe, it, expect } from 'vitest';
import { chaseFor, shareOfLeader, type RankedRow } from '@/lib/leaderboard';

const row = (name: string, points: number, rank: number, is_me = false): RankedRow => ({
  user_id: name,
  player_name: name,
  points,
  rank,
  is_me,
});

describe('chaseFor', () => {
  it('names the nearest player ahead and the training days to catch them', () => {
    const rows = [row('Aoife', 90, 1), row('Cian', 60, 2), row('Me', 45, 3, true), row('Sean', 20, 4)];
    expect(chaseFor(rows)).toEqual({ kind: 'chasing', gap: 15, days: 2, target: 'Cian', outsideList: false });
  });

  it('chases past a tie by aiming at the next higher score', () => {
    const rows = [row('Aoife', 50, 1), row('Me', 30, 2, true), row('Cian', 30, 2)];
    expect(chaseFor(rows)).toMatchObject({ kind: 'chasing', gap: 20, target: 'Aoife' });
  });

  it('gives the lead over second place when top', () => {
    const rows = [row('Me', 80, 1, true), row('Cian', 70, 2)];
    expect(chaseFor(rows)).toEqual({ kind: 'leading', lead: 10, over: 'Cian' });
  });

  it('reports a shared top spot as a lead of zero', () => {
    const rows = [row('Cian', 40, 1), row('Me', 40, 1, true)];
    expect(chaseFor(rows)).toEqual({ kind: 'leading', lead: 0, over: 'Cian' });
  });

  it('handles being alone on the board', () => {
    expect(chaseFor([row('Me', 10, 1, true)])).toEqual({ kind: 'leading', lead: 0, over: null });
  });

  it('treats zero points as not on the board yet', () => {
    expect(chaseFor([row('Cian', 10, 1), row('Me', 0, 2, true)])).toEqual({ kind: 'unranked' });
  });

  it('flags when the player is below the rows the page has', () => {
    const rows = [row('Aoife', 300, 1), row('Last', 100, 100), row('Me', 30, 140, true)];
    expect(chaseFor(rows)).toMatchObject({ kind: 'chasing', target: 'Last', outsideList: true, days: 7 });
  });

  it('returns null without the player in the list', () => {
    expect(chaseFor([row('Cian', 10, 1)])).toBeNull();
  });
});

describe('shareOfLeader', () => {
  it('scales to the leader and keeps a sliver for small scores', () => {
    expect(shareOfLeader(50, 100)).toBe(50);
    expect(shareOfLeader(1, 1000)).toBe(4);
    expect(shareOfLeader(0, 100)).toBe(0);
    expect(shareOfLeader(10, 0)).toBe(0);
  });
});
