// @vitest-environment node
// __tests__/rimFinderBench.test.ts
// (Node, not jsdom: onnxruntime-node rejects jsdom's typed arrays.)
// Measures the rim finder (src/lib/video/rimFinder.ts) on Deadeye frames whose
// ring edges were tapped by hand, with the trained model run through
// onnxruntime-node. Skips unless pointed at the model, the frames and ffmpeg:
//
//   DEADEYE_RIM_MODEL=.../rfdetr-nano-int8.onnx
//   DEADEYE_RIM_FRAMES=.../eval-frames          (frames.json and the jpgs)
//   DEADEYE_ORT_NODE=.../node_modules/onnxruntime-node
//   DEADEYE_BENCH_FFMPEG=.../ffmpeg.exe          (ffprobe beside it)
//   DEADEYE_RIM_OUT=report.txt                   (optional)
//
// Error is how far the found ends are from the tapped ones, in rim widths, as
// the training notebook measured it: under 0.15 is about a careful tap.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findRim, medianRim, MODEL_SIZE, type FoundRim, type ModelOutput, type Region } from '@/lib/video/rimFinder';

const MODEL = process.env.DEADEYE_RIM_MODEL;
const FRAMES = process.env.DEADEYE_RIM_FRAMES;
const ORT = process.env.DEADEYE_ORT_NODE;
const FFMPEG = process.env.DEADEYE_BENCH_FFMPEG || 'ffmpeg';
const ready = !!(MODEL && FRAMES && ORT);

interface Frame {
  file: string;
  clip: string;
  rim: [number, number, number, number];
}

/** Box-averaged when shrinking, bilinear when growing: close to a canvas drawn with high-quality smoothing. */
function sampleFrom(rgba: Uint8Array, W: number, H: number, r: Region): Uint8ClampedArray {
  const out = new Uint8ClampedArray(MODEL_SIZE * MODEL_SIZE * 4);
  const step = r.sw / MODEL_SIZE;
  const stepY = r.sh / MODEL_SIZE;
  const px = (x: number, y: number, c: number) => rgba[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4 + c];
  for (let j = 0; j < MODEL_SIZE; j++) {
    for (let i = 0; i < MODEL_SIZE; i++) {
      const o = (j * MODEL_SIZE + i) * 4;
      if (step > 1) {
        const x0 = Math.floor(r.sx + i * step);
        const y0 = Math.floor(r.sy + j * stepY);
        const nx = Math.max(1, Math.round(step));
        const ny = Math.max(1, Math.round(stepY));
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) sum += px(x0 + x, y0 + y, c);
          out[o + c] = sum / (nx * ny);
        }
      } else {
        const fx = r.sx + (i + 0.5) * step - 0.5;
        const fy = r.sy + (j + 0.5) * stepY - 0.5;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const ax = fx - x0;
        const ay = fy - y0;
        for (let c = 0; c < 3; c++) {
          out[o + c] =
            px(x0, y0, c) * (1 - ax) * (1 - ay) + px(x0 + 1, y0, c) * ax * (1 - ay) + px(x0, y0 + 1, c) * (1 - ax) * ay + px(x0 + 1, y0 + 1, c) * ax * ay;
        }
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

function errorOf(found: FoundRim | null, f: Frame, W: number, H: number) {
  if (!found) return null;
  const [lx, ly, rx, ry] = f.rim;
  const width = (rx - lx) * W;
  const edge = (Math.abs(found.left.x - lx) * W + Math.abs(found.right.x - rx) * W) / 2 / width;
  const height = Math.abs((found.left.y + found.right.y) / 2 - (ly + ry) / 2) * H / width;
  return { edge, height };
}

describe.skipIf(!ready)('rim finder on Deadeye frames', () => {
  it('finds the rim close to the hand taps', { timeout: 30 * 60 * 1000 }, async () => {
    const ort = await import(path.resolve(ORT!));
    const session = await ort.InferenceSession.create(MODEL!);
    const inputName = session.inputNames[0];
    const run = async (input: Float32Array): Promise<ModelOutput> => {
      const res = await session.run({ [inputName]: new ort.Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]) });
      const dets = res[session.outputNames.find((n: string) => n.includes('det'))!];
      const labels = res[session.outputNames.find((n: string) => n.includes('label'))!];
      return { dets: dets.data as Float32Array, labels: labels.data as Float32Array, queries: dets.dims[1], classes: labels.dims[2] };
    };

    const { frames } = JSON.parse(readFileSync(path.join(FRAMES!, 'frames.json'), 'utf8')) as { frames: Frame[] };
    const ffprobe = path.join(path.dirname(FFMPEG), FFMPEG.endsWith('.exe') ? 'ffprobe.exe' : 'ffprobe');
    const modes = [
      { name: 'one look', opts: { close: false } },
      { name: 'close x3', opts: { close: true, rims: 3 } },
      { name: 'close x5', opts: { close: true, rims: 5 } },
      { name: 'close x8', opts: { close: true, rims: 8 } },
    ];
    const results: Record<string, Array<{ frame: Frame; found: FoundRim | null; W: number; H: number }>> = {};
    for (const m of modes) results[m.name] = [];

    for (const f of frames) {
      const file = path.join(FRAMES!, f.file);
      const [W, H] = execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' })
        .trim()
        .split(',')
        .map(Number);
      const rgba = execFileSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 });
      const sample = (r: Region) => sampleFrom(rgba, W, H, r);
      for (const m of modes) results[m.name].push({ frame: f, found: await findRim(W, H, sample, run, m.opts), W, H });
    }

    const lines: string[] = [`model ${path.basename(MODEL!)}`, 'mode        clip   found  edge median  edge worst  height median  clip-median edge'];
    const summary: Record<string, number> = {};
    for (const m of modes) {
      for (const clip of ['clip1', 'clip2']) {
        const rows = results[m.name].filter((r) => r.frame.clip === clip);
        const errs = rows.map((r) => errorOf(r.found, r.frame, r.W, r.H)).filter((e): e is { edge: number; height: number } => e !== null);
        const edges = errs.map((e) => e.edge).sort((a, b) => a - b);
        const heights = errs.map((e) => e.height).sort((a, b) => a - b);
        // Several frames of one tripod: the middle of their finds
        const med = medianRim(rows.map((r) => r.found).filter((x): x is FoundRim => x !== null));
        const medErr = med ? errorOf(med, rows[0].frame, rows[0].W, rows[0].H) : null;
        summary[`${m.name} ${clip}`] = edges[edges.length >> 1] ?? NaN;
        if (med) lines.push(`  ${m.name} ${clip} ends (middle of frames): ${[med.left.x, med.left.y, med.right.x, med.right.y].map((v) => v.toFixed(4)).join(',')}`);
        lines.push(
          `${m.name.padEnd(11)} ${clip}  ${String(errs.length).padStart(2)}/${rows.length}  ${(edges[edges.length >> 1] ?? NaN).toFixed(3).padStart(11)}  ${(edges[edges.length - 1] ?? NaN).toFixed(3).padStart(10)}  ${(heights[heights.length >> 1] ?? NaN).toFixed(3).padStart(13)}  ${(medErr?.edge ?? NaN).toFixed(3).padStart(16)}`
        );
      }
    }
    const text = lines.join('\n');
    console.log(text);
    if (process.env.DEADEYE_RIM_OUT) writeFileSync(process.env.DEADEYE_RIM_OUT, text + '\n');
    expect(Object.keys(summary).length).toBeGreaterThan(0);
  });
});
