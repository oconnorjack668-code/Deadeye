// public/workers/rim-model.js
// The hoop finder's worker (see src/lib/video/rimModel.ts, which starts it and
// defines the messages). A plain file served as it is, not bundled: on the
// live site the bundled worker (Turbopack) was created but never ran - no
// message, no error - so "Find the hoop for me" span for ever (3 Nov 2026),
// while the same build worked locally. Served from /workers/, outside
// /_next/static/, the service worker leaves it alone too.
//
// Each look takes a second or more on a phone, so it runs here and not on the
// page. The model is fetched once and kept in the Cache API. The runtime
// (onnxruntime-web, the version the page passes) comes from the CDN.
'use strict';

let ort = null;
let session = null;

async function runtime(version) {
  if (ort) return ort;
  const base = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + version + '/dist/';
  ort = await import(base + 'ort.wasm.min.mjs');
  ort.env.wasm.wasmPaths = base;
  // One thread: the app is not cross-origin isolated
  ort.env.wasm.numThreads = 1;
  return ort;
}

async function modelBytes(url, cacheName, expected) {
  let cache = null;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (hit) {
      self.postMessage({ type: 'progress', fraction: 1 });
      return await hit.arrayBuffer();
    }
  } catch {
    // No Cache API here (private mode): fetch every time
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error('model download failed (' + res.status + ')');
  const total = Number(res.headers.get('content-length')) || expected;
  const reader = res.body.getReader();
  const parts = [];
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
      self.postMessage({ type: 'progress', fraction: Math.min(1, loaded / total) });
    }
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.length;
  }
  try {
    if (cache) await cache.put(url, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }));
  } catch {
    // Storage full or refused: it works, it just downloads again next time
  }
  return bytes.buffer;
}

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'load') {
      const [rt, bytes] = await Promise.all([runtime(msg.runtimeVersion), modelBytes(msg.url, msg.cacheName, msg.expectedBytes)]);
      self.postMessage({ type: 'preparing' });
      session = await rt.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      self.postMessage({ type: 'ready' });
    } else if (msg.type === 'run') {
      if (!session || !ort) throw new Error('model not loaded');
      const input = new ort.Tensor('float32', new Float32Array(msg.buffer), [1, 3, msg.size, msg.size]);
      const res = await session.run({ [session.inputNames[0]]: input });
      const detsName = session.outputNames.find((n) => n.includes('det')) || session.outputNames[0];
      const labelsName = session.outputNames.find((n) => n.includes('label')) || session.outputNames[1];
      const dets = res[detsName];
      const labels = res[labelsName];
      const detsData = new Float32Array(dets.data);
      const labelsData = new Float32Array(labels.data);
      self.postMessage(
        { type: 'result', id: msg.id, dets: detsData.buffer, labels: labelsData.buffer, queries: dets.dims[1], classes: labels.dims[2] },
        [detsData.buffer, labelsData.buffer]
      );
    }
  } catch (err) {
    self.postMessage({ type: 'failed', id: msg.type === 'run' ? msg.id : undefined, message: err && err.message ? err.message : String(err) });
  }
};

// Set up: the page waits for this before sending anything
self.postMessage({ type: 'alive' });
