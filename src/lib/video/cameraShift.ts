// src/lib/video/cameraShift.ts
// Notices when the camera has moved since the rim was tapped.
//
// Everything the tracker measures hangs off the two taps: the crop, the rim
// line, the net box. A tripod knocked by a rebound, or a phone propped on a
// bag that slumps, moves the hoop in the picture and every call after that is
// made against a rim that is no longer there - silently, because nothing in
// the tracker knows where the hoop is. A saved rim from a slightly different
// spot fails the same way from the first shot.
//
// The hoop crop is reduced to a small grid of brightness and compared against
// a reference taken over the first second of tracking, at every offset a few
// cells either way. The background - backboard, wall, rim - stays put while
// the camera does, so the best match is at no offset. When the camera has
// moved, it is somewhere else, consistently, frame after frame.
//
// What else changes the picture: the ball, the net, players walking through
// and the light. The reference is a per-cell median over several frames, so a
// player passing through it once does not end up in it; each comparison is a
// normalised correlation, so brighter or darker is not movement; and a shift
// has to win clearly and on several checks running before it counts.

/** Cells across the grid; each is an eighth of a rim width (the crop is six rim widths). */
export const GRID = 48;
/** Furthest offset tried, in cells: about one rim width. */
const MAX_SHIFT = 8;
/** Frames whose median makes the reference. */
const REFERENCE_FRAMES = 9;
/** Score frames this far apart, in ms: often enough to catch a knock within a couple of seconds. */
export const CHECK_EVERY_MS = 400;
/**
 * Cells of offset that count as the camera having moved: one, an eighth of a
 * rim width. Small moves matter - taps 6px off on a 50px ring cost the 2:39
 * clip up to four calls - and on the bench (1 Nov 2026) a 7px knock of the
 * picture cost both labelled clips calls. At one cell both clips, rebounders
 * and all, gave no false alarm over their whole length, while knocks of 5, 7
 * and 14 canvas pixels were each reported within 1.2 to 4.6 seconds (the
 * bench's DEADEYE_BENCH_KNOCK). Gain and agreement below keep it steady.
 */
export const MOVED_CELLS = 1;
/** How much better the best offset must correlate than none at all. */
const MIN_GAIN = 0.06;
/** Below this the match is too poor to say anything (a crowd in front, darkness). */
const MIN_MATCH = 0.45;
/** Checks running that must agree before a move is reported. */
const AGREE = 3;

export interface Shift {
  /** Offset of the current picture from the reference, in grid cells. */
  dx: number;
  dy: number;
  /** Correlation at that offset and at none, -1..1. */
  match: number;
  still: number;
}

/** The crop's RGBA pixels reduced to a GRID x GRID brightness grid. */
export function brightnessGrid(pixels: Uint8ClampedArray, width: number, height: number, grid = GRID): Float32Array {
  const out = new Float32Array(grid * grid);
  const counts = new Uint16Array(grid * grid);
  // Every other pixel each way is plenty for a cell mean, and quarters the work
  for (let y = 0; y < height; y += 2) {
    const gy = Math.min(grid - 1, Math.floor((y * grid) / height));
    for (let x = 0; x < width; x += 2) {
      const gx = Math.min(grid - 1, Math.floor((x * grid) / width));
      const i = (y * width + x) * 4;
      out[gy * grid + gx] += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      counts[gy * grid + gx]++;
    }
  }
  for (let k = 0; k < out.length; k++) out[k] = counts[k] ? out[k] / counts[k] : 0;
  return out;
}

/** Zero-mean normalised correlation of `cur` shifted by (dx, dy) against `ref`, over where they overlap. */
function correlate(ref: Float32Array, cur: Float32Array, grid: number, dx: number, dy: number): number {
  let n = 0;
  let sr = 0;
  let sc = 0;
  for (let y = Math.max(0, dy); y < Math.min(grid, grid + dy); y++) {
    for (let x = Math.max(0, dx); x < Math.min(grid, grid + dx); x++) {
      sr += ref[(y - dy) * grid + (x - dx)];
      sc += cur[y * grid + x];
      n++;
    }
  }
  if (n < grid * 4) return -1;
  const mr = sr / n;
  const mc = sc / n;
  let num = 0;
  let vr = 0;
  let vc = 0;
  for (let y = Math.max(0, dy); y < Math.min(grid, grid + dy); y++) {
    for (let x = Math.max(0, dx); x < Math.min(grid, grid + dx); x++) {
      const a = ref[(y - dy) * grid + (x - dx)] - mr;
      const b = cur[y * grid + x] - mc;
      num += a * b;
      vr += a * a;
      vc += b * b;
    }
  }
  return vr > 0 && vc > 0 ? num / Math.sqrt(vr * vc) : -1;
}

