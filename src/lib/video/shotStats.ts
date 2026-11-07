// src/lib/video/shotStats.ts
// What a list of shots says about the shooting: streaks, how the session
// went from start to finish, which way the misses go and how clean the makes
// were. Shared by the live HUD, the review step and the session page, so a
// streak is counted the same way on all three.
import { MAKE_MARGIN } from './shotDetector';
import type { SavedShot, ShotZoneChoice } from './trackedShots';

export interface Streaks {
  /** Makes in a row at the end of the list. */
  current: number;
  /** Most makes in a row anywhere in it. */
  best: number;
  /** Misses in a row at the end, for "shake it off" rather than a streak. */
  coldRun: number;
}

export function streaks(made: readonly boolean[]): Streaks {
  let best = 0;
  let run = 0;
  for (const m of made) {
    run = m ? run + 1 : 0;
    if (run > best) best = run;
  }
  let coldRun = 0;
  for (let i = made.length - 1; i >= 0 && !made[i]; i--) coldRun++;
  return { current: run, best, coldRun };
}

export interface Tally {
  makes: number;
  attempts: number;
}

const tally = (shots: readonly { made: boolean }[]): Tally => ({ makes: shots.filter((s) => s.made).length, attempts: shots.length });

/** Fewer shots than this and a first half against a second half says nothing. */
export const MIN_SHOTS_FOR_HALVES = 10;

/**
 * The session's first half of shots against its second, which is where
 * tiredness shows. Null for a session too short to split.
 */
export function halves(shots: readonly { made: boolean }[]): { first: Tally; second: Tally } | null {
  if (shots.length < MIN_SHOTS_FOR_HALVES) return null;
  const mid = Math.floor(shots.length / 2);
  return { first: tally(shots.slice(0, mid)), second: tally(shots.slice(mid)) };
}

export interface MissSides {
  /** Misses the tracker saw cross wide of the ring, on the camera's left and right. */
  left: number;
  right: number;
  /** Misses that crossed inside the ring's width: short, long or off the rim. */
  inLine: number;
  /** Misses with no crossing seen, so no side to tell. */
  unknown: number;
}

/**
 * Which way the misses went, as the camera saw them. Only misses the player
 * kept as misses, and only those the tracker saw cross the rim line.
 *
 * Left and right are the camera's, which are the shooter's only when filmed
 * from behind them; the screens that show this say so.
 */
export function missSides(shots: readonly SavedShot[]): MissSides {
  const out: MissSides = { left: 0, right: 0, inLine: 0, unknown: 0 };
  for (const s of shots) {
    if (s.made) continue;
    if (typeof s.side !== 'number' || s.called !== 'miss') out.unknown++;
    else if (Math.abs(s.side) <= MAKE_MARGIN) out.inLine++;
    else if (s.side < 0) out.left++;
    else out.right++;
  }
  return out;
}

/** The side most misses go, when one clearly does: at least 4 wide misses and two in three one way. */
export function missTendency(sides: MissSides): 'left' | 'right' | null {
  const wide = sides.left + sides.right;
  if (wide < 4) return null;
  if (sides.left >= wide * (2 / 3)) return 'left';
  if (sides.right >= wide * (2 / 3)) return 'right';
  return null;
}

/**
 * Makes that went through without the tracker seeing the ball come back up off
 * the ring, and makes that did. "Clean" is not "swish": a ball can kiss the
 * ring on the way through without bouncing, and the camera cannot tell.
 * Only shots the tracker itself called a make count, so a make the player
 * added or switched has no say.
 */
export function makeKinds(shots: readonly SavedShot[]): { clean: number; rim: number } {
  let clean = 0;
  let rim = 0;
  for (const s of shots) {
    if (!s.made || s.called !== 'make') continue;
    if (s.rim) rim++;
    else clean++;
  }
  return { clean, rim };
}

/** Makes and attempts per zone, shots without one counted to `fallback`. */
export function zoneTotals(shots: readonly { made: boolean; zone?: ShotZoneChoice }[], fallback: ShotZoneChoice): Array<{ zone: ShotZoneChoice } & Tally> {
  const map = new Map<ShotZoneChoice, Tally>();
  for (const s of shots) {
    const zone = s.zone ?? fallback;
    const t = map.get(zone) ?? { makes: 0, attempts: 0 };
    t.attempts++;
    if (s.made) t.makes++;
    map.set(zone, t);
  }
  return [...map.entries()].map(([zone, t]) => ({ zone, ...t }));
}

/**
 * A gap this long with no shot and no ball is a break - fetching a ball,
 * water, a chat - and is left out of the time spent shooting.
 */
export const IDLE_MS = 45_000;

/**
 * Time actually spent shooting, in ms: the run from its start to `endMs`,
 * with every quiet gap longer than IDLE_MS cut down to IDLE_MS. `activity` is
 * every moment something happened (a shot, the ball in the air), any order.
 */
export function activeMs(activity: readonly number[], endMs: number): number {
  const times = [0, ...activity.filter((t) => t >= 0 && t <= endMs), endMs].sort((a, b) => a - b);
  let total = 0;
  for (let i = 1; i < times.length; i++) total += Math.min(IDLE_MS, times[i] - times[i - 1]);
  return total;
}

export const pct = (makes: number, attempts: number) => (attempts > 0 ? Math.round((makes / attempts) * 100) : 0);
