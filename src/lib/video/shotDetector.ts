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
  /**
   * Share of the net that moved on this frame, the ball excluded (0..1), from
   * netMotion in motionBall. Optional: without it a make is judged on the
   * ball's path alone, as it was before the net was watched.
   */
  net?: number;
}

export interface ShotDetectorOptions {
  /**
   * The frame's height over its width.
   *
   * Positions arrive as fractions of the frame, so a step of 0.01 down and
   * 0.01 across are different distances on anything but a square frame. Every
   * distance here is measured in rim widths, and converting a vertical one needs
   * this. 1 when unknown, which is what the detector assumed before.
   */
  aspect?: number;
}

export interface DetectedShot {
  t: number; // time the shot was decided (ms)
  made: boolean;
  confident: boolean; // false when the result was inferred without seeing the ball cross the rim
  /**
   * How far from the rim's centre the ball crossed, in half-rim widths.
   *
   * 0 is dead centre, 1 is the ring itself, and the make test accepts up to
   * MAKE_MARGIN. Absent when no crossing was seen, which is the same case as
   * confident: false.
   *
   * Kept because "called a miss by a hair" and "called a miss by a metre" are
   * completely different events and the app could not previously tell them
   * apart - see BORDERLINE_MARGIN below.
   */
  crossMargin?: number;
}

/**
 * How far out a crossing can be and still count as a make.
 *
 * Slightly over 1 because the ball has width and the measured rim is two taps
 * rather than a survey.
 */
export const MAKE_MARGIN = 1.1;

// A "borderline" band was tried here, marking crossings just outside the ring
// as unclear for the player to decide. It was added while chasing a wrong call
// that turned out to have a different cause entirely, and once that was fixed
// the measured margins separated cleanly - makes at 0.18 to 0.64 half-rims,
// misses at 1.21 and above. The band only ever flagged correct misses, so it
// cost the player taps and bought nothing. Removed rather than kept "just in
// case": if a mis-tapped rim turns out to blur that gap on other footage, it
// can come back with evidence behind it.

/**
 * Fastest a ball may appear to travel, in rim widths per second.
 *
 * A rim is 45cm, so 25 rim widths a second is about 11 m/s on screen - well
 * above a jump shot and generous enough for a close camera, a fast break or a
 * blurred frame. Its job is not to model ball physics but to reject a jump no
 * ball could make.
 *
 * This exists because the hoop crop necessarily contains the player, whose head
 * and shoulders are a round, moving, roughly ball-sized blob below the rim
 * line. On the measured clip that cost a made shot: the detector decided at
 * 20.1s, when the ball was still high and to the left and had not reached the
 * rim, by pairing the ball above the rim with something else below it. The
 * crossing came out 2.85 half-rims wide - indistinguishable from the genuine
 * misses at 2.87 and 3.43, so no make threshold could ever have separated them.
 * The fix is upstream of the make test: the thing that crossed has to plausibly
 * be the thing that was tracked.
 */
export const MAX_BALL_RIMS_PER_SEC = 25;

const COOLDOWN_MS = 1200; // ignore rim bounces / put-backs right after a decision
const LOST_BALL_MS = 1500; // armed shot with the ball out of view this long -> miss
const MAX_FLIGHT_MS = 3500;
const APPROACH_WIDTHS = 3; // ball must be within this many rim widths sideways to count as a shot

/**
 * How long after the ball reaches the rim line the call waits for evidence, ms.
 *
 * Deciding on the first frame at the rim was the largest single source of wrong
 * calls on the 2:39 clip. A ball that lands on the ring is at rim height and
 * inside its width on that frame whether it then drops through, bounces out or
 * rolls off the side. What happens next is what decides it, and by 0.6s it has
 * happened: the net has been dragged or has not, and the ball is under it,
 * beside it or back above it.
 */
export const CONFIRM_MS = 600;

/** Below this share of the net moving, a frame counts as the net being still. */
export const NET_MOVING = 0.05;

/**
 * Above this share, the net did not move: something passed in front of it.
 * A swinging net never changed more than 0.36 of its area between frames on
 * the measured clips; a ball passed back close to the camera changed 0.84 to
 * 1.0, and was called a make.
 */
