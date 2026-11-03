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

## Next

With the result in hand: the app runs the model once when the camera is pointed at the hoop, proposes the
rim, and the player confirms with one tap (the adjuster stays as the fallback). Automatic "Fix rim" after a
knocked tripod comes from the same model.
