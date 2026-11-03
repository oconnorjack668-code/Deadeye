// src/lib/video/rimModel.worker.ts
// Runs the rim detector (rimFinder.ts) in a worker: each look takes a second
// or more on a phone, and on the main thread the camera picture would freeze.
// The model is fetched once and kept in the Cache API, so the 36 MB download
// happens on first use only and finding works offline after.
import * as ort from 'onnxruntime-web/wasm';
import type { FromRimWorker, ToRimWorker } from './rimModel';

const scope = self as unknown as {
  postMessage(message: FromRimWorker, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent<ToRimWorker>) => void) | null;
};

let session: ort.InferenceSession | null = null;

async function modelBytes(url: string, cacheName: string, expected: number): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  } catch {
    // No Cache API here (private mode): fetch every time
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`model download failed (${res.status})`);
  const total = Number(res.headers.get('content-length')) || expected;
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    scope.postMessage({ type: 'progress', fraction: Math.min(1, loaded / total) });
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
      // The runtime's own wasm, from the same version on the CDN (as MediaPipe's
      // is): one thread, since the app is not cross-origin isolated
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${msg.runtimeVersion}/dist/`;
      ort.env.wasm.numThreads = 1;
      const bytes = await modelBytes(msg.url, msg.cacheName, msg.expectedBytes);
      session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      scope.postMessage({ type: 'ready' });
    } else if (msg.type === 'run') {
      if (!session) throw new Error('model not loaded');
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