export const NET_OCCLUDED = 0.6;

/**
 * Frames, within CONFIRM_MS of the crossing, on which the net must be moving
 * for a make. See netMotion in motionBall for why the net is watched at all.
 */
export const NET_FRAMES = 6;

/**
 * Total net movement - the sum of the moving share over CONFIRM_MS of frames -
 * that is a make on its own, with the ball never seen under the ring.
 *
 * On the measured clip makes summed 2.9 to 3.9 and rim-outs, which shake the
 * net through the ring, 1.1 to 2.4.
 */
export const NET_TOTAL_ALONE = 2.7;

/**
 * A ball under the rim this many half-rims or more from its centre has come
 * off the side, not through the net.
 *
 * Wider than MAKE_MARGIN because a made ball is pushed sideways by the net as
 * it drops out of it: measured makes left the net up to 1.4 half-rims off
 * centre.
 */
export const OFF_THE_SIDE = 1.45;

/** How far below the rim line, in rim widths, a sighting says where the ball went. */
const BELOW_FROM = 0.25;
const BELOW_TO = 1.5;

/** How far above the rim line, in rim widths, the ball counts as above it. */
const ABOVE = 0.15;

/** Closer than this above the rim line, in rim widths, the ball is at the ring. */
const AT_RIM = 0.5;

/** Closer than this above the rim line, in rim widths, the ball has reached the ring for timing. */
const NEAR = 0.8;

/** Within this many half-rims of the centre, a ball at rim height is at the ring. */
const TOUCH_SIDE = 1.6;

/** Rise, in rim widths, after reaching the ring that counts as a bounce off it. */
const BOUNCE = 0.2;

/**
 * Half-rims from the centre within which a ball back above the rim has bounced
 * off it. As wide as CLEAR_SIDE: a ball off the front of the ring can be three
 * half-rims out by the first frame it is seen again.
 */
const BOUNCE_SIDE = 4;

/** Half-rims from the centre at which a bounced ball has left the ring for good. */
const CLEAR_SIDE = 4;

/** Unseen this long at the ring, the ball has gone into the net or behind the rim. */
const HIDDEN_MS = 100;

/** Furthest ahead, in ms, a vanished ball's path is carried on to the rim line. */
const HIDDEN_REACH_MS = 120;

/**
 * Unseen this long after reaching the ring, with nothing to say it went in,
 * the ball has gone. Waiting the full LOST_BALL_MS put these calls two seconds
 * after the shot, where they read as a second, phantom attempt.
 */
const GONE_MS = 700;

/** Longest gap between the sightings either side of the rim line that can place a crossing. */
const MAX_CROSSING_GAP_MS = 250;

interface Sighting {
  t: number;
  x: number;
  y: number;
}

interface Pending {
  /** When the ball reached the rim line. */
  t: number;
  margin: number;
  confident: boolean;
  /** Sightings under the rim inside the net's width, and off to the side. */
  inside: number;
  outside: number;
}

export class ShotDetector {
  private armedAt: number | null = null;
  private lastAbove: Sighting | null = null;
  /** The sighting above the rim before lastAbove, for the ball's direction. */
  private beforeAbove: Sighting | null = null;
  private lastSeen = 0;
  private cooldownUntil = 0;
  private pending: Pending | null = null;
  /** When the ball last reached the ring on this shot. */
  private nearAt: number | null = null;
  /** When the ball was seen at the ring and then back above it: it hit the rim. */
  private touchedAt: number | null = null;
  /** Lowest the ball has come at the ring on this shot, in rim widths below it. */
  private deepest: number | null = null;
  private netLog: Array<{ t: number; net: number }> = [];
  private readonly aspect: number;
  readonly shots: DetectedShot[] = [];

  constructor(
    private rim: Rim,
    options: ShotDetectorOptions = {}
  ) {
    this.aspect = options.aspect && options.aspect > 0 ? options.aspect : 1;
  }

  setRim(rim: Rim) {
    this.rim = rim;
  }

  /** Below the rim line at the ball's own x, in rim widths. Negative is above. */
  private depth(x: number, y: number): number {
    const { rim } = this;
    return rim.width > 0 ? ((y - rimYAt(rim, x)) * this.aspect) / rim.width : 0;
  }

