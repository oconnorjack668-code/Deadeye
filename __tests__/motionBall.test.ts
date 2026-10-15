// __tests__/motionBall.test.ts
// Synthetic frames: a painted background, a disc drawn where the ball is, and
// whatever else the case needs. Lets the pixel maths be pinned exactly, with no
// browser and no sample clip.
import { describe, it, expect } from 'vitest';
import {
  luma,
  diffMask,
  motionMask,
  labelBlobs,
  roundness,
  blobDiameter,
  blobColour,
  colourSimilarity,
  sizeScore,
  scoreBlob,
  findBall,
  expectedBallDiameter,
  BALL_TO_RIM,
  type Rgb,
} from '@/lib/video/motionBall';

const W = 80;
const H = 80;

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

function rect(buf: Uint8ClampedArray, x0: number, y0: number, w: number, h: number, colour: Rgb) {
  for (let y = y0; y < y0 + h && y < H; y++) {
    for (let x = x0; x < x0 + w && x < W; x++) {
      const p = (y * W + x) * 4;
      buf[p] = colour.r;
      buf[p + 1] = colour.g;
      buf[p + 2] = colour.b;
      buf[p + 3] = 255;
    }
  }
}

const HALL: Rgb = { r: 200, g: 200, b: 196 };
const MAROON: Rgb = { r: 140, g: 40, b: 50 };
const ORANGE: Rgb = { r: 220, g: 120, b: 40 };

describe('expectedBallDiameter', () => {
  it('sizes the ball from the rim, which is already measured', () => {
    // No pixel constant anywhere: a ball is 24cm across and a rim 45cm, so the
    // tracker fits any distance, resolution or zoom the rim was measured at.
    expect(expectedBallDiameter(100)).toBeCloseTo(53);
    expect(BALL_TO_RIM).toBeCloseTo(24 / 45, 1);
  });
});

describe('luma', () => {
  it('weights green most, as the eye does', () => {
    expect(luma(0, 255, 0)).toBeGreaterThan(luma(255, 0, 0));
    expect(luma(255, 0, 0)).toBeGreaterThan(luma(0, 0, 255));
  });
});

describe('diffMask', () => {
  it('marks only what moved', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 40, 40, 6, MAROON);
    const mask = diffMask(a, b, W, H);
    const lit = mask.reduce((n, v) => n + v, 0);
    expect(lit).toBeGreaterThan(80);
    expect(lit).toBeLessThan(160);
    expect(mask[40 * W + 40]).toBe(1);
    expect(mask[5 * W + 5]).toBe(0);
  });

  it('ignores a static object however distinctive it is', () => {
    // The clip that prompted this has a maroon rim and a maroon ball. The rim
    // does not move, so it never reaches the scoring stage at all.
    const a = frame(HALL);
    disc(a, 20, 20, 7, MAROON);
    const b = frame(HALL);
    disc(b, 20, 20, 7, MAROON);
    expect(diffMask(a, b, W, H).reduce((n, v) => n + v, 0)).toBe(0);
  });

  it('catches a colour change at the same brightness', () => {
    const a = frame({ r: 120, g: 120, b: 120 });
    const b = frame({ r: 120, g: 120, b: 120 });
    disc(b, 40, 40, 6, { r: 190, g: 90, b: 95 });
    expect(diffMask(a, b, W, H)[40 * W + 40]).toBe(1);
  });
});

describe('motionMask', () => {
  it('keeps only where the ball is now, not where it was', () => {
    const a = frame(HALL);
    disc(a, 20, 40, 5, MAROON);
    const b = frame(HALL);
    disc(b, 40, 40, 5, MAROON);
    const c = frame(HALL);
    disc(c, 60, 40, 5, MAROON);

    const two = diffMask(a, b, W, H);
    const three = motionMask(a, b, c, W, H);
    // Two frames light up both the old and the new position
    expect(two[40 * W + 20]).toBe(1);
    expect(two[40 * W + 40]).toBe(1);
    // Three frames keep the middle one only
    expect(three[40 * W + 40]).toBe(1);
    expect(three[40 * W + 20]).toBe(0);
    expect(three[40 * W + 60]).toBe(0);
  });
});

