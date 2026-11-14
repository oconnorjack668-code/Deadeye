// src/lib/video/workload.ts
// Keeps an uploaded clip playing at full speed by doing less work per frame
// when a device cannot keep up, rather than slowing the clip down.
//
// The shot tracker analyses a clip by playing it and scoring each frame the
// browser presents. When the per-frame work outruns a frame, the browser moves
// on and the frames in between are never looked at - 540361d measured that
// costing makes. The first answer was to slow playback until every frame was
// scored (0c27635). It worked, and players hated it: a two and a half minute
// session took four or five minutes to check, which is not something anyone
// sits through twice.
//
// Most of that slowdown was work that did not need doing. Phones record at 60
// fps and the tracker was scoring every one of those frames, twice the work of
// the 30 fps it was measured at, for nothing. Worse, a "60 fps" clip is often
// 30 fps footage with every frame shown twice, and three-frame differencing
// against an identical copy finds no motion at all: the ball vanished on
// exactly the frames that were being paid for. So frames are thinned to 30 a
// second and repeats are dropped before any pixel work is done.
//
// Past that, a device that still cannot keep up gets a smaller picture of the
// hoop to work on. The crop is scaled so the ball is about 28px across at the
// top level; the lowest keeps it near 18, which three-frame differencing
// still finds reliably, and the work per frame falls with the square of it.

/** The sampling the detector was measured at: 30 frames a second of footage. */
export const TARGET_FRAME_MS = 1000 / 30;

/**
 * Frames closer together than this are thinned out. Less than a full 30 fps
 * interval so that 30 fps footage with a little timing jitter keeps every frame.
 */
export const MIN_GAP_MS = TARGET_FRAME_MS * 0.75;

/** A gap this many frame intervals wide means at least one frame was skipped. */
export const SKIP_FACTOR = 1.5;

/** Side of the square the hoop crop is drawn into, in px, from most work to least. */
export const CANVAS_LEVELS = [320, 256, 208] as const;

/** Skipped frames, within the last WINDOW scored, that step the work down a level. */
const SKIPS_TO_STEP_DOWN = 4;
const WINDOW = 30;

/** Clean frames in a row after which the work steps back up a level. */
const CALM_TO_STEP_UP = 300;

/**
 * The speed an uploaded clip drops to when frames are going unscored.
 *
 * Slowing the clip was dropped once (see above) because it was always on. It
 * comes back as the first answer to falling behind on an upload, and only
 * then, because the frames lost are not this code's to win back. Measured in
 * Chrome on the bench laptop (14 Nov 2026), playing clip 2 (60 fps, portrait)
 * at full speed lost about a quarter of the frames however they were read out
 * of the video - on the main thread, through createImageBitmap in a worker, or
 * as a VideoFrame - and the calls fell from 31 of 31 to 25-27. Reading pixels
 * back from the graphics chip is what costs them: with no reading at all the
 * same playback lost almost none. At half speed every frame arrived and it
 * called 30 of 31; at three quarters it still lost them. A smaller picture
 * does not help here, since the cost is the reading, not the pixel work.
 */
export const SLOW_RATE = 0.5;

/**
 * Skipped frames, within the last WINDOW scored, that slow an upload: a
 * quarter of them, which is what clip 2 lost at full speed. Fewer get the
 * smaller picture as before. At SKIPS_TO_STEP_DOWN a laptop that keeps up
 * with a 30 fps clip slowed it during one busy moment, doubling the time to
 * check it for nothing.
 */
const SKIPS_TO_SLOW = 8;

export interface WorkloadOptions {
  /**
   * Answer a heavy loss of frames (SKIPS_TO_SLOW) by asking for the clip to
   * be played slower (`slowed()`), keeping the full picture; a lighter loss
   * still gets the smaller picture, decided once a whole window has gone by.
   * For an uploaded clip, which can be slowed; a live camera cannot.
   */
  slowFirst?: boolean;
}

