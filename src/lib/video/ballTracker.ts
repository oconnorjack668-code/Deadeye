// src/lib/video/ballTracker.ts
// Wraps findBall with a memory of what the ball looked like.
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
import { findBall, type BallCandidate, type Rgb } from './motionBall';

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
}

export interface BallTracker {
  /**
   * Finds the ball between two frames, passing `next` for three-frame
   * differencing. Returns null when nothing ball-like moved.
   */
  track(
    prev: Uint8ClampedArray,
    cur: Uint8ClampedArray,
    width: number,
    height: number,
    next?: Uint8ClampedArray
  ): BallCandidate | null;
  /** What the ball is currently believed to look like, or null. */
  colour(): Rgb | null;
  /** How many colours have been learned, for diagnostics. */
  samples(): number;
}

export function createBallTracker(options: BallTrackerOptions): BallTracker {
  const learn = options.learn ?? true;
  const samples: Rgb[] = [];
  let learned: Rgb | null = null;

  const current = (): Rgb | null => learned ?? options.initialColour ?? null;

  return {
    track(prev, cur, width, height, next) {
      const sampledColour = current();
      const found = findBall(
        prev,
        cur,
        width,
        height,
        {
          expectedDiameter: options.expectedDiameter,
          threshold: options.threshold,
          minScore: options.minScore,
          sampledColour,
        },
        next
      );

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
  };
}
