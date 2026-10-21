// src/lib/progress.ts
// How a session compares with the player's earlier ones, spot by spot, for
// the progress card after saving (src/components/basketball/SessionProgress.tsx).
// The payoff for logging a 2nd and 3rd session: a number that moved.
import { ZONE_LABELS } from '@/lib/court';
import type { ShotZone } from '@/lib/supabase/types';

export interface ZoneShots {
  shot_zone: ShotZone;
  makes: number;
  attempts: number;
}

export interface ZoneProgress {
  zone: ShotZone;
  label: string;
  /** Make % this session */
  now: number;
  /** Make % across the earlier sessions, or null if never shot from here before */
  before: number | null;
  attemptsNow: number;
  attemptsBefore: number;
}

export interface SessionProgress {
  zones: ZoneProgress[];
  /** One line for the top of the card */
  headline: string;
  /** Whole-session make %, now and before */
  overall: { now: number; before: number | null };
}

/**
 * Attempts needed on both sides before a spot can make the headline: 3 of 4
 * against 1 of 2 is luck, not progress.
 */
export const MIN_ATTEMPTS = 5;

function total(rows: ZoneShots[]): Map<ShotZone, { makes: number; attempts: number }> {
  const byZone = new Map<ShotZone, { makes: number; attempts: number }>();
  for (const r of rows) {
    if (r.attempts <= 0) continue;
    const t = byZone.get(r.shot_zone) ?? { makes: 0, attempts: 0 };
    t.makes += r.makes;
    t.attempts += r.attempts;
    byZone.set(r.shot_zone, t);
  }
  return byZone;
}

const pct = (makes: number, attempts: number) => Math.round((makes / attempts) * 100);

/** Null when this session has no shots, or there is nothing earlier to compare it with. */
export function compareSession(current: ZoneShots[], earlier: ZoneShots[]): SessionProgress | null {
  const now = total(current);
  const before = total(earlier);
  if (now.size === 0 || before.size === 0) return null;

  const zones: ZoneProgress[] = [...now.entries()]
    .map(([zone, t]) => {
      const b = before.get(zone);
      return {
        zone,
        label: ZONE_LABELS[zone] ?? zone,
        now: pct(t.makes, t.attempts),
        before: b ? pct(b.makes, b.attempts) : null,
        attemptsNow: t.attempts,
        attemptsBefore: b?.attempts ?? 0,
      };
    })
    .sort((a, b) => b.attemptsNow - a.attemptsNow);

  const sum = (m: Map<ShotZone, { makes: number; attempts: number }>) =>
    [...m.values()].reduce((acc, t) => ({ makes: acc.makes + t.makes, attempts: acc.attempts + t.attempts }), { makes: 0, attempts: 0 });
  const n = sum(now);
  const b = sum(before);
  const overall = { now: pct(n.makes, n.attempts), before: pct(b.makes, b.attempts) };

  // The spot that moved most, among those shot enough both times
  const solid = zones.filter((z) => z.before !== null && z.attemptsNow >= MIN_ATTEMPTS && z.attemptsBefore >= MIN_ATTEMPTS);
  const best = solid.reduce<ZoneProgress | null>((top, z) => (!top || z.now - z.before! > top.now - top.before! ? z : top), null);

  let headline: string;
  if (best && best.now - best.before! >= 3) {
    headline = `Up ${best.now - best.before!}% from ${best.label.toLowerCase()} compared with your earlier sessions.`;
  } else if (overall.now - overall.before >= 3) {
    headline = `Up ${overall.now - overall.before}% overall compared with your earlier sessions.`;
  } else if (overall.before - overall.now >= 3) {
    headline = `A tougher day: ${overall.now}% against your usual ${overall.before}%. Every session counts towards the average.`;
  } else {
    headline = `Right on your average: ${overall.now}% today, ${overall.before}% before. Consistency is the hard part.`;
  }

  return { zones, headline, overall };
}
