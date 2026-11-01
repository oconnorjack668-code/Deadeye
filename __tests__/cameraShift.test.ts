import { describe, it, expect } from 'vitest';
import { createCameraShiftWatcher, shiftInFrame, CHECK_EVERY_MS, GRID } from '@/lib/video/cameraShift';

const SIZE = GRID * 6; // 6 px a cell

/** A fixed scene: soft random blobs, like a wall, a backboard and a rim. */
function scene(seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const blobs = Array.from({ length: 40 }, () => ({ x: rand() * SIZE * 1.6 - SIZE * 0.3, y: rand() * SIZE * 1.6 - SIZE * 0.3, r: 8 + rand() * 30, v: rand() * 200 }));
  return (x: number, y: number) => {
    let v = 30;
    for (const b of blobs) if ((x - b.x) ** 2 + (y - b.y) ** 2 < b.r * b.r) v = b.v;
    return v;
  };
}

function frame(at: (x: number, y: number) => number, opts: { dx?: number; dy?: number; gain?: number; ball?: { x: number; y: number } } = {}) {
  const px = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // The scene drawn dx px further right, as when the camera turns left
      let v = at(x - (opts.dx ?? 0), y - (opts.dy ?? 0)) * (opts.gain ?? 1);
      if (opts.ball && (x - opts.ball.x) ** 2 + (y - opts.ball.y) ** 2 < 15 * 15) v = 120;
      const i = (y * SIZE + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = Math.min(255, v);
      px[i + 3] = 255;
    }
  }
  return px;
}

function run(frames: Uint8ClampedArray[]) {
  const w = createCameraShiftWatcher();
  const reports = frames.map((f, k) => w.push(f, SIZE, SIZE, k * CHECK_EVERY_MS));
  return { w, reports: reports.filter(Boolean) };
}

describe('camera shift', () => {
  const at = scene(7);

  it('says nothing while the camera stays put, with a ball and players passing', () => {
    const frames = Array.from({ length: 40 }, (_, k) => frame(at, { ball: { x: (k * 37) % SIZE, y: (k * 53) % SIZE } }));
    expect(run(frames).reports).toEqual([]);
  });

  it('is not fooled by the light changing', () => {
    const frames = Array.from({ length: 30 }, (_, k) => frame(at, { gain: 0.6 + (k % 7) * 0.1 }));
    expect(run(frames).reports).toEqual([]);
  });

  it('reports a knock once, a few checks after it happens', () => {
    const frames = [
      ...Array.from({ length: 12 }, () => frame(at)),
      ...Array.from({ length: 10 }, () => frame(at, { dx: 18, dy: -12 })),
    ];
    const { w, reports } = run(frames);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ dx: 3, dy: -2 });
    expect(w.moved()).toMatchObject({ dx: 3, dy: -2 });
  });

  it('ignores a shift that does not last', () => {
    const frames = [
      ...Array.from({ length: 12 }, () => frame(at)),
      frame(at, { dx: 24 }),
      frame(at, { dx: 24 }),
      ...Array.from({ length: 8 }, () => frame(at)),
    ];
    expect(run(frames).reports).toEqual([]);
  });

  it('starts again after a reset', () => {
    const frames = [...Array.from({ length: 12 }, () => frame(at)), ...Array.from({ length: 6 }, () => frame(at, { dx: 18 }))];
    const { w } = run(frames);
    expect(w.moved()).not.toBeNull();
    w.reset();
    expect(w.moved()).toBeNull();
  });

  it('converts cells to a move of the rim in the frame', () => {
    const cell = 360 / GRID;
    expect(shiftInFrame({ dx: 3, dy: -2 }, 360, 1920, 1080)).toEqual({ x: (3 * cell) / 1920, y: (-2 * cell) / 1080 });
  });
});

import { repeatSignature, sameSignature, isRepeat } from '@/lib/video/workload';

describe('repeat signature', () => {
  it('agrees with isRepeat', () => {
    const a = new Uint8ClampedArray(320 * 320 * 4).map((_, i) => (i * 7) % 251);
    const b = new Uint8ClampedArray(a);
    const c = new Uint8ClampedArray(a);
    c[0] = 1 + c[0];
    expect(sameSignature(repeatSignature(a), repeatSignature(b))).toBe(isRepeat(a, b));
    expect(sameSignature(repeatSignature(a), repeatSignature(c))).toBe(isRepeat(a, c));
    expect(isRepeat(a, c)).toBe(false);
  });
});
