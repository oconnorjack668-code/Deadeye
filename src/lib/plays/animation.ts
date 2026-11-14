// src/lib/plays/animation.ts
// Where everyone is at any moment of a play, for the animated court. Pure
// functions of (diagram, time in ms), so the player can scrub, pause and
// rewind without keeping state, and tests can check any instant.
//
// Time runs through the steps in order, each lasting its frame's ms. Inside a
// step a mover follows their drawn path (start, waypoints, end) by distance,
// so a curl curls; everyone else stays put. The ball rides with its holder,
// and on a pass it leaves partway through the step, once the cutter has had
// time to get open, and arrives with the receiver at the step's end.
import { MOVEMENT_TYPES, type Diagram } from './diagram';
import { distance, type Point } from './spots';

export interface StepTime {
  start: number;
  end: number;
}

/** Start and end time of each step; index 0 is step 1. */
export function stepTimes(d: Diagram): StepTime[] {
  const times: StepTime[] = [];
  let at = 0;
  for (let i = 1; i < d.frames.length; i++) {
    times.push({ start: at, end: at + d.frames[i].ms });
    at += d.frames[i].ms;
  }
  return times;
}

export function totalMs(d: Diagram): number {
  const times = stepTimes(d);
  return times.length ? times[times.length - 1].end : 0;
}

/** The step (1..n) being played at time t: its lines are the ones drawn. */
export function stepAt(d: Diagram, t: number): number {
  const times = stepTimes(d);
  const i = times.findIndex((s) => t < s.end);
  return i === -1 ? times.length : i + 1;
}

/** When step k starts. */
export function stepStart(d: Diagram, k: number): number {
  const times = stepTimes(d);
  return times[Math.min(Math.max(k, 1), times.length) - 1]?.start ?? 0;
}

/**
 * cubic-bezier(0.2, 0, 0, 1), the app's --ease-deadeye curve in globals.css:
 * quick off the mark, gentle into the spot.
 */
export function easeDeadeye(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const [x1, y1, x2, y2] = [0.2, 0, 0, 1];
  const bez = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  // Solve x(t) = p by bisection: x is increasing for these control points
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, x1, x2) < p) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, y1, y2);
}

/** The line a player's move is drawn along in step k: start, waypoints, end. */
export function movePath(d: Diagram, k: number, playerId: string): Point[] {
  const before = d.frames[k - 1].positions[playerId];
  const after = d.frames[k].positions[playerId];
  const move = d.frames[k].actions.find((a) => a.from === playerId && MOVEMENT_TYPES.includes(a.type));
  return [before, ...(move?.path ?? []), after];
}

/** The point a fraction f (0..1) of the way along a polyline, by distance. */
export function pointAlong(points: Point[], f: number): Point {
  if (points.length === 1) return { ...points[0] };
  const lengths = points.slice(1).map((p, i) => distance(points[i], p));
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total === 0) return { ...points[0] };
  let left = Math.min(Math.max(f, 0), 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const r = lengths[i] === 0 ? 0 : Math.min(left / lengths[i], 1);
      return { x: points[i].x + (points[i + 1].x - points[i].x) * r, y: points[i].y + (points[i + 1].y - points[i].y) * r };
    }
    left -= lengths[i];
  }
  return { ...points[points.length - 1] };
}

function lerp(a: Point, b: Point, r: number): Point {
  return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
}

/** A pass leaves the passer's hands this far into its step. */
const PASS_RELEASE = 0.35;

export interface Scene {
  /** Step 1..n whose lines are drawn. */
  step: number;
  /** 0..1 through that step, eased. */
  progress: number;
  positions: Record<string, Point>;
  ball: Point | null;
  /** Who holds the ball, or null while a pass is in the air. */
  ballHolder: string | null;
}

/** Everyone's spot and the ball at time t (ms). `ease: false` moves at a steady speed. */
export function sceneAt(d: Diagram, t: number, { ease = true }: { ease?: boolean } = {}): Scene {
  const times = stepTimes(d);
  const k = stepAt(d, t);
  const { start, end } = times[k - 1];
  const raw = end > start ? Math.min(Math.max((t - start) / (end - start), 0), 1) : 1;
  const p = ease ? easeDeadeye(raw) : raw;
  const frame = d.frames[k];
  const before = d.frames[k - 1];

  const positions: Record<string, Point> = {};
  for (const player of d.players) {
    const moves = frame.actions.some((a) => a.from === player.id && MOVEMENT_TYPES.includes(a.type));
    positions[player.id] = moves
      ? pointAlong(movePath(d, k, player.id), p)
      : lerp(before.positions[player.id], frame.positions[player.id], p);
  }

  const pass = frame.actions.find((a) => (a.type === 'pass' || a.type === 'handoff') && a.to);
  let ball: Point | null = null;
  let ballHolder: string | null = before.ball;
  if (pass && pass.to) {
    const flight = Math.min(Math.max((p - PASS_RELEASE) / (1 - PASS_RELEASE), 0), 1);
    if (flight <= 0) ballHolder = pass.from;
    else if (flight >= 1) ballHolder = pass.to;
    else ballHolder = null;
    ball = lerp(positions[pass.from], positions[pass.to], flight);
  } else if (ballHolder) {
    ball = positions[ballHolder];
  }
  return { step: k, progress: p, positions, ball, ballHolder };
}
