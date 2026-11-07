// src/lib/video/overlayTimeline.ts
// What the tracker's overlay showed, moment by moment, so a session's video can
// be saved with the overlay drawn into it (TrackerVideoExport).
//
// The live overlay is drawn on top of the picture and never recorded: the
// phone records the camera, not the screen. Drawing it into every recorded
// frame while tracking would cost the frames the tracker needs, so instead the
// run keeps a small log - the ball on each scored frame, the rim, each call -
// and the overlay is drawn again afterwards, frame by frame, from the log.
//
// Two clocks. The tracking clock (shot times, `t` everywhere in the tracker)
// holds still while the player re-aims after the camera moved; the recording
// does not. `gaps` records each hold so a time on one clock can be found on the
// other. For a video file the clock is the file's own time and there are none.
import type { Rim } from './shotDetector';
import { drillProgress, type DrillMode, type DrillProgress } from './drillModes';
import { activeMs, IDLE_MS, streaks } from './shotStats';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OverlayCall {
  t: number;
  made: boolean;
  confident: boolean;
}

/** The recording ran on for `ms` while the tracking clock stood at `at`. */
export interface ClockGap {
  at: number;
  ms: number;
}

export interface OverlayTimeline {
  /** Scored frames' times on the tracking clock, ascending, beside the ball found on each. */
  frameT: number[];
  frameBall: Array<Box | null>;
  /** The rim in use from each time on. */
  rims: Array<{ t: number; rim: Rim }>;
  /** The tracker's calls as it made them, before any correction in review. */
  calls: OverlayCall[];
  /** Moments something happened, for the shooting clock (shotStats.activeMs). */
  activity: number[];
  gaps: ClockGap[];
  mode: DrillMode;
  /** The tracking clock when the run ended. */
  endT: number;
}

/** How long the ball's trail stays on screen, ms. */
export const TRAIL_MS = 600;
/** Most points in a trail. */
export const TRAIL_POINTS = 12;
/** How long a make or miss stays up, ms (the .deadeye-flash animation). */
export const FLASH_MS = 1400;
/** How long the rim line takes the colour of the last call, ms. */
export const RIM_PULSE_MS = 700;
/** The ball counts as in view for this long after it was last seen (liveHealth's BALL_HOLD_MS). */
export const BALL_HOLD_MS = 350;
/** A ball box older than this is not drawn: the live overlay clears it on the next scored frame. */
const BALL_STALE_MS = 150;
/** Makes in a row for the streak flame. */
export const HOT_STREAK = 3;
/**
 * Most frames logged: about 80 minutes at 30 a second, a few MB. Past it the
 * ball stops being logged; calls and the score carry on.
 */
export const MAX_FRAMES = 150_000;

export interface OverlayLog {
  /** A run starts, or resumes after re-aiming, on this rim. */
  rim(t: number, rim: Rim): void;
  frame(t: number, ball: Box | null): void;
  call(call: OverlayCall): void;
  gap(at: number, ms: number): void;
  /** The gaps so far, for mapping shot times onto the recording while the log is still open. */
  gaps(): readonly ClockGap[];
  snapshot(extra: { activity: readonly number[]; mode: DrillMode; endT: number }): OverlayTimeline;
}

export function createOverlayLog(): OverlayLog {
  const frameT: number[] = [];
  const frameBall: Array<Box | null> = [];
  const rims: Array<{ t: number; rim: Rim }> = [];
  const calls: OverlayCall[] = [];
  const gaps: ClockGap[] = [];
  return {
    rim(t, rim) {
      rims.push({ t, rim });
    },
    frame(t, ball) {
      if (frameT.length >= MAX_FRAMES) return;
      // Frames arrive in order; one out of order would break the searches below
      if (frameT.length && t < frameT[frameT.length - 1]) return;
      frameT.push(t);
      frameBall.push(ball ? { x: ball.x, y: ball.y, w: ball.w, h: ball.h } : null);
    },
    call(call) {
      calls.push({ t: call.t, made: call.made, confident: call.confident });
    },
    gap(at, ms) {
      if (ms > 0) gaps.push({ at, ms });
    },
    gaps: () => gaps,
    snapshot({ activity, mode, endT }) {
      return {
        frameT: frameT.slice(),
        frameBall: frameBall.slice(),
        rims: rims.slice(),
        calls: calls.slice().sort((a, b) => a.t - b.t),
        activity: activity.slice().sort((a, b) => a - b),
        gaps: gaps.slice(),
        mode,
        endT,
      };
    },
  };
}

/** A time on the tracking clock as a time in the recording. A call made just before a hold belongs before it. */
export function mediaAtClock(gaps: readonly ClockGap[], clockMs: number): number {
  let media = clockMs;
  for (const g of gaps) if (g.at < clockMs) media += g.ms;
  return media;
}

/** A time in the recording as a time on the tracking clock; inside a hold, the time the clock stood at. */
export function clockAtMedia(gaps: readonly ClockGap[], mediaMs: number): { clockMs: number; held: boolean } {
  let offset = 0;
  for (const g of gaps) {
    const start = g.at + offset;
    if (mediaMs < start) break;
    if (mediaMs < start + g.ms) return { clockMs: g.at, held: true };
    offset += g.ms;
  }
  return { clockMs: mediaMs - offset, held: false };
}

