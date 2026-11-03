// src/lib/video/rimModel.worker.ts
// Runs the rim detector (rimFinder.ts) in a worker: each look takes a second
// or more on a phone, and on the main thread the camera picture would freeze.
// The model is fetched once and kept in the Cache API, so the 36 MB download
// happens on first use only and finding works offline after.
//
// The runtime is loaded from the CDN when the first message arrives, not
// imported. Imported, the production build (Turbopack) made this worker an
// async module that never finished starting: its message handler was never
// set, nothing was ever answered, and "Find the hoop" spun for ever on the
// live site (3 Nov 2026). Nothing here may be awaited before the handler is
// set, and the worker says it is alive as soon as it is.
import type * as Ort from 'onnxruntime-web';
import type { FromRimWorker, ToRimWorker } from './rimModel';

const scope = self as unknown as {
  postMessage(message: FromRimWorker, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ToRimWorker>) => void) | null;
};

let ort: typeof Ort | null = null;
let session: Ort.InferenceSession | null = null;

async function runtime(version: string): Promise<typeof Ort> {
  if (ort) return ort;
  const base = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;
  // Ignored by both bundlers: fetched at run time, the version the app was built with
  ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${base}ort.wasm.min.mjs`)) as typeof Ort;
  ort.env.wasm.wasmPaths = base;
  // One thread: the app is not cross-origin isolated
  ort.env.wasm.numThreads = 1;
  return ort;
}

async function modelBytes(url: string, cacheName: string, expected: number): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (hit) {
      scope.postMessage({ type: 'progress', fraction: 1 });
      return await hit.arrayBuffer();
    }
  } catch {
    // No Cache API here (private mode): fetch every time
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || expected;
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  let told = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    const pct = Math.floor((loaded / total) * 100);
    if (pct !== told) {
      told = pct;
      scope.postMessage({ type: 'progress', fraction: Math.min(1, loaded / total) });
    }
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  try {
    await cache?.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }));
  } catch {
    // Storage full or refused: it works, it just downloads again next time
  }
  return bytes.buffer;
}

scope.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      const [rt, bytes] = await Promise.all([runtime(msg.runtimeVersion), modelBytes(msg.url, msg.cacheName, msg.expectedBytes)]);
      scope.postMessage({ type: 'preparing' });
      session = await rt.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      scope.postMessage({ type: 'ready' });
    } else if (msg.type === 'run') {
      if (!session || !ort) throw new Error('model not loaded');
      const input = new ort.Tensor('float32', new Float32Array(msg.buffer), [1, 3, msg.size, msg.size]);
      const res = await session.run({ [session.inputNames[0]]: input });
      const detsName = session.outputNames.find((n) => n.includes('det')) ?? session.outputNames[0];
      const labelsName = session.outputNames.find((n) => n.includes('label')) ?? session.outputNames[1];
      const dets = res[detsName];
      const labels = res[labelsName];
      const detsData = new Float32Array(dets.data as Float32Array);
      const labelsData = new Float32Array(labels.data as Float32Array);
      scope.postMessage(
        { type: 'result', id: msg.id, dets: detsData.buffer, labels: labelsData.buffer, queries: dets.dims[1], classes: labels.dims[2] },
        [detsData.buffer, labelsData.buffer]
      );
    }
  } catch (err) {
    scope.postMessage({ type: 'failed', id: msg.type === 'run' ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};

// Set up: the page waits for this before sending anything (rimModel.ts)
scope.postMessage({ type: 'alive' });
