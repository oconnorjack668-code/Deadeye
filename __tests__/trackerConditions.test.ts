// __tests__/trackerConditions.test.ts
// The tracker under conditions the bench suite simulates: slow phones and
// washed-out pictures (scripts/bench-suite.mjs).
import { describe, it, expect } from 'vitest';
import { ShotDetector, type BallObservation, type DetectedShot } from '@/lib/video/shotDetector';
import { adaptedThreshold, lumaSpread, DEFAULT_DIFF_THRESHOLD, MIN_THRESHOLD_SCALE } from '@/lib/video/motionBall';

const RIM = { x: 0.5, y: 0.5, width: 0.1 };

/**
 * A make as a slow phone sees it: the ball once, just above the ring, then
 * nothing but the net swinging as it drops through.
 */
function loneMake(frameMs: number): BallObservation[] {
  const out: BallObservation[] = [];
  let t = 0;
  for (; t < 600; t += frameMs) out.push({ t, ball: null, net: 0 });
  out.push({ t, ball: { x: 0.5, y: 0.45 }, net: 0 });
  for (t += frameMs; t < 3000; t += frameMs) out.push({ t, ball: null, net: t < 1600 ? 0.2 : 0 });
  return out;
}

function run(frames: BallObservation[]): DetectedShot[] {
  const d = new ShotDetector(RIM);
  const shots: DetectedShot[] = [];
  for (const f of frames) {
    const s = d.push(f);
    if (s) shots.push(s);
  }
  return shots;
}

describe('a slow phone', () => {
  it('counts a make seen once above the ring and then in the net, marked unsure', () => {
    const shots = run(loneMake(100));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
    expect(shots[0].confident).toBe(false);
    // No crossing was seen, so there is no margin to report
    expect(shots[0].crossMargin).toBeUndefined();
  });

  it('leaves a phone at full speed exactly as it was: one sighting does not start a shot there', () => {
    expect(run(loneMake(33))).toHaveLength(0);
  });

  it('needs the net to move: a lone sighting with a still net is nothing', () => {
    const frames = loneMake(100).map((f) => ({ ...f, net: 0 }));
    expect(run(frames)).toHaveLength(0);
  });
});

/**
 * A shot on a slow phone that comes down to the ring and vanishes, with a
 * stray sighting a frame later moving up, as at 23.6s on the 2:39 bench clip
 * at 10 frames a second. The net moves on `netUntil`.
 */
function vanishes(netUntil: number): BallObservation[] {
  const out: BallObservation[] = [];
  let t = 0;
  for (; t < 700; t += 100) out.push({ t, ball: null, net: 0 });
  out.push({ t: 700, ball: { x: 0.53, y: 0.38 }, net: 0 });
  out.push({ t: 800, ball: { x: 0.51, y: 0.444 }, net: 0 });
  out.push({ t: 900, ball: { x: 0.4, y: 0.42 }, net: 0.15 });
  for (t = 1000; t < 3500; t += 100) out.push({ t, ball: null, net: t < netUntil ? 0.25 : 0.01 });
  return out;
}

describe('a slow phone, the ball vanishing at the ring', () => {
  it('is a make, unsure, when the net is still swinging late', () => {
    const shots = run(vanishes(2600));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
    expect(shots[0].confident).toBe(false);
    expect(shots[0].t).toBe(800);
  });

  it('is a miss when the net only shook from the ring', () => {
    const shots = run(vanishes(1400));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
  });
});

describe('contrast', () => {
  const picture = (values: number[]) => {
    const px = new Uint8ClampedArray(values.length * 4);
    values.forEach((v, i) => px.set([v, v, v, 255], i * 4));
    return px;
  };

  it('measures how far apart the dark and bright parts are', () => {
    expect(lumaSpread(picture(Array(700).fill(128)), 1)).toBe(0);
    expect(lumaSpread(picture([...Array(350).fill(20), ...Array(350).fill(220)]), 1)).toBe(200);
  });

  it('keeps the threshold on an ordinary picture and lowers it on a flat one, to a floor', () => {
    // Both bench clips measure about 107 as filmed, 56 washed out
    expect(adaptedThreshold(107)).toBe(DEFAULT_DIFF_THRESHOLD);
    expect(adaptedThreshold(56)).toBeCloseTo(DEFAULT_DIFF_THRESHOLD * 0.56);
    expect(adaptedThreshold(5)).toBe(DEFAULT_DIFF_THRESHOLD * MIN_THRESHOLD_SCALE);
  });
});
