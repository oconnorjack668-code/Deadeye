# First-run tutorial, starting steps and the promo on the website (2026-10-21)

Agent: Claude Code (Opus 5.5) · Commits: this one · Status: shipped

## Outcome
- The landing page plays the promo (voice cut, 720p, 3.4 MB) in the "Put the phone down. Shoot." section.
- Onboarding now ends on `/welcome`: "Are you at a court right now?" Yes shows the rim-tap loop, placement tips and the camera/by-hand choice. No offers reminders, the sample clip and the IQ question.
- `/welcome/sample` runs the real tracker on a bundled 34s clip with the rim preset. Nothing is saved, and it compares its call with the real answer (4 of 6).
- The dashboard shows four starting steps (home screen, sample, IQ question, first shots) and a one-off +150 XP bonus for finishing them.
- The shot logger shows step-by-step tips until the first session is saved. The first save gets a celebration on `/basketball` or `/basketball/[id]` (`?saved=1`).

## Decisions
- No migration for the bonus. It is a `reward_events` row (`milestone_reached`, badge_id `starter-steps`): server-only inserts (00018), and the unique index pays it once (Claude).
- Bonus XP added at the user's request, as its own "Starting steps" line in the XP breakdown, not a badge (user).
- Home screen and sample are per-device localStorage flags. The API checks the session and IQ answer in the database before paying out, so faking the other two gains 150 XP once at most (Claude).
- Sample clip is bench clip 16606, first 34s, re-encoded to 1280 H.264 (original is HEVC, which some Android Chrome can't play). Bench (`DEADEYE_BENCH_APP=1`): 6 of 6. Headless Chrome: 4/6 correct, one shot flagged unclear and guessed right (Claude).
- `.mp4` added to the proxy's static-file exclusions. Without it, logged-out visitors were redirected to /login for the promo (Claude).
- Starting steps hide the separate install nudge while shown (one nudge at a time).

## Where things are
- `src/lib/starter.ts`: steps, bonus id/XP, localStorage keys
- `src/app/api/starter-bonus/route.ts`: pays the bonus; tests in `__tests__/starter-bonus.test.ts`
- `src/app/(app)/welcome/` (welcome + sample), `src/components/StarterSteps.tsx`
- `src/components/basketball/FirstLogGuide.tsx`, `FirstSessionCelebration.tsx`
- `ShotTracker` `sample` prop (`TrackerSample`): preset rim, no save
- `public/promo/` (landing promo, rim-tap loop), `public/samples/` (sample clip + poster)

## Open
- Re-run the activation counts in a week or two to see whether new players log a first session more often (user, SQL editor; see memory `usage-snapshot`).
- A dedicated non-owner test account would let Claude check signed-in pages end to end. Waits on the user creating one (not the owner login).

## Gotchas
- React Compiler lint: a caller of `startTracking` declared above it made the compiler treat `startTracking` and `startFromSavedRim` as render code ("Cannot call impure function"). Fixed by declaring the sample functions below `startTracking`. Passing them to `<Button>` doesn't help.
- `TaskStop` on `next dev` left the server holding the port. A second start failed with EADDRINUSE. Kill it by port (`Get-NetTCPConnection -LocalPort`).
- The bench prints nothing under vitest's default reporter. Set `DEADEYE_BENCH_OUT` to a file.
- Playwright 1.55 wants a different Chromium than the one installed. Pass `executablePath` to `ms-playwright/chromium-1234`.
- Signed-in pages were previewed through a throwaway public route (deleted, not committed).
