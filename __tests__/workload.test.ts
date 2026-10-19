// __tests__/workload.test.ts
import { describe, it, expect } from 'vitest';
import { createWorkload, isRepeat, CANVAS_LEVELS, TARGET_FRAME_MS } from '@/lib/video/workload';

/** Feeds frames presented at the given clip times, scoring whichever are wanted. */
function play(times: number[]) {
  const w = createWorkload();
  const scored: number[] = [];
  for (const t of times) {
    if (!w.wants(t)) continue;
    w.scored(t);
    scored.push(t);
  }
  return { w, scored };
}

const at = (fps: number, frames: number, from = 0) => Array.from({ length: frames }, (_, i) => from + (i * 1000) / fps);

describe('createWorkload', () => {
  it('scores every frame of 30 fps footage, at the top level', () => {
    const { w, scored } = play(at(30, 300));
    expect(scored).toHaveLength(300);
    expect(w.canvas()).toBe(CANVAS_LEVELS[0]);
    expect(w.skipped()).toBe(0);
  });

  it('scores 60 fps footage at 30, and does not count the thinning as skipping', () => {
    const { w, scored } = play(at(60, 600));
    expect(scored.length).toBeGreaterThan(290);
    expect(scored.length).toBeLessThan(310);
    expect(w.skipped()).toBe(0);
    expect(w.canvas()).toBe(CANVAS_LEVELS[0]);
  });

  it('keeps every frame of 30 fps footage with a little timing jitter', () => {
    const jittered = at(30, 300).map((t, i) => t + (i % 2 ? 4 : -4));
    expect(play(jittered).scored).toHaveLength(300);
  });

  it('works on a smaller picture when this device skips frames, without slowing the clip', () => {
    // Only every other 30 fps frame reaches the tracker
    const { w } = play(at(15, 60));
    expect(w.canvas()).toBeLessThan(CANVAS_LEVELS[0]);
    expect(w.skipped()).toBeGreaterThan(0);
  });

  it('never goes below the smallest picture', () => {
    const { w } = play(at(10, 600));
    expect(w.canvas()).toBe(CANVAS_LEVELS[CANVAS_LEVELS.length - 1]);
  });

  it('steps back up once it is keeping up again', () => {
    const slow = at(15, 60);
    // One level per ten seconds of keeping up, so two levels takes twenty
    const fast = at(30, 650, slow[slow.length - 1] + TARGET_FRAME_MS);
    const { w } = play([...slow, ...fast]);
    expect(w.canvas()).toBe(CANVAS_LEVELS[0]);
  });

  it('starts again after the clip is rewound', () => {
    const { scored } = play([0, 33, 66, 10, 43]);
    expect(scored).toEqual([0, 33, 66, 10, 43]);
  });
});

describe('isRepeat', () => {
  const frame = (seed: number) => {
    const f = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < f.length; i++) f[i] = (i * 31 + seed) % 251;
    return f;
  };

  it('spots a frame shown twice', () => {
    expect(isRepeat(frame(1), frame(1))).toBe(true);
  });

  it('does not mistake a new frame for a repeat', () => {
    expect(isRepeat(frame(1), frame(2))).toBe(false);
  });

  it('does not compare frames of different sizes', () => {
    expect(isRepeat(new Uint8ClampedArray(16), new Uint8ClampedArray(32))).toBe(false);
  });
});
