# Cron and crash check; plan for the 3 new test clips (2026-11-07)

Agent: Claude Code (Opus 5.5) · Commits: this handoff only · Status: crash reports closed; reminders wait on the founder; clips not started

## Outcome
- **Training reminders** fail every day (503 "VAPID keys missing"): production has never had push keys. Its clean-up part still runs before that check (old reports, unapproved under-16 accounts: `removed 0`). Weekly AI report is fine.
- **The 2 crash reports** came from the 3 Nov live debugging of Find the hoop, before #65: `importScripts` at 15:12 UTC (#63's Turbopack module worker), the 15s start limit at 15:27 (#64). #65 (plain worker, 15:44) fixed both; nothing since. Marked resolved. The tracker's own bundled worker is not affected (the 1 Nov saved session ran in it; frames came back live on 3 Nov).
- **3 new shooting clips** recorded 4 Nov, not yet labelled or run. The plan below is for the next session.

## The 3 new clips
- On the founder's phone, seen on the laptop through Phone Link: `C:\Users\Vivobook S16\CrossDevice\Jack's S25 FE\storage\DCIM\Camera\` → `20261104_172123.mp4` (261 MB), `20261104_172532.mp4` (274 MB), `20261104_172910.mp4` (342 MB). Not probed yet (size, fps, length).
- Why they matter: the tracker has been tuned and scored on the same 2 clips (`16606`, `16761`). These are its first unseen footage, so the first run is the honest score.

## Testing plan, in order
1. **Pull first.** The laptop's `main` checkout is behind `origin/main`; `scripts/bench-suite.mjs` exists only there. Work in a worktree off `origin/main`.
2. **Copy the originals** (cable or Phone Link copy, never WhatsApp) to `Documents/deadeye-bench`, named e.g. `clip3.mp4`…`clip5.mp4`. ffprobe each; note angle, distance, light, mount, and whether other people or a second ball are in shot.
3. **Pick the hold-out now**, before any tuning: the clip least like 16606/16761. Write it in its `note`. It is run once at the end and never tuned on.
4. **Label every shot**: rim taps on the ring's two edges (not the bracket), every attempt's time and which went in. Fastest: run the bench on each clip for a draft list (times, calls), then the founder watches the **whole** clip and corrects it, adding shots the tracker never called. "Save for the test library" drops hand-added shots (no time), the very misses we need, so add their times by hand. Matching tolerance is 1.0s for makes, 1.5s for attempts; 0.05s precision is plenty. Add the clips to `scripts/bench-suite.json`.
5. **Baseline before any code change**: `node scripts/bench-suite.mjs --label=baseline-nov7` (all clips, all 8 versions). Keep `out/baseline-nov7/summary.txt`; report right / missed / wrong / phantom / unsure per clip.
6. **Diagnose** each wrong or missed call with `DEADEYE_BENCH_TRACE`, `_NETTRACE` and `_START`/`_END` on that shot. Group by cause; fix the biggest group first. Known weak spots: 10 fps (clip1 4/10), wobbly mount, far small rim.
7. **Accept a change only if** the total rises, no clip drops, 16606 and 16761 stay 10/10 and 31/31 as filmed, and phantoms do not rise. Then score the hold-out once and report it as the real number.
8. **Rim finder**: take ~12 frames per clip and score them with `__tests__/rimFinderBench.test.ts` against the edge taps. It has only been measured on the 2 old courts (and found 2–3 rims on clip 2). Retraining with these frames comes later, keeps the hold-out's frames out, and needs consent from anyone else in shot before frames go to Colab/Drive.

## Where things are
- `scripts/bench-suite.mjs`, `scripts/bench-suite.json`, `__tests__/clipBench.test.ts`; README "The bench suite"
- `Documents/deadeye-bench/` (clips, `variants/`, `out/<label>/summary.txt`, `rim-result/`, `eval-frames/`)
- [tracker-accuracy-bench handoff](2026-11-03-tracker-accuracy-bench.md), [rim-finder handoff](2026-11-03-rim-finder.md)

## Open
- **DONE 2026-11-07, do not raise again:** the founder added the push keys that day. `cron_runs` shows every reminders run from 7 Nov on returns 200 (the last 503 "VAPID keys missing" was 6 Nov). Original note, kept for reference: A key pair was generated (`.claude/jobs/1738f077/tmp/vapid.json` in the user folder; deleted with this job, else `npx web-push generate-vapid-keys`). Vercel → Settings → Environment Variables, Production: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = publicKey, `VAPID_PRIVATE_KEY` = privateKey (Sensitive). Then redeploy: the public key is built into the page. Check: Profile → Turn on notifications → Send a test; the next 16:28 run shows Worked at `/admin/cron-runs`. Never change the pair after players subscribe.
- Next session: steps 1–8 above.

## Gotchas
- Auto mode refuses Vercel env writes (Secret-Store Writes); the founder sets secrets.
- Bench gotchas from 3 Nov still apply: ffmpeg not on PATH (full winget path), `py` not `python`, never edit tracker source while a suite runs, Set-Content's BOM breaks JSON.