/** Where `cur` matches `ref` best, within MAX_SHIFT cells. */
export function bestShift(ref: Float32Array, cur: Float32Array, grid = GRID): Shift {
  const still = correlate(ref, cur, grid, 0, 0);
  let best = { dx: 0, dy: 0, match: still };
  for (let dy = -MAX_SHIFT; dy <= MAX_SHIFT; dy++) {
    for (let dx = -MAX_SHIFT; dx <= MAX_SHIFT; dx++) {
      if (!dx && !dy) continue;
      const m = correlate(ref, cur, grid, dx, dy);
      if (m > best.match) best = { dx, dy, match: m };
    }
  }
  return { ...best, still };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export interface CameraShiftWatcher {
  /**
   * Feeds one frame of the hoop crop. Returns the shift when this frame
   * settles that the camera has moved (once per move), otherwise null.
   */
  push(pixels: Uint8ClampedArray, width: number, height: number, t: number): Shift | null;
  /** The latest agreed shift while the camera is off where it started, or null. */
  moved(): Shift | null;
  /** Starts again from the picture as it is now, after the rim has been fixed. */
  reset(): void;
  /** Mean brightness of the crop (0..255) when the frame just pushed was measured, else null. */
  lastLight(): number | null;
}

export function createCameraShiftWatcher(): CameraShiftWatcher {
  let frames: Float32Array[] = [];
  let reference: Float32Array | null = null;
  let lastCheck = -Infinity;
  let agreeing: Shift[] = [];
  let current: Shift | null = null;
  let light: number | null = null;

  return {
    push(pixels, width, height, t) {
      light = null;
      if (t - lastCheck < CHECK_EVERY_MS) return null;
      lastCheck = t;
      const grid = brightnessGrid(pixels, width, height);
      light = grid.reduce((s, v) => s + v, 0) / grid.length;
      if (!reference) {
        frames.push(grid);
        if (frames.length >= REFERENCE_FRAMES) {
          reference = new Float32Array(GRID * GRID);
          for (let k = 0; k < reference.length; k++) reference[k] = median(frames.map((f) => f[k]));
          frames = [];
        }
        return null;
      }
      const shift = bestShift(reference, grid);
      const off = Math.max(Math.abs(shift.dx), Math.abs(shift.dy)) >= MOVED_CELLS;
      const clear = shift.match >= MIN_MATCH && shift.match - shift.still >= MIN_GAIN;
      if (!off || !clear) {
        // Back where it was (or never left): a reading that agrees with the
        // reference clears a reported move too, in case it was put back
        if (shift.still >= MIN_MATCH && !off) current = null;
        agreeing = [];
        return null;
      }
      // Agreeing means the same offset, give or take a cell
      if (agreeing.length && (Math.abs(agreeing[0].dx - shift.dx) > 1 || Math.abs(agreeing[0].dy - shift.dy) > 1)) agreeing = [];
      agreeing.push(shift);
      if (agreeing.length < AGREE) return null;
      const settled = agreeing[agreeing.length - 1];
      const fresh = !current || Math.abs(current.dx - settled.dx) > 1 || Math.abs(current.dy - settled.dy) > 1;
      current = settled;
      return fresh ? settled : null;
    },
    moved: () => current,
    lastLight: () => light,
    reset() {
      frames = [];
      reference = null;
      lastCheck = -Infinity;
      agreeing = [];
      current = null;
    },
  };
}

/**
 * The shift as a move of the rim, in frame fractions: the hoop's picture moved
 * by (dx, dy) cells of a crop `cropSide` video pixels square.
 */
export function shiftInFrame(shift: { dx: number; dy: number }, cropSide: number, videoWidth: number, videoHeight: number, grid = GRID) {
  const cell = cropSide / grid;
  return { x: (shift.dx * cell) / videoWidth, y: (shift.dy * cell) / videoHeight };
}
