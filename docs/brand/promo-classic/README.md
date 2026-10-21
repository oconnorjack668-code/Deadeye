# Deadeye promo: the first promo with voice (shipped)

This is the version in `docs/brand/deadeye-promo-voice.mp4` and `deadeye-promo-silent.mp4`.
`index.html` is the whole film (1080x1920, 24.5s). It is built on the first promo
(`../deadeye-promo-v1.mp4`):

- 0-2.8s first shot, 2.8-15s makes and misses, rim set-up, form check and coach (the logo sting is cut)
- 15-17.4s the real programmes screen in place of "Train smarter"
- 17.4-24.5s closing line over clean footage, then the end card, held for the last voice line

The first promo's own captions are blurred out in the footage where they sat, and the new
captions in `index.html` sit exactly over them, each timed to the voice.

## Rebuild

From `../promo-video` (ffmpeg and ffprobe on PATH):

1. `node scripts/build-classic.mjs` cuts and grades the pieces into `assets/classic/` and blurs the old captions.
   The boxes and timings it blurs are listed at the top of the script. It then runs
   `scripts/fix-rim-line.mjs`, which ends the first hoop's rim line on the far side of the ring
   (the first promo ran it onto the bracket), using clean pixels from the raw clip 16606.
   Run that only through build-classic: on its own it would move the end a second time.
2. `node scripts/make-sfx.mjs classic`
3. Here: `npx hyperframes render --video-frame-format png -o renders/picture.mp4`
4. `node scripts/mux-voice.mjs classic` gives `renders/silent.mp4` and `renders/voice.mp4`.
   Phrase timings are in that script; the voice clips come from `scripts/make-voice-phrases.mjs`.

Square cuts: the full video scaled into the middle of 1080x1080 over a blurred copy of itself
(`node scripts/make-squares.mjs` in ../promo-video).

The title font is Anton (SIL Open Font License, `assets/fonts/OFL.txt`).
