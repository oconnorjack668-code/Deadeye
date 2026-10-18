// src/lib/video/pace.ts
// Slows a clip's playback just enough that the tracker sees every frame.
//
// The shot tracker analyses an uploaded clip by playing it and scoring each
// frame the browser presents. When the per-frame work takes longer than a
// frame lasts, the browser does not wait: it presents later frames and the
// ones in between are never looked at. 540361d measured exactly this on the
// bench - under half the frames scored, a 10.7 second stretch with no ball at
// all, and makes turned into misses because the crossing fell between the
// frames that were seen. The bench was moved to seeking frame by frame; the
// tracker players use never was.
//
// A player then reported the same thing on a 2:39 clip: about 15 seconds with
// nothing tracked, and wrong calls after the first minute. The first minute
// matters - a phone doing pixel work on every frame heats up and slows down,
// so a rate that kept up at the start stops keeping up, which is why a fixed
// speed cannot be the answer either.
//
// Seeking frame by frame, as the bench does, would fix coverage, but each seek
// into phone footage (HEVC, a keyframe every second or so) can mean decoding
// from the last keyframe again - potentially many times slower than playing.
// Playing is the cheap way to decode a clip in order. So this keeps playing,
// watches the clip time between consecutive scored frames, and turns the speed
// down whenever frames are being skipped and back up when they stop being.

/** The sampling the detector was measured at: 30 frames a second of footage. */
export const TARGET_FRAME_MS = 1000 / 30;

/** A gap this many frame intervals wide means at least one frame was skipped. */
export const SKIP_FACTOR = 1.5;

/**
 * Slowest the clip will be played. Below this the run takes four times the
 * clip's length, and a device that cannot keep up even here is better served by
 * finishing than by crawling.
 */
export const MIN_RATE = 0.25;

/** Each time frames are skipped, the speed is cut to this fraction. */
const SLOW_DOWN = 0.8;

/** After this many clean frames in a row, try a little faster. */
const CALM_FRAMES = 90;
const SPEED_UP = 1.15;

export interface Pacer {
  /**
   * Records the clip time of a frame that was just scored and returns the
   * playback rate to use from here.
   */
  next(mediaMs: number): number;
  rate(): number;
  /** Frames estimated to have gone unscored so far. */
  skipped(): number;
}

/** Wide gaps seen at the slowest speed before they are taken as the clip's own frame rate. */
const NATIVE_EVIDENCE = 10;

export function createPacer(): Pacer {
  let rate = 1;
  let last: number | null = null;
  let calm = 0;
  let skipped = 0;
  // The clip's own frame interval, when that is wider than TARGET_FRAME_MS. A
  // 15 fps clip has 66ms between frames however slowly it plays, and every gap
  // would otherwise read as a skip and hold the speed at the floor for nothing.
  //
  // It cannot be taken from the smallest gap seen, which was the obvious way:
  // on a phone that skips from the very first frame, the smallest gap is a
  // skipped one, and slowing down would never start. Only gaps that persist at
  // the slowest speed are evidence about the clip rather than the device.
  let nativeMs = TARGET_FRAME_MS;
  let floorGaps = 0;
  let floorMin = Infinity;

  return {
    next(mediaMs) {
      if (last === null || mediaMs <= last) {
        // First frame, or the clip was rewound: nothing to compare against
        last = mediaMs;
        return rate;
      }
      const gap = mediaMs - last;
      last = mediaMs;

      // 60 fps footage is scored at 30: skipping every other frame is not a skip
      if (gap > nativeMs * SKIP_FACTOR) {
        skipped += Math.max(1, Math.round(gap / nativeMs) - 1);
        calm = 0;
        if (rate > MIN_RATE) {
          rate = Math.max(MIN_RATE, rate * SLOW_DOWN);
        } else {
          floorMin = Math.min(floorMin, gap);
          if (++floorGaps >= NATIVE_EVIDENCE) nativeMs = Math.max(nativeMs, floorMin);
        }
      } else if (++calm >= CALM_FRAMES && rate < 1) {
        rate = Math.min(1, rate * SPEED_UP);
        calm = 0;
      }
      return rate;
    },
    rate: () => rate,
    skipped: () => skipped,
  };
}
