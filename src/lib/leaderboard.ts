// src/lib/leaderboard.ts
// What the leaderboard page tells a player about their own place: who they are
// chasing and how far off they are. A rank on its own says where you are; a
// gap of "20 pts, about 2 training days" says what to do next.

/** Points for one training day (00024): the unit a player can actually earn today. */
export const POINTS_PER_TRAINING_DAY = 10;

export interface RankedRow {
  user_id: string;
  player_name: string;
  points: number;
  rank: number;
  is_me: boolean;
}

export type Chase =
  | { kind: 'unranked' }
  | { kind: 'leading'; lead: number; over: string | null }
  | { kind: 'chasing'; gap: number; days: number; target: string; outsideList: boolean };

/**
 * The player to catch next: whoever has the fewest points that are still more
 * than mine. When I am outside the rows the page was given (top 100 plus me),
 * the nearest row above is the last one in the list, so say so rather than
 * naming someone who is really many places ahead.
 */
export function chaseFor(rows: RankedRow[], listLimit = 100): Chase | null {
  const me = rows.find((r) => r.is_me);
  if (!me) return null;
  if (me.points <= 0) return { kind: 'unranked' };

  const others = rows.filter((r) => !r.is_me);
  const ahead = others.filter((r) => r.points > me.points);
  if (ahead.length === 0) {
    const next = others.filter((r) => r.points <= me.points).sort((a, b) => b.points - a.points)[0];
    return { kind: 'leading', lead: next ? me.points - next.points : 0, over: next?.player_name ?? null };
  }
  const target = ahead.reduce((best, r) => (r.points < best.points ? r : best));
  const gap = target.points - me.points;
  return {
    kind: 'chasing',
    gap,
    days: Math.ceil(gap / POINTS_PER_TRAINING_DAY),
    target: target.player_name,
    outsideList: me.rank > listLimit,
  };
}

/** Share of the leader's points, for the bar under each row. Never 0 for a player with points. */
export function shareOfLeader(points: number, leaderPoints: number): number {
  if (leaderPoints <= 0 || points <= 0) return 0;
  return Math.max(4, Math.min(100, Math.round((points / leaderPoints) * 100)));
}
