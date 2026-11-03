# Find the hoop for me: trained rim detector in the tracker (2026-11-03)

Agent: Claude Code (Opus 5.5) · Branch: `feat/rim-finder` · Status: PR opened, merged on the founder's word ("build it and merge once it's checked")

## Outcome
- The founder trained the rim detector on Colab (`ml/rim-detector`); result in `Documents/deadeye-bench/rim-result`. Held-back pictures: rim 85% found / 88% right, backboard 96%, ball 76%.
- Tracker rim step: **Find the hoop for me**. Downloads the int8 model (36 MB) on first press, keeps it in the Cache API, runs it in a worker, and opens the adjuster on the found ends with a note to check them. Tapping still works as before.
- Accuracy: a second, close look (a square 5 rim widths across around the first find) cut the error from 0.14/0.11 rim widths (worst 0.45) to 0.027/0.018 (worst 0.048) on the 24 bench frames, better than a careful tap. Three moments of a live camera, middle answer.

## Decisions
- Close look at 5 rim widths: best of 3, 5 and 8 on the bench (`rimFinderBench.test.ts`).
- Ends start level (a box has no tilt). On the full near clip the found ends and the true ring ends each called 9/10 (a different shot wrong), so tilt estimation could not show a gain; not built. The player is asked to adjust the far end when filming from the side.
- onnxruntime-web 1.30.0 (Sept; 1.31.1 was a day old), wasm from jsdelivr for that version (as MediaPipe's), one thread (not cross-origin isolated), in a worker.
- Model served from `public/models` (in git, 36 MB). `.onnx` added to the proxy's skip list; the service worker keeps `deadeye-models-v1` across updates.
- Clip 1's bench far tap sits on the bracket; the eval frames now use the ring's edge. The shot bench keeps the old taps (it was tuned on them, 10/10).
- Privacy page: one sentence (finding runs on the phone) and a Credits section for the datasets (CC BY 4.0).

## Where things are
- `src/lib/video/rimFinder.ts` (pure: input, decode, two looks, median), `rimModel.ts` + `rimModel.worker.ts` (browser)
- `ShotTracker.tsx` (`findHoop`, button in the `!edges` calibrate block, note above the adjuster)
- `public/models/rim-detector-int8.onnx`, `public/sw.js`, `src/proxy.ts`, `src/app/privacy/page.tsx`
- Tests: `rimFinder.test.ts`; bench `rimFinderBench.test.ts` (skips without DEADEYE_RIM_MODEL, DEADEYE_RIM_FRAMES, DEADEYE_ORT_NODE = onnxruntime-node path)

## Checks run
- tsc, ESLint, 985 tests, `next build --webpack`. Production build in headless Chromium: model and runtime loaded, hoop found in about 10 s (laptop, incl. download), adjuster opened on the ring; tracking on the unadjusted ends called 3/6 on the sample (4/6 tapped).

## Open
- Real phones: time to find (wasm, one thread) on a mid-range Android and an iPhone; first-press download on mobile data.
- Dataset source links for 2 datasets still to confirm (`ml/rim-detector/ATTRIBUTION.md`).
- Next: automatic Fix rim from the same model; retrain with test-library frames.

## Follow-ups the same day (#64, and the PR after it)
- The founder found it spinning for ever on a phone. On the live site, with the tester in Chrome: the Turbopack-bundled worker was created but never ran. There was no message and no error; the same build worked locally, also with the service worker in control. Button's `isLoading` also hid every stage behind "Loading...".
- #64: stages on the button, time limits (start 15s, stalled download 45s, ready 120s, look 60s), failures shown and reported with stage and time, two looks on one still.
- Then: the worker is a plain file, `public/workers/rim-model.js` (outside `/_next/static/`, skipped by the proxy). The runtime is dynamically imported from jsdelivr. Run as a blob worker on the live site before merging: alive 10ms, 36 MB in 1.5s, ready 3.7s, one look 2.5s.
- The tracker's own bundled worker does run on the live site (frames came back in Chrome), so tracking was not affected.

## Gotchas
- Test signed-in features on the live site in Chrome with the tester session, and build locally with Turbopack (`next build`), not `--webpack`: the webpack build hid this.
- onnxruntime-node rejects jsdom's typed arrays: the bench file is `@vitest-environment node`.
- PowerShell's Set-Content writes a BOM that JSON.parse rejects.
- Signed-out test pages log 405s from `/api/events` redirecting to /login; harmless.
