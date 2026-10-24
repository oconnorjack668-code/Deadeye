# Body tracker timestamp crash (2026-10-24)

Agent: Claude Code · Commits: see `git log -- src/lib/video/poseClock.ts` · Status: PR open, not yet merged

## Outcome
- Two crash reports from `/video` ("Packet timestamp mismatch on norm_rect", then "WaitUntilIdle failed") came from the form check and jump test's body tracker. A second analysis started soon after the first could send MediaPipe a timestamp lower than the last, and the shared tracker stayed broken until reload. Fixed.

## Decisions
- Timestamps now come from `nextPoseTimestamp` (`src/lib/video/poseClock.ts`): a module-wide clock that only moves forward, never behind `performance.now()`. The old `performance.now() + counter` restarted its counter every run and ended ahead of the real clock.
- When `detectForVideo` throws, `resetPoseLandmarker()` drops the shared instance so a retry gets a fresh one, and the player sees "The body tracker stopped partway through. Try again." instead of a stuck spinner.

## Where things are
- `src/lib/video/poseClock.ts`, `__tests__/poseClock.test.ts`: the clock and its test (reproduces the old failing sequence).
- `src/lib/video/mediapipe.ts`: `resetPoseLandmarker`.
- `src/components/video/FormCheck.tsx`, `JumpTest.tsx`: callers.

## Open
- Not reproduced in a real browser: MediaPipe's wasm and models load from jsdelivr and googleapis, which this container cannot reach. The fix rests on the arithmetic and the unit test. Worth running the form check twice in a row on a phone after deploy.
- `createBallDetector` is never cached, so the bench is not affected.

## Gotchas
- Crash reports are copied from the owner tools into the chat, with names removed.
