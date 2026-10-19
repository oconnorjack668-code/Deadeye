// src/lib/video/ballTracker.ts
// Follows the ball through a clip: which moving blob is the ball, frame after
// frame, and what it looks like.
//
// Colour is the one thing that separates a ball from a hand in the frames that
// decide a make, where the crop is busy with net, backboard and rim. But asking
// a player to tap their ball would be a third calibration step, and the
// measurement that justified this tracker got 10 of 10 attempts with no colour
// at all - so colour has to earn its place without costing a tap.
//
// It learns instead. Shape and motion find the ball unaided; the colours of
// those finds are collected, and once there are enough to be sure, the median
// of them sharpens later frames. Nothing is assumed about what a ball looks
// like, which is the point: players' balls vary, and the one that prompted all
// this is maroon.
//
// Which blob is the ball is decided by continuity, not by score alone. Taking
// the best-scoring blob on every frame was measured on a 2:39 session with two
// rebounders and two balls, and it failed there in ways no threshold could fix.
// People moving behind the glass backboard lit up the same spot above the rim
// on hundreds of frames, often outscoring the real ball, and the shot detector
// paired the ball's last position with that spot. Rebounders' heads under the
// rim are round, ball-sized and moving. And a net still swinging from the last
// shot is all three at once.
//
// So every moving ball-like thing is followed separately, from frame to frame,
// by where it was heading. The one reported is one that has been above the
// rim: a shot comes down from above, and none of those other things ever is.
import {
  ballCandidates,
  diffMask,
  netMotion as netMotionIn,
  DEFAULT_DIFF_THRESHOLD,
  type BallCandidate,
  type NetBox,
  type Rgb,
} from './motionBall';

/**
 * Shape-and-size score a detection must beat before its colour is believed.
 *
 * Deliberately well above the floor for reporting a ball at all. A tracker that
 * learned from its own weak guesses would teach itself the colour of the
 * player's sleeve and then confidently find sleeves.
 */
export const LEARN_ABOVE = 0.62;

/** Colours needed before the learned value is used. */
export const LEARN_SAMPLES = 12;

/** Keeps the estimate fresh as the light changes, without unbounded growth. */
export const MAX_SAMPLES = 60;

/**
 * How long a followed thing may go unseen before it is let go, in ms.
 *
 * Long enough to coast through the frame or two where the net or the rim hides
 * the ball, short enough that one which has left the crop is not still being
 * matched against the next shot.
 */
export const TRACK_COAST_MS = 200;

/**
 * How far from where it was heading a followed thing may be found, in ball
 * widths, before the allowance for its own speed.
 *
 * A ball off the rim reverses in a frame, so the prediction can be out by about
 * one and a half times the distance it travels per frame; that is the speed
 * allowance. On top of it, a ball width for the blob's centre wandering as the
 * ball blurs or is partly hidden.
 */
export const TRACK_GATE = 1;

/**
 * Hits a spot may take before it is treated as a fixture rather than a ball.
 *
 * Counted per ball-sized cell with a per-frame decay, so the count reads as
 * "lit up on about this many of the recent frames". A ball in flight crosses a
 * cell in one or two frames and never gets near this. Something lit on every
 * other frame for a third of a second does.
 */
export const HOT_SPOT = 4;
const HEAT_DECAY = 0.95;

const FRAME_MS = 1000 / 30;

/** Match radius, in ball widths, for something seen only once: no speed to predict from. */
const FIRST_GATE = 2.5;

/** Most things followed at once. Past this, new ones wait for a slot. */
const MAX_TRACKS = 4;

/** How far above the rim line, in rim widths, counts as having been above it. */
const ABOVE_RIM = 0.3;

/**
 * What moving like a ball in flight means, over its last few sightings: at
 * least a ball width covered, and in a line - the distance from first to last
 * at least this share of the path walked between them. A ball's path is a
 * parabola, straight at this scale. Something hopping back and forth between
 * two spots walks two or three times the distance it ends up covering.
 */
const FLIGHT_WINDOW = 4;
const STRAIGHTNESS = 0.75;

/**
 * Largest a ball in flight may be, in expected ball widths. Measured balls at
 * the hoop ran at 0.8 to 1.0 of the expected width; a pass coming back past
 * the camera at 1.3 and up.
 */
const OVERSIZE = 1.25;

/** Ground, in ball widths, a followed thing must have covered in all before it is the ball. */
const RANGE = 3.5;