  /** Off the rim's centre, in half-rim widths. */
  private side(x: number): number {
    const { rim } = this;
    return rim.width > 0 ? Math.abs(x - rim.x) / (rim.width / 2) : Infinity;
  }

  /** Feed one frame. Returns a shot when one is decided on this frame. */
  push(obs: BallObservation): DetectedShot | null {
    if (obs.net !== undefined) {
      // Most of the net changing at once is something passing in front of
      // it, not the net moving: see NET_OCCLUDED
      this.netLog.push({ t: obs.t, net: obs.net > NET_OCCLUDED ? 0 : obs.net });
      while (this.netLog.length && this.netLog[0].t < obs.t - CONFIRM_MS * 2) this.netLog.shift();
    }

    if (obs.t < this.cooldownUntil) return null;

    if (this.pending) return this.confirm(obs);

    // Checked first, on every frame. Lower down it was only reached on a frame
    // where the ball was seen beside the rim, so anything that kept appearing
    // above it held a shot open indefinitely and swallowed the next one.
    if (this.armedAt !== null && obs.t - this.armedAt > MAX_FLIGHT_MS) return this.miss(obs.t, this.nearAt !== null);

    if (!obs.ball) return this.unseen(obs);

    const { x, y } = obs.ball;
    this.lastSeen = obs.t;
    const side = this.side(x);
    // Every test is in terms of depth rather than a flat `y`, so a tilted rim
    // is measured along its own line
    const depth = this.depth(x, y);

    // Above the line. Arming needs the ball clearly above it; once armed,
    // anything above the line is still the approach - a ball a hair above the
    // ring on its last visible frame was otherwise forgotten, and when it was
    // next seen dropping out of the net nothing linked it to the shot
    if ((depth < -ABOVE || (depth < 0 && this.armedAt !== null)) && side < APPROACH_WIDTHS * 2) {
      if (this.armedAt === null) this.armedAt = obs.t;
      if (side <= TOUCH_SIDE && depth >= -NEAR) this.nearAt = obs.t;
      // Came down to the ring and is now going back up: it hit the rim. Only
      // the bounce is noted - the ball can still drop in on the way back down,
      // which is how a rattled-in shot goes.
      if (this.deepest !== null && side <= BOUNCE_SIDE && depth < this.deepest - BOUNCE) this.touchedAt ??= obs.t;
      if (side <= TOUCH_SIDE && depth >= -AT_RIM) this.deepest = Math.max(this.deepest ?? -Infinity, depth);
      // Bounced off and well clear of the ring sideways: that is the miss
      if (this.touchedAt !== null && side > CLEAR_SIDE) return this.miss(obs.t, true);
      this.beforeAbove = this.lastAbove;
      this.lastAbove = { t: obs.t, x, y };
      return null;
    }

    if (this.armedAt === null) return null;

    if (depth >= 0 && this.lastAbove) {
      const prev = this.lastAbove;
      if (obs.t - prev.t > MAX_CROSSING_GAP_MS) {
        // Too long since it was above to say where it crossed. Falling beside
        // the ring after reaching it says it missed; anything else is not
        // evidence either way.
        const below = depth >= BELOW_FROM && depth <= BELOW_TO;
        if (this.nearAt !== null && below && side >= OFF_THE_SIDE) return this.miss(obs.t, true);
        // Reached the ring, vanished, and is now dropping out from under the
        // net: it went through out of sight. Still needs the net to agree.
        if (this.nearAt !== null && below && obs.t - this.nearAt <= GONE_MS) {
          this.pending = { t: this.nearAt, margin: this.side(prev.x), confident: false, inside: 1, outside: 0 };
          return this.confirm({ t: obs.t, ball: null });
        }
        return null;
      }
      // Is this plausibly the same ball? The crop contains the player, and
      // pairing the ball above the rim with a shoulder below it produces a
      // confident crossing through a point the ball never went near.
      const travelled = Math.hypot(x - prev.x, (y - prev.y) * this.aspect);
      const reachable = (MAX_BALL_RIMS_PER_SEC * Math.max(obs.t - prev.t, 1)) / 1000;
      if (this.rim.width > 0 && travelled > reachable * this.rim.width) return null;
      // Both the ball's path and the rim line are straight, so `depth` runs
      // linearly along this step and the crossing is where it reaches zero.
      const prevDepth = this.depth(prev.x, prev.y);
      const closed = prevDepth - depth;
      const fraction = Math.abs(closed) < 1e-6 ? 1 : prevDepth / closed;
      // Just the two sightings either side of the rim line. Fitting a line
      // across the recent track was tried, to stop one badly centred ball
      // deciding a make - and measured against hand-labelled shots it was
      // worse, 7 of 10 against 9. It changed exactly two calls and got both
      // wrong. The likely reason is that the path is least straight at the
      // moment that matters: a ball clipping the rim or dragging through the
      // net deflects, and a fit reaching 200ms back averages the deflection
      // into the crossing. Locality beats smoothing when the motion being
      // measured is not smooth. See README; do not re-add without labels.
      const crossX = prev.x + (x - prev.x) * Math.min(1, Math.max(0, fraction));
      const margin = this.side(crossX);
      const at = prev.t + (obs.t - prev.t) * Math.min(1, Math.max(0, fraction));
      const confident = obs.t - prev.t <= MAX_CROSSING_GAP_MS;
      if (margin > MAKE_MARGIN) return this.decide(obs.t, false, confident, margin, at);
      // Inside the ring on screen. That is necessary for a make, not proof of
      // one: see CONFIRM_MS.
      this.pending = { t: at, margin, confident, inside: 0, outside: 0 };
      return this.confirm(obs);
    }

    if (side > APPROACH_WIDTHS * 2 + 2) return this.miss(obs.t, this.nearAt !== null);
    return null;
  }

