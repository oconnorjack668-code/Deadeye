// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createStabiliser, halfLuma, slideBetween, slidePixels, START_PX } from '@/lib/video/stabilise';

const W = 160;

/**
 * A still scene like a hoop crop: a wall gradient, a backboard, window bars
 * and a rim, with soft edges, nothing repeating.
 */
function scene(): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * W * 4);
  const soft = (d: number) => 1 / (1 + Math.exp(-d / 1.2));
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let v = 70 + 40 * Math.sin(x / 37 + 0.4) * Math.cos(y / 53) + 0.2 * y;
      // Backboard
      v += 90 * soft(x - 40) * soft(110 - x) * soft(y - 20) * soft(80 - y);
      // Window bars
      v -= 50 * soft(3 - Math.abs(x - 125)) * soft(y - 5);
      v -= 40 * soft(2 - Math.abs(y - 100));
      // Rim: an ellipse outline
      const e = Math.hypot((x - 75) / 22, (y - 88) / 6);
      v -= 80 * soft(2 - Math.abs(e - 1) * 12);
      const i = (y * W + x) * 4;
      px[i] = v;
      px[i + 1] = v * 0.95;
      px[i + 2] = v * 0.9;
      px[i + 3] = 255;
    }
  }
  return px;
}

/** Deterministic sensor noise of about ±3 levels. */
function noisy(px: Uint8ClampedArray, seed: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px);
  let s = seed;
  for (let i = 0; i < out.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const n = ((s / 0x7fffffff) - 0.5) * 6;
    out[i] += n;
    out[i + 1] += n;
    out[i + 2] += n;
  }
  return out;
}

/** A ball-sized bright square, as a moving thing in the picture. */
function withBall(px: Uint8ClampedArray, cx: number, cy: number, r = 6): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px);
  for (let y = Math.max(0, cy - r); y < Math.min(W, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r); x++) {
      const i = (y * W + x) * 4;
      out[i] = 230;
      out[i + 1] = 90;
      out[i + 2] = 40;
    }
  }
  return out;
}

describe('slideBetween', () => {
  it('measures a slide to a fraction of a pixel', () => {
    const base = scene();
    const ref = halfLuma(base, W, W);
    // The picture moved 2.4 right and 1.6 up: cur(x) = base(x - 2.4), so it
    // lines up with the reference read from 2.4 further along
    const cur = halfLuma(slidePixels(base, W, W, -2.4, 1.6), W, W);
    const r = slideBetween(ref, cur, W / 2, W / 2, 0, 0, 6, 1);
    expect(r.ok).toBe(true);
    // Half-size pixels
    expect(Math.abs(r.dx - 1.2)).toBeLessThan(0.15);
    expect(Math.abs(r.dy + 0.8)).toBeLessThan(0.15);
  });

  it('is not pulled off by something moving through the picture', () => {
    const base = scene();
    const ref = halfLuma(base, W, W);
    const cur = halfLuma(withBall(base, 80, 60, 14), W, W);
    const r = slideBetween(ref, cur, W / 2, W / 2, 0, 0, 6, 1);
    expect(Math.abs(r.dx)).toBeLessThan(0.1);
    expect(Math.abs(r.dy)).toBeLessThan(0.1);
  });
});

describe('createStabiliser', () => {
  it('passes a still camera through untouched, the same array', () => {
    const base = scene();
    const st = createStabiliser();
    for (let k = 0; k < 60; k++) {
      const frame = withBall(noisy(base, k + 1), 20 + k * 2, 30 + k);
      const r = st.push(frame, W, W);
      expect(r.moved).toBe(false);
      expect(r.pixels).toBe(frame);
    }
  });

  it('holds a wobbling picture still', () => {
    const base = scene();
    const st = createStabiliser();
    st.push(base, W, W);
    let worst = 0;
    let steadied = 0;
    let raw = 0;
    for (let k = 1; k <= 90; k++) {
      const sx = 3 * Math.sin(k / 6);
      const sy = 2 * Math.cos(k / 8);
      const frame = noisy(slidePixels(base, W, W, sx, sy), k);
      const r = st.push(frame, W, W);
      if (k > 10 && r.moved) {
        // What it measured is the slide that was applied
        worst = Math.max(worst, Math.abs(r.dx + sx), Math.abs(r.dy + sy));
        // And the frame handed on lines up with the start far better than
        // the wobbling frame did, away from the edges
        const ref = halfLuma(base, W, W);
        const apart = (img: Uint8ClampedArray) => {
          const l = halfLuma(img, W, W);
          let diff = 0;
          let n = 0;
          for (let y = 10; y < W / 2 - 10; y++) {
            for (let x = 10; x < W / 2 - 10; x++) {
              diff += Math.abs(l[y * (W / 2) + x] - ref[y * (W / 2) + x]);
              n++;
            }
          }
          return diff / n;
        };
        steadied += apart(r.pixels);
        raw += apart(frame);
      }
    }
    expect(worst).toBeLessThan(0.35);
    // Whole-pixel slides leave up to half a pixel each way
    expect(steadied).toBeLessThan(raw * 0.6);
  });

  it('moves frames back after a small slide only once a few readings agree', () => {
    const base = scene();
    const st = createStabiliser();
    st.push(base, W, W);
    const shifted = slidePixels(base, W, W, START_PX + 0.08, 0);
    expect(st.push(shifted, W, W).moved).toBe(false);
    expect(st.push(shifted, W, W).moved).toBe(false);
    expect(st.push(shifted, W, W).moved).toBe(true);
  });

  it('follows a knock larger than a frame-to-frame wobble', () => {
    const base = scene();
    const st = createStabiliser();
    st.push(base, W, W);
    let r = st.push(base, W, W);
    for (let k = 0; k < 4; k++) r = st.push(noisy(slidePixels(base, W, W, 7, -5), k + 3), W, W);
    expect(r.moved).toBe(true);
    expect(Math.abs(r.dx + 7)).toBeLessThan(0.5);
    expect(Math.abs(r.dy - 5)).toBeLessThan(0.5);
  });

  it('starts again after a reset', () => {
    const base = scene();
    const st = createStabiliser();
    st.push(base, W, W);
    const shifted = slidePixels(base, W, W, 4, 0);
    for (let k = 0; k < 4; k++) st.push(shifted, W, W);
    st.reset();
    const r = st.push(shifted, W, W);
    expect(r.moved).toBe(false);
    expect(r.dx).toBe(0);
  });
});
