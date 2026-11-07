// __tests__/rimFinder.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { closeRegion, decode, findRimSteady, medianRim, toInput, MODEL_SIZE, type ModelOutput, type Region } from '@/lib/video/rimFinder';
import { RUNTIME_VERSION } from '@/lib/video/rimModel';

const logit = (p: number) => Math.log(p / (1 - p));

/** A model output with one find per entry: [class index, score, cx, cy, w, h]. */
function output(finds: Array<[number, number, number, number, number, number]>, classes = 4): ModelOutput {
  const queries = Math.max(finds.length, 3);
  const dets = new Float32Array(queries * 4);
  const labels = new Float32Array(queries * classes).fill(logit(0.01));
  finds.forEach(([c, p, cx, cy, w, h], q) => {
    dets.set([cx, cy, w, h], q * 4);
    labels[q * classes + c] = logit(p);
  });
  return { dets, labels, queries, classes };
}

describe('decode', () => {
  it('reads boxes as centre and size, scores through a sigmoid, best first, above the threshold', () => {
    const found = decode(
      output([
        [0, 0.6, 0.2, 0.2, 0.1, 0.1],
        [1, 0.9, 0.5, 0.4, 0.2, 0.1],
      ]),
      0.3
    );
    expect(found.map((d) => d.cls)).toEqual(['rim', 'ball']);
    expect(found[0].score).toBeCloseTo(0.9);
    expect(found[0]).toMatchObject({ x1: expect.closeTo(0.4), y1: expect.closeTo(0.35), x2: expect.closeTo(0.6), y2: expect.closeTo(0.45) });
    expect(decode(output([[1, 0.2, 0.5, 0.5, 0.1, 0.1]]), 0.3)).toEqual([]);
  });

  it('ignores an output slot beyond the three trained classes', () => {
    expect(decode(output([[3, 0.99, 0.5, 0.5, 0.1, 0.1]]), 0.3)).toEqual([]);
  });
});

describe('the close look', () => {
  it('is a square five rim widths across, centred on the rim, kept inside the frame', () => {
    expect(closeRegion({ x1: 900, y1: 400, x2: 1000, y2: 440 }, 1920, 1080)).toEqual({ sx: 700, sy: 170, sw: 500, sh: 500 });
    // Near the top corner it slides in rather than leaving the picture
    expect(closeRegion({ x1: 10, y1: 5, x2: 110, y2: 45 }, 1920, 1080)).toEqual({ sx: 0, sy: 0, sw: 500, sh: 500 });
    // Never bigger than the frame's short side
    expect(closeRegion({ x1: 100, y1: 100, x2: 600, y2: 300 }, 1920, 1080).sw).toBe(1080);
  });
});

describe('findRimSteady', () => {
  it('takes the close look on every frame and the middle of their answers', async () => {
    const W = 1920;
    const H = 1080;
    // First look: a rim at x 900..1000 on the whole frame. Close looks: the same
    // rim, each a little different, one way off (a ball on the ring)
    const close = [0.4, 0.41, 0.6];
    let call = 0;
    const regions: Region[] = [];
    const run = async (): Promise<ModelOutput> => {
      const n = call++;
      if (n === 0) return output([[1, 0.8, 950 / W, 420 / H, 100 / W, 40 / H]]);
      const x = close[n - 1];
      return output([[1, 0.9, x + 0.1, 0.5, 0.2, 0.08]]);
    };
    const sample = (r: Region) => {
      regions.push(r);
      return new Uint8ClampedArray(MODEL_SIZE * MODEL_SIZE * 4);
    };
    const found = await findRimSteady(W, H, [sample, sample, sample], run);
    expect(regions[0]).toEqual({ sx: 0, sy: 0, sw: W, sh: H });
    // Boxes come back as 32-bit floats, as from the real model: a few hundredths of a pixel out
    expect(regions.slice(1).every((r) => Math.abs(r.sw - 500) < 0.1 && Math.abs(r.sx - 700) < 0.1)).toBe(true);
    // The middle close look (x1 0.41 of the square) wins over the odd one out
    expect(found!.left.x).toBeCloseTo((700 + 0.41 * 500) / W);
    expect(found!.refined).toBe(true);
  });

  it('finds nothing when the first look sees no rim', async () => {
    const run = async () => output([[0, 0.9, 0.5, 0.5, 0.05, 0.05]]);
    expect(await findRimSteady(100, 100, [() => new Uint8ClampedArray(MODEL_SIZE * MODEL_SIZE * 4)], run)).toBeNull();
  });
});

describe('model input and the runtime', () => {
  it('turns pixels into normalised RGB planes', () => {
    const px = new Uint8ClampedArray(MODEL_SIZE * MODEL_SIZE * 4).fill(255);
    const input = toInput(px);
    expect(input.length).toBe(3 * MODEL_SIZE * MODEL_SIZE);
    expect(input[0]).toBeCloseTo((1 - 0.485) / 0.229);
    expect(input[2 * MODEL_SIZE * MODEL_SIZE]).toBeCloseTo((1 - 0.406) / 0.225);
  });

  it('fetches the runtime wasm for the version the app is built with', () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.dependencies['onnxruntime-web']).toBe(RUNTIME_VERSION);
  });

  it('takes the middle of each end separately', () => {
    const at = (x: number) => ({ left: { x, y: 0.5 }, right: { x: x + 0.1, y: 0.5 }, score: 0.9, refined: true });
    expect(medianRim([at(0.4), at(0.9), at(0.41)])!.left.x).toBeCloseTo(0.41);
    expect(medianRim([])).toBeNull();
  });
});
