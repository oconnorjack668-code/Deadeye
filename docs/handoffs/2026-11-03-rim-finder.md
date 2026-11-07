# Find the hoop for me: trained rim detector in the tracker (2026-11-03)

Agent: Claude Code (Opus 5.5) · Commits: fd045cc (#63), 3b50154 (#64), 7dbefee (#65) · Status: shipped. All three merged on the founder's word; checked live through the real button with the tester account in Chrome (file upload). Not yet tried on a phone.

## Outcome
- The tracker's rim step has **Find the hoop for me**. It runs the rim detector the founder trained on Colab (`ml/rim-detector`; result in `Documents/deadeye-bench/rim-result`) on the phone and opens the adjuster on the ring's two ends to check. Tapping works as before.
- Model on held-back pictures: rim 85% found / 88% right, backboard 96%, ball 76%.
- Accuracy: a close second look (a square 5 rim widths across around the first find) cut the error on the 24 bench frames from 0.14/0.11 rim widths (worst 0.45) to 0.027/0.018 (worst 0.048), better than a careful tap.
- Live, 3 Nov, after #65: hoop found in 12.5s with the model already cached (getting ready 2.3s, two looks 9.9s), markers on the ring.

## Decisions
- Close look at 5 rim widths: best of 3, 5 and 8 on the bench (`rimFinderBench.test.ts`).
- One still, two looks (whole, then close). A median over three moments was dropped in #64: each look is seconds on a phone, and one close look was already 0.027/0.018.
- The ends start level, since a box has no tilt. On the full near clip, the found ends and the true ring ends each called 9/10 (a different shot wrong each time), so tilt estimation was not built. The note asks the player to raise or lower the far end.
- int8 model (36 MB, the same finds as the 115 MB one), served from `public/models` (in git). Downloaded on first press and kept in Cache API `deadeye-models-v1`, which the service worker keeps across updates.
- The worker is a plain file, `public/workers/rim-model.js` (#65), not a bundled one. On the live site the Turbopack-bundled worker was created but never ran: no message, no error. The same build worked locally, also with the service worker in control. The runtime (onnxruntime-web 1.30.0, pinned in package.json for the version check) is dynamically imported from jsdelivr; wasm, one thread.
- Every stage has a time limit (start 15s, stalled download 45s, ready 120s, a look 60s). The button names the stage; Button's `isLoading` had shown only "Loading...". Failures are shown and reported to `/admin/errors` with stage, time and source; dropped connections are not reported (reportError ignores them).
- `.onnx` and `/workers/` are on the proxy's skip list. The privacy page says the finding runs on the phone and credits the datasets (CC BY 4.0).
- Clip 1's bench far tap sits on the bracket; the rim eval frames now use the ring's edge. The shot bench keeps the old taps (it was tuned on them, 10/10).

## Where things are
- `src/lib/video/rimFinder.ts`: pure (input, decode, the two looks, median)
- `src/lib/video/rimModel.ts`: loading, stages, limits, `RimFinderError`
- `public/workers/rim-model.js`: the worker
- `ShotTracker.tsx`: `findHoop`, `FinderState`/`finderLabel`, the button in the `!edges` calibrate block, the note above the adjuster
- `public/models/rim-detector-int8.onnx`, `public/sw.js`, `src/proxy.ts`, `src/app/privacy/page.tsx` (#credits)
- Tests: `rimFinder.test.ts`; bench `rimFinderBench.test.ts` (skips without DEADEYE_RIM_MODEL, DEADEYE_RIM_FRAMES, DEADEYE_ORT_NODE = an onnxruntime-node install)
- `ml/rim-detector/README.md`: training results and the bench table

## Checks run
- tsc, ESLint, 985 tests; local Turbopack production builds.
- Headless Chromium against the local build: a fake live camera fed from clip 1 found the ring in 10.3s. Found twice in a row with the service worker in control. With the model blocked, "could not download" in 0.6s.
- Live site, Chrome, tester session: #64 alone stopped at the 15s start limit, which is how the bundled worker was found. #65's worker code was run as a blob worker before merging (alive 10ms, 36 MB in 1.5s, ready 3.7s, a look 2.5s), then the real button found the hoop after merging.
- The tracker's own bundled worker does run live (frames came back), so tracking was not affected.

## Open
- Founder: retry on a phone with the **live camera** (Chrome's permission bubble blocked that path here). Expect 30–60s the first time; any failure or limit reached shows in `/admin/errors` as "Hoop finder failed at …".
- Dataset source links for basketball-computer-vision and Basketball Shot Tracking (`ml/rim-detector/ATTRIBUTION.md`, privacy credits).
- Next: automatic Fix rim from the same model; retrain with test-library frames. Prefer speed over a bigger model.

## Gotchas
- Test signed-in features on the live site in Chrome with the tester session (memory: test-live-in-chrome). Build locally with Turbopack (`next build`), not `--webpack`; the webpack build hid the worker bug.
- The worktree's `node_modules` became a real install when `npm install` ran in it (it had been a junction). That is what let Turbopack build locally.
- Chrome's resource timing drops a URL's `#` part, so a worker URL rebuilt from it loses Turbopack's `#params`.
- onnxruntime-node rejects jsdom's typed arrays: the bench file is `@vitest-environment node`.
- PowerShell's Set-Content writes a BOM that JSON.parse rejects. Signed-out test pages log harmless 405s from `/api/events`.
