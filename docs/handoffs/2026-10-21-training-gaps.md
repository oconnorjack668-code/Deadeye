# Phase 5 training gaps (2026-10-21)

Agent: Claude Code (Opus 5.5) · Branch: `training-gaps`, commit 7cc9bee (not pushed) · Status: in progress (built and checked; waits on migration 00048)

Follows [coach-side-c1-c2](2026-10-21-coach-side-c1-c2.md). The gaps came from the October review ([tracker-streaks-gym-avatars](2026-10-20-tracker-streaks-gym-avatars.md)); status is in the plan doc, Phase 5 ([Deadeye next steps plan](https://claude.ai/artifact/RqfLp144xsDgauotzCHkhj)).

## Outcome
- Drill library: new Warm-Up, Off-Ball and Cool-Down skills; 18 new drills (4 warm-ups, 2 cool-downs, 10 off-ball cutting/screening/spacing/transition, 2 team fast-break). 168 drills, 19 team, 71 with no hoop.
- No hoop needed filter and tag; a timer on every drill (reads "3 x 30 seconds", "20 seconds on, 40 off"; otherwise counts down the drill's minutes; beeps, vibrates, keeps the screen on).
- Every programme day starts with the Court Warm-Up and ends with the Cool-Down, and shows each exercise's easier version. Warm-ups in the Train hub.
- Easier versions for 95 exercises (exercise library card and programme days). 10 m and 20 m sprint tests. Guide: Growth Spurts, Sore Knees and Sore Heels.

## Decisions
- Warm-ups and cool-downs are drills, not a new kind of content, so they get the timer, search and favourites for free (Claude).
- Easier versions written for bodyweight, plyometric, core, conditioning and main lifts; machine and isolation exercises left without one, where "lighter weight" is the easier version (Claude).
- Metre sprints are 10 m and 20 m, the distances Irish and European clubs test (Claude).
- The drill count is `DRILL_COUNT` in `src/lib/plans.ts`, checked against the migrations by a test. The promo video still says 150 drills, which stays true (Claude).
- The growing-pains guide is general advice that sends players to a doctor or physio for night pain, swelling, a limp, or hip pain (Claude).

## Where things are
- `supabase/migrations/00048_training_gaps.sql`; `src/lib/drillTimer.ts`, `src/components/DrillTimer.tsx`; `__tests__/trainingGaps.test.ts`.
- Test names in one list: `TEST_TYPES` in `src/lib/performanceTests.ts`.

## Open
- Run 00048 in Supabase, then say push (user). Before it runs, choosing a metre sprint would fail to save, and the new skill chips are empty.
- After the push: check a drill timer, the No hoop filter and a programme day live with the tester (Claude).
- Tracker accuracy: 2 or 3 filmed sessions (user). Demo videos in Owner tools (user).

## Gotchas
- The new test found "Full-Court Layup Challenge" counting makes with no hoop in its equipment; 00048 fixes it, or the filter would have listed it.
- 00048 tested in PGlite like 00047 (loads after all migrations, runs twice). The 25 older exercises live only in the live database (seed.sql), so 22 of the easier versions are only checked there.
