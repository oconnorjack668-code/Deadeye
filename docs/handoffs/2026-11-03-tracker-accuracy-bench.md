# Tracker accuracy: bench suite, slow phones, washed-out light; rim detector notebook (2026-11-03)

Agent: Claude Code (Opus 5.5) · Branch: `feat/tracker-bench-variants` · Status: PR opened, merged on the founder's word ("merge once it's all checked")

## Outcome
- `scripts/bench-suite.mjs` runs the clip bench, the app's way, over both labelled clips and 7 harder versions of each (far, dim, washed out, 15/10 fps, wobbly, all at once): 328 labelled attempts in one table.
- Accuracy across them went from 221/328 (67.4%) to 254/328 (77.4%), phantoms 5 to 2, as-filmed clips unchanged (10/10, 31/31). Washed-out 4/10 to 10/10 and 21/31 to 29/31; clip 2 at 10 fps 4/31 to 13/31.
- Owner-only "Save for the test library" on the tracker review saves the video and a labels .json; dropped into the bench folder, the suite picks it up.
- `ml/rim-detector/`: Colab notebook to train RF-DETR Nano on the founder's 4 Roboflow datasets (ball/rim/backboard), score it on 24 Deadeye frames with known rim taps, export ONNX and prove the browser recipe.

## Decisions
- Harder versions of the 2 clips keep their labels: conditions, not new courts. YouTube and game broadcasts were refused (copyright, and the wrong viewpoint).
- Frame-rate scaling stretches only gaps that stand for missing frames; flight times (LOST_BALL_MS, CONFIRM_MS, GONE_MS) stay.
- Contrast only lowers the threshold (floor half), never raises it, so ordinary pictures are untouched.
- Lone-sighting starts only below 20 fps and are always unsure, with no margin.
- Tried and dropped: widening "near the ring" for lone sightings. It traded missed shots for wrong calls one for one.
- RF-DETR Nano (Apache 2.0) over Ultralytics (AGPL). Data via Google Drive (1.3 GB zip). The notebook checks the ONNX recipe against the trained model rather than assuming it.
- Datasets: ballllls, X-Basket, Basketball Shot Tracking CC BY 4.0 (the last checked by the founder), basketball-computer-vision public domain. 2 source links to confirm (`ml/rim-detector/ATTRIBUTION.md`).

## Where things are
- `scripts/bench-suite.mjs` / `.json`; README "The bench suite"
- `src/lib/video/shotDetector.ts` (pace, SLOW_PACE, lone), `motionBall.ts` (lumaSpread, adaptedThreshold), `ballTracker.ts`
- `src/lib/video/benchLabels.ts`, ShotTracker `ownerTools`, `video/page.tsx` → `VideoHub`
- `ml/rim-detector/` (notebook, README, ATTRIBUTION)
- Laptop: `Documents/deadeye-bench` (clips, variants, out/*/summary.txt, datasets, eval-frames, notebook copy)
- Tests: `trackerConditions.test.ts`, `benchLabels.test.ts`

## Checks run
- tsc, ESLint on changed files, 977 tests, `next build --webpack`; suite runs baseline, pace, contrast-lone, arrival (dropped), final spot check identical to contrast-lone.

## Open
- Founder: run the notebook on Colab (steps in its first cell), bring back `deadeye-rim-detector-result.zip`; then Claude wires rim-finding into the app.
- Founder: send the 2 dataset links for ATTRIBUTION before the model ships.
- Still weak: clip 1 at 10 fps (4/10), wobbly mount, far small rim. Needs real clips from the test-library button.
- Not checked on a phone: the button's two downloads on iPhone Safari.

## Gotchas
- No python on PATH; `py` (3.14) works. ffmpeg via winget: full path in the commands above (PATH needs a new shell).
- Editing tracker source while a suite run is going corrupts that run: each bench run reads the source afresh.
- Bench reports list a wrong call twice; the suite counts wrong as called − right.
