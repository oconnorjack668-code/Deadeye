// src/lib/video/stabilise.ts
// Holds the hoop still in the picture when the camera is not.
//
// The tracker finds the ball, and the net moving, by what changed between one
// frame and the next, and judges every shot against a rim tapped once. Both
// assume a camera that does not move. A phone leaning on a bag, a tripod on a
// sprung floor or a mount in the wind drifts by a pixel or two a frame, and
// then everything with an edge has "moved": on the bench's wobbly-mount clips
// the net read as moving on nearly every frame, and 13 of 21 misses on the
// 2:39 clip were called makes (9 Nov 2026). The rim line drifts with it.
//
// It happens on clips nobody would call shaky, too. Measured frame against
// frame, the first bench clip's phone sags 2.8 canvas pixels over its 51
// seconds and the second clip's is knocked 2 pixels at 86s, a rebound hitting
// the stand (13 Nov 2026). Both are under the camera watcher's 1-cell alarm,
// and both move the rim line a tenth of a rim width or more.
//
// So each frame is lined up with a reference picture of the same crop before
// anything else looks at it. How far the picture has slid is measured from the
// brightness of the whole crop at once (the backboard, the wall and the rim
// are most of it and do not move), and the frame is slid back.
//
// By whole pixels only, and only once the camera has clearly moved one. A
// slide by a fraction of a pixel blends neighbouring pixels, which softens the
// frame by a different amount each time; the frame differencing then sees
// every edge in the picture change and the ball is harder to find. Sliding by
// fractions lost a call on three of the first clip's harder versions. Whole
// pixels keep every frame as sharp as it came, and a camera that is still is
// passed through untouched, so a tripod clip is scored on exactly the pixels
// it always was.

/**
 * How far, in canvas pixels, the measured slide must be from the one being
 * applied before the applied one changes: past half a pixel, so a reading
 * that wanders around a half does not flip between two whole pixels.
 */
export const START_PX = 0.75;
/** Readings in a row past START_PX before the applied slide changes: one odd reading is not a move. */
const START_FRAMES = 3;
/**
 * Past this far from the applied slide, in canvas pixels, it changes on the
 * first reading. Under a pixel: a camera that moves a whole pixel between two
 * frames is followed on that frame. Waiting longer left the picture a pixel
 * or two behind and then caught up in jumps of two, so strong edges moved
 * back and forth more than with no steadying at all; on the bench's wobbly
 * fourth clip they filled every slot the ball tracker has, and the ball was
 * not followed until it reached the ring (13 Nov 2026).
 */
const FOLLOW_AT_ONCE_PX = 0.9;
/**
 * Furthest slide followed, as a share of the crop's side: about 0.8 of a rim
 * width (the crop is six across). Past it too much of the picture has left
 * the crop to track in, and the camera watcher's "camera moved" is the right
 * answer.
 */
export const MAX_SLIDE = 0.13;
/** Brightness difference, 0..255, past which a pixel is taken to be something moving, not the camera. */
const OUTLIER = 15;
/** Share of the picture that must agree with the reference for a reading to be believed. */
const MIN_AGREE = 0.55;
/** How fast the reference follows the light: a time constant of about two seconds at 30 fps. */
const FOLLOW = 0.02;
/** Unbelievable readings in a row after which the reference starts again from the picture as it is. */
const RESTART_FRAMES = 45;

export interface Steadied {
  /** The frame to score: the one given when nothing is being applied, otherwise a copy slid back. */
  pixels: Uint8ClampedArray;
  /** How far the picture has slid from the reference, as measured, in canvas pixels. */
  dx: number;
  dy: number;
  /** Whether `pixels` was slid back (by whole pixels, the measured slide rounded). */
  moved: boolean;
  /** The whole-pixel slide applied to `pixels`, 0 when it was passed through. */
  ax: number;
  ay: number;
  /** Whether this frame's reading was believed; false while something fills the picture. */
  sure: boolean;
}

export interface Stabiliser {
  push(pixels: Uint8ClampedArray, width: number, height: number): Steadied;
  /** Starts again from the next frame, after the rim or the canvas size changed. */
  reset(): void;
}

