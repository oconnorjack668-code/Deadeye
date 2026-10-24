// __tests__/poseClock.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { nextPoseTimestamp, resetPoseClock } from '@/lib/video/poseClock';

/** One analysis run: `frames` stamps, each taken `seekMs` of real time after the last. */
function run(
  stamp: (step: number, now: number) => number,
  startNow: number,
  frames: number,
  stepMs: number,
  seekMs: number
) {
  const stamps: number[] = [];
  let now = startNow;
  for (let i = 0; i < frames; i++) {
    now += seekMs;
    stamps.push(stamp(stepMs, now));
  }
  return { stamps, endNow: now };
}

describe('nextPoseTimestamp', () => {
  beforeEach(() => resetPoseClock());

  it('the old formula went backwards on a quick second run (the crash)', () => {
    // performance.now() + a counter that restarts at 0 each run
    const old = (counterRef: { ts: number }) => (step: number, now: number) => {
      counterRef.ts += step;
      return Math.round(now + counterRef.ts);
    };
    const first = run(old({ ts: 0 }), 10_000, 240, 20, 30);
    const second = run(old({ ts: 0 }), first.endNow + 3_000, 240, 20, 30);
    expect(second.stamps[0]).toBeLessThan(first.stamps[first.stamps.length - 1]);
  });

  it('never goes backwards across runs started soon after each other', () => {
    const first = run(nextPoseTimestamp, 10_000, 240, 20, 30);
    const second = run(nextPoseTimestamp, first.endNow + 3_000, 240, 20, 30);
    const third = run(nextPoseTimestamp, second.endNow + 1, 90, 1000 / 30, 5);
    const all = [...first.stamps, ...second.stamps, ...third.stamps];
    for (let i = 1; i < all.length; i++) expect(all[i]).toBeGreaterThan(all[i - 1]);
  });

  it('advances by at least the step even when the clock does not move', () => {
    const a = nextPoseTimestamp(20, 1000);
    const b = nextPoseTimestamp(20, 1000);
    expect(b - a).toBeGreaterThanOrEqual(20);
  });

  it('follows the real clock when that is ahead', () => {
    nextPoseTimestamp(20, 1000);
    expect(nextPoseTimestamp(20, 50_000)).toBe(50_000);
  });

  it('moves forward by at least 1 for a zero or tiny step', () => {
    const a = nextPoseTimestamp(0, 100);
    const b = nextPoseTimestamp(0.2, 100);
    expect(b).toBeGreaterThan(a);
  });
});