/** Median per channel: one bad sample cannot drag the estimate as a mean would. */
export function medianColour(samples: Rgb[]): Rgb | null {
  if (samples.length === 0) return null;
  const mid = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return {
    r: mid(samples.map((c) => c.r)),
    g: mid(samples.map((c) => c.g)),
    b: mid(samples.map((c) => c.b)),
  };
}

export interface BallTrackerOptions {
  expectedDiameter: number;
  threshold?: number;
  minScore?: number;
  /**
   * A colour known in advance - a remembered ball, or one a player picked.
   * Used from the first frame, and learning then refines rather than replaces
   * it, so a remembered ball still copes with a differently lit hall.
   */
  initialColour?: Rgb | null;
  /** Off, the tracker runs on shape and motion alone. */
  learn?: boolean;
  /**
   * Where the net hangs on the canvas, which also places the rim line.
   *
   * Given, only something that has been above the rim is reported as the ball,
   * nothing may start being followed from inside the net, and netMotion()
   * reports on it. Without it every followed thing is eligible, which is how
   * the tracker behaved before it knew where the rim was.
   */
  net?: NetBox | null;
}

export interface BallTracker {
  /**
   * Finds the ball between two frames, passing `next` for three-frame
   * differencing. Returns null when nothing ball-like moved, or when what
   * moved was not a ball in flight.
   *
   * `at` is the frame's time in ms. Without it frames are taken to be 1/30s
   * apart, which is how the tracker has always been fed.
   */
  track(
    prev: Uint8ClampedArray,
    cur: Uint8ClampedArray,
    width: number,
    height: number,
    next?: Uint8ClampedArray,
    at?: number
  ): BallCandidate | null;
  /** What the ball is currently believed to look like, or null. */
  colour(): Rgb | null;
  /** How many colours have been learned, for diagnostics. */
  samples(): number;
  /**
   * The share of the net that moved on the frame last tracked, the ball left
   * out, or null when no net box was given. See netMotion in motionBall.
   */
  netMotion(): number | null;
}

interface Sighting {
  t: number;
  x: number;
  y: number;
  diameter: number;
}

interface Track {
  seen: Sighting[];
  /** Frames on which it was moving like a ball in flight. */
  flights: number;
  /** Everywhere it has been, as a box: minX, minY, maxX, maxY. */
  box: [number, number, number, number];
  /** Has been above the rim line: the mark of a ball in flight. */
  above: boolean;
  /** Matched on the frame being processed. */
  current: BallCandidate | null;
}

