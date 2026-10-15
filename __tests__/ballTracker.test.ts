// __tests__/ballTracker.test.ts
import { describe, it, expect } from 'vitest';
import { createBallTracker, medianColour, LEARN_SAMPLES, LEARN_ABOVE } from '@/lib/video/ballTracker';
import { colourSimilarity, type Rgb } from '@/lib/video/motionBall';

const W = 80;
const H = 80;
const HALL: Rgb = { r: 200, g: 200, b: 196 };
const MAROON: Rgb = { r: 140, g: 40, b: 50 };

function frame(bg: Rgb): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    buf[i * 4] = bg.r;
    buf[i * 4 + 1] = bg.g;
    buf[i * 4 + 2] = bg.b;
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

function disc(buf: Uint8ClampedArray, cx: number, cy: number, radius: number, colour: Rgb) {
  for (let y = Math.max(0, cy - radius); y <= Math.min(H - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(W - 1, cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius * radius) continue;
      const p = (y * W + x) * 4;
      buf[p] = colour.r;
      buf[p + 1] = colour.g;
      buf[p + 2] = colour.b;
      buf[p + 3] = 255;
    }
  }
}

/** A ball crossing the frame, one step per call. */
function ballAt(x: number, colour = MAROON): Uint8ClampedArray {
  const f = frame(HALL);
  disc(f, x, 40, 7, colour);
  return f;
}

describe('medianColour', () => {
  it('ignores a single wrong sample that a mean would follow', () => {
    const samples = [MAROON, MAROON, MAROON, { r: 255, g: 255, b: 255 }, MAROON];
    const median = medianColour(samples)!;
    expect(median).toEqual(MAROON);
  });

  it('has nothing to say about no samples', () => {
    expect(medianColour([])).toBeNull();
  });
});

describe('createBallTracker', () => {
  const opts = { expectedDiameter: 14 };

  /**
   * Runs a ball across the frame for `steps` frames, three at a time.
   *
   * The 16px stride matters: three-frame differencing intersects what changed
   * before with what changed after, so a ball that moves less than its own
   * 14px width overlaps itself and the intersection comes back nearly empty.
   * A ball in flight easily clears that; one resting on the floor does not,
   * which is the right behaviour - a still ball is not a shot.
   */
  function runSteps(
    tracker: ReturnType<typeof createBallTracker>,
    steps: number,
    colour = MAROON,
    threeFrame = true
  ) {
    let found = 0;
    for (let i = 0; i < steps; i++) {
      const x = 12 + ((i * 7) % 20);
      const prev = ballAt(x, colour);
      const cur = ballAt(x + 16, colour);
      const next = ballAt(x + 32, colour);
      if (tracker.track(prev, cur, W, H, threeFrame ? next : undefined)) found++;
    }
    return found;
  }

  it('learns the ball colour from its own confident finds, with no tap', () => {
    const tracker = createBallTracker(opts);
    expect(tracker.colour()).toBeNull();
    runSteps(tracker, LEARN_SAMPLES + 4);
    const learned = tracker.colour();
    expect(learned).not.toBeNull();
    expect(colourSimilarity(learned!, MAROON)).toBeGreaterThan(0.9);
  });

  it('learns whatever colour the ball actually is', () => {
    // The point of learning rather than assuming: this one is blue
    const BLUE: Rgb = { r: 40, g: 70, b: 170 };
    const tracker = createBallTracker(opts);
    runSteps(tracker, LEARN_SAMPLES + 4, BLUE);
    expect(colourSimilarity(tracker.colour()!, BLUE)).toBeGreaterThan(0.9);
  });

  it('says nothing until it has seen enough', () => {
    const tracker = createBallTracker(opts);
    runSteps(tracker, LEARN_SAMPLES - 2);
    expect(tracker.colour()).toBeNull();
  });

  it('stops collecting once a colour is in play, so it cannot feed back on itself', () => {
    // Believing a colour raises the score of blobs matching it, which would
    // teach that colour more firmly still - a loop that ends in certainty
    // about whatever it happened to see first.
    const tracker = createBallTracker(opts);
    runSteps(tracker, LEARN_SAMPLES + 2);
    const settled = tracker.samples();
    runSteps(tracker, 10);
    expect(tracker.samples()).toBe(settled);
  });

  it('uses a colour given up front from the very first frame', () => {
    const tracker = createBallTracker({ ...opts, initialColour: MAROON });
    expect(tracker.colour()).toEqual(MAROON);
    // And having one, it does not then learn over the top of it
    runSteps(tracker, LEARN_SAMPLES + 4);
    expect(tracker.samples()).toBe(0);
  });

  it('can be told not to learn at all', () => {
    const tracker = createBallTracker({ ...opts, learn: false });
    runSteps(tracker, LEARN_SAMPLES + 6);
    expect(tracker.colour()).toBeNull();
    expect(tracker.samples()).toBe(0);
  });

  it('still finds the ball while it is still learning', () => {
    // Learning must never be a precondition for working
    const tracker = createBallTracker(opts);
    expect(runSteps(tracker, 4)).toBeGreaterThan(0);
  });

  it('only believes finds that scored well on shape and size alone', () => {
    expect(LEARN_ABOVE).toBeGreaterThan(0.5);
    const tracker = createBallTracker(opts);
    // A long thin streak is found by nothing, so nothing is learned from it
    const a = frame(HALL);
    const b = frame(HALL);
    for (let x = 5; x < 70; x++) disc(b, x, 40, 1, MAROON);
    const c = frame(HALL);
    tracker.track(a, b, W, H, c);
    expect(tracker.samples()).toBe(0);
  });

  it('will not learn a colour from two frames, where the mask is ambiguous', () => {
    // A two-frame mask covers the old position too, where the current frame
    // shows wall - so the colour read back is a blend, not the ball.
    const tracker = createBallTracker(opts);
    const found = runSteps(tracker, LEARN_SAMPLES + 6, MAROON, false);
    // It finds the ball perfectly well on two frames; it just will not take a
    // colour reading from them.
    expect(found).toBeGreaterThan(0);
    expect(tracker.samples()).toBe(0);
    expect(tracker.colour()).toBeNull();
  });
});
