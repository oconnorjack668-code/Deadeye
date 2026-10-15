// __tests__/clipBench.test.ts
// Runs the real tracker over a real clip, headlessly, with ffmpeg decoding the
// frames. Skipped unless pointed at a clip, so the normal gates are untouched.
//
//   $env:DEADEYE_BENCH_CLIP = "C:\path\to\clip.mp4"
//   $env:DEADEYE_BENCH_RIM  = "0.5253,0.2194,0.5865,0.1991"   # two taps, x,y,x,y
//   $env:DEADEYE_BENCH_FFMPEG = "C:\path\to\ffmpeg.exe"       # optional
//   npx vitest run __tests__/clipBench.test.ts
//
// Exists because every measurement so far has needed a browser, a person and
// several minutes. The tracker is pure functions over pixels, so it does not
// need any of that, and a measurement that can be repeated in one command is
// worth far more than one that cannot.
import { describe, it, expect, vi } from 'vitest';
import { spawnSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { expectedBallDiameter } from '@/lib/video/motionBall';
import { createBallTracker } from '@/lib/video/ballTracker';
import { cropRectFor, ballCentreInFrame, CROP_CANVAS_PX } from '@/lib/video/crop';
import { ShotDetector, rimFromEdges } from '@/lib/video/shotDetector';

vi.setConfig({ testTimeout: 1_800_000 });

const CLIP = process.env.DEADEYE_BENCH_CLIP;
const FFMPEG = process.env.DEADEYE_BENCH_FFMPEG || 'ffmpeg';
const RIM = process.env.DEADEYE_BENCH_RIM;
const LOST_BALL_MS = 1500;

function videoInfo(ffmpeg: string, clip: string) {
  // ffmpeg reports the stream on stderr and exits non-zero with no output file,
  // which is expected here - the point is the header, not a conversion.
  const out = spawnSync(ffmpeg, ['-hide_banner', '-i', clip], { encoding: 'utf8' });
  const text = `${out.stderr || ''}${out.stdout || ''}`;
  const size = text.match(/,\s(\d{2,5})x(\d{2,5})[,\s]/);
  const fps = text.match(/([\d.]+)\sfps/);
  if (!size) throw new Error(`Could not read the video size from ffmpeg:\n${text.slice(0, 600)}`);
  return {
    width: Number(size[1]),
    height: Number(size[2]),
    fps: fps ? Number(fps[1]) : 30,
  };
}

/** Streams the hoop crop as raw RGBA, handing each frame to `onFrame`. */
function eachFrame(
  ffmpeg: string,
  clip: string,
  crop: { sx: number; sy: number; side: number },
  onFrame: (pixels: Uint8ClampedArray, index: number) => void
): Promise<number> {
  const side = Math.round(crop.side);
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', clip,
    '-vf', `crop=${side}:${side}:${Math.round(crop.sx)}:${Math.round(crop.sy)},scale=${CROP_CANVAS_PX}:${CROP_CANVAS_PX}`,
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-',
  ];
  const frameBytes = CROP_CANVAS_PX * CROP_CANVAS_PX * 4;

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    // Frames are processed as they arrive and dropped: holding all of them
    // would be 631MB on a 51 second clip.
    let pending = new Uint8Array(0);
    let index = 0;
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      if (pending.length) {
        const merged = new Uint8Array(pending.length + chunk.length);
        merged.set(pending);
        merged.set(chunk, pending.length);
        pending = merged;
      } else {
        pending = new Uint8Array(chunk);
      }
      while (pending.length >= frameBytes) {
        // Copies, which it must: the tracker keeps previous frames to compare
        onFrame(new Uint8ClampedArray(pending.subarray(0, frameBytes)), index++);
        pending = pending.subarray(frameBytes);
      }
    });
    proc.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0 && index === 0) reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(0, 400)}`));
      else resolve(index);
    });
  });
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

describe.skipIf(!CLIP || !RIM)('motion tracker over a real clip', () => {
  it('reports what it found', async () => {
    if (!CLIP || !RIM) return;
    expect(existsSync(CLIP), `clip not found: ${CLIP}`).toBe(true);

    const [ax, ay, bx, by] = RIM.split(',').map(Number);
    const rim = rimFromEdges({ x: ax, y: ay }, { x: bx, y: by });
    const { width, height, fps } = videoInfo(FFMPEG, CLIP);
    const crop = cropRectFor(rim, width, height);
    // The rim is measured in frame pixels; the tracker works in the crop canvas
    const rimOnCanvas = rim.width * width * (CROP_CANVAS_PX / crop.side);
    const expectedDiameter = expectedBallDiameter(rimOnCanvas);

    const shotDetector = new ShotDetector(rim);
    const scores: number[] = [];
    let framesWithBall = 0;
    let maxGapMs = 0;
    let gapsOverLimit = 0;
    let lastBallMs: number | null = null;
    const startedAt = Date.now();

    const learnColour = process.env.DEADEYE_BENCH_LEARN === '1';
    const tracker = createBallTracker({ expectedDiameter, learn: learnColour });

    /** Scores one frame against its neighbours and feeds the shot detector. */
    const measure = (
      prev: Uint8ClampedArray,
      cur: Uint8ClampedArray,
      index: number,
      next?: Uint8ClampedArray
    ) => {
      const videoMs = (index * 1000) / fps;
      const found = tracker.track(prev, cur, CROP_CANVAS_PX, CROP_CANVAS_PX, next);
      if (!found) {
        shotDetector.push({ t: videoMs, ball: null });
        return;
      }
      framesWithBall++;
      scores.push(found.score);
      if (lastBallMs !== null) {
        const gap = videoMs - lastBallMs;
        if (gap > maxGapMs) maxGapMs = gap;
        if (gap > LOST_BALL_MS) gapsOverLimit++;
      }
      lastBallMs = videoMs;
      const box = {
        originX: found.x - found.diameter / 2,
        originY: found.y - found.diameter / 2,
        width: found.diameter,
        height: found.diameter,
      };
      shotDetector.push({ t: videoMs, ball: ballCentreInFrame(box, crop, width, height) });
    };

    // Three-frame differencing reports where the ball is rather than where it
    // was and is, at one frame of lag, so the middle frame is the one measured.
    const threeFrame = process.env.DEADEYE_BENCH_3FRAME === '1';
    let f0: Uint8ClampedArray | null = null;
    let f1: Uint8ClampedArray | null = null;

    const frames = await eachFrame(FFMPEG, CLIP, crop, (pixels, index) => {
      if (threeFrame) {
        if (f0 && f1) measure(f0, f1, index - 1, pixels);
        f0 = f1;
        f1 = pixels;
      } else {
        if (f1) measure(f1, pixels, index);
        f1 = pixels;
      }
    });

    const shots = shotDetector.shots;
    const lines = [
      '',
      `clip            ${CLIP}`,
      `video           ${width}x${height} @ ${fps}fps`,
      `rim             x=${rim.x.toFixed(4)} y=${rim.y.toFixed(4)} width=${rim.width.toFixed(4)} tilt=${(rim.tilt ?? 0).toFixed(3)}`,
      `crop            ${Math.round(crop.side)}px at (${Math.round(crop.sx)}, ${Math.round(crop.sy)}), ball expected ${expectedDiameter.toFixed(1)}px of ${CROP_CANVAS_PX}`,
      `differencing    ${threeFrame ? 'three frame' : 'two frame'}`,
      `colour          ${
        learnColour
          ? tracker.colour()
            ? `learned rgb(${Math.round(tracker.colour()!.r)}, ${Math.round(tracker.colour()!.g)}, ${Math.round(tracker.colour()!.b)}) from ${tracker.samples()} samples`
            : `learning, only ${tracker.samples()} samples`
          : 'not used'
      }`,
      `frames          ${frames}`,
      `ball found in   ${framesWithBall} (${((framesWithBall / Math.max(frames, 1)) * 100).toFixed(1)}%)`,
      `ball-likeness   median ${median(scores).toFixed(3)}, best ${scores.length ? Math.max(...scores).toFixed(3) : '-'}`,
      `longest gap     ${Math.round(maxGapMs)} ms`,
      `gaps > ${LOST_BALL_MS}ms   ${gapsOverLimit}`,
      `shots called    ${shots.length} (${shots.filter((s) => s.made).length} made, ${shots.filter((s) => !s.confident).length} inferred)`,
      ...shots.map((s) => `  ${(s.t / 1000).toFixed(1)}s ${s.made ? 'MAKE' : 'MISS'}${s.confident ? '' : ' (inferred)'}`),
      `took            ${((Date.now() - startedAt) / 1000).toFixed(0)}s`,
      '',
    ];
    const text = lines.join('\n');
    console.log(text);
    // Vitest can swallow console output depending on reporter; a file always
    // survives, and makes runs easy to keep and compare.
    if (process.env.DEADEYE_BENCH_OUT) writeFileSync(process.env.DEADEYE_BENCH_OUT, text, 'utf8');

    expect(frames).toBeGreaterThan(0);
  });
});
