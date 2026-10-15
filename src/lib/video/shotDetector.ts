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
/**
 * Why a pair of taps cannot be a rim, or null when they can.
 *
 * The clamps in rimFromEdges stop a bad pair producing nonsense, but clamping
 * invents a number instead of measuring one, and the player is never told. The
 * two taps set the crop size and the make window, so a pair that had to be
 * clamped is the single worst thing that can happen to detection accuracy -
 * worse than a shaky hand or poor light. Better to say so and ask again.
 *
 * The rule is one idea applied twice: reject exactly when the measurement would
 * have to be invented. A genuinely side-on rim foreshortens to a sliver and
 * that is the correct target there, so narrow is fine - only narrower than the
 * clamp floor is not.
 */
export function rimTapProblem(a: { x: number; y: number }, b: { x: number; y: number }): string | null {
  const dx = Math.abs(b.x - a.x);
  if (dx < MIN_RIM_WIDTH) {
    return 'Those two taps are almost in line with each other. Tap the far left and far right of the ring - its widest points across - rather than the front and back of it.';
  }
  if (Math.abs((b.y - a.y) / (b.x - a.x)) > MAX_RIM_TILT) {
    return 'Those two taps are at very different heights. Tap the left and right of the ring itself, not the backboard above it.';
  }
  return null;
}

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

/**
 * How many recent sightings the crossing is fitted to.
 *
 * Two points - the last one above the rim and the first at or below it - is the
 * least evidence the crossing can be computed from, and it puts the whole
 * make-or-miss call on the precision of exactly two ball centres. Fitting a
 * short track instead lets one noisy centre be outvoted.
 */
export const TRACK_POINTS = 6;

/**
 * Longest run of sightings worth fitting, in ms.
 *
 * A line is only a fair description of the path over a short stretch. Reaching
 * further back picks up the top of the arc, where the ball is still rising, and
 * bends the fit away from the descent that matters.
 */
export const TRACK_WINDOW_MS = 220;

/** Fewest points before a fit is preferred to plain interpolation. */
export const MIN_FIT_POINTS = 3;

export interface TrackPoint {
  t: number;
  x: number;
  y: number;
}

/**
 * Where a short ball track crosses the rim line, as an x in frame units.
 *
 * Fits x and y against time by least squares and solves for the moment the
 * ball's depth below the rim line reaches zero. Straight lines rather than a
 * parabola on purpose: across the ~200ms either side of the rim, gravity bends
 * the path by far less than detection noise moves a single centre, so a
 * quadratic mostly fits the noise and costs the stability this is for.
 *
 * Returns null when the points do not describe a crossing, leaving the caller
 * to fall back to interpolating between its two nearest observations.
 */
export function crossingFromTrack(points: TrackPoint[], rim: Rim): number | null {
  if (points.length < MIN_FIT_POINTS) return null;
  const n = points.length;
  // Time relative to the last point, so the numbers stay small and well scaled
  const t0 = points[n - 1].t;
  const ts = points.map((p) => p.t - t0);
  const meanT = ts.reduce((a, b) => a + b, 0) / n;
  let varT = 0;
  for (const t of ts) varT += (t - meanT) ** 2;
  // Every sighting at the same instant carries no velocity
  if (varT < 1e-9) return null;

  const slopeOf = (values: number[]) => {
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let cov = 0;
    for (let i = 0; i < n; i++) cov += (ts[i] - meanT) * (values[i] - mean);
    return { slope: cov / varT, intercept: mean - (cov / varT) * meanT };
  };

  const fx = slopeOf(points.map((p) => p.x));
  const fy = slopeOf(points.map((p) => p.y));
  const tilt = rim.tilt ?? 0;

  // depth(t) = y(t) - rimYAt(x(t)), which is linear in t given linear x and y
  const depthSlope = fy.slope - fx.slope * tilt;
  const depthAt0 = fy.intercept - rim.y - (fx.intercept - rim.x) * tilt;
  // A ball that is not descending relative to the rim never crosses it
  if (depthSlope <= 1e-9) return null;

  const tCross = -depthAt0 / depthSlope;
  // Only trust a crossing inside, or just beyond, the stretch actually seen
  const earliest = ts[0] - TRACK_WINDOW_MS;
  if (tCross < earliest || tCross > TRACK_WINDOW_MS) return null;
  return fx.intercept + fx.slope * tCross;
}

const COOLDOWN_MS = 1200; // ignore rim bounces / put-backs right after a decision
const LOST_BALL_MS = 1500; // armed shot with the ball out of view this long -> miss
const MAX_FLIGHT_MS = 3500;
const APPROACH_WIDTHS = 3; // ball must be within this many rim widths sideways to count as a shot

export class ShotDetector {
  private armedAt: number | null = null;
  private lastAbove: { t: number; x: number; y: number } | null = null;
  /** Recent sightings, newest last, for fitting the crossing. */
  private track: TrackPoint[] = [];
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
    this.track.push({ t: obs.t, x, y });
    // Keep it short in both count and time: an old sighting from the top of
    // the arc would bend the fit away from the descent being measured.
    while (this.track.length > TRACK_POINTS || (this.track.length > 1 && obs.t - this.track[0].t > TRACK_WINDOW_MS)) {
      this.track.shift();
    }
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
      const interpolated = prev.x + (x - prev.x) * Math.min(1, Math.max(0, fraction));
      // Fitted across the recent track where there is enough of it, so one
      // badly centred ball cannot decide a make on its own; otherwise the two
      // nearest sightings, which is all there is to go on.
      const crossX = crossingFromTrack(this.track, rim) ?? interpolated;
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
    // The next shot must be fitted to its own flight, not to the tail of this
    // one's: sightings of a ball dropping out of the net describe nothing
    // about the shot that follows.
    this.track = [];
    this.cooldownUntil = t + COOLDOWN_MS;
    return shot;
  }
}
