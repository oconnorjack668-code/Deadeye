// src/lib/video/shotDetector.ts
// Turns per-frame ball detections into shots, using a rim position the player taps once.
// Coordinates are normalised to the frame (0..1, y grows downward).

export interface Rim {
  x: number; // centre
  y: number; // rim height at the centre
  width: number; // rim width (normalised to frame width)
  /**
   * Slope of the rim across the frame, dy/dx in normalised units, 0 when level.
   *
   * A rim is only horizontal on screen when the camera is square to it. Filmed
   * from the side, or above or below the ring, the two edges sit at different
   * heights, and averaging them into one `y` put the crossing line through the
   * middle of a rim that is actually tilted - testing the wrong height by up to
   * half the rim width times the slope. That error is worst on side-on footage,
   * which is exactly what measuring the rim from two taps exists to support.
   *
   * Optional so rims measured before this existed, and the tests that build
   * them by hand, keep behaving exactly as they did: absent means level.
   */
  tilt?: number;
}

/** Narrowest and widest believable rim, as a fraction of frame width. */
export const MIN_RIM_WIDTH = 0.015;
export const MAX_RIM_WIDTH = 0.6;

/**
 * Steepest slope accepted from two taps (~31 degrees in normalised units).
 *
 * Past this the taps are far likelier to be sloppy - one on the ring and one on
 * the backboard, say - than the rim to be that angled, and an over-tilted line
 * is worse than a level one.
 */
export const MAX_RIM_TILT = 0.6;

/** The rim's height at a given x, following its tilt. */
export function rimYAt(rim: Rim, x: number): number {
  return rim.y + (x - rim.x) * (rim.tilt ?? 0);
}

/**
 * The tilt as an angle, for showing a player what was captured.
 *
 * Only a readout: the slope is in normalised units, where x is a fraction of
 * frame width and y a fraction of frame height, so on a non-square frame this
 * is not the true on-screen angle. It is close enough to tell a level rim from
 * a tilted one, which is all it is for.
 */
export function rimTiltDegrees(rim: Rim): number {
  return (Math.atan(rim.tilt ?? 0) * 180) / Math.PI;
}

/**
 * Builds a rim from two taps, one on each side of it.
 *
 * Replaces a fixed "rim is 8% of the frame" assumption, which only held when
 * the player framed the hoop a particular way: it ruled out side-on footage and
 * any clip with the hoop near an edge, and when the real rim was smaller than
 * assumed the detector armed on balls nowhere near the hoop and scored nearly
 * everything as a make.
 */
export function rimFromEdges(a: { x: number; y: number }, b: { x: number; y: number }): Rim {
  const dx = b.x - a.x;
  // Two taps at the same x carry no slope, and dividing by that dx would give
  // an infinite one.
  const slope = Math.abs(dx) < 1e-6 ? 0 : (b.y - a.y) / dx;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    // Horizontal extent, because the crossing test compares horizontal
    // distances. Seen side-on the rim foreshortens, and a narrower target is
    // the right answer there - the ball really does pass through a narrower gap
    // on screen. The tilt below carries the angle the width no longer does.
    width: Math.min(MAX_RIM_WIDTH, Math.max(MIN_RIM_WIDTH, Math.abs(dx))),
    // The `|| 0` collapses negative zero, which a level rim produces when the
    // taps run right to left. It behaves identically in every calculation but
    // is not equal to 0, so two measurements of the same level rim compared
    // unequal depending on tap order.
    tilt: Math.min(MAX_RIM_TILT, Math.max(-MAX_RIM_TILT, slope)) || 0,
  };
}

export interface BallObservation {
  t: number; // milliseconds
  ball: { x: number; y: number } | null;
}

export interface DetectedShot {
  t: number; // time the shot was decided (ms)
  made: boolean;
  confident: boolean; // false when the result was inferred without seeing the ball cross the rim
}

const COOLDOWN_MS = 1200; // ignore rim bounces / put-backs right after a decision
const LOST_BALL_MS = 1500; // armed shot with the ball out of view this long -> miss
const MAX_FLIGHT_MS = 3500;
const APPROACH_WIDTHS = 3; // ball must be within this many rim widths sideways to count as a shot

export class ShotDetector {
  private armedAt: number | null = null;
  private lastAbove: { t: number; x: number; y: number } | null = null;
  private lastSeen = 0;
  private cooldownUntil = 0;
  readonly shots: DetectedShot[] = [];

  constructor(private rim: Rim) {}

  setRim(rim: Rim) {
    this.rim = rim;
  }

  /** Feed one frame. Returns a shot when one is decided on this frame. */
  push(obs: BallObservation): DetectedShot | null {
    const { rim } = this;
    const halfRim = rim.width / 2;

    if (obs.t < this.cooldownUntil) return null;

    // Armed shot but the ball vanished (went behind the backboard, out of frame...)
    if (this.armedAt !== null && !obs.ball) {
      if (obs.t - this.lastSeen > LOST_BALL_MS) return this.decide(obs.t, false, false);
      return null;
    }
    if (!obs.ball) return null;

    const { x, y } = obs.ball;
    this.lastSeen = obs.t;
    const sideways = Math.abs(x - rim.x);
    // How far below the rim line the ball is, at the ball's own x. Negative is
    // above it. Every test below is in terms of this rather than a flat `y`, so
    // a tilted rim is measured along its own line - and with tilt 0 it reduces
    // to exactly the comparisons against rim.y that it replaced.
    const depth = y - rimYAt(rim, x);
    const aboveRim = depth < -halfRim * 0.3;

    if (aboveRim && sideways < rim.width * APPROACH_WIDTHS) {
      if (this.armedAt === null) this.armedAt = obs.t;
      this.lastAbove = { t: obs.t, x, y };
      return null;
    }

    if (this.armedAt === null) return null;

    // Ball has come down to rim level: did it pass through the rim?
    if (depth >= 0 && this.lastAbove) {
      const prev = this.lastAbove;
      // Both the ball's path and the rim line are straight, so `depth` runs
      // linearly along this step and the crossing is where it reaches zero.
      const prevDepth = prev.y - rimYAt(rim, prev.x);
      const closed = prevDepth - depth;
      const fraction = Math.abs(closed) < 1e-6 ? 1 : prevDepth / closed;
      const crossX = prev.x + (x - prev.x) * Math.min(1, Math.max(0, fraction));
      const throughRim = Math.abs(crossX - rim.x) <= halfRim * 1.1;
      const confident = obs.t - prev.t <= 250;
      return this.decide(obs.t, throughRim, confident);
    }

    if (sideways > rim.width * (APPROACH_WIDTHS + 1) || obs.t - this.armedAt > MAX_FLIGHT_MS) {
      return this.decide(obs.t, false, false);
    }
    return null;
  }

  private decide(t: number, made: boolean, confident: boolean): DetectedShot {
    const shot = { t, made, confident };
    this.shots.push(shot);
    this.armedAt = null;
    this.lastAbove = null;
    this.cooldownUntil = t + COOLDOWN_MS;
    return shot;
  }
}
