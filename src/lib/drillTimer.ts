// src/lib/drillTimer.ts
// The drill timer on every drill page: work and rest intervals when the drill
// is written that way ("3 x 30 seconds", "5 x 1 minute"), otherwise a
// countdown of the drill's minutes. Pure, so the timing is testable; the
// component only ticks the clock and makes the beeps.

export interface TimerPlan {
  /** Seconds of work in each round */
  work: number;
  /** Seconds of rest between rounds (none after the last) */
  rest: number;
  rounds: number;
}

export type TimerPhase =
  | { phase: 'work' | 'rest'; round: number; remaining: number }
  | { phase: 'done'; round: number; remaining: 0 };

/** Rest when a drill gives intervals but no rest of its own. */
export const DEFAULT_REST = 30;

const UNIT = String.raw`(seconds?|secs?|s|minutes?|mins?)\b`;
const toSeconds = (n: number, unit: string) => (/^m/i.test(unit) ? n * 60 : n);

/**
 * Work intervals read from a drill's reps, or null when the reps are counted
 * in shots or makes rather than time. "3 x 30 seconds" is 3 rounds of 30
 * seconds; "4 reps with 60-second rest" gives the rest, and a round length
 * only if one is written. "Each hand" or "each side" is left as written: the
 * player can add rounds on the timer.
 */
export function parseIntervals(reps: string): TimerPlan | null {
  const text = reps.replace(/×/g, 'x');
  const intervals = text.match(new RegExp(String.raw`(\d+)\s*x\s*(\d+)[\s-]*${UNIT}`, 'i'));
  if (!intervals) return null;
  const rounds = Number(intervals[1]);
  const work = toSeconds(Number(intervals[2]), intervals[3]);
  // "with 60-second rest", or "20 seconds on, 40 seconds off"
  const restMatch = text.match(new RegExp(String.raw`(\d+)[\s-]*${UNIT}\s*(?:rest|off)`, 'i'));
  const rest = restMatch ? toSeconds(Number(restMatch[1]), restMatch[2]) : DEFAULT_REST;
  if (rounds < 1 || rounds > 50 || work < 5 || work > 3600) return null;
  return { rounds, work, rest };
}

/** The timer a drill starts with: its intervals, or one block of its minutes. */
export function planFor(drill: { reps: string; duration_minutes: number }): TimerPlan {
  return parseIntervals(drill.reps) ?? { rounds: 1, work: Math.max(1, drill.duration_minutes) * 60, rest: 0 };
}

export function totalSeconds(plan: TimerPlan): number {
  return plan.rounds * plan.work + (plan.rounds - 1) * plan.rest;
}

/** Where the timer is after this many seconds: which round, work or rest, and the seconds left in it. */
export function phaseAt(plan: TimerPlan, elapsed: number): TimerPhase {
  let t = Math.max(0, elapsed);
  for (let round = 1; round <= plan.rounds; round++) {
    if (t < plan.work) return { phase: 'work', round, remaining: Math.ceil(plan.work - t) };
    t -= plan.work;
    if (round === plan.rounds) break;
    if (t < plan.rest) return { phase: 'rest', round, remaining: Math.ceil(plan.rest - t) };
    t -= plan.rest;
  }
  return { phase: 'done', round: plan.rounds, remaining: 0 };
}

/** 75 -> "1:15", 9 -> "0:09" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