describe('labelBlobs', () => {
  it('separates two moving things', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 20, 20, 5, MAROON);
    disc(b, 60, 60, 5, MAROON);
    const blobs = labelBlobs(diffMask(a, b, W, H), W, H, 4);
    expect(blobs).toHaveLength(2);
    expect(blobs.map((bl) => Math.round(bl.cx)).sort((p, q) => p - q)).toEqual([20, 60]);
  });

  it('drops specks below the minimum', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 30, 30, 1, MAROON);
    expect(labelBlobs(diffMask(a, b, W, H), W, H, 40)).toHaveLength(0);
  });

  it('survives a frame where everything moved', () => {
    // The phone getting knocked. A recursive flood fill would overflow here.
    const a = frame({ r: 0, g: 0, b: 0 });
    const b = frame({ r: 255, g: 255, b: 255 });
    const blobs = labelBlobs(diffMask(a, b, W, H), W, H, 4);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].area).toBe(W * H);
  });
});

describe('roundness', () => {
  it('rates a disc far above a limb', () => {
    const a = frame(HALL);
    const ball = frame(HALL);
    disc(ball, 40, 40, 7, MAROON);
    const arm = frame(HALL);
    rect(arm, 20, 38, 40, 4, MAROON);

    const ballBlob = labelBlobs(diffMask(a, ball, W, H), W, H, 4)[0];
    const armBlob = labelBlobs(diffMask(a, arm, W, H), W, H, 4)[0];
    expect(roundness(ballBlob)).toBeGreaterThan(0.75);
    expect(roundness(armBlob)).toBeLessThan(0.25);
  });

  it('rates a filled square below a disc, since a ball does not fill its box', () => {
    const a = frame(HALL);
    const square = frame(HALL);
    rect(square, 30, 30, 14, 14, MAROON);
    const squareBlob = labelBlobs(diffMask(a, square, W, H), W, H, 4)[0];
    expect(roundness(squareBlob)).toBeLessThan(0.75);
  });
});

describe('colourSimilarity', () => {
  it('matches a colour to itself', () => {
    expect(colourSimilarity(MAROON, MAROON)).toBeCloseTo(1);
  });

  it('matches the same ball in shade, where plain RGB would not', () => {
    const shaded = { r: MAROON.r * 0.45, g: MAROON.g * 0.45, b: MAROON.b * 0.45 };
    expect(colourSimilarity(MAROON, shaded)).toBeGreaterThan(0.95);
  });

  it('separates balls of different colours', () => {
    expect(colourSimilarity(MAROON, ORANGE)).toBeLessThan(0.8);
  });

  it('claims no knowledge about near-black pixels', () => {
    expect(colourSimilarity({ r: 2, g: 2, b: 2 }, MAROON)).toBe(0.5);
  });
});

describe('blobDiameter and blobColour', () => {
  it('measures a blob across its longer side', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    rect(b, 10, 10, 20, 6, MAROON);
    const blob = labelBlobs(diffMask(a, b, W, H), W, H, 4)[0];
    expect(blobDiameter(blob)).toBe(20);
  });

  it('reads a blob\'s colour from the frame, not the mask', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 40, 40, 7, MAROON);
    const mask = diffMask(a, b, W, H);
    const blob = labelBlobs(mask, W, H, 4)[0];
    const colour = blobColour(b, W, blob, mask);
    // Edge pixels blend, so compare by likeness rather than exact values
    expect(colourSimilarity(colour, MAROON)).toBeGreaterThan(0.9);
  });
});