/** Brightness at half size: each value the mean of a 2x2 block. */
export function halfLuma(pixels: Uint8ClampedArray, width: number, height: number, out?: Float32Array): Float32Array {
  const w = width >> 1;
  const h = height >> 1;
  const luma = out && out.length === w * h ? out : new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let p = y * 2 * width * 4;
    const q = p + width * 4;
    const row = y * w;
    for (let x = 0; x < w; x++, p += 8) {
      const pq = q + x * 8;
      // 0.299, 0.587, 0.114 over four pixels
      luma[row + x] =
        (pixels[p] + pixels[p + 4] + pixels[pq] + pixels[pq + 4]) * 0.07475 +
        (pixels[p + 1] + pixels[p + 5] + pixels[pq + 1] + pixels[pq + 5]) * 0.14675 +
        (pixels[p + 2] + pixels[p + 6] + pixels[pq + 2] + pixels[pq + 6]) * 0.0285;
    }
  }
  return luma;
}

/** A picture at a quarter of the size each way, for the coarse search. */
function quarter(src: Float32Array, w: number, h: number): { data: Float32Array; w: number; h: number } {
  const cw = w >> 2;
  const ch = h >> 2;
  const data = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        const row = (y * 4 + j) * w + x * 4;
        sum += src[row] + src[row + 1] + src[row + 2] + src[row + 3];
      }
      data[y * cw + x] = sum / 16;
    }
  }
  return { data, w: cw, h: ch };
}

interface Reading {
  dx: number;
  dy: number;
  /** Share of the pixels compared that agree with the reference once lined up. */
  agree: number;
  ok: boolean;
}

/**
 * How far `cur` has slid from `ref`, starting the search from (dx, dy): the
 * slide that best lines the two up, cur(x + dx, y + dy) = ref(x, y), found by
 * following the brightness slopes of the reference (Lucas-Kanade, translation
 * only). Good to within about a pixel of the start; further out, a picture
 * with repeating edges can lead it to the wrong match, which is what
 * `coarseSlide` is for.
 *
 * Pixels that differ a lot once lined up - a player, the ball, the net - pull
 * with a capped weight, so the still background decides.
 */
export function slideBetween(ref: Float32Array, cur: Float32Array, w: number, h: number, dx: number, dy: number, margin: number, step: number): Reading {
  let agree = 0;
  for (let it = 0; it < 6; it++) {
    const ix = Math.floor(dx);
    const iy = Math.floor(dy);
    const fx = dx - ix;
    const fy = dy - iy;
    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    let b1 = 0;
    let b2 = 0;
    let n = 0;
    let inl = 0;
    for (let y = margin; y < h - margin; y += step) {
      const sy = y + iy;
      if (sy < 0 || sy >= h - 1) continue;
      for (let x = margin; x < w - margin; x += step) {
        const sx = x + ix;
        if (sx < 0 || sx >= w - 1) continue;
        const i = y * w + x;
        const j = sy * w + sx;
        const r = cur[j] * w00 + cur[j + 1] * w10 + cur[j + w] * w01 + cur[j + w + 1] * w11 - ref[i];
        const gx = (ref[i + 1] - ref[i - 1]) * 0.5;
        const gy = (ref[i + w] - ref[i - w]) * 0.5;
        const ar = r < 0 ? -r : r;
        n++;
        let weight = 1;
        if (ar > OUTLIER) weight = OUTLIER / ar;
        else inl++;
        a11 += weight * gx * gx;
        a12 += weight * gx * gy;
        a22 += weight * gy * gy;
        b1 += weight * gx * r;
        b2 += weight * gy * r;
      }
    }
    if (n === 0) return { dx, dy, agree: 0, ok: false };
    agree = inl / n;
    const det = a11 * a22 - a12 * a12;
    // Edges all running one way say nothing about a slide along them
    if (det < 1e-3 * (a11 + a22) * (a11 + a22) || det <= 0) return { dx, dy, agree, ok: false };
    const stepX = -(a22 * b1 - a12 * b2) / det;
    const stepY = -(a11 * b2 - a12 * b1) / det;
    dx += stepX;
    dy += stepY;
    if (Math.abs(stepX) + Math.abs(stepY) < 0.01) break;
  }
  return { dx, dy, agree, ok: agree >= MIN_AGREE };
}

