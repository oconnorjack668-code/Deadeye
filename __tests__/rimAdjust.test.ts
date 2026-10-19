// __tests__/rimAdjust.test.ts
import { describe, it, expect } from 'vitest';
import {
  zoomRegionFor,
  toZoom,
  fromZoom,
  nudge,
  rimPixels,
  leftFirst,
  ZOOM_RIM_WIDTHS,
  MIN_ZOOM_PX,
} from '@/lib/video/rimAdjust';

// The 2:39 test clip: a 1080x1920 frame with a ring 50px across
const W = 1080;
const H = 1920;
const left = { x: 386 / W, y: 860 / H };
const right = { x: 436 / W, y: 860 / H };

describe('zoomRegionFor', () => {
  it('magnifies so the ring fills about half the view', () => {
    const r = zoomRegionFor(left, right, W, H);
    expect(r.side).toBeCloseTo(50 * ZOOM_RIM_WIDTHS);
    // Centred on the ring
    expect(r.sx + r.side / 2).toBeCloseTo(411);
    expect(r.sy + r.side / 2).toBeCloseTo(860);
  });

  it('does not magnify a tiny ring into a blur', () => {
    const r = zoomRegionFor({ x: 0.5, y: 0.5 }, { x: 0.5 + 10 / W, y: 0.5 }, W, H);
    expect(r.side).toBe(MIN_ZOOM_PX);
  });

  it('keeps a hoop at the edge of the frame inside the picture', () => {
    const r = zoomRegionFor({ x: 0.97, y: 0.01 }, { x: 0.999, y: 0.01 }, W, H);
    expect(r.sx).toBeGreaterThanOrEqual(0);
    expect(r.sy).toBeGreaterThanOrEqual(0);
    expect(r.sx + r.side).toBeLessThanOrEqual(W);
  });

  it('never asks for more than the frame', () => {
    const r = zoomRegionFor({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, W, H);
    expect(r.side).toBe(W);
  });
});

describe('toZoom and fromZoom', () => {
  it('round-trip a point through the magnified view', () => {
    const r = zoomRegionFor(left, right, W, H);
    const back = fromZoom(toZoom(left, r, W, H, 360), r, W, H, 360);
    expect(back.x).toBeCloseTo(left.x);
    expect(back.y).toBeCloseTo(left.y);
  });

  it('places the two taps either side of the middle of the view', () => {
    const r = zoomRegionFor(left, right, W, H);
    const a = toZoom(left, r, W, H, 360);
    const b = toZoom(right, r, W, H, 360);
    expect(a.x).toBeLessThan(180);
    expect(b.x).toBeGreaterThan(180);
    // Half the view apart, give or take
    expect((b.x - a.x) / 360).toBeCloseTo(1 / ZOOM_RIM_WIDTHS, 2);
  });

  it('keeps a drag that leaves the view inside it', () => {
    const r = zoomRegionFor(left, right, W, H);
    const p = fromZoom({ x: -40, y: 999 }, r, W, H, 360);
    expect(p.x * W).toBeCloseTo(r.sx);
    expect(p.y * H).toBeCloseTo(r.sy + r.side);
  });
});

describe('nudge', () => {
  it('moves a point by whole video pixels', () => {
    const p = nudge(left, 1, -2, W, H);
    expect(p.x * W).toBeCloseTo(387);
    expect(p.y * H).toBeCloseTo(858);
  });

  it('stops at the edge of the frame', () => {
    expect(nudge({ x: 0, y: 1 }, -5, 5, W, H)).toEqual({ x: 0, y: 1 });
  });
});

describe('rimPixels and leftFirst', () => {
  it('measures the ring in video pixels', () => {
    expect(rimPixels(left, right, W)).toBeCloseTo(50);
    expect(rimPixels(right, left, W)).toBeCloseTo(50);
  });

  it('puts the left point first whichever was tapped first', () => {
    expect(leftFirst(right, left)).toEqual([left, right]);
    expect(leftFirst(left, right)).toEqual([left, right]);
  });
});
