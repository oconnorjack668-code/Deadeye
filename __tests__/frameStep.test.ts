// __tests__/frameStep.test.ts
import { describe, it, expect } from 'vitest';
import {
  sampleTimesMs,
  seekMadeProgress,
  estimatedPassMs,
  DEFAULT_STEP_MS,
  MAX_SAMPLES,
} from '@/lib/video/frameStep';

describe('sampleTimesMs', () => {
  it('samples a short clip at the full rate', () => {
    const times = sampleTimesMs(1000);
    expect(times).toHaveLength(30);
    expect(times[0]).toBe(0);
    expect(times[1]).toBeCloseTo(DEFAULT_STEP_MS);
    // Never past the end: a seek beyond duration lands on the last frame again
    expect(Math.max(...times)).toBeLessThan(1000);
  });

  it('sees more than twice what real-time playback managed', () => {
    // The measured run processed 734 frames of a clip at 14.3 fps, so about 51
    // seconds. At 30 fps the same clip gives over 1500 samples.
    const times = sampleTimesMs(51_000);
    expect(times.length).toBeGreaterThan(1500);
    expect(times.length / 734).toBeGreaterThan(2);
  });

  it('widens the step rather than running forever on a long recording', () => {
    const halfHour = 30 * 60 * 1000;
    const times = sampleTimesMs(halfHour);
    expect(times).toHaveLength(MAX_SAMPLES);
    // Still spread across the whole clip, not just the first stretch
    expect(times[times.length - 1]).toBeGreaterThan(halfHour * 0.99);
  });

  it('honours a step the caller chooses', () => {
    expect(sampleTimesMs(1000, 100)).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
  });

  it('has nothing to sample from a clip with no duration', () => {
    // A video element reports NaN duration until it has loaded metadata
    expect(sampleTimesMs(NaN)).toEqual([]);
    expect(sampleTimesMs(0)).toEqual([]);
    expect(sampleTimesMs(-5)).toEqual([]);
    expect(sampleTimesMs(Infinity)).toEqual([]);
  });

  it('refuses a step that would never advance', () => {
    expect(sampleTimesMs(1000, 0)).toEqual([]);
    expect(sampleTimesMs(1000, -10)).toEqual([]);
    expect(sampleTimesMs(1000, NaN)).toEqual([]);
  });
});

describe('seekMadeProgress', () => {
  it('accepts a seek that moved on', () => {
    expect(seekMadeProgress(1000, 1033)).toBe(true);
  });

  it('rejects a seek that landed back on the same frame', () => {
    expect(seekMadeProgress(1000, 1000)).toBe(false);
    expect(seekMadeProgress(1000, 1000.2)).toBe(false);
    expect(seekMadeProgress(1000, 990)).toBe(false);
  });
});

describe('estimatedPassMs', () => {
  it('multiplies out, so the page can warn before a long wait', () => {
    // 1500 samples at 70ms of inference each is about 105 seconds
    expect(estimatedPassMs(1500, 70)).toBe(105_000);
  });
});
