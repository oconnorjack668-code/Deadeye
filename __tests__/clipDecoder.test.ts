import { describe, it, expect } from 'vitest';
import { rotationOf, cropInStored, editOffsetMs } from '@/lib/video/clipDecoder';

const F = 65536;

describe('rotationOf', () => {
  it('reads the rotation from a track matrix, clockwise', () => {
    expect(rotationOf([F, 0, 0, 0, F, 0, 0, 0, 1 << 30])).toBe(0);
    // ffmpeg -display_rotation 90 writes this; Chrome shows it turned so that
    // the crop matches with 270 (checked against the <video>, 14 Nov 2026)
    expect(rotationOf([0, -F, 0, F, 0, 0, 0, 0, 1 << 30])).toBe(270);
    expect(rotationOf([0, F, 0, -F, 0, 0, 0, 0, 1 << 30])).toBe(90);
    expect(rotationOf([-F, 0, 0, 0, -F, 0, 0, 0, 1 << 30])).toBe(180);
  });

  it('is 0 with no matrix, or one that is not a quarter turn', () => {
    expect(rotationOf(undefined)).toBe(0);
    expect(rotationOf([])).toBe(0);
    expect(rotationOf([F * 0.7, F * 0.7, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
  });
});

describe('cropInStored', () => {
  // A 1920x1080 stored frame; shown sideways it is 1080x1920
  const crop = { sx: 100, sy: 300, side: 200 };

  it('leaves an upright frame alone', () => {
    expect(cropInStored(crop, 0, 1920, 1080)).toEqual({ x: 100, y: 300 });
  });

  it('maps the square into a frame stored sideways or upside down', () => {
    expect(cropInStored(crop, 90, 1920, 1080)).toEqual({ x: 300, y: 1080 - 100 - 200 });
    expect(cropInStored(crop, 270, 1920, 1080)).toEqual({ x: 1920 - 300 - 200, y: 100 });
    expect(cropInStored(crop, 180, 1920, 1080)).toEqual({ x: 1920 - 100 - 200, y: 1080 - 300 - 200 });
  });

  it('keeps a crop that covers the whole shown picture inside the stored frame', () => {
    const whole = { sx: 0, sy: 0, side: 1080 };
    for (const r of [90, 270] as const) {
      const at = cropInStored(whole, r, 1920, 1080);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.x + whole.side).toBeLessThanOrEqual(1920);
      expect(at.y + whole.side).toBeLessThanOrEqual(1080);
    }
  });
});

describe('editOffsetMs', () => {
  it('is 0 with no edit list', () => {
    expect(editOffsetMs(undefined, 600, 1000)).toBe(0);
    expect(editOffsetMs([], 600, 1000)).toBe(0);
  });

  it('starts playback partway into the media: frames before it are not shown', () => {
    // media_time in the track's timescale (600), so 0.5s
    expect(editOffsetMs([{ media_time: 300, segment_duration: 5000 }], 600, 1000)).toBe(500);
  });

  it('counts an empty edit as a delay before the media starts', () => {
    // 200ms of nothing (movie timescale 1000), then the media from its start
    expect(editOffsetMs([{ media_time: -1, segment_duration: 200 }, { media_time: 0, segment_duration: 5000 }], 600, 1000)).toBe(-200);
  });
});
