// src/lib/video/motionBall.ts
// Finds the ball by what it DOES rather than what it looks like: the one small,
// round, fast-moving thing in a scene whose camera is not moving.
//
// The COCO detector was measured on real footage at every frame of a 30 fps
// clip and found the ball in 7.1% of them, median confidence 0.246 against a
// 0.12 floor. Looking at the frames shows why - the ball is a heavily
// motion-blurred maroon sphere in dim indoor light, with its seams smeared
// away. That is outside what a general-purpose model trained on sharp, mostly
// orange balls recognises, and no threshold or crop changes it.
//
// Nothing here assumes a colour. Players' balls differ, and so do rims; a
// tracker that looks for orange would fail on the very clip that prompted this.
// Colour is only ever used as supplied by the caller, sampled from the footage
// itself, and the tracker works without it.
//
// Frame differencing also solves the problem that a maroon ball passes through
// a maroon rim: the rim does not move, so it is gone from the mask before
// anything is scored.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Blob {
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  /** Centroid, in working-image pixels. */
  cx: number;
  cy: number;
}

export interface BallCandidate {
  x: number;
  y: number;
  diameter: number;
  /** 0..1. Higher is more ball-like; see scoreBlob for what goes into it. */
  score: number;
  blob: Blob;
  colour: Rgb;
}

/**
 * A ball's width as a fraction of a rim's.
 *
 * A men's ball is about 24cm across and a rim 45cm. This is the measurement
 * that lets the tracker size itself to any footage without a pixel constant:
 * the rim is already measured from two taps, so the expected ball size follows
 * from it, at any distance, resolution or zoom.
 */
export const BALL_TO_RIM = 0.53;

/** Expected ball width in pixels, given the rim's width in the same pixels. */
export function expectedBallDiameter(rimWidthPx: number): number {
  return rimWidthPx * BALL_TO_RIM;
}

/**
 * How far from the expected size a blob may be and still be the ball.
 *
 * Generous upward because a ball closer to the camera than the hoop genuinely
 * looks bigger, and the rim is the far reference. Tight downward because
 * anything much smaller is noise.
 */
export const MIN_SIZE_RATIO = 0.45;
export const MAX_SIZE_RATIO = 2.2;

/** Default per-channel difference before a pixel counts as having moved. */
export const DEFAULT_DIFF_THRESHOLD = 28;

/** Perceived brightness, for comparing two pixels cheaply. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Pixels that changed between two frames, as a 0/1 mask.
 *
 * Compares brightness and colour together: a ball crossing a wall of similar
 * brightness but different hue shows up in the second term, and one crossing a
 * similarly coloured but darker background in the first.
 */
export function diffMask(
  prev: Uint8ClampedArray,
  cur: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = DEFAULT_DIFF_THRESHOLD
): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const dr = Math.abs(cur[p] - prev[p]);
    const dg = Math.abs(cur[p + 1] - prev[p + 1]);
    const db = Math.abs(cur[p + 2] - prev[p + 2]);
    const dLuma = Math.abs(luma(cur[p], cur[p + 1], cur[p + 2]) - luma(prev[p], prev[p + 1], prev[p + 2]));
    if (dLuma > threshold || Math.max(dr, dg, db) > threshold * 1.5) mask[i] = 1;
  }
  return mask;
}

/**
 * Where the ball is NOW, rather than where it was and is.
 *
 * Differencing two frames lights up both positions of a fast object, giving a
 * smeared pair of circles whose centroid sits between them - half a frame
 * behind the truth, and much less round than a ball. Intersecting the change
 * from the previous frame with the change to the next leaves only the middle
 * position. Costs one frame of lag, which is nothing at 30 fps.
 */
export function motionMask(
  prev: Uint8ClampedArray,
  cur: Uint8ClampedArray,
  next: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = DEFAULT_DIFF_THRESHOLD
): Uint8Array {
  const before = diffMask(prev, cur, width, height, threshold);
  const after = diffMask(cur, next, width, height, threshold);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = before[i] & after[i];
  return mask;
}

/**
 * Connected regions of the mask, as blobs.
 *
 * Iterative rather than recursive: a mask where most pixels moved - someone
 * walking past the camera, or the phone being knocked - would blow the call
 * stack on a recursive flood fill.
 */
export function labelBlobs(mask: Uint8Array, width: number, height: number, minArea = 4): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    seen[start] = 1;
    stack.push(start);

    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    while (stack.length) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      area++;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // 8-connected: a blurred ball's edge is ragged and 4-connectivity splits
      // it into pieces that each fall under minArea
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (mask[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }

    if (area >= minArea) {
      blobs.push({ area, minX, minY, maxX, maxY, cx: sumX / area, cy: sumY / area });
    }
  }
  return blobs;
}

/**
 * How ball-like a blob's shape is, 0..1.
 *
 * Two things at once: a ball's bounding box is square, and it fills about
 * pi/4 of that box. A limb swinging through frame is long and thin and fails
 * the first; a loose cluster of noise fills little of its box and fails the
 * second.
 */