  /** A frame with no ball in it, while nothing is pending. */
  private unseen(obs: BallObservation): DetectedShot | null {
    if (this.armedAt === null) return null;
    const gone = obs.t - this.lastSeen;
    // Disappeared at the ring with the net being watched: the net will say
    // whether it went through
    const crossX = this.hiddenCrossing();
    if (gone >= HIDDEN_MS && crossX !== null && this.netLog.length && this.side(crossX) <= MAKE_MARGIN) {
      this.pending = { t: this.lastAbove!.t, margin: this.side(crossX), confident: false, inside: 0, outside: 0 };
      return this.confirm(obs);
    }
    // Confident only when it was seen bouncing off: a ball that reached the
    // ring and vanished may equally have gone in unseen
    if (this.nearAt !== null && gone > GONE_MS) return this.miss(obs.t, this.touchedAt !== null);
    if (gone > LOST_BALL_MS) return this.miss(obs.t, false);
    return null;
  }

  /**
   * Where the ball would have crossed the rim line, for a ball that vanished
   * just above it on its way down, or null.
   *
   * A ball dropping into the ring is usually hidden by it, or by the net, on
   * exactly the frames that would place the crossing. Its last two sightings
   * say where it was headed, and when it was within a few frames of the rim
   * line that is close enough to carry on along: on the clip that prompted
   * this, a swish last seen half a rim width above the ring and 1.25 half-rims
   * out was heading for 0.26 half-rims.
   */
  private hiddenCrossing(): number | null {
    const last = this.lastAbove;
    const before = this.beforeAbove;
    if (!last || !before || last.t !== this.lastSeen || last.t <= before.t) return null;
    const depth = this.depth(last.x, last.y);
    if (depth < -AT_RIM * 2) return null;
    const sink = (depth - this.depth(before.x, before.y)) / (last.t - before.t);
    if (sink <= 0) return null;
    const ms = -depth / sink;
    if (ms > HIDDEN_REACH_MS) return null;
    return last.x + ((last.x - before.x) / (last.t - before.t)) * ms;
  }

