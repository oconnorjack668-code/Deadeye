// src/lib/video/tracker.worker.ts
// The shot tracker's pixel work, in a worker. See trackerEngine.ts.
import { createPipeline, type TrackerPipeline } from './trackerPipeline';
import type { FromWorker, ToWorker } from './trackerEngine';

// The DOM types are what this project compiles against; a worker's global
// only needs these two from it
const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((e: MessageEvent<ToWorker>) => void) | null;
};

let pipeline: TrackerPipeline | null = null;

scope.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'start') {
      pipeline = createPipeline(msg.config);
    } else if (msg.type === 'frame') {
      if (!pipeline) return;
      const result = pipeline.frame(new Uint8ClampedArray(msg.buffer), msg.px, msg.t);
      scope.postMessage({ type: 'frame', result });
    } else if (msg.type === 'finish') {
      scope.postMessage({ type: 'finished', shot: pipeline?.finish() ?? null });
    } else if (msg.type === 'reset-shift') {
      pipeline?.resetShift();
    }
  } catch (err) {
    scope.postMessage({ type: 'failed', message: err instanceof Error ? err.message : String(err) });
  }
};