/**
 * The whole-pixel slide, at a quarter of the size, that best lines `cur` up
 * with `ref`, by trying every one within `reach`. Differences are capped, so
 * someone walking through the picture counts for no more than a patch of
 * background. Cannot be led astray the way following slopes can, which is
 * what a knock of several pixels needs.
 */
export function coarseSlide(ref: Float32Array, cur: Float32Array, w: number, h: number, reach: number): { dx: number; dy: number } {
  let best = { dx: 0, dy: 0, cost: Infinity };
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      let cost = 0;
      let n = 0;
      for (let y = reach; y < h - reach; y++) {
        const row = y * w;
        const srow = (y + dy) * w + dx;
        for (let x = reach; x < w - reach; x++) {
          const d = cur[srow + x] - ref[row + x];
          cost += d < 0 ? (d < -OUTLIER ? OUTLIER : -d) : d > OUTLIER ? OUTLIER : d;
          n++;
        }
      }
      // Ties go to the smaller slide
      cost = cost / Math.max(n, 1) + (Math.abs(dx) + Math.abs(dy)) * 1e-3;
      if (cost < best.cost) best = { dx, dy, cost };
    }
  }
  return { dx: best.dx, dy: best.dy };
}

/** `pixels` slid by whole pixels: out(x, y) = in(x + dx, y + dy), the edges repeated. */
export function slideWhole(pixels: Uint8ClampedArray, width: number, height: number, dx: number, dy: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const sy = Math.min(height - 1, Math.max(0, y + dy));
    const src = sy * rowBytes;
    const dst = y * rowBytes;
    // The part of the row that comes from inside the picture, copied at once
    const from = Math.max(0, -dx);
    const to = Math.min(width, width - dx);
    if (to > from) out.set(pixels.subarray(src + (from + dx) * 4, src + (to + dx) * 4), dst + from * 4);
    // And the edge pixel repeated where the slide uncovers nothing
    for (let x = 0; x < from; x++) out.set(pixels.subarray(src, src + 4), dst + x * 4);
    for (let x = Math.max(to, 0); x < width; x++) out.set(pixels.subarray(src + rowBytes - 4, src + rowBytes), dst + x * 4);
  }
  return out;
}

/** `pixels` slid by (dx, dy), blending neighbours for a fraction of a pixel. For tests and tools. */
export function slidePixels(pixels: Uint8ClampedArray, width: number, height: number, dx: number, dy: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  const ix = Math.floor(dx);
  const iy = Math.floor(dy);
  const fx = dx - ix;
  const fy = dy - iy;
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  const maxX = width - 1;
  const maxY = height - 1;
  for (let y = 0; y < height; y++) {
    const y0 = Math.min(maxY, Math.max(0, y + iy));
    const y1 = Math.min(maxY, Math.max(0, y + iy + 1));
    let o = y * width * 4;
    for (let x = 0; x < width; x++, o += 4) {
      const x0 = Math.min(maxX, Math.max(0, x + ix));
      const x1 = Math.min(maxX, Math.max(0, x + ix + 1));
      const a = (y0 * width + x0) * 4;
      const b = (y0 * width + x1) * 4;
      const c = (y1 * width + x0) * 4;
      const d = (y1 * width + x1) * 4;
      for (let k = 0; k < 3; k++) out[o + k] = pixels[a + k] * w00 + pixels[b + k] * w10 + pixels[c + k] * w01 + pixels[d + k] * w11;
      out[o + 3] = 255;
    }
  }
  return out;
}

