# Sample clip, camera start, Next.js security and dashboard spacing fixes (2026-10-23)

Agent: Claude Code · Commits: see `git log -- src/lib/video/sampleClip.ts` · Status: rim fix and sample start fix merged (oconnorjack668-code/Deadeye#36, #37); camera fix and Next.js 16.4.2 merged (#38); club card spacing pushed to `agent-os`

## Outcome
- On the tracker sample clip (landing demo and /welcome/sample), the rim marker ran past the ring onto the bracket. Its far end now sits on the ring's far edge. The user spotted it.
- The sample sometimes sat on a black screen saying "Starting…" until a reload (the user hit it twice). The clip was attached on the next animation frame; after the landing page's download await, that frame could come before the video had rendered, so the clip was never attached. It is now attached in an effect once the video exists.
- The live camera had the same race after `await getUserMedia`: a black picture. Camera, file and sample now all go through one `attachRef` effect.
- Next.js 16.4.0 to 16.4.2: fixes two critical remote code execution advisories (image optimiser with SVG, `use cache` typed arrays) and a Server Actions denial of service. vite and vitest bumped by `npm audit fix`.
- Dashboard: "Pick your club" sat flush against the workload box below it; both of its states now carry `mb-4` like the cards around it. The user spotted it.

## Decisions
- Exposure before the upgrade: Server Actions are used (4 files), so the denial of service applied; `next/image` is used but SVG optimisation is not enabled, and `use cache` is not used.
- The promo video was checked and needs nothing: a plain `<video>` with its `src` in the markup, H.264 with moov first, decodes cleanly, range requests served.
- The far tap moved from (0.5865, 0.1991) to (0.5736, 0.2034): 0.79 of the way between the old taps, the same point the promo fix used ([promo-rim-line-fix](2026-10-21-promo-rim-line-fix.md)). Checked on a zoomed poster frame. The near tap was already on the ring's edge and did not change.
- Bench (`DEADEYE_BENCH_APP=1`, 30 fps) on `public/samples/tracker-sample.mp4`: 5 of 5 calls right, the 20.3s make never called. The old taps gave the same result. With the new taps the makes cross nearer the centre (0.05 to 0.09 half-rims, was 0.25).

## Where things are
- `src/lib/video/sampleClip.ts`: `SAMPLE_RIM`.
- `src/components/video/ShotTracker.tsx`: `attachRef` and its effect, under `openFile`.

## Open
- 5 high `npm audit` findings remain, all `braces` via `fast-glob` inside `eslint-config-next`: lint tooling only, never shipped. npm's fix downgrades to Next 14, so left until Next updates it.
- On this machine the bench did not match the 6 of 6 noted on 21 Oct for the 1280 re-encode (both tap sets miss the 20.3s make). That predates this change, and is the bench only: in the app the founder sees the sample call all six. The marketing drafts briefly claimed the sample misses a make; corrected.

## Gotchas
- Repro: a local `next dev` plus Playwright (Pixel 7) pressing play 12 times left the clip unattached once; after the fix 0 of 30. Playwright's Chromium cannot play H.264, so the play-through check served a VP9 WebM copy of the clip through `page.route` (10 of 10 playing within 1.3s).
- The camera was tested on a temporary page under the public `/parents/` path (removed, never committed), with Chromium's fake camera and getUserMedia delayed up to 40ms: 10 of 20 black before, 0 of 35 after. Delete `.next/dev` after removing such a page or `next build` fails on its stale types.
- `next dev` stops once to print the security notice; run it again.
- The live site is deadeyeapp.vercel.app (deadeye.ie is not bought yet). This container cannot reach it (network policy); the user can add it under Allowed domains.
- The bench prints through `console.log`, which vitest hides here. Set `DEADEYE_BENCH_OUT` to a file and read that.