export function createBallTracker(options: BallTrackerOptions): BallTracker {
  const learn = options.learn ?? true;
  const threshold = options.threshold ?? DEFAULT_DIFF_THRESHOLD;
  const net = options.net ?? null;
  const D = options.expectedDiameter;
  const samples: Rgb[] = [];
  let learned: Rgb | null = null;
  let lastNet: number | null = null;

  const current = (): Rgb | null => learned ?? options.initialColour ?? null;

  let tracks: Track[] = [];
  let clock = 0;

  // Heat per ball-sized cell, see HOT_SPOT
  const cell = Math.max(4, D);
  let heat: Float32Array | null = null;
  let heatCols = 0;

  // Three-frame differencing compares (prev, cur) and (cur, next), and the next
  // call's (prev, cur) is this call's (cur, next). Keeping that mask halves the
  // pixel work, which is most of the cost on a phone.
  let carried: { a: Uint8ClampedArray; b: Uint8ClampedArray; mask: Uint8Array } | null = null;
  const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number) => {
    if (carried && carried.a === a && carried.b === b) return carried.mask;
    return diffMask(a, b, width, height, threshold);
  };

  /** Rim line height on the canvas at x. */
  const rimLine = (x: number) => (net ? net.top + (x - net.x0) * net.slope : 0);
  const isAbove = (c: { x: number; y: number }) => (net ? c.y < rimLine(c.x) - ABOVE_RIM * net.depth : true);
  const medianDiameter = (tr: Track) => {
    const sizes = tr.seen.slice(-6).map((s) => s.diameter).sort((a, b) => a - b);
    return sizes[Math.floor(sizes.length / 2)];
  };
  const inFlight = (tr: Track) => {
    const w = tr.seen.slice(-FLIGHT_WINDOW);
    if (w.length < 3) return false;
    let walked = 0;
    for (let i = 1; i < w.length; i++) walked += Math.hypot(w[i].x - w[i - 1].x, w[i].y - w[i - 1].y);
    const covered = Math.hypot(w[w.length - 1].x - w[0].x, w[w.length - 1].y - w[0].y);
    return covered >= D && covered >= walked * STRAIGHTNESS;
  };

  return {
    track(prev, cur, width, height, next, at) {
      clock = at ?? clock + 1000 / 30;
      const now = clock;

      const before = diff(prev, cur, width, height);
      let mask = before;
      if (next) {
        const after = diffMask(cur, next, width, height, threshold);
        carried = { a: cur, b: next, mask: after };
        mask = new Uint8Array(before.length);
        for (let i = 0; i < mask.length; i++) mask[i] = before[i] & after[i];
      } else {
        carried = null;
      }

      const sampledColour = current();
      const candidates = ballCandidates(mask, cur, width, height, {
        expectedDiameter: D,
        threshold,
        minScore: options.minScore,
        sampledColour,
      });

      // Cool every cell, then (below) warm the ones something ball-like moved in
      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      if (!heat || heatCols !== cols || heat.length !== cols * rows) {
        heat = new Float32Array(cols * rows);
        heatCols = cols;
      }
      for (let i = 0; i < heat.length; i++) heat[i] *= HEAT_DECAY;
      const heatAt = (c: { x: number; y: number }) =>
        heat![
          Math.min(rows - 1, Math.max(0, Math.floor(c.y / cell))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(c.x / cell)))
        ];

      // Let go of what has not been seen for a while, and of anything that has
      // stopped moving: a "ball" that stays put for six sightings is a fixture
      // that got lucky
      tracks = tracks.filter((tr) => {
        if (now - tr.seen[tr.seen.length - 1].t > TRACK_COAST_MS) return false;
        if (tr.seen.length >= 6) {
          const recent = tr.seen.slice(-6);
          const spread = Math.max(
            Math.max(...recent.map((s) => s.x)) - Math.min(...recent.map((s) => s.x)),
            Math.max(...recent.map((s) => s.y)) - Math.min(...recent.map((s) => s.y))
          );
          if (spread < D * 0.5) return false;
        }
        return true;
      });

      // Match what was followed first, balls in flight before anything else,
      // each to the nearest unclaimed candidate where it was heading
      const claimed = new Set<BallCandidate>();
      const order = [...tracks].sort((a, b) => Number(b.above) - Number(a.above) || b.seen.length - a.seen.length);
      for (const tr of order) {
        tr.current = null;
        const last = tr.seen[tr.seen.length - 1];
        // Speed over the last few sightings rather than the last two: a blob's
        // centre wanders by a few pixels as the ball blurs, and over one frame
        // that is a large share of the step, enough to point the prediction
        // at the rim instead of the ball dropping through it
        const base = tr.seen.length > 1 ? tr.seen[Math.max(0, tr.seen.length - 4)] : null;
        const dt = now - last.t;
        let vx = 0;
        let vy = 0;
        if (base && last.t > base.t) {
          vx = (last.x - base.x) / (last.t - base.t);
          vy = (last.y - base.y) / (last.t - base.t);
        }
        const px = last.x + vx * dt;
        const py = last.y + vy * dt;
        // The speed allowance is for one frame however long the gap: a ball
        // hidden in the rim for two frames was otherwise given a radius wide
        // enough to take in the flicker beside the backboard
        // Seen once, it has no speed yet, and a shot can cover more than its
        // own width between frames: allow for the fastest one
        const gate = tr.seen.length < 2 ? D * FIRST_GATE : D * TRACK_GATE + Math.hypot(vx, vy) * FRAME_MS * 1.5;
        let bestDistance = Infinity;
        for (const c of candidates) {
          if (claimed.has(c)) continue;
          const d = Math.hypot(c.x - px, c.y - py);
          // A fixture can only take over a followed ball if it is right where
          // the ball was going: otherwise the glass-backboard flicker beside
          // the rim takes the ball over as it reaches the ring
          if (heatAt(c) >= HOT_SPOT && d > D) continue;
          // Nearer wins, and between two at much the same distance the more
          // ball-like one
          const cost = d - c.score * D * 0.5;
          if (d <= gate && cost < bestDistance) {
            bestDistance = cost;
            tr.current = c;
          }
        }
        if (tr.current) {
          claimed.add(tr.current);
          tr.seen.push({ t: now, x: tr.current.x, y: tr.current.y, diameter: tr.current.diameter });
          tr.box = [
            Math.min(tr.box[0], tr.current.x),
            Math.min(tr.box[1], tr.current.y),
            Math.max(tr.box[2], tr.current.x),
            Math.max(tr.box[3], tr.current.y),
          ];
          if (tr.seen.length > 12) tr.seen.shift();
          if (isAbove(tr.current)) tr.above = true;
          if (inFlight(tr)) tr.flights++;
        }
      }

      // Start following anything new that is not a fixture. That includes
      // the net: a ball hidden by the rim on the way in is often first seen
      // again dropping through it, and that sighting is what tells a make
      // from a rim-out. The net's own swinging does not move like a ball in
      // flight, so it is followed but never reported.
      for (const c of candidates) {
        if (claimed.has(c) || tracks.length >= MAX_TRACKS) continue;
        if (heatAt(c) >= HOT_SPOT) continue;
        const first = { t: now, x: c.x, y: c.y, diameter: c.diameter };
        tracks.push({ seen: [first], flights: 0, box: [c.x, c.y, c.x, c.y], above: isAbove(c), current: c });
        claimed.add(c);
      }

      for (const c of candidates) heat[
        Math.min(rows - 1, Math.max(0, Math.floor(c.y / cell))) * cols + Math.min(cols - 1, Math.max(0, Math.floor(c.x / cell)))
      ] += 1;

      // The ball: the thing in flight seen this frame. In flight means moving
      // like a thrown ball - covering ground, smoothly. The backboard flicker
      // on the measured clip hopped between two spots two ball widths apart
      // all session, which over enough frames adds up to distance; what it
      // never does is keep going in one direction. Heads under the rim bob
      // and drift; they do not cover a ball width every few frames.
      //
      // With more than one, something that has been above the rim wins - a
      // shot comes down from there - and then whatever has been in flight
      // longest. Something in flight that never was above still counts when
      // nothing else is there: a ball that bounced off the ring out of sight
      // and reappears falling beside it is the evidence that it missed.
      //
      // Without a rim to measure from, as the tracker was before, anything
      // followed counts.
      let found: BallCandidate | null = null;
      let best = -1;
      for (const tr of tracks) {
        if (!tr.current) continue;
        if (net && !inFlight(tr)) continue;
        // A ball much bigger than one at the hoop is much nearer the camera
        // than the hoop: a pass back to the shooter, not a shot. One blob's
        // size is noisy, so it is the median of the last few that counts.
        if (net && medianDiameter(tr) > OVERSIZE * D) continue;
        // And somewhere that flickers all the time, it has come from
        // elsewhere. The flicker on the measured clip was confined to a patch
        // two and a half ball widths tall for the whole session, and inside
        // that patch could still string a few frames together in a line. A
        // real ball reaching a busy spot - the net, still swinging from the
        // last shot - has always crossed half the crop to get there.
        if (net && heatAt(tr.current) >= HOT_SPOT && Math.hypot(tr.box[2] - tr.box[0], tr.box[3] - tr.box[1]) < RANGE * D) continue;
        const rank = (tr.above ? 1000 : 0) + tr.flights;
        if (rank > best) {
          best = rank;
          found = tr.current;
        }
      }

      lastNet = net ? netMotionIn(before, width, height, net, found) : null;

      // Three conditions, each for its own reason.
      //
      // `next`, because the colour is read from the masked pixels and a
      // two-frame mask covers where the ball was as well as where it is. At the
      // old position the current frame shows background, so the mean comes back
      // a blend of ball and wall - measured at 0.33 similarity to a ball that
      // was in fact a perfect match. Three frames leave only the position the
      // ball is actually in.
      //
      // A high score, because a tracker learning from its own weak guesses
      // teaches itself the colour of the player's sleeve and then confidently
      // finds sleeves.
      //
      // And no colour already in play, or it feeds back on itself: believing a
      // colour raises the score of blobs matching it, which would teach that
      // colour more firmly still.
      if (learn && next && found && !sampledColour && found.score >= LEARN_ABOVE) {
        samples.push(found.colour);
        if (samples.length > MAX_SAMPLES) samples.shift();
        if (samples.length >= LEARN_SAMPLES) learned = medianColour(samples);
      }
      return found;
    },
    colour: current,
    samples: () => samples.length,
    netMotion: () => lastNet,
  };
}
