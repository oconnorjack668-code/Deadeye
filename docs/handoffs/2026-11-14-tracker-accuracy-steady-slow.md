# Tracker accuracy: steadier picture, slow phones, the 9 Nov fixes merged (2026-11-14)

Agent: Claude Code (Fable 5.2, then Opus 5.5) · Commits: d10207d (merge of `bench/new-test-clips`), e36e887, 985fb2b · PR: #108 (draft) · Status: in review

## Outcome
- Founder asked (13 Nov) whether more Roboflow images would help, then to improve accuracy with the recorded clips only. More images would not: the trained model only finds the hoop; make/miss is motion logic. Work went into that logic.
- Bench suite, 32 runs (clips 1-4, 8 conditions): **535 to 595 right of 656 (81.6% to 90.7%)**, never called 63 to 16, calls with no shot 7 to 5. Every clip as filmed the same or better. 10 fps 39 to 68 of 82, 15 fps 71 to 77, wobbly 56 to 65, small-dim-slow 60 to 72.
- Hold-out clip 5 (never tuned on), scored once on 6 of its 8 versions: **120 to 133 of 174 (69.0% to 76.4%)**, no version worse; as filmed 21 to 22 of 29.
- The 9 Nov branch `bench/new-test-clips` (clips 3-5, rattle-out fix, phantom fix) had never reached main; it is merged here.

## Decisions
- Steadier (`stabilise.ts`) slides by whole pixels only: sub-pixel slides softened frames unevenly and lost calls on clip 1's half-size, 15 fps and hard versions. Whole-pixel moves followed on the frame they happen (0.9px), smaller drift after 3 readings.
- Kept despite clip 4 wobbly 20 to 15: that test video moves in near-1px steps (ffmpeg crops at even pixels), the worst case for whole-pixel rounding; real clips drift smoothly (clip 1 sags 2.8px over 51s, clip 2 knocked 2px at 86s, both measured frame to frame) and the steadier is +12 on clip 2, +5 on clip 3.
- Shot detector held 2 frames behind the tracker (`HOLD_FRAMES`) and given the ball's first sightings; `finish()` returns a list (engine, worker, ShotTracker updated).
- Slow phones: 2 far-apart sightings are a ball in flight; a ball that reached the ring and vanished is judged by the net with 3x the late swing (`VANISHED_AT_RING`), always unsure. A rule for a ball first seen dropping out of the net was considered and not built: it is where a front-rim miss falls too.
- Four runs lost a call or more (clip 4 wobbly 5, clip 1 fps15, clip 3 hard, clip 4 dim 1 each); founder to accept or not.

## Where things are
- Speed: about 0.7 ms a frame more on the laptop (3.7-4.1 to 4.6-4.7 ms on clip 1); slid frames use a ring of 4 buffers.
- `src/lib/video/stabilise.ts`, `trackerPipeline.ts` (HOLD_FRAMES), `ballTracker.ts` (slow flight, `recent()`), `shotDetector.ts` (VANISHED_AT_RING)
- `__tests__/stabilise.test.ts`, `trackerConditions.test.ts`; bench `DEADEYE_BENCH_NOSTEADY`, `DEADEYE_BENCH_STEADYTRACE`
- README "The bench suite"; reports in `Documents/deadeye-bench/out/n13-all-clip*`, `n13-holdout-*`

## Status changes
- Closed: none
- Opened: S36

## Gotchas
- Running two bench suites at once ran the laptop out of memory (Claude Code stopped one). Run one clip at a time; freeze a copy of the code outside the worktree so edits do not corrupt a run.
- The grain variants (`dark`, `hard`) of clip 5 took hours to encode overnight; clip 5 was scored without them.
- Python scripts writing TypeScript turned `'\n'` into a real line break twice; check with `tsc` after scripted edits.
- Worktree isolation refuses git commands writing outside the worktree; `git archive -o` inside it, then move the file.
