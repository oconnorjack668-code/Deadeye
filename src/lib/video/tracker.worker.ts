// src/lib/video/tracker.worker.ts
// The shot tracker's pixel work, in a worker. See trackerEngine.ts.
import { createPipeline, type TrackerPipeline } from './trackerPipeline';
import type { FromWorker, ToWorker } from './trackerEngine';
import { decodeClip, DecodeError } from './clipDecoder';
import { cropRectFor } from './crop';

// The DOM types are what this project compiles against; a worker's global
// only needs these two from it
const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};

let pipeline: TrackerPipeline | null = null;
let config: Parameters<typeof createPipeline>[0] | null = null;
// A clip being decoded stops at its next frame once this is set (clipDecoder.ts)
let stopDecoding = false;
// Where a bitmap from the main thread is drawn to read its pixels back
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

scope.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'start') {
      pipeline = createPipeline(msg.config);
      config = msg.config;
      stopDecoding = false;
    } else if (msg.type === 'frame') {
      if (!pipeline) return;
      const result = pipeline.frame(new Uint8ClampedArray(msg.buffer), msg.px, msg.t);
      scope.postMessage({ type: 'frame', result });
    } else if (msg.type === 'bitmap') {
      if (!pipeline) {
        msg.bitmap.close();
        return;
      }
      if (!canvas || canvas.width !== msg.px) {
        canvas = new OffscreenCanvas(msg.px, msg.px);
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      }
      if (!ctx) throw new Error('No 2d context for bitmaps');
      ctx.drawImage(msg.bitmap, 0, 0);
      msg.bitmap.close();
      const pixels = ctx.getImageData(0, 0, msg.px, msg.px).data;
      const result = pipeline.frame(pixels, msg.px, msg.t);
      scope.postMessage({ type: 'frame', result });
    } else if (msg.type === 'decode') {
      if (!pipeline || !config) return;
      const run = pipeline;
      const crop = cropRectFor(config.rim, config.videoWidth, config.videoHeight);
      decodeClip(msg.file, {
        videoWidth: config.videoWidth,
        videoHeight: config.videoHeight,
        crop,
        px: msg.px,
        stopped: () => stopDecoding || pipeline !== run,
        onFrame: (pixels, px, t) => scope.postMessage({ type: 'frame', result: run.frame(pixels, px, t) }),
        onProgress: (t, durationMs) => scope.postMessage({ type: 'decode-progress', t, durationMs }),
        onStage: (stage) => scope.postMessage({ type: 'decode-stage', stage }),
      })
        .then((done) => scope.postMessage({ type: 'decoded', frames: done.frames, durationMs: done.durationMs }))
        .catch((err) =>
          scope.postMessage({ type: 'decode-failed', message: err instanceof Error ? err.message : String(err), frames: err instanceof DecodeError ? err.frames : 0 })
        );
    } else if (msg.type === 'finish') {
      // A clip still being decoded stops here: the run was ended early
      stopDecoding = true;
      scope.postMessage({ type: 'finished', shots: pipeline?.finish() ?? [] });
    } else if (msg.type === 'reset-shift') {
      pipeline?.resetShift();
    }
  } catch (err) {
    scope.postMessage({ type: 'failed', message: err instanceof Error ? err.message : String(err) });
  }
};
