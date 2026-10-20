# Deadeye promo video (HyperFrames project)

`index.html` is the whole film: 1080x1920, 33.2s, 30fps. Edit it in HyperFrames Studio
(`npx hyperframes preview`) or by hand. Captions, scene times and the tracker overlay
are all in that one file, with comments by section.

Plan, claims and where each number comes from: `PLAN.md`.

## Rebuild

1. `node scripts/build-assets.mjs` cuts the shooting clips and screen recordings into `assets/`
   (source paths are at the top of the script).
2. `node scripts/build-hud-data.mjs` turns the tracker's ball trace for 16606
   (`assets/data/16606-ball-trace.csv`) into the ball box and trail the HUD replays.
3. Render the silent version (needs ffmpeg and ffprobe on PATH):
   `npx hyperframes render --video-frame-format png -o renders/silent.mp4`
4. `node scripts/mux-voice.mjs` adds the three Kokoro voice lines (am_adam, 1.12x) -> `renders/voice.mp4`.

Voice lines live in `assets/voice/`. They were made with kokoro-js (Kokoro-82M, Apache-2.0),
using the exact text in `PLAN.md`. The three timings are in `scripts/mux-voice.mjs`.

## Notes

- The count in the HUD (1/1, 2/2, 2/3, 3/4) follows the order the cuts are shown. Each call
  (make or miss) is the tracker's call on that shot, checked against the hand labels.
- No music or sound effects are baked in. Add a track from TikTok's or Instagram's commercial
  music library when posting.
- `assets/` holds crops of the screen recordings. Nothing shows another player's name or photo.

## The first promo with voice (`../promo-classic`)

A second HyperFrames project built on the first promo itself: the logo sting after the first
shot is cut (with a white flash, as the original used going into the makes), "Train smarter"
is replaced by the real programmes screen (18 programmes, 4 free, 150 drills), and it gets the
watermark, a light grade and the end card held for the last voice line.

1. `node scripts/build-classic.mjs` cuts the first promo into `../promo-classic/assets/classic/`.
2. `node scripts/make-sfx.mjs classic`
3. In `../promo-classic`: `npx hyperframes render --video-frame-format png -o renders/picture.mp4`
4. `node scripts/mux-voice.mjs classic` -> `../promo-classic/renders/silent.mp4` and `voice.mp4`

The title font there is Anton (SIL Open Font License, `assets/fonts/OFL.txt`).
