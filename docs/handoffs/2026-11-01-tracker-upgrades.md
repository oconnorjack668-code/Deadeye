# Shot tracker upgrades: accuracy data, worker, camera watch, HUD, drills, replays (2026-11-01)

Agent: Claude Code (Opus 5.5) · Branch: `feat/tracker-upgrades` · Commits: 6b3e996, 007967d, 4f104e6, e49918c · Status: shipped, merged as #50 (8c9fbb3) on 1 Nov 2026; handoff fixes #51 (38ce969); checked live

## Outcome
- Each tracked session saves the tracker's own call next to the player's correction, plus fps, worker, camera moves and a coarse device class. `/admin/tracker` adds them up.
- Pixel work runs in a Web Worker (main-thread fallback) through one pipeline shared with the bench. A camera watcher flags a moved tripod, and Fix rim re-aims mid-session while keeping the shots.
- Live camera: 1080p, zoom slider and "Zoom in" for a small rim, focus/exposure held, and an optional on-phone recording. The recording gives replays, a highlight reel and a re-check at full frame rate.
- HUD: a calm "Watching the hoop" pill and specific amber warnings (slow, moved, dark, hard to call). Also streaks, a ball trail, full screen, and time spent shooting with breaks over 45s left out. New drills: make target, timed, and spots with voice cues.
- Review and session: tap a shot to watch it and settle it, a spot per shot (one `shooting_entries` row per spot), and a shot-by-shot breakdown (best run, halves, wide misses left/right, clean makes) on the review and the session page. The share card gains the shot dots and best run.
- Framing check before Start. Saved hoops sync to the account (00055); one from the account always opens in the adjuster to check first.

## Decisions
- Auto-snapping rim taps was not shipped: on real frames it made taps worse (error 204→279 px on 16606, 90→168 on 16761 at 31s). The ring's tips are dark or desaturated, and a bracket joins one end on both clips.
- Item 7 (bounce-back false make): no change. The ball's size does not grow as it falls past the net (0.47–0.54 rim widths vs 0.49–0.52 arriving). Centre taps already give 31/31.
- Camera watcher threshold is 1 cell (1/8 rim width): no false alarm on 13 runs of both clips, and knocks of 5, 7 and 14px are reported within 1.2–4.6s.
- Device class, not the user agent, is saved: players can be 13.
- Account hoops are never started on directly, which keeps rimMemory's reason for staying on the device.

## Where things are
- `src/lib/video/`: `trackerPipeline.ts`, `trackerEngine.ts`, `tracker.worker.ts`, `cameraShift.ts`, `cameraControls.ts`, `liveHealth.ts`, `liveRecorder.ts`, `drillModes.ts`, `shotStats.ts`, `framing.ts`, `trackedShots.ts`, `rimSync.ts`
- `src/components/video/`: `ShotTracker.tsx` (rewritten), `TrackerHud`, `ShotReplay`, `DrillPicker`, `FramingPanel`, `CameraZoom`, `useFramingCheck`; `src/components/basketball/ShootingBreakdown.tsx`
- `src/app/(app)/admin/tracker/page.tsx`, `supabase/migrations/00055_saved_rims.sql`, README bench section (`DEADEYE_BENCH_KNOCK`)

## Checks run
- `npx tsc --noEmit` clean. ESLint is clean on every changed file. 924 tests pass. `next build` passes.
- Bench before and after: 10/10, 31/31, tap grid 313/341, 7 phantom calls. Identical.
- Browser (Playwright, Pixel 7, local): the sample calls 4 of 6 in dev and production, with the worker loaded. Upload → taps → framing → track → replay all worked. The fake camera with a knock showed Camera moved, then Fix rim, resume, recording, re-check. Spots drill tagged its zones; full screen kept the overlay aligned.

## Live check (1 Nov 2026, after #51 deployed)
- GitHub shows both production deploys succeeded (8c9fbb3 at 20:01, 38ce969 at 20:30 UTC). Vercel: no runtime errors in the 2 hours after.
- deadeyeapp.vercel.app: home, /privacy (new hoop and tracker wording, dated November 1, 2026) and the sample clip return 200. The landing sample, played at phone size, called "Spot on, 4 of 6" with the worker loaded from the live build.
- Not checked live (needs sign-in): saving a session, the session page breakdown, hoop sync.

## Open
- ~~Run 00055~~: the user confirmed it was run before the merge. Tick it in `docs/launch-checklist.md`.
- ~~Safety review~~: BLOCK, then PASS. It found the privacy policy did not name the new data and that account hoops stayed on shared devices; both were fixed in 4f104e6, along with less device data (platform only) and copy notes. release-checker was not run; tsc, lint, tests, build and the bench were.
- Not tested: a real phone (zoom, focus lock, MediaRecorder memory on iOS, orientation lock), signed-in saving, the session page breakdown and hoop sync (this sandbox cannot reach Supabase, live or local). Needs the user.
- Owner tools got a new tile in the existing tile style. `docs/design.md` says to drop tiles when a screen changes; left for a separate tidy.

## Gotchas
- The React Compiler bailed out of all of ShotTracker over one `setFraming(null)` in an effect cleanup. It showed as impure-call errors in unrelated functions. Fixed by moving the check to `useFramingCheck.ts`. Bisect by stubbing or cutting, not by reading the errors.
- `scripts/build-migration-check.mjs` does nothing on Windows (its run-directly check compares mismatched paths). Import `buildCheck` and call it instead.
- Bash heredocs here drop backslashes; write scripts containing `\` with the file tool.
- Merging follows the agent-os rules: the founder names the PR ("merge 51"), checks green, `gh pr merge --match-head-commit <sha>` so nothing pushed after the yes slips in. Docs changes to main also go through a PR.
- Supabase is unreachable from this sandbox, so signed-in checks fail ("Failed to fetch"). A temporary page under `/parents/` was used and then deleted, along with `.next/dev`.
