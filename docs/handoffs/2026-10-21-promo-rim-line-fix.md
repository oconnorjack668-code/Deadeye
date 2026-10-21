# Promo rim line fix (2026-10-21)

Agent: Claude Code (Opus 5.5) · Commits: 02a207c, plus this handoff · Status: shipped, pushed, phone page updated

Follows [promo-video-and-coach-format](2026-10-20-promo-video-and-coach-format.md).

## Outcome
- On the first hoop (0-8.3s of the promo) the orange rim line used to run past the ring onto the bracket. It now ends on the far edge of the ring. The user spotted it.
- `deadeye-promo-voice.mp4`, `-silent.mp4` and both `-square` cuts in `docs/brand/` are re-rendered with the fix.
- The phone page https://claude.ai/artifact/TNi2xjxjsePCzeUst6k3pW (same link, version 2) now has the fixed vertical (9.3 MB copy) and square cuts with save buttons.

## Decisions
- Patched the old footage rather than redrawing the overlay: the line is baked into `deadeye-promo-v1.mp4` and its source script is gone.
- The overrun and old dot are covered with the same spot from raw clip 16606 at the matching moment, colour-matched per frame; whip-pan frames get a smooth fill instead (a sharp patch would show on a blurred frame).
- New end at 0.79 of the way between the old taps (raw 1226.5,236.5 → 1369.5,214.25): the ring's outer far edge, checked on a zoomed raw frame.
- The three single white-flash frames between shots (middle 40, 82, 124) are left untouched: the line sits under the score badge there.
- Pushed straight to `main` (fast-forward, main had not moved), as the user asked.

## Where things are
- `docs/brand/promo-video/scripts/fix-rim-line.mjs`: the fix. `build-classic.mjs` runs it right after cutting `hook.mp4` and `middle.mp4`.
- `docs/brand/promo-classic/README.md`: rebuild steps, now mention the fix.
- `docs/brand/promo-classic/renders/phone.mp4` (gitignored): the 9.3 MB vertical used on the phone page (x264 slow, 3800k video, 160k AAC).

## Open
- None. Known residue: a faint texture where the old dot was on the three zoom-pop frames (middle 41, 83, 125), one frame each.

## Gotchas
- Run `fix-rim-line.mjs` only through `build-classic.mjs`: on its own output it would find the new dot and move the end again.
- Flash and shake frames cost the most time. The strict dot finder misses them (washed colours, a green call ring or red trail over the dot), the overlay and footage are scaled differently on zoom pops, and a washed frame needs a colour gain near 0.45. The script now has a tolerant local dot search, a neighbour fallback, a small registration search, and mean-and-spread colour matching.
- Timing per frame from the best raw match jumps around; it is smoothed to the neighbours' steady offset.
- HyperFrames needs ffprobe on PATH: `npm install ffprobe-static@3.1.0` in a temp folder and add `node_modules/ffprobe-static/bin/win32/x64`.
- Artifact publish refused video files from the scratchpad (a Read permission rule); sources inside the repo worked. It also refuses to overwrite published files not yet read: list them (`scope: "files"`) first.
- Untracked `.agents/` in the repo root is not from this session; left alone.