export function createStabiliser(): Stabiliser {
  let ref: Float32Array | null = null;
  let w = 0;
  let h = 0;
  let luma: Float32Array | null = null;
  // The last believed slide, in half-size pixels
  let dx = 0;
  let dy = 0;
  // The whole-pixel slide being applied, in canvas pixels, and how many
  // readings in a row have been past START_PX from it
  let ax = 0;
  let ay = 0;
  let off = 0;
  let unsure = 0;

  const reset = () => {
    ref = null;
    dx = 0;
    dy = 0;
    ax = 0;
    ay = 0;
    off = 0;
    unsure = 0;
  };

  return {
    reset,
    push(pixels, width, height) {
      if (ref && (w !== width >> 1 || h !== height >> 1)) reset();
      w = width >> 1;
      h = height >> 1;
      luma = halfLuma(pixels, width, height, luma ?? undefined);
      if (!ref) {
        ref = new Float32Array(luma);
        return { pixels, dx: 0, dy: 0, moved: false, ax: 0, ay: 0, sure: true };
      }
      const limit = (MAX_SLIDE * width) / 2;
      const margin = Math.ceil(limit) + 2;

      // From where it was a frame ago: a wobble moves a pixel or so a frame
      let reading = slideBetween(ref, luma, w, h, dx, dy, margin, 2);
      if (!reading.ok || Math.abs(reading.dx - dx) > 2 || Math.abs(reading.dy - dy) > 2) {
        // Lost, or it says the camera jumped: check by trying every whole
        // slide at a quarter of the size, then follow the slopes from there
        const coarseRef = quarter(ref, w, h);
        const coarseCur = quarter(luma, w, h);
        const coarse = coarseSlide(coarseRef.data, coarseCur.data, coarseRef.w, coarseRef.h, Math.ceil(limit / 4) + 1);
        const again = slideBetween(ref, luma, w, h, coarse.dx * 4, coarse.dy * 4, margin, 2);
        if (again.ok && (!reading.ok || again.agree > reading.agree)) reading = again;
      }
      const inReach = Math.abs(reading.dx) <= limit && Math.abs(reading.dy) <= limit;
      const sure = reading.ok && inReach;

      if (sure) {
        unsure = 0;
        dx = reading.dx;
        dy = reading.dy;
        // The reference follows the light, slowly, from the frame lined up
        // with it. What does not agree (a player standing in the picture)
        // is followed ten times slower, so it neither sticks nor smears.
        const ix = Math.floor(dx);
        const iy = Math.floor(dy);
        const fx = dx - ix;
        const fy = dy - iy;
        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;
        for (let y = 1; y < h - 1; y++) {
          const sy = y + iy;
          if (sy < 0 || sy >= h - 1) continue;
          for (let x = 1; x < w - 1; x++) {
            const sx = x + ix;
            if (sx < 0 || sx >= w - 1) continue;
            const i = y * w + x;
            const j = sy * w + sx;
            const r = luma[j] * w00 + luma[j + 1] * w10 + luma[j + w] * w01 + luma[j + w + 1] * w11 - ref[i];
            ref[i] += r * (r > OUTLIER || r < -OUTLIER ? FOLLOW / 10 : FOLLOW);
          }
        }
      } else if (++unsure >= RESTART_FRAMES) {
        // Nothing has matched for a second and a half: the light changed at
        // once, or the camera was moved for good. Start again from here.
        // Where it was moved to is the camera watcher's to report.
        ref = new Float32Array(luma);
        dx = 0;
        dy = 0;
        ax = 0;
        ay = 0;
        off = 0;
        unsure = 0;
        return { pixels, dx: 0, dy: 0, moved: false, ax: 0, ay: 0, sure: false };
      }

      // In canvas pixels
      const sx = dx * 2;
      const sy = dy * 2;
      const gap = Math.max(Math.abs(sx - ax), Math.abs(sy - ay));
      if (gap > START_PX) {
        // A whole-pixel move is followed at once; drift of a fraction of a
        // pixel waits for three readings, so noise does not flip it
        if (++off >= START_FRAMES || gap > FOLLOW_AT_ONCE_PX) {
          ax = Math.round(sx);
          ay = Math.round(sy);
          off = 0;
        }
      } else {
        off = 0;
      }
      if (!ax && !ay) return { pixels, dx: sx, dy: sy, moved: false, ax: 0, ay: 0, sure };
      return { pixels: slideWhole(pixels, width, height, ax, ay), dx: sx, dy: sy, moved: true, ax, ay, sure };
    },
  };
}
