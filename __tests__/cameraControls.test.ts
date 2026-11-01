import { describe, it, expect } from 'vitest';
import { clampZoom, insideFrame, lockConstraints, zoomPoint, zoomRange, zoomToFit, TARGET_RIM_PX } from '@/lib/video/cameraControls';

describe('zoomRange', () => {
  it('reads a camera that can zoom', () => {
    expect(zoomRange({ zoom: { min: 1, max: 8, step: 0.1 } })).toEqual({ min: 1, max: 8, step: 0.1 });
  });
  it('is null for one that cannot', () => {
    expect(zoomRange({})).toBeNull();
    expect(zoomRange({ zoom: { min: 1, max: 1 } })).toBeNull();
    expect(zoomRange(undefined)).toBeNull();
  });
});

describe('zoomToFit', () => {
  const range = { min: 1, max: 10, step: 0.1 };

  it('zooms a small centred hoop up to the target size', () => {
    const z = zoomToFit({ x: 0.5, y: 0.45, width: 0.04 }, 50, 1, range, 16 / 9);
    expect(z).toBeCloseTo(TARGET_RIM_PX / 50, 1);
  });

  it('stops short when the hoop is near an edge of the frame', () => {
    const z = zoomToFit({ x: 0.85, y: 0.5, width: 0.04 }, 50, 1, range, 9 / 16);
    expect(z).toBeLessThan(TARGET_RIM_PX / 50);
    // The watched square still fits: centre plus three rim widths stays inside
    const k = z / 1;
    expect(0.5 + (0.85 - 0.5) * k + 3 * 0.04 * k).toBeLessThanOrEqual(1);
  });

  it('never zooms out, and respects the camera range', () => {
    expect(zoomToFit({ x: 0.5, y: 0.5, width: 0.2 }, 300, 2, range, 0.5625)).toBe(2);
    expect(zoomToFit({ x: 0.5, y: 0.5, width: 0.005 }, 5, 1, { min: 1, max: 3, step: 0.5 }, 0.5625)).toBe(3);
  });

  it('snaps to the step', () => {
    expect(clampZoom(2.04, { min: 1, max: 4, step: 0.25 })).toBe(2);
  });
});

describe('zoomPoint', () => {
  it('moves points away from the centre as zoom rises', () => {
    expect(zoomPoint({ x: 0.6, y: 0.4 }, 1, 2)).toEqual({ x: 0.7, y: 0.30000000000000004 });
    expect(zoomPoint({ x: 0.5, y: 0.5 }, 1, 3)).toEqual({ x: 0.5, y: 0.5 });
  });
  it('can tell when the rim would leave the picture', () => {
    expect(insideFrame([zoomPoint({ x: 0.9, y: 0.5 }, 1, 2)])).toBe(false);
  });
});

describe('lockConstraints', () => {
  it('holds each setting the camera reports and allows', () => {
    const caps = { focusMode: ['continuous', 'manual'], exposureMode: ['continuous', 'manual'], whiteBalanceMode: ['continuous'] };
    const settings = { focusDistance: 0.4, exposureTime: 33, colorTemperature: 5000 };
    expect(lockConstraints(caps, settings)).toEqual([
      { focusMode: 'manual', focusDistance: 0.4 },
      { exposureMode: 'manual', exposureTime: 33 },
    ]);
  });
  it('holds nothing it cannot read the current value of', () => {
    expect(lockConstraints({ focusMode: ['manual'] }, {})).toEqual([]);
  });
});
