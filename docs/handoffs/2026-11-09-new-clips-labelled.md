# 3 new test clips cut, labelled, in the bench suite (2026-11-09)

Agent: Claude Code (Opus 5.5) · Commits: this branch (`bench/new-test-clips`) · Status: in progress (baseline 22 of 32 runs)

## Outcome
- The 4 Nov clips are in `scripts/bench-suite.json` as `clip3`, `clip4`, `clip5`: cut (stream copy, bit-identical frames) from just before the first shot to 2.5s after the last, labelled frame by frame.
- `clip5` is the hold-out. `bench-suite.mjs` now skips any `"holdout": true` clip unless it is named.
- First score on unseen footage: **clip3 as filmed 15/17** (1 missed, 2 phantoms). Old clips unchanged: clip1 10/10, clip2 31/31 as filmed.

## The clips (in `Documents/deadeye-bench/`; originals kept beside them)
| clip | from | cut at | attempts / makes | what it is |
|---|---|---|---|---|
| clip3 | 20261104_172123 | 21.009–172.5s | 17 / 8 | far, side-on wall hoop, rim 2.3% of width (smallest yet) |
| clip4 | 20261104_172532 | 11.014–177.5s | 24 / 4 | low, close, rim at left edge, same hoop as clip3, passes past the lens |
| clip5 | 20261104_172910 | 31.002–223.5s | 29 / 16 | HOLD-OUT: very low, rim top-left corner, two light streaks, two players |
- Label time = original time minus the cut start. Rim taps from a settled frame at 1:00; the mount does not drift.
- The tracker was never run on clip5 (its labels were made by eye, so they owe nothing to its calls).

## Baseline `out/baseline-nov7/` (stopped by Claude Code for low memory; no summary.txt)
- clip1: 10, 10, 10, 10, 10, **4**, 9, 10 /10 (base, lowres, dark, washed, fps15, fps10, shake, hard)
- clip2: 31, 23, 27, 29, 26, **13**, 17, 15 /31
- clip3: 15, 16, 16, 16, 13, **10** /17 (shake, hard not run); clip4: not run
- clip3 as filmed, the 2 wrong: the make at 30.05s called late (32.2s) as a miss; the make at 84.75s called a miss, crossed at 1.44 half-rims (tiny rim). Phantom at 126.6s: a player dribbling.
- Untrimmed drafts (`out/draft-nov7/`): clip4's tracker called the rattle-out at 88.1 (cut time) a make; the setup and someone walking past the lens made phantoms. Cutting removes the setup ones.

## Decisions
- Hold-out is clip5, chosen before any tuning: least like clip1/clip2 (Claude; founder can swap it before tuning starts).
- Cut clips, keep originals: founder asked for cuts from just before the first shot to just after the last.
- Labelled by eye at 5 fps, every unclear shot checked at 30 fps, rather than corrected from tracker drafts, so the labels don't lean toward the tracker.

## Open
- Founder: watch the 3 cut clips against the labels (`scripts/bench-suite.json`); flag any shot missing. Least sure: clip3 30.05 and 84.75 (makes), clip4 81.0 and 101.0 (airballs right of the ring).
- Rerun the baseline when memory allows: `node scripts/bench-suite.mjs clip3 clip4 --label=baseline-nov7` (variants are made; clip1/2 results are in place).
- Then plan steps 6–8 (diagnose, change, score clip5 once; rim finder frames) from the [new-test-footage handoff](2026-11-07-new-test-footage.md).
- Consent: a second player is in clip4 and clip5; ask them before any frames go to Colab/Drive.
- Push keys (from the 7 Nov handoff) still open.

## Gotchas
- `ffmpeg -ss <exact keyframe pts>` decodes one frame later; compare frames with `framemd5`, not `-ss`.
- A 30-run suite outlives a background shell; run it in smaller batches by clip.