/** Index of the last entry at or before t, or -1. */
function lastAtOrBefore(sorted: readonly number[], t: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

export type RimTone = 'make' | 'miss' | null;

/** The rim line's colour: the last call's for a moment after it, plain otherwise. */
export function rimTone(last: { t: number; made: boolean } | null, t: number): RimTone {
  if (!last || t < last.t || t - last.t > RIM_PULSE_MS) return null;
  return last.made ? 'make' : 'miss';
}

/** How hot the shooter is: 0 below the streak, then 1 (3-4 in a row), 2 (5-6), 3 (7 or more). */
export function heatLevel(streak: number): 0 | 1 | 2 | 3 {
  if (streak < HOT_STREAK) return 0;
  if (streak < 5) return 1;
  if (streak < 7) return 2;
  return 3;
}

/** How long a milestone banner stays up, ms. */
export const BANNER_MS = 2500;
const MAKE_MILESTONES = [10, 25, 50, 100, 150, 200, 300];
const SHOT_MILESTONES = [50, 100, 200, 300, 500];

/**
 * A milestone reached by the latest call, or null. Kept to a few on purpose
 * (docs/design.md): round numbers of makes and shots, and a perfect start.
 */
export function milestoneFor(made: readonly boolean[]): string | null {
  const n = made.length;
  if (!n) return null;
  const makes = made.filter(Boolean).length;
  if (made[n - 1] && MAKE_MILESTONES.includes(makes)) return `${makes} makes`;
  if (n === 5 && makes === 5) return 'Perfect start · 5/5';
  if (SHOT_MILESTONES.includes(n)) return `${n} shots up`;
  return null;
}

/**
 * The makes worth a slow-motion replay between two moments on the clock: the
 * ones made deepest into a streak, latest first on a tie, shown in the order
 * they happened.
 */
export function replayPicks(tl: OverlayTimeline, fromClock: number, toClock: number, max = 3): number[] {
  const made: boolean[] = [];
  const picks: Array<{ t: number; streak: number }> = [];
  for (const c of tl.calls) {
    made.push(c.made);
    if (c.made && c.t >= fromClock && c.t <= toClock) picks.push({ t: c.t, streak: streaks(made).current });
  }
  return picks
    .sort((a, b) => b.streak - a.streak || b.t - a.t)
    .slice(0, max)
    .map((p) => p.t)
    .sort((a, b) => a - b);
}

export interface OverlayFlash {
  made: boolean;
  confident: boolean;
  makes: number;
  attempts: number;
  /** Makes in a row after this call. */
  streak: number;
  /** Since the call, ms. */
  age: number;
}

export interface OverlayState {
  rim: Rim | null;
  tone: RimTone;
  ball: Box | null;
  /** Ball centres, oldest first, in frame fractions. */
  trail: Array<{ x: number; y: number }>;
  makes: number;
  attempts: number;
  streak: number;
  /** The last eight calls, oldest first. */
  recent: boolean[];
  /** Time spent shooting, long breaks left out. */
  shootingMs: number;
  paused: boolean;
  ballInView: boolean;
  flash: OverlayFlash | null;
  /** A milestone just reached, and how long ago. */
  banner: { label: string; age: number } | null;
  drill: DrillProgress | null;
}

/**
 * The overlay as it stood at a moment on the tracking clock. `held` is a
 * moment while the player was re-aiming: the score stays, the rim and ball go,
 * as they did on screen.
 */
export function overlayAt(tl: OverlayTimeline, clockMs: number, held = false): OverlayState {
  const callTimes = tl.calls.map((c) => c.t);
  const n = lastAtOrBefore(callTimes, clockMs) + 1;
  const madeSoFar = tl.calls.slice(0, n).map((c) => c.made);
  const makes = madeSoFar.filter(Boolean).length;
  const streak = streaks(madeSoFar).current;
  const last = n > 0 ? tl.calls[n - 1] : null;

  let flash: OverlayFlash | null = null;
  if (last && clockMs - last.t <= FLASH_MS) {
    flash = { made: last.made, confident: last.confident, makes, attempts: n, streak, age: clockMs - last.t };
  }

  let rim: Rim | null = null;
  let ball: Box | null = null;
  const trail: Array<{ x: number; y: number }> = [];
  let ballInView = false;
  if (!held) {
    const r = lastAtOrBefore(
      tl.rims.map((x) => x.t),
      clockMs
    );
    rim = r >= 0 ? tl.rims[r].rim : (tl.rims[0]?.rim ?? null);
    const f = lastAtOrBefore(tl.frameT, clockMs);
    if (f >= 0) {
      if (clockMs - tl.frameT[f] <= BALL_STALE_MS) ball = tl.frameBall[f];
      for (let i = f; i >= 0 && clockMs - tl.frameT[i] <= TRAIL_MS && trail.length < TRAIL_POINTS; i--) {
        const b = tl.frameBall[i];
        if (b) trail.unshift({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
      }
      for (let i = f; i >= 0 && clockMs - tl.frameT[i] <= BALL_HOLD_MS; i--) {
        if (tl.frameBall[i]) {
          ballInView = true;
          break;
        }
      }
    }
  }

  let banner: OverlayState['banner'] = null;
  for (let i = n - 1; i >= 0 && clockMs - tl.calls[i].t <= BANNER_MS; i--) {
    const label = milestoneFor(madeSoFar.slice(0, i + 1));
    if (label) {
      banner = { label, age: clockMs - tl.calls[i].t };
      break;
    }
  }

  const activity = tl.activity.filter((t) => t <= clockMs);
  const lastActivity = activity.length ? activity[activity.length - 1] : 0;
  return {
    rim,
    tone: held ? null : rimTone(last, clockMs),
    ball,
    trail,
    makes,
    attempts: n,
    streak,
    recent: madeSoFar.slice(-8),
    shootingMs: activeMs(activity, clockMs),
    paused: clockMs - lastActivity > IDLE_MS,
    ballInView,
    flash,
    banner,
    drill: drillProgress(tl.mode, madeSoFar, clockMs),
  };
}