describe('scoreBlob', () => {
  const ballBlob = () => {
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 40, 40, 7, MAROON);
    return labelBlobs(diffMask(a, b, W, H), W, H, 4)[0];
  };

  it('refuses a blob the rim says is the wrong size, whatever its shape', () => {
    expect(scoreBlob(ballBlob(), { expectedDiameter: 200 })).toBe(0);
  });

  it('scores on shape and size when no colour was sampled', () => {
    expect(scoreBlob(ballBlob(), { expectedDiameter: 14 })).toBeGreaterThan(0.5);
  });

  it('rewards a colour match and penalises a mismatch', () => {
    const blob = ballBlob();
    const matched = scoreBlob(blob, { expectedDiameter: 14, sampledColour: MAROON }, MAROON);
    const mismatched = scoreBlob(blob, { expectedDiameter: 14, sampledColour: ORANGE }, MAROON);
    expect(matched).toBeGreaterThan(mismatched);
    // Still scores on shape and size, so a mismatch does not zero it out
    expect(mismatched).toBeGreaterThan(0);
  });
});

describe('sizeScore', () => {
  it('peaks at the size the rim predicts', () => {
    expect(sizeScore(50, 50)).toBeCloseTo(1);
    expect(sizeScore(40, 50)).toBeLessThan(1);
    expect(sizeScore(75, 50)).toBeLessThan(1);
  });

  it('refuses something far too small or far too large', () => {
    expect(sizeScore(5, 50)).toBe(0);
    expect(sizeScore(300, 50)).toBe(0);
  });
});

describe('findBall', () => {
  const opts = { expectedDiameter: 14 };

  it('finds a ball moving across the hall', () => {
    const a = frame(HALL);
    disc(a, 20, 40, 7, MAROON);
    const b = frame(HALL);
    disc(b, 40, 40, 7, MAROON);
    const found = findBall(a, b, W, H, opts);
    expect(found).not.toBeNull();
    expect(found!.score).toBeGreaterThan(0.5);
  });

  it('prefers the ball over an arm that is moving just as much', () => {
    // Three real frames, so the arm survives the intersection and has to be
    // rejected on shape rather than by not being there.
    const ARM: Rgb = { r: 90, g: 90, b: 110 };
    const a = frame(HALL);
    disc(a, 20, 20, 7, MAROON);
    rect(a, 4, 60, 36, 5, ARM);
    const b = frame(HALL);
    disc(b, 44, 20, 7, MAROON);
    rect(b, 10, 60, 36, 5, ARM);
    const c = frame(HALL);
    disc(c, 68, 20, 7, MAROON);
    rect(c, 16, 60, 36, 5, ARM);

    const found = findBall(a, b, W, H, opts, c);
    expect(found).not.toBeNull();
    // The arm sits at y=60; the ball near y=20
    expect(found!.y).toBeLessThan(40);
  });

  it('works with no sampled colour at all', () => {
    // Players' balls differ, so colour is a bonus and never a requirement
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 40, 40, 7, { r: 30, g: 90, b: 160 });
    expect(findBall(a, b, W, H, opts)).not.toBeNull();
  });

  it('uses a sampled colour to pick between two moving discs', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    disc(b, 20, 20, 7, MAROON);
    disc(b, 60, 60, 7, ORANGE);
    const found = findBall(a, b, W, H, { ...opts, sampledColour: ORANGE });
    expect(found).not.toBeNull();
    expect(found!.x).toBeGreaterThan(40);
    const other = findBall(a, b, W, H, { ...opts, sampledColour: MAROON });
    expect(other!.x).toBeLessThan(40);
  });

  it('reports nothing when nothing moved', () => {
    const a = frame(HALL);
    disc(a, 40, 40, 7, MAROON);
    expect(findBall(a, a, W, H, opts)).toBeNull();
  });

  it('reports nothing rather than the least bad blob', () => {
    const a = frame(HALL);
    const b = frame(HALL);
    // A long thin streak, nothing like a ball
    rect(b, 5, 40, 70, 3, MAROON);
    expect(findBall(a, b, W, H, opts)).toBeNull();
  });

  it('is not fooled by a static ball-coloured rim', () => {
    const a = frame(HALL);
    disc(a, 65, 15, 7, MAROON);
    const b = frame(HALL);
    disc(b, 65, 15, 7, MAROON);
    disc(b, 30, 50, 7, MAROON);
    const found = findBall(a, b, W, H, { ...opts, sampledColour: MAROON });
    expect(found).not.toBeNull();
    expect(Math.round(found!.x)).toBe(30);
    expect(Math.round(found!.y)).toBe(50);
  });
});
