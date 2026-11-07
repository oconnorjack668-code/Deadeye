# Tracker: new personal best % after a session (2026-11-02)

Agent: Claude Code (Opus 5.5) · Branch: `feat/tracker-personal-best` · PR #60 · Status: merged on the founder's word ("just merge it") without the signed-in preview check

## Outcome
- In review, a tracked session of 20+ shots that beats the player's best saved session % says "New personal best: 72%" and gives the old best; with nothing to beat yet, "Personal best set: 45%". It uses the calls as corrected in review, since those are saved.
- A saved video of the whole session shows "NEW PERSONAL BEST" on its end card.

## Decisions
- 20 shots minimum on both sides (`MIN_PB_ATTEMPTS`): 3/3 = 100% would be a best nothing could beat.
- Beaten on the % shown (rounded), so it never says "new best 65%, was 65%".
- Compared against all saved shooting sessions, hand-logged too, not only tracked ones: it is the player's best %.
- Filtered by the player's own `user_id`: a coach can read their players' sessions.
- Loaded when a run starts (online at setup, before this session is saved). Offline, signed out or on the sample: nothing is claimed.
- End card: only a whole session made to the end, since a part of one is not a session's %.

## Where things are
- `src/lib/video/personalBest.ts` (+ `__tests__/personalBest.test.ts`, 9 tests)
- `ShotTracker.tsx` review card and load; `TrackerVideoExport.tsx` `best` prop; `overlayArt.ts` end-card badge

## Checks run
- tsc, ESLint, the tests; the end-card badge drawn in headless Chromium in both shapes. The Vercel preview built.

## Open
- **Not seen working signed in.** The preview needs the tester sign-in, which Claude can't do. Founder to check on a phone: track 20+ shots (or add makes in review past 20) and look for the card. Don't save test sessions on the live DB unless meant.
- A live banner mid-session when the running % passes the best was not built (the founder asked for "after it's tracked").

## Gotchas
- The preview redirects to /login; Claude can't enter passwords, so signed-in preview checks wait for the founder ([[preview-checks]] memory).
