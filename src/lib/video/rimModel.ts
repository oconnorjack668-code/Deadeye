// src/lib/video/rimModel.ts
// The rim detector in the browser: loads it in a worker (rimModel.worker.ts)
// and hands rimFinder.ts a RunModel, plus the pictures to run it on.
import { MODEL_SIZE, type ModelOutput, type Region, type RunModel, type SampleRegion } from './rimFinder';

/** The int8 copy from the training notebook (ml/rim-detector), same finds as the full one at a third of the size. */
export const RIM_MODEL_URL = '/models/rim-detector-int8.onnx';
export const RIM_MODEL_BYTES = 35_657_994;
/** Kept by the service worker across updates (public/sw.js). */
export const MODEL_CACHE = 'deadeye-models-v1';
/** Must match onnxruntime-web in package.json: its wasm is fetched for this version. */
export const RUNTIME_VERSION = '1.30.0';

export type ToRimWorker =
  | { type: 'load'; url: string; cacheName: string; expectedBytes: number; runtimeVersion: string }
  | { type: 'run'; id: number; buffer: ArrayBuffer; size: number };

export type FromRimWorker =
  | { type: 'progress'; fraction: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; dets: ArrayBuffer; labels: ArrayBuffer; queries: number; classes: number }
  | { type: 'failed'; id?: number; message: string };

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

/** Loads the model, reporting the download as a fraction; rejects if it cannot. */
export function loadRimModel(onProgress: (fraction: number) => void): Promise<RimModel> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./rimModel.worker.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      reject(err);
      return;
    }
    let nextId = 1;
    const pending = new Map<number, { resolve: (o: ModelOutput) => void; reject: (e: Error) => void }>();
    const model: RimModel = {
      run(input) {
        const id = nextId++;
        return new Promise<ModelOutput>((res, rej) => {
          pending.set(id, { resolve: res, reject: rej });
          const copy = new Float32Array(input);
          worker.postMessage({ type: 'run', id, buffer: copy.buffer, size: MODEL_SIZE } satisfies ToRimWorker, [copy.buffer]);
        });
      },
      dispose() {
        worker.terminate();
        for (const p of pending.values()) p.reject(new Error('stopped'));
        pending.clear();
      },
    };
    let ready = false;
    worker.onmessage = (e: MessageEvent<FromRimWorker>) => {
      const msg = e.data;
      if (msg.type === 'progress') onProgress(msg.fraction);
      else if (msg.type === 'ready') {
        ready = true;
        resolve(model);
      } else if (msg.type === 'result') {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        p?.resolve({ dets: new Float32Array(msg.dets), labels: new Float32Array(msg.labels), queries: msg.queries, classes: msg.classes });
      } else if (msg.type === 'failed') {
        if (msg.id !== undefined) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          p?.reject(new Error(msg.message));
        } else if (!ready) {
          worker.terminate();
          reject(new Error(msg.message));
        }
      }
    };
    worker.onerror = (e) => {
      if (!ready) {
        worker.terminate();
        reject(new Error(e.message || 'worker failed'));
      }
    };
    worker.postMessage({ type: 'load', url: RIM_MODEL_URL, cacheName: MODEL_CACHE, expectedBytes: RIM_MODEL_BYTES, runtimeVersion: RUNTIME_VERSION } satisfies ToRimWorker);
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
