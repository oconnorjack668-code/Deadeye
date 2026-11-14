// src/lib/video/trackerEngine.ts
// Runs the tracker's pixel work off the main thread, in a worker, where the
// browser allows it, and on the main thread where it does not.
//
// The tracker scores every frame in the time the next one takes to arrive,
// and on a phone the main thread is also painting the video, the overlay and
// React. When the work did not fit, frames went unscored and the workload
// (workload.ts) gave the phone a smaller picture of the hoop to work on. In a
// worker the pixel work has a core to itself, so more phones keep the full
// picture at the full 30 frames a second.
//
// The main thread still draws each frame's hoop crop (only it can read the
// video) and hands the pixels over without copying them. Frames are processed
// in order, as the tracker needs. When the worker falls behind, new frames are
// not queued without end - the main thread simply does not send them, which
// the workload sees as skipped frames and answers as it always has.
import { createPipeline, type PipelineConfig, type PipelineFrame } from './trackerPipeline';
import type { DetectedShot } from './shotDetector';

/** Frames sent and not yet answered before new ones are dropped: one being worked on, one waiting. */
export const MAX_IN_FLIGHT = 2;

/** How long to wait for the worker to call the last shot when a run ends. */
const FINISH_TIMEOUT_MS = 2000;

export type ToWorker =
  | { type: 'start'; config: PipelineConfig }
  | { type: 'frame'; buffer: ArrayBuffer; px: number; t: number }
  | { type: 'finish' }
  | { type: 'reset-shift' };

export type FromWorker =
  | { type: 'frame'; result: PipelineFrame }
  | { type: 'finished'; shots: DetectedShot[] }
  | { type: 'failed'; message: string };

export interface TrackerEngine {
  /** Whether the work is running in a worker. */
  readonly inWorker: () => boolean;
  /** Too many frames waiting: skip this one. */
  busy(): boolean;
  /** Hands over a frame's pixels. The array must not be used again afterwards. */
  push(pixels: Uint8ClampedArray, px: number, t: number): void;
  /** Calls what is still being judged, once every frame sent has been scored: the shots that decided, oldest first. */
  finish(): Promise<DetectedShot[]>;
  resetShift(): void;
  dispose(): void;
}

/** The pipeline on this thread: each frame is answered before push returns. */
export function createInlineEngine(config: PipelineConfig, onFrame: (r: PipelineFrame) => void): TrackerEngine {
  const pipeline = createPipeline(config);
  return {
    inWorker: () => false,
    busy: () => false,
    push: (pixels, px, t) => onFrame(pipeline.frame(pixels, px, t)),
    finish: async () => pipeline.finish(),
    resetShift: () => pipeline.resetShift(),
    dispose: () => undefined,
  };
}

/**
 * The pipeline in a worker, falling back to this thread if the worker cannot
 * start or fails part way. A failure part way loses the shot being judged at
 * that moment and nothing already called.
 */
export function createEngine(config: PipelineConfig, onFrame: (r: PipelineFrame) => void, onFallback?: () => void): TrackerEngine {
  let worker: Worker | null = null;
  try {
    if (typeof Worker !== 'undefined') {
      worker = new Worker(new URL('./tracker.worker.ts', import.meta.url), { type: 'module' });
    }
  } catch {
    worker = null;
  }
  if (!worker) return createInlineEngine(config, onFrame);

  let inFlight = 0;
  let fallback: TrackerEngine | null = null;
  let finishing: ((shots: DetectedShot[]) => void) | null = null;

  const fail = () => {
    if (fallback) return;
    worker?.terminate();
    worker = null;
    inFlight = 0;
    fallback = createInlineEngine(config, onFrame);
    onFallback?.();
    // A finish waiting on the worker will not be answered now
    finishing?.([]);
    finishing = null;
  };

  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const msg = e.data;
    if (msg.type === 'frame') {
      inFlight = Math.max(0, inFlight - 1);
      onFrame(msg.result);
    } else if (msg.type === 'finished') {
      finishing?.(msg.shots);
      finishing = null;
    } else if (msg.type === 'failed') {
      fail();
    }
  };
  worker.onerror = (e) => {
    e.preventDefault();
    fail();
  };
  worker.postMessage({ type: 'start', config } satisfies ToWorker);

  return {
    inWorker: () => fallback === null,
    busy: () => (fallback ? false : inFlight >= MAX_IN_FLIGHT),
    push(pixels, px, t) {
      if (fallback) return fallback.push(pixels, px, t);
      inFlight++;
      const buffer = pixels.buffer as ArrayBuffer;
      worker!.postMessage({ type: 'frame', buffer, px, t } satisfies ToWorker, [buffer]);
    },
    finish() {
      if (fallback) return fallback.finish();
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          finishing = null;
          resolve([]);
        }, FINISH_TIMEOUT_MS);
        finishing = (shots) => {
          clearTimeout(timer);
          resolve(shots);
        };
        worker!.postMessage({ type: 'finish' } satisfies ToWorker);
      });
    },
    resetShift() {
      if (fallback) return fallback.resetShift();
      worker!.postMessage({ type: 'reset-shift' } satisfies ToWorker);
    },
    dispose() {
      worker?.terminate();
      worker = null;
      fallback?.dispose();
    },
  };
}
