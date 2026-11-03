// src/lib/video/rimFinder.ts
// Finds the rim in a picture with the trained detector (ml/rim-detector), so a
// player can have the hoop found instead of tapping both sides of the ring.
// It proposes; the player confirms in the adjuster, which stays the authority.
//
// The model runs on the phone. This file is the part that does not depend on
// where: turning pixels into the model's input, reading its output, and the
// two-look search. The app hands in a browser runner (rimModel.ts); the bench
// hands in a Node one, so what is measured is what ships.
//
// The settings below are the ones the training notebook proved reproduce the
// trained model's own finds (model-card.json, 3 Nov 2026: ImageNet mean and
// std, RGB, 0..1, NCHW at 384; boxes cx,cy,w,h as fractions; sigmoid scores;
// class 0 ball, 1 rim, 2 backboard).

/** The model's square input, in pixels. */
export const MODEL_SIZE = 384;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
export const CLASSES = ['ball', 'rim', 'backboard'] as const;
export type RimClass = (typeof CLASSES)[number];

/** A find, as fractions of the picture it was found in. */
export interface Detection {
  cls: RimClass;
  score: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** The model's raw output for one picture. */
export interface ModelOutput {
  /** Per query: cx, cy, w, h as fractions of the input. */
  dets: Float32Array;
  /** Per query: one logit per class. */
  labels: Float32Array;
  queries: number;
  classes: number;
}

export type RunModel = (input: Float32Array) => Promise<ModelOutput>;

/** A region of the frame, in its pixels. */
export interface Region {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** Draws a region of the frame at MODEL_SIZE x MODEL_SIZE and returns its RGBA pixels. */
export type SampleRegion = (region: Region) => Promise<Uint8ClampedArray> | Uint8ClampedArray;

/** RGBA pixels, MODEL_SIZE square, as the model's input: RGB planes, normalised. */
export function toInput(rgba: Uint8ClampedArray): Float32Array {
  const n = MODEL_SIZE * MODEL_SIZE;
  const out = new Float32Array(3 * n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    out[i] = (rgba[p] / 255 - MEAN[0]) / STD[0];
    out[n + i] = (rgba[p + 1] / 255 - MEAN[1]) / STD[1];
    out[2 * n + i] = (rgba[p + 2] / 255 - MEAN[2]) / STD[2];
  }
  return out;
}

/** The finds scoring at least `threshold`, best first. */
export function decode(out: ModelOutput, threshold: number): Detection[] {
  const found: Detection[] = [];
  for (let q = 0; q < out.queries; q++) {
    let best = -1;
    let bestScore = 0;
    // Only the three trained classes; the output can carry an extra slot
    for (let c = 0; c < Math.min(out.classes, CLASSES.length); c++) {
      const s = 1 / (1 + Math.exp(-out.labels[q * out.classes + c]));
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (best < 0 || bestScore < threshold) continue;
    const [cx, cy, w, h] = out.dets.subarray(q * 4, q * 4 + 4);
    found.push({ cls: CLASSES[best], score: bestScore, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });
  }
  return found.sort((a, b) => b.score - a.score);
}

/** Lowest score a rim is taken at. */
export const MIN_RIM_SCORE = 0.3;

/**
 * The close look's square, in rim widths. Through the whole frame squeezed to
 * 384 a rim far away is 18px wide and its ends are a few pixels each way; a
 * square this many rim widths across, drawn at 384, makes it several times
 * bigger. Chosen on the bench's 24 frames (rimFinderBench.test.ts).
 */
export const CLOSE_RIMS = 5;

/** The square around a rim box for the close look, inside the frame. */
export function closeRegion(box: { x1: number; y1: number; x2: number; y2: number }, frameW: number, frameH: number, rims = CLOSE_RIMS): Region {
  const w = box.x2 - box.x1;
  const side = Math.min(frameW, frameH, Math.max(w, box.y2 - box.y1) * rims);
  const cx = (box.x1 + box.x2) / 2;
  const cy = (box.y1 + box.y2) / 2;
  const sx = Math.min(frameW - side, Math.max(0, cx - side / 2));
  const sy = Math.min(frameH - side, Math.max(0, cy - side / 2));
  return { sx, sy, sw: side, sh: side };
}

/** The rim as found: its two ends, as fractions of the frame, for the adjuster. */
export interface FoundRim {
  left: { x: number; y: number };
  right: { x: number; y: number };
  score: number;
  /** Whether the close look found it (otherwise the first look's find). */
  refined: boolean;
}

/**
 * The rim's two ends from its box: the sides, at mid-height. A box says
 * nothing about the rim's tilt, so the ends start level and the player sets
 * the tilt in the adjuster when the camera is off to one side.
 */
function endsOf(box: { x1: number; y1: number; x2: number; y2: number }, frameW: number, frameH: number) {
  const y = (box.y1 + box.y2) / 2 / frameH;
  return { left: { x: box.x1 / frameW, y }, right: { x: box.x2 / frameW, y } };
}

type Box = { x1: number; y1: number; x2: number; y2: number };

/** The most confident rim in the whole picture, in frame pixels. */
async function firstLook(frameW: number, frameH: number, sample: SampleRegion, run: RunModel): Promise<{ box: Box; score: number } | null> {
  const whole: Region = { sx: 0, sy: 0, sw: frameW, sh: frameH };
  const first = decode(await run(toInput(await sample(whole))), MIN_RIM_SCORE).find((d) => d.cls === 'rim');
  if (!first) return null;
  return { box: { x1: first.x1 * frameW, y1: first.y1 * frameH, x2: first.x2 * frameW, y2: first.y2 * frameH }, score: first.score };
}

/** The rim nearest the middle of the close square, in frame pixels: the square is centred on the rim found first. */
async function closeLook(region: Region, sample: SampleRegion, run: RunModel): Promise<{ box: Box; score: number } | null> {
  const near = decode(await run(toInput(await sample(region))), MIN_RIM_SCORE).filter((d) => d.cls === 'rim');
  const off = (d: Detection) => Math.hypot((d.x1 + d.x2) / 2 - 0.5, (d.y1 + d.y2) / 2 - 0.5);
  const middle = near.sort((a, b) => off(a) - off(b))[0];
  if (!middle) return null;
  return {
    box: {
      x1: region.sx + middle.x1 * region.sw,
      y1: region.sy + middle.y1 * region.sh,
      x2: region.sx + middle.x2 * region.sw,
      y2: region.sy + middle.y2 * region.sh,
    },
    score: middle.score,
  };
}

/**
 * Finds the rim: a first look at the whole picture, then a close look at a
 * square around what it found, on each of `frames` (moments of the same
 * camera), and the middle of those. The most confident rim is taken; on the
 * bench's clip with a second hoop on the far wall that was the right one on
 * every frame.
 *
 * Measured on the bench's 24 frames against the ring's ends (3 Nov 2026), in
 * rim widths: one look alone was 0.14 out on the near clip, where it boxed the
 * bracket with the ring, and 0.11 on the far clip, worst 0.45; the close look
 * was 0.027 and 0.018, worst 0.048, better than a careful tap.
 */
export async function findRimSteady(frameW: number, frameH: number, frames: readonly SampleRegion[], run: RunModel, rims = CLOSE_RIMS): Promise<FoundRim | null> {
  if (!frames.length) return null;
  const first = await firstLook(frameW, frameH, frames[0], run);
  if (!first) return null;
  const region = closeRegion(first.box, frameW, frameH, rims);
  const found: FoundRim[] = [];
  for (const sample of frames) {
    const close = await closeLook(region, sample, run);
    found.push(
      close
        ? { ...endsOf(close.box, frameW, frameH), score: close.score, refined: true }
        : { ...endsOf(first.box, frameW, frameH), score: first.score, refined: false }
    );
  }
  return medianRim(found);
}

/** One frame; `close: false` stops after the first look (the bench compares the two). */
export async function findRim(frameW: number, frameH: number, sample: SampleRegion, run: RunModel, { close = true, rims = CLOSE_RIMS } = {}): Promise<FoundRim | null> {
  if (close) return findRimSteady(frameW, frameH, [sample], run, rims);
  const first = await firstLook(frameW, frameH, sample, run);
  return first ? { ...endsOf(first.box, frameW, frameH), score: first.score, refined: false } : null;
}

/** The middle of several frames' finds, each end on its own: one frame with the ball on the ring does not move it. */
export function medianRim(found: readonly FoundRim[]): FoundRim | null {
  if (!found.length) return null;
  const med = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  return {
    left: { x: med(found.map((f) => f.left.x)), y: med(found.map((f) => f.left.y)) },
    right: { x: med(found.map((f) => f.right.x)), y: med(found.map((f) => f.right.y)) },
    score: med(found.map((f) => f.score)),
    refined: found.some((f) => f.refined),
  };
}
