# Tracker video: vertical 9:16, slow-mo replays, milestone banners (2026-11-02)

Agent: Claude Code (Opus 5.5) · Branch: `feat/tracker-vertical-slowmo` · Status: PR opened and merged on the founder's word ("merge the next PR once it's all good"); follows #58 (4dc8e8c)

## Outcome
- "Video with the tracker" now saves as **Vertical 9:16** (default, 1080x1920) or **As filmed**. Sideways footage is shown whole across the width over a blurred copy of itself; upright footage fills the frame. The HUD stays out of the top tenth and bottom fifth, where TikTok/Reels put their tabs and caption.
- **Slow-mo replays** (default on): up to 3 of the range's best makes (deepest into a streak, latest on a tie) replayed at half speed before the end card, with a "SLOW-MO REPLAY" badge and no score (it would read as going backwards).
- **Milestone banners**, live and in the saved video: 10/25/50/100/150/200/300 makes, 50/100/200/300/500 shots, "Perfect start · 5/5". 2.5s, white pill under the score.

## Decisions
- No tight 9:16 crop of sideways footage: one tall enough to fill keeps about a quarter of the width and would cut the shooter out. A hoop-centred zoom could come later.
- Backdrop blur by drawing tiny and stretching, not `ctx.filter`, which older Safari lacks.
- Slow motion is the recording played at 0.5x into the recorded canvas, so a 30fps clip gives 15 distinct frames a second in replays.
- No "new personal best %" banner: it needs the player's history, which the tracker doesn't load. Worth adding with a server prop.

## Where things are
- `src/lib/video/overlayTimeline.ts`: `milestoneFor`, `replayPicks`, banner in `overlayAt`
- `src/lib/video/overlayArt.ts`: `verticalLayout`, `drawBackdrop`, HUD `area`/`replay`, banner
- `src/components/video/TrackerVideoExport.tsx`: `exportPlan` (segments), shape and slow-mo options
- `src/app/globals.css`: `.deadeye-banner`; `TrackerHud` `banner` prop; `ShotTracker` raises it

## Checks run
- tsc, ESLint on changed files, 960 tests (24 in `overlayTimeline.test.tsx`), `next build --webpack`: pass.
- Headless Chromium on the sample through the real tracker: 4/6; vertical + slow-mo export 1080x1920, 51.5s (34s + 3 replays + end card) in 53s, as planned; frames checked for layout, flame, replay badge.

## Open
- Real phones (from #58 too): iPhone Safari recording and memory, Android Chrome, playbackRate 0.5 smoothness, a session with "Fix rim".
- The live banner was checked in a unit test only; the sample has no milestone in it.

## Gotchas
- As in [the #58 handoff](2026-11-02-tracker-video-export.md): webpack, not Turbopack, with a junctioned node_modules; `next typegen` before tsc.