export interface Workload {
  /**
   * Whether a frame presented at this clip time should be scored at all.
   * False for frames closer than MIN_GAP_MS to the last one scored.
   */
  wants(mediaMs: number): boolean;
  /** Records that a frame at this clip time was scored. */
  scored(mediaMs: number): void;
  /** The canvas size to draw the hoop crop at, from CANVAS_LEVELS. */
  canvas(): number;
  /** Frames estimated to have gone unscored so far. */
  skipped(): number;
  /** The clip should now play at SLOW_RATE: see WorkloadOptions.slowFirst. Once set, it stays set. */
  slowed(): boolean;
}

export function createWorkload(options: WorkloadOptions = {}): Workload {
  let last: number | null = null;
  let level = 0;
  let slowed = false;
  let skipped = 0;
  let calm = 0;
  // 1 for each recent scored frame that followed a skip, newest last
  const recent: number[] = [];

  return {
    wants(mediaMs) {
      // First frame, or the clip was rewound: nothing to compare against
      if (last === null || mediaMs < last) return true;
      return mediaMs - last >= MIN_GAP_MS;
    },
    scored(mediaMs) {
      if (last === null || mediaMs <= last) {
        last = mediaMs;
        return;
      }
      const gap = mediaMs - last;
      last = mediaMs;
      const skip = gap > TARGET_FRAME_MS * SKIP_FACTOR;
      if (skip) {
        skipped += Math.max(1, Math.round(gap / TARGET_FRAME_MS) - 1);
        calm = 0;
      } else {
        calm++;
      }
      recent.push(skip ? 1 : 0);
      if (recent.length > WINDOW) recent.shift();
      const skips = recent.reduce((n, s) => n + s, 0);
      // An upload not yet slowed waits for a whole window before taking the
      // smaller picture, so that a heavy loss can reach SKIPS_TO_SLOW first
      const deciding = options.slowFirst && !slowed;
      if (deciding && skips >= SKIPS_TO_SLOW) {
        slowed = true;
        recent.length = 0;
      } else if (skips >= SKIPS_TO_STEP_DOWN && (!deciding || recent.length >= WINDOW) && level < CANVAS_LEVELS.length - 1) {
        level++;
        recent.length = 0;
      } else if (calm >= CALM_TO_STEP_UP && level > 0) {
        level--;
        calm = 0;
      }
    },
    canvas: () => CANVAS_LEVELS[level],
    skipped: () => skipped,
    slowed: () => slowed,
  };
}

/**
 * Whether two frames are the same picture: a frame shown twice in a 60 fps
 * export, or one the browser presented again. Compared on a sparse grid of
 * pixels, which is enough - a real new frame differs almost everywhere, by
 * sensor noise if nothing else, while a repeat differs nowhere.
 */
export function isRepeat(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  const pixels = a.length / 4;
  const step = Math.max(1, Math.floor(pixels / 257));
  for (let i = 0; i < pixels; i += step) {
    const p = i * 4;
    if (a[p] !== b[p] || a[p + 1] !== b[p + 1] || a[p + 2] !== b[p + 2]) return false;
  }
  return true;
}

/**
 * The pixels isRepeat compares, kept so a frame can be checked against the
 * last one after that one's pixels have been handed to the worker
 * (trackerEngine.ts) and are no longer readable here.
 */
export function repeatSignature(pixels: Uint8ClampedArray): Uint8Array {
  const count = pixels.length / 4;
  const step = Math.max(1, Math.floor(count / 257));
  const out = new Uint8Array(Math.ceil(count / step) * 3);
  let k = 0;
  for (let i = 0; i < count; i += step) {
    const p = i * 4;
    out[k++] = pixels[p];
    out[k++] = pixels[p + 1];
    out[k++] = pixels[p + 2];
  }
  return out;
}

/** Two signatures from repeatSignature are the same picture: see isRepeat. */
export function sameSignature(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
