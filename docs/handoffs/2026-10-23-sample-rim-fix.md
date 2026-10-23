# Sample clip rim fix (2026-10-23)

Agent: Claude Code · Commits: see `git log -- src/lib/video/sampleClip.ts` · Status: shipped to `agent-os`

## Outcome
- On the tracker sample clip (landing demo and /welcome/sample), the rim marker ran past the ring onto the bracket. Its far end now sits on the ring's far edge. The user spotted it.

## Decisions
- The far tap moved from (0.5865, 0.1991) to (0.5736, 0.2034): 0.79 of the way between the old taps, the same point the promo fix used ([promo-rim-line-fix](2026-10-21-promo-rim-line-fix.md)). Checked on a zoomed poster frame. The near tap was already on the ring's edge and did not change.
- Bench (`DEADEYE_BENCH_APP=1`, 30 fps) on `public/samples/tracker-sample.mp4`: 5 of 5 calls right, the 20.3s make never called. The old taps gave the same result. With the new taps the makes cross nearer the centre (0.05 to 0.09 half-rims, was 0.25).

## Where things are
- `src/lib/video/sampleClip.ts`: `SAMPLE_RIM`.

## Open
- None. On this machine the bench did not match the 6 of 6 noted on 21 Oct for the 1280 re-encode (both tap sets miss the 20.3s make). That predates this change.

## Gotchas
- The bench prints through `console.log`, which vitest hides here. Set `DEADEYE_BENCH_OUT` to a file and read that.
