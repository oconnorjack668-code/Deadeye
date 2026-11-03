// src/lib/video/rimModel.ts
// The rim detector in the browser: loads it in a worker (rimModel.worker.ts)
// and hands rimFinder.ts a RunModel, plus the pictures to run it on.
//
// Every stage has a time limit and says where it is. The first live version
// had neither: when the worker never started on the production build, the
// button span for ever with nothing to say why.
import { MODEL_SIZE, type ModelOutput, type Region, type RunModel, type SampleRegion } from './rimFinder';

/** The int8 copy from the training notebook (ml/rim-detector), same finds as the full one at a third of the size. */
export const RIM_MODEL_URL = '/models/rim-detector-int8.onnx';
export const RIM_MODEL_BYTES = 35_657_994;
/** Kept by the service worker across updates (public/sw.js). */
export const MODEL_CACHE = 'deadeye-models-v1';
/** Must match onnxruntime-web in package.json: the runtime is fetched for this version. */
export const RUNTIME_VERSION = '1.30.0';

/** Longest waits, ms: for the worker to start, for the download to move, for the model to be ready, for one look. */
export const LIMITS = { start: 15_000, stalled: 45_000, prepare: 120_000, look: 60_000 };

export type ToRimWorker =
  | { type: 'load'; url: string; cacheName: string; expectedBytes: number; runtimeVersion: string }
  | { type: 'run'; id: number; buffer: ArrayBuffer; size: number };

export type FromRimWorker =
  | { type: 'alive' }
  | { type: 'progress'; fraction: number }
  | { type: 'preparing' }
  | { type: 'ready' }
  | { type: 'result'; id: number; dets: ArrayBuffer; labels: ArrayBuffer; queries: number; classes: number }
  | { type: 'failed'; id?: number; message: string };

/** Where loading has got to, for the button. */
export type RimStage = { stage: 'starting' } | { stage: 'downloading'; fraction: number } | { stage: 'preparing' };

/** A failure that says which stage it happened in, for the player and the error log. */
export class RimFinderError extends Error {
  constructor(
    readonly stage: 'start' | 'download' | 'prepare' | 'look',
    message: string
  ) {
    super(message);
    this.name = 'RimFinderError';
  }
}

/** Whether the model is already on this phone, so no download is needed. */
export async function rimModelCached(): Promise<boolean> {
  try {
    const cache = await caches.open(MODEL_CACHE);
    return !!(await cache.match(RIM_MODEL_URL));
  } catch {
    return false;
  }
}

export interface RimModel {
  run: RunModel;
  dispose(): void;
}

/** Loads the model, reporting each stage; rejects with a RimFinderError when a stage fails or stalls. */
export function loadRimModel(onStage: (s: RimStage) => void): Promise<RimModel> {
  return new Promise((resolve, reject) => {
    onStage({ stage: 'starting' });
    let worker: Worker;
    try {
      worker = new Worker(new URL('./rimModel.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(new RimFinderError('start', err instanceof Error ? err.message : 'worker could not be made'));
      return;
    }
    let nextId = 1;
    const pending = new Map<number, { resolve: (o: ModelOutput) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    let settled = false;
    let stage: RimFinderError['stage'] = 'start';
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fail = (why: string) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      worker.terminate();
      reject(new RimFinderError(stage, why));
    };
    /** (Re)starts the current stage's time limit. */
    const wait = (ms: number, why: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fail(why), ms);
    };

    const model: RimModel = {
      run(input) {
        const id = nextId++;
        return new Promise<ModelOutput>((res, rej) => {
          const t = setTimeout(() => {
            pending.delete(id);
            rej(new RimFinderError('look', `a look took over ${LIMITS.look / 1000}s`));
          }, LIMITS.look);
          pending.set(id, { resolve: res, reject: rej, timer: t });
          const copy = new Float32Array(input);
          worker.postMessage({ type: 'run', id, buffer: copy.buffer, size: MODEL_SIZE } satisfies ToRimWorker, [copy.buffer]);
        });
      },
      dispose() {
        worker.terminate();
        for (const p of pending.values()) {
          clearTimeout(p.timer);
          p.reject(new Error('stopped'));
        }
        pending.clear();
      },
    };

    worker.onmessage = (e: MessageEvent<FromRimWorker>) => {
      const msg = e.data;
      if (msg.type === 'alive') {
        stage = 'download';
        onStage({ stage: 'downloading', fraction: 0 });
        wait(LIMITS.stalled, 'the download stopped');
        worker.postMessage({ type: 'load', url: RIM_MODEL_URL, cacheName: MODEL_CACHE, expectedBytes: RIM_MODEL_BYTES, runtimeVersion: RUNTIME_VERSION } satisfies ToRimWorker);
      } else if (msg.type === 'progress') {
        onStage({ stage: 'downloading', fraction: msg.fraction });
        wait(LIMITS.stalled, 'the download stopped');
      } else if (msg.type === 'preparing') {
        stage = 'prepare';
        onStage({ stage: 'preparing' });
        wait(LIMITS.prepare, `getting ready took over ${LIMITS.prepare / 1000}s`);
      } else if (msg.type === 'ready') {
        if (timer) clearTimeout(timer);
        settled = true;
        resolve(model);
      } else if (msg.type === 'result') {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (p) clearTimeout(p.timer);
        p?.resolve({ dets: new Float32Array(msg.dets), labels: new Float32Array(msg.labels), queries: msg.queries, classes: msg.classes });
      } else if (msg.type === 'failed') {
        if (msg.id !== undefined) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (p) clearTimeout(p.timer);
          p?.reject(new RimFinderError('look', msg.message));
        } else {
          fail(msg.message);
        }
      }
    };
    worker.onerror = (e) => fail(e.message || 'the worker failed');
    wait(LIMITS.start, `the finder did not start within ${LIMITS.start / 1000}s`);
  });
}

/** A still of the video as it is now, at full size, so several moments can be looked at after. */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas;
}

/** Draws a region of a still at the model's size, smoothed the way the bench's resampling is. */
export function sampler(still: HTMLCanvasElement): SampleRegion {
  const out = document.createElement('canvas');
  out.width = MODEL_SIZE;
  out.height = MODEL_SIZE;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return (r: Region) => {
    ctx.drawImage(still, r.sx, r.sy, r.sw, r.sh, 0, 0, MODEL_SIZE, MODEL_SIZE);
    return ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
  };
}
