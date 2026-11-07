# Tracker video with the overlay, and a streak flame (2026-11-02)

Agent: Claude Code (Opus 5.5) · Branch: `feat/tracker-video-export` · Commits: ec22ce1 · Status: in review (PR open, not merged)

## Outcome
- Review gains "Video with the tracker": the session's video saved with the overlay drawn in (rim line, ball and comet trail, score, %, clock, streak, shot dots, each make/miss), a DEADEYE mark and a 2.5s end card (makes/attempts, %, best run). From/To by shot. Made on the phone at normal speed, MP4 where the browser records it, Share or Save. Asked for by the founder for ad footage.
- Live HUD: at 3 makes in a row the makes count burns (`StreakFlame`), pill "Heating up · 3", from 5 "On fire · 5" (red), and the shot call adds "3 in a row". The rim line flashes green/red after each call; the ball is a ring with a comet tail that burns on a streak.
- Fix: replays and the highlight reel were off by the re-aim time for every shot after "Fix rim" on the live camera (the clock holds, the recording doesn't). Now mapped through the logged gaps.

## Decisions
- Overlay redrawn afterwards from a log, not recorded live: drawing every frame into a recorded canvas while tracking would take frames from the tracker. The log is in memory only (~a few MB, capped at 150k frames).
- One drawing module (`overlayArt.ts`) for the live rim/ball and the whole saved overlay, so the video matches the screen. The live score and pills stay HTML (cheap, accessible); the saved HUD copies their layout in canvas.
- The saved video shows the tracker's calls as made live, not review corrections: it is footage of what the app showed.
- Amber warnings and buttons are left out of the saved video.
- Streak flame is a founder-chosen exception to design.md's "no more celebrations"; overlay only, still for reduced motion (recorded in `docs/design.md`).

## Where things are
- `src/lib/video/overlayTimeline.ts`: the log, clock/recording mapping, `overlayAt`
- `src/lib/video/overlayArt.ts`: rim, ball, flame, saved HUD, end card
- `src/components/video/TrackerVideoExport.tsx`, `StreakFlame.tsx`; `TrackerHud.tsx`, `ShotTracker.tsx` wiring
- `__tests__/overlayTimeline.test.tsx` (16 tests)

## Checks run
- `npx tsc --noEmit`, ESLint on every changed file, 952 tests, `next build --webpack`: all pass.
- Headless Chromium (Playwright, phone width) on the sample clip uploaded through the real tracker: called 4/6 (right); flame and "Heating up · 3" live at 28s; export made a 36.5s 1280x592 MP4 in 37s; frames from the file show MAKE, "3 IN A ROW", the flame, the trail and the end card.

## Open
- Real phone check by the founder: iPhone Safari (MP4 recording, memory on a long session), Android Chrome; a live-camera session with a "Fix rim" in it.
- Ideas not built (see the PR): slow-mo replay of makes, a live shot chart, personal-best and milestone callouts, a landscape broadcast layout, music on the saved video.

## Gotchas
- `requestVideoFrameCallback` never fires on a video element that is not on the page; the export first stalled on it. It uses `requestAnimationFrame` now.
- Turbopack refuses a `node_modules` junction pointing outside the worktree ("Could not find the Next.js package"). `next dev --webpack` / `next build --webpack` work. Run `npx next typegen` first or tsc misses `LayoutProps`.
- No Python here, and compound shell commands get refused in a worktree session: edit with the file tools.
