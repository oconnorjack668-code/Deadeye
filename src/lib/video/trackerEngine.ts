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
// video) and hands the pixels over without copying them. Or, where the
// browser can (pushBitmap), it asks the graphics chip for the crop already
// shrunk and hands that over, and the worker reads its pixels back: reading a
// video frame back on the main thread took 11 ms of every 33 on the bench
// laptop, six times the tracker's own work, and froze the screen while it did. Frames are processed
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
  | { type: 'bitmap'; bitmap: ImageBitmap; px: number; t: number }
  | { type: 'decode'; file: Blob; px: number }
  | { type: 'finish' }
  | { type: 'reset-shift' };

export type FromWorker =
  | { type: 'frame'; result: PipelineFrame }
  | { type: 'finished'; shots: DetectedShot[] }
  | { type: 'decode-progress'; t: number; durationMs: number }
  | { type: 'decoded'; frames: number; durationMs: number }
  | { type: 'decode-failed'; message: string; frames: number }
  | { type: 'failed'; message: string };

export interface TrackerEngine {
  /** Whether the work is running in a worker. */
  readonly inWorker: () => boolean;
  /** Too many frames waiting: skip this one. */
  busy(): boolean;
  /** Hands over a frame's pixels. The array must not be used again afterwards. */
  push(pixels: Uint8ClampedArray, px: number, t: number): void;
  /** Whether pushBitmap can be used: a worker is running and can read a bitmap back. */
  takesBitmaps(): boolean;
  /** Hands over a frame's hoop crop, already px square, as a bitmap the worker reads back. It is closed after use. */
  pushBitmap(bitmap: ImageBitmap, px: number, t: number): void;
  /** Whether decodeFile can be used: a worker is running and this browser has WebCodecs (clipDecoder.ts). */
  takesFiles(): boolean;
  /**
   * Has the worker decode an uploaded clip and score every frame, as fast as
   * it can, instead of frames being pushed (clipDecoder.ts). Frame results
   * arrive through onFrame as usual; finish() still calls the last shot.
   */
  decodeFile(file: Blob, px: number, events: DecodeEvents): void;
  /** Calls what is still being judged, once every frame sent has been scored: the shots that decided, oldest first. */
  finish(): Promise<DetectedShot[]>;
  resetShift(): void;
  dispose(): void;
}

export interface DecodeEvents {
  onProgress(t: number, durationMs: number): void;
  /** Every frame has been scored. */
  onDone(frames: number, durationMs: number): void;
  /** It could not decode the clip; `frames` were scored before it stopped. */
  onFailed(message: string, frames: number): void;
}

/** The pipeline on this thread: each frame is answered before push returns. */
export function createInlineEngine(config: PipelineConfig, onFrame: (r: PipelineFrame) => void): TrackerEngine {
  const pipeline = createPipeline(config);
  return {
    inWorker: () => false,
    busy: () => false,
    push: (pixels, px, t) => onFrame(pipeline.frame(pixels, px, t)),
    takesBitmaps: () => false,
    pushBitmap: (bitmap) => bitmap.close(),
    takesFiles: () => false,
    decodeFile: (_file, _px, events) => events.onFailed('Decoding needs the worker', 0),
    finish: async () => pipeline.finish(),
    resetShift: () => pipeline.resetShift(),
    dispose: () => undefined,
  };
}

/**
 * Whether this browser can crop and shrink a video frame into a bitmap and a
 * worker can read it back: createImageBitmap, and OffscreenCanvas with a 2d
 * context (Safari from 16.4). Checked here; a worker on a browser that has it
 * here has it too.
 */
export function bitmapsWork(): boolean {
  try {
    return typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined' && new OffscreenCanvas(1, 1).getContext('2d') !== null;
  } catch {
    return false;
  }
}

/**
 * Whether this browser can decode an uploaded clip in the worker
 * (clipDecoder.ts): WebCodecs' VideoDecoder, and what bitmapsWork needs to cut
 * and read each frame. Kept here, not in clipDecoder.ts, so that the page does
 * not load the clip reader (mp4box) just to ask. Whether a given clip's format
 * decodes is only known once its file is open.
 */
export function decodeWorks(): boolean {
  return typeof VideoDecoder !== 'undefined' && typeof EncodedVideoChunk !== 'undefined' && bitmapsWork();
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
  let decoding: DecodeEvents | null = null;

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
    decoding?.onFailed('The worker stopped', 0);
    decoding = null;
  };

  worker.onmessage = (e: MessageEvent<FromWorker>) => {
    const msg = e.data;
    if (msg.type === 'frame') {
      inFlight = Math.max(0, inFlight - 1);
      onFrame(msg.result);
    } else if (msg.type === 'finished') {
      finishing?.(msg.shots);
      finishing = null;
    } else if (msg.type === 'decode-progress') {
      decoding?.onProgress(msg.t, msg.durationMs);
    } else if (msg.type === 'decoded') {
      decoding?.onDone(msg.frames, msg.durationMs);
      decoding = null;
    } else if (msg.type === 'decode-failed') {
      decoding?.onFailed(msg.message, msg.frames);
      decoding = null;
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
    takesBitmaps: () => fallback === null && bitmapsWork(),
    takesFiles: () => fallback === null && decodeWorks(),
    decodeFile(file, px, events) {
      if (fallback) return fallback.decodeFile(file, px, events);
      decoding = events;
      worker!.postMessage({ type: 'decode', file, px } satisfies ToWorker);
    },
    pushBitmap(bitmap, px, t) {
      if (fallback) return fallback.pushBitmap(bitmap, px, t);
      inFlight++;
      worker!.postMessage({ type: 'bitmap', bitmap, px, t } satisfies ToWorker, [bitmap]);
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