export function roundness(blob: Blob): number {
  const w = blob.maxX - blob.minX + 1;
  const h = blob.maxY - blob.minY + 1;
  if (w <= 0 || h <= 0) return 0;
  const aspect = Math.min(w, h) / Math.max(w, h);
  const fill = blob.area / (w * h);
  const idealFill = Math.PI / 4;
  // Over-full (a solid square) is as wrong as under-full
  const fillScore = 1 - Math.min(1, Math.abs(fill - idealFill) / idealFill);
  return aspect * fillScore;
}

/** A blob's width, taken as the longer side of its box. */
export function blobDiameter(blob: Blob): number {
  return Math.max(blob.maxX - blob.minX + 1, blob.maxY - blob.minY + 1);
}

/** Mean colour of a blob's pixels in the given frame. */
export function blobColour(frame: Uint8ClampedArray, width: number, blob: Blob, mask: Uint8Array): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = blob.minY; y <= blob.maxY; y++) {
    for (let x = blob.minX; x <= blob.maxX; x++) {
      const i = y * width + x;
      if (!mask[i]) continue;
      const p = i * 4;
      r += frame[p];
      g += frame[p + 1];
      b += frame[p + 2];
      n++;
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / n, g: g / n, b: b / n };
}

/**
 * Colour likeness, 0..1, independent of how bright the scene is.
 *
 * Compared as chromaticity - each channel over the total - so the same ball in
 * sun and in shade still matches itself. Raw RGB distance would not: a maroon
 * ball under a gym light and the same ball in the shadow of the backboard are
 * far apart in RGB and identical in chromaticity.
 */
export function colourSimilarity(a: Rgb, b: Rgb): number {
  const sumA = a.r + a.g + a.b;
  const sumB = b.r + b.g + b.b;
  // Near-black pixels have no stable chromaticity, so claim no knowledge
  if (sumA < 24 || sumB < 24) return 0.5;
  const dr = a.r / sumA - b.r / sumB;
  const dg = a.g / sumA - b.g / sumB;
  const db = a.b / sumA - b.b / sumB;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  // Chromaticity distance rarely exceeds ~0.5 between real colours
  return Math.max(0, 1 - distance / 0.5);
}

/** How close a blob is to the size the rim says the ball should be, 0..1. */
export function sizeScore(diameter: number, expected: number): number {
  if (expected <= 0) return 0;
  const ratio = diameter / expected;
  if (ratio < MIN_SIZE_RATIO || ratio > MAX_SIZE_RATIO) return 0;
  // Peaks at the expected size and tails off either side
  return ratio <= 1 ? (ratio - MIN_SIZE_RATIO) / (1 - MIN_SIZE_RATIO) : (MAX_SIZE_RATIO - ratio) / (MAX_SIZE_RATIO - 1);
}

export interface FindBallOptions {
  /** From expectedBallDiameter(rim width), in working-image pixels. */
  expectedDiameter: number;
  /** Sampled from the footage by the player. Omitted, shape and size decide. */
  sampledColour?: Rgb | null;
  threshold?: number;
  /** Below this, report nothing rather than the least bad blob. */
  minScore?: number;
}

export const DEFAULT_MIN_SCORE = 0.35;

/**
 * Scores a blob as a ball: shape, size, and colour when it is known.
 *
 * Shape and size are always available and carry the decision; colour only
 * adjusts it, so a player who never sampled one loses accuracy rather than the
 * feature. Weighted rather than gated for the same reason - a ball crossing a
 * background its own colour loses its edges in the mask and deserves to still
 * be found on shape.
 */
export function scoreBlob(blob: Blob, options: FindBallOptions, colour?: Rgb): number {
  const shape = roundness(blob);
  const size = sizeScore(blobDiameter(blob), options.expectedDiameter);
  if (size === 0) return 0;
  const base = shape * 0.5 + size * 0.5;
  if (!options.sampledColour || !colour) return base;
  const match = colourSimilarity(colour, options.sampledColour);
  return base * 0.7 + match * 0.3;
}

/**
 * The most ball-like moving thing between two frames, or null.
 *
 * `prev` and `cur` alone are enough; pass `next` as well to use three-frame
 * differencing, which reports where the ball is rather than where it was and
 * is.
 */
export function findBall(
  prev: Uint8ClampedArray,
  cur: Uint8ClampedArray,
  width: number,
  height: number,
  options: FindBallOptions,
  next?: Uint8ClampedArray
): BallCandidate | null {
  const threshold = options.threshold ?? DEFAULT_DIFF_THRESHOLD;
  const mask = next
    ? motionMask(prev, cur, next, width, height, threshold)
    : diffMask(prev, cur, width, height, threshold);

  // A blob smaller than a quarter of the expected ball cannot be it, and
  // skipping those keeps the labeller off sensor noise
  const minArea = Math.max(4, Math.floor((options.expectedDiameter * options.expectedDiameter) / 16));
  const blobs = labelBlobs(mask, width, height, minArea);

  let best: BallCandidate | null = null;
  for (const blob of blobs) {
    const colour = blobColour(cur, width, blob, mask);
    const score = scoreBlob(blob, options, colour);
    if (!best || score > best.score) {
      best = { x: blob.cx, y: blob.cy, diameter: blobDiameter(blob), score, blob, colour };
    }
  }

  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  return best && best.score >= minScore ? best : null;
}
