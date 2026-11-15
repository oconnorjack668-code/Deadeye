# Tracker speed: uploads decoded, not played; camera frames off the main thread (2026-11-14)

Agent: Claude Code (Opus 5.5) · Commits: 9951936 (#113), 53bedba (#115), 5c0321e (#118), d467d58 (#119), 1a44768 (#120) · PR: #113, #115, #118, #119, #120 · Status: merged and checked live 14 Nov

## Outcome
- Founder asked how to make the tracker faster on phones. Measured in Chrome on the laptop with the app's own frame path: the tracker's pixel work is ~1.7 ms a frame; reading each frame out of a playing video is 11-16 ms, and on clip 2 (60 fps) a quarter of the frames never reached the tracker (25/31; bench 31/31), whichever way the pixels were read.
- #113: an upload losing a quarter of its frames plays at half speed and says so: clip 2 30/31 in 5:20.
- #115: the live camera's hoop crop is cut and shrunk by the graphics chip and read back in the worker: main thread 0.8-1.0 ms a frame against 15.6-16.3, same frames reaching the tracker.
- #118: uploads decoded with WebCodecs in the worker, every frame scored as fast as the device allows: clip 1 10/10 in 13.4s (51s clip), clip 2 30/31 in 51.9s (2:40), clip 3 16/17 in 37.8s, clip 4 23/24 in 53.3s (bench 24/24).

## Decisions
- After #118 merged, the live site stalled on uploads while its preview worked. Cause: the service worker cached Turbopack's worker bootstrap (same name every build, chunk list in `#params=`, which the Cache API ignores when matching), so live workers ran an old build. #120 never caches worker requests and bumps the cache to hoopiq-v6; #119 adds an 8 s watchdog (play instead) and stage reports. Founder merged both on the spot. Live check after #120: upload decoded, 3/3.
- The founder chose all three, in the order 1, 3, 2 (14 Nov): decoding is the real fix, half speed the safety net, the bitmap path keeps the screen smooth.
- Slowing needs 8 of 30 frames lost: at 4 a busy laptop slowed a 30 fps clip it was keeping up with.
- Bitmaps only for the live camera: uploads need the pixels on the main thread for the repeat check before the workload counts a frame. Two bitmaps may be in the making at once, handed over in order (one at a time lost ~2 frames a second).
- mp4box 2.4.1 (BSD-3), pinned; not 2.5.0 (20 days old). Credit line added to the privacy page's Credits. It is in the worker's chunk only.
- Decoding handles rotation (track matrix) and the edit list; checked against the <video> at 90/180/270 (crops within 2-4 levels). Refuses a clip whose decoded size differs from the <video>'s. Falls back to playing when it fails before any frame (a WebM fails in 0.1s); calls what it saw when it fails part way; both reported to /admin/errors.
- While decoding: video paused, no ball overlay, no sound or buzz, no camera-moved prompt.

## Where things are
- `src/lib/video/workload.ts` (slowFirst, SLOW_RATE), `trackerEngine.ts` (pushBitmap, decodeFile, bitmapsWork, decodeWorks), `tracker.worker.ts`, `clipDecoder.ts`, `ShotTracker.tsx`
- Tests: `workload.test.ts`, `trackerEngine.test.ts`, `clipDecoder.test.ts`
- README "What the bench cannot see: frames lost in the browser"
- Browser test harness (not in the repo): Playwright + esbuild scripts in the job's scratch folder; Chromium from `%LOCALAPPDATA%/ms-playwright/chromium-1248`, run with a visible window (headless emulates the GPU)

## Status changes
- Closed: none
- Opened: S38

## Gotchas
- A preview starts with an empty service-worker cache, so it cannot show stale-cache bugs: check the live site after every merge.
- A clip cut with `-c copy` carries an edit list; ignoring it made the decoder's first frame a different moment from the <video>'s, which looked like a rotation bug.
- mp4box: follow `appendBuffer`'s return value (where to read next); phone files put the index at the end.
- Chromium's CPU throttling slows the page's main thread, not workers: it overstates the main thread's share.
- The Chrome upload tool takes 10 MB at most; previews need the tester signed in on the preview address itself.
- Another session on the laptop ran its own benches (grep processes on a pattern this session never used); timings were noisy while it did.
