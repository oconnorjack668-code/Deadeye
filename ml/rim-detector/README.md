# Rim detector

A small model that finds the basketball **rim, backboard and ball** in a picture, so the shot tracker can
find the hoop itself (one tap to confirm) instead of the player tapping both sides of the ring.

Why a trained model: a general one (COCO's "sports ball") found the ball on 7% of frames of a bench clip
(commit 369d6e3), and snapping taps to the ring with pixel maths made them worse (tracker-upgrades handoff,
1 Nov 2026). A model trained on basketball pictures is a different thing; this measures whether it is good
enough.

## Train it

`train_rim_detector.ipynb` runs on Google Colab's free GPU. The instructions are in its first cell: put the
dataset zips and `deadeye-eval-frames.zip` in a Drive folder `deadeye-rim`, set a T4 GPU, Run all. It
resumes after a disconnect and leaves `deadeye-rim-detector-result.zip` in that folder.

What it does:

1. Merges the four datasets (`ATTRIBUTION.md`) into three classes: ball, rim, backboard.
2. Trains RF-DETR Nano (Apache 2.0), with early stopping.
3. Scores it on held-back test pictures, per class.
4. Scores it on **Deadeye's own frames**: 24 frames from the two bench clips whose ring edges were tapped
   by hand. It reports whether it found the right hoop (clip 2 has a second hoop on the far wall) and how far
   its box's sides are from the taps, in rim widths. Under about 0.15 is as good as a careful tap.
5. Exports ONNX for the browser, plus an int8 copy, and **proves** how to run it: it tries the usual
   preprocessing recipes and class numberings and keeps the one that reproduces the trained model's own
   finds. That recipe goes in `model-card.json`, so the app copies something shown to work rather than
   something assumed.

The evaluation frames come from `scripts/bench-suite.json`'s clips; rebuild them with ffmpeg if the clips
change.

## Trained (3 Nov 2026), and in the app

RF-DETR Nano, 40 epochs at most with early stopping, on 2,179 training pictures. On the 305 held-back ones:
rim found 85% (88% of its rim finds right), backboard 96%, ball 76%. The int8 copy reproduces the full
model's finds as well as the full one does, at 36 MB against 115.

In the app it is **Find the hoop for me** in the tracker's rim step (`src/lib/video/rimFinder.ts`,
`rimModel.ts` and its worker). The model downloads on first press (`public/models/rim-detector-int8.onnx`),
stays in the Cache API (`deadeye-models-v1`, kept by the service worker), and runs on the phone. It looks
at the whole picture, then again at a square five rim widths across around what it found, over three
moments of a live camera, and opens the adjuster on the ends for the player to check.

Measured with `__tests__/rimFinderBench.test.ts` on the 24 frames, against the ring's ends, in rim widths
(median, worst):

| | near clip | far clip |
| --- | --- | --- |
| one look | 0.142, 0.158 (it boxed the bracket too) | 0.111, 0.445 |
| close look, 5 rim widths | **0.027, 0.042** | **0.018, 0.048** |

The near clip's bench taps had the far end on the bracket; `eval-frames/frames.json` now has the ring's
edge (0.5736, 0.2034, as `sampleClip.ts`). A box has no tilt, so the ends start level; on the full near clip
the shot bench called 9 of 10 right on the found ends and 9 of 10 on the true ring ends (a different shot
wrong each time), so level ends lose nothing there. A browser run of the 34s sample on the found ends,
unadjusted, called 3 of 6 (the 13.9s make); tapped, 4 of 6.

Next: automatic "Fix rim" when the camera moves, from the same model; more Deadeye frames in training from
the test library.
