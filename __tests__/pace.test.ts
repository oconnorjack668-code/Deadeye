// __tests__/pace.test.ts
// The playback pacer for uploaded clips. What matters: it slows down as soon
// as frames are being skipped - including on a device that skips from the
// very first frame - speeds back up once it is keeping up, and does not
// mistake 60 fps footage or a genuinely low frame rate for skipping.
import { describe, it, expect } from 'vitest';
import { createPacer, MIN_RATE, TARGET_FRAME_MS } from '@/lib/video/pace';

/** Feeds `count` frames `gapMs` apart and returns the final rate. */
function feed(pacer: ReturnType<typeof createPacer>, start: number, gapMs: number, count: number) {
  let t = start;
  for (let i = 0; i < count; i++) {
    pacer.next(t);
    t += gapMs;
  }
  return t;
}

describe('createPacer', () => {
  it('stays at full speed while every frame of 30 fps footage is scored', () => {
    const p = createPacer();
    feed(p, 0, TARGET_FRAME_MS, 300);
    expect(p.rate()).toBe(1);
    expect(p.skipped()).toBe(0);
  });

  it('slows down on a device that skips from the very first frame', () => {
    const p = createPacer();
    // Every other frame scored: 66ms of clip between scored frames
    feed(p, 0, TARGET_FRAME_MS * 2, 6);
    expect(p.rate()).toBeLessThan(0.5);
    expect(p.skipped()).toBeGreaterThan(0);
  });

  it('speeds back up once it is keeping up again', () => {
    const p = createPacer();
    const t = feed(p, 0, TARGET_FRAME_MS * 2, 4);
    const slowed = p.rate();
    feed(p, t, TARGET_FRAME_MS, 600);
    expect(p.rate()).toBeGreaterThan(slowed);
    expect(p.rate()).toBeLessThanOrEqual(1);
  });

  it('never goes below the floor', () => {
    const p = createPacer();
    feed(p, 0, 200, 100);
    expect(p.rate()).toBe(MIN_RATE);
  });

  it('treats 60 fps footage scored at 30 as keeping up', () => {
    const p = createPacer();
    feed(p, 0, (1000 / 60) * 2, 300);
    expect(p.rate()).toBe(1);
  });

  it('learns a genuinely low frame rate at the floor and then recovers speed', () => {
    const p = createPacer();
    // 15 fps footage: 66ms between frames however slowly it plays
    feed(p, 0, 1000 / 15, 1000);
    expect(p.rate()).toBeGreaterThan(MIN_RATE);
  });

  it('ignores a rewind instead of reading it as a huge gap', () => {
    const p = createPacer();
    feed(p, 5000, TARGET_FRAME_MS, 10);
    p.next(0);
    p.next(TARGET_FRAME_MS);
    expect(p.rate()).toBe(1);
  });
});
