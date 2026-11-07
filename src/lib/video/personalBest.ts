// src/lib/video/personalBest.ts
// A player's best shooting % from their saved sessions, so a tracked session
// can say when it beat it.
//
// Only sessions of MIN_PB_ATTEMPTS shots or more count, on both sides: 3 of 3
// is 100% and would be a "best" no real session could ever beat.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { pct } from './shotStats';

/** Shots a session needs before its % can set or beat a personal best. */
export const MIN_PB_ATTEMPTS = 20;

export interface ShootingTally {
  makes: number;
  attempts: number;
}

/** The best % among sessions with enough shots, or null when none has. On a tie, the one with more shots. */
export function bestShootingPct(sessions: readonly ShootingTally[]): ShootingTally | null {
  let best: ShootingTally | null = null;
  for (const s of sessions) {
    if (s.attempts < MIN_PB_ATTEMPTS) continue;
    if (!best) {
      best = s;
      continue;
    }
    // Compared as fractions, not rounded %, so 13/20 and 26/40 are a tie
    const diff = s.makes * best.attempts - best.makes * s.attempts;
    if (diff > 0 || (diff === 0 && s.attempts > best.attempts)) best = s;
  }
  return best ? { makes: best.makes, attempts: best.attempts } : null;
}

export type PersonalBestResult =
  /** Beat the earlier best, by at least a whole point as shown. */
  | { kind: 'new'; pct: number; previous: ShootingTally & { pct: number } }
  /** The first session with enough shots: it sets the best. */
  | { kind: 'first'; pct: number }
  /** Not a best, or too few shots to count. */
  | { kind: 'none' };

/**
 * Whether this session is a new personal best. A best is beaten on the % the
 * player sees, so it never says "new best 65%, was 65%". `best` undefined:
 * not known (still loading, offline, signed out), so nothing is claimed.
 */
export function personalBest(current: ShootingTally, best: ShootingTally | null | undefined): PersonalBestResult {
  if (best === undefined || current.attempts < MIN_PB_ATTEMPTS) return { kind: 'none' };
  const now = pct(current.makes, current.attempts);
  if (best === null) return { kind: 'first', pct: now };
  const before = pct(best.makes, best.attempts);
  return now > before ? { kind: 'new', pct: now, previous: { ...best, pct: before } } : { kind: 'none' };
}

/** Adds up shot rows into one tally per session. */
export function tallyBySession(rows: ReadonlyArray<{ session_id: string; shooting_entries: ShootingTally[] | null }>): ShootingTally[] {
  const bySession = new Map<string, ShootingTally>();
  for (const row of rows) {
    const t = bySession.get(row.session_id) ?? { makes: 0, attempts: 0 };
    for (const e of row.shooting_entries ?? []) {
      t.makes += e.makes ?? 0;
      t.attempts += e.attempts ?? 0;
    }
    bySession.set(row.session_id, t);
  }
  return [...bySession.values()];
}

/**
 * The signed-in player's best saved session, or null when none has enough
 * shots. Undefined when it cannot be known (signed out, offline, an error),
 * so the tracker claims nothing. Filtered to the player's own rows: a coach
 * can read their players' sessions too.
 */
export async function loadShootingBest(client: SupabaseClient<Database>): Promise<ShootingTally | null | undefined> {
  try {
    const { data: auth } = await client.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return undefined;
    const { data, error } = await client.from('session_drills').select('session_id, shooting_entries(makes, attempts)').eq('user_id', uid).limit(5000);
    if (error || !data) return undefined;
    // The hand-written types do not describe this relation (as in AfterSession)
    return bestShootingPct(tallyBySession(data as unknown as Array<{ session_id: string; shooting_entries: ShootingTally[] | null }>));
  } catch {
    return undefined;
  }
}