  /** Gathers what happened after a crossing inside the ring, and calls it once it can. */
  private confirm(obs: BallObservation): DetectedShot | null {
    const p = this.pending!;

    if (obs.ball) {
      const depth = this.depth(obs.ball.x, obs.ball.y);
      const side = this.side(obs.ball.x);
      this.lastSeen = obs.t;
      if (depth < -ABOVE && side <= BOUNCE_SIDE) {
        // Back above the rim: it hit the ring and bounced. Not decided yet - it
        // may still drop in, which is how a rattled-in shot goes - so the shot
        // stays armed from here, as though it had not come down at all.
        this.pending = null;
        this.touchedAt ??= p.t;
        this.nearAt = obs.t;
        this.deepest = null;
        this.beforeAbove = null;
        this.lastAbove = { t: obs.t, x: obs.ball.x, y: obs.ball.y };
        return null;
      }
      if (depth >= BELOW_FROM && depth <= BELOW_TO) {
        if (side < OFF_THE_SIDE) p.inside++;
        else p.outside++;
      }
    }

    // Seen dropping beside the ring and never under it: it rolled off the side
    if (p.outside >= 2 && p.inside === 0) return this.decide(obs.t, false, true, p.margin, p.t);

    const netKnown = this.netLog.some((n) => n.t >= p.t);
    const elapsed = obs.t - p.t;

    if (!netKnown) {
      // Judged on the ball alone, as before the net was watched: a sighting
      // under the ring settles it, and so does running out of time without
      // one, since the crossing itself was inside.
      if (p.inside >= 1 || elapsed >= CONFIRM_MS) {
        return this.decide(obs.t, p.outside <= p.inside, p.confident, p.margin, p.t);
      }
      return null;
    }

    const moving = this.netLog.filter((n) => n.t >= p.t && n.t <= p.t + CONFIRM_MS && n.net >= NET_MOVING).length;
    if (moving >= NET_FRAMES && p.inside >= 1 && p.outside <= p.inside) return this.decide(obs.t, true, p.confident, p.margin, p.t);
    if (elapsed >= CONFIRM_MS) {
      // A make needs the net dragged and the ball seen under the ring. The net
      // moving is not enough on its own - a ball hitting the ring and
      // bouncing out of sight shook it on fifteen frames on the measured
      // clip, as many as a swish - unless it moved a great deal more than a
      // rim hit does. And the ball under the ring is not enough either: one
      // that fell past the front of it is there too, with the net still.
      if (p.inside >= 1 && p.outside <= p.inside && moving >= NET_FRAMES) return this.decide(obs.t, true, p.confident, p.margin, p.t);
      const total = this.netLog.filter((n) => n.t >= p.t && n.t <= p.t + CONFIRM_MS).reduce((sum, n) => sum + n.net, 0);
      if (p.inside === 0 && p.outside === 0 && total >= NET_TOTAL_ALONE) return this.decide(obs.t, true, false, p.margin, p.t);
      if (p.inside === 0 && p.outside === 0 && moving >= NET_FRAMES) {
        // The ring was hit and the ball has not been seen since. It may yet
        // drop in - a ball off the ring can go a metre up and still fall
        // through - so the shot goes back to waiting for it, and is called a
        // miss if it does not come back.
        this.pending = null;
        this.touchedAt ??= p.t;
        this.nearAt = p.t;
        this.lastSeen = obs.t;
        this.deepest = null;
        this.beforeAbove = null;
        return null;
      }
      return this.decide(obs.t, false, p.confident, p.margin, p.t);
    }
    return null;
  }

  /** A miss, timed at the ring when the ball got there. */
  private miss(t: number, confident: boolean): DetectedShot {
    return this.decide(t, false, confident, undefined, this.touchedAt ?? this.nearAt ?? undefined);
  }

  /**
   * Records a shot. `at` is when the ball reached the rim, when that is known
   * and differs from now: the call can come some time later, and the shot's
   * time is used to find it in the clip.
   */
  private decide(t: number, made: boolean, confident: boolean, crossMargin?: number, at?: number): DetectedShot {
    const shot: DetectedShot = { t: at ?? t, made, confident, ...(crossMargin === undefined ? {} : { crossMargin }) };
    this.shots.push(shot);
    this.armedAt = null;
    this.lastAbove = null;
    this.beforeAbove = null;
    this.pending = null;
    this.nearAt = null;
    this.touchedAt = null;
    this.deepest = null;
    this.cooldownUntil = t + COOLDOWN_MS;
    return shot;
  }
}
