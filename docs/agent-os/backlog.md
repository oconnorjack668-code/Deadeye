# Activation backlog

The experiments, ranked. activation-analyst adds and ranks them and marks
exactly one `NEXT`; builder takes that one; the founder approves the merge.

Status: `idea` · `NEXT` · `building (branch)` · `review` · `shipped YYYY-MM-DD` · `kept` · `dropped` · `founder`

Each item:

```
## E<n> · <title> · <status>
- Hypothesis: <why players stall here>
- Change: <the smallest change that tests it>
- Signal: <the funnel step that should move, and by how much>
- Safety: <safety-reviewer verdict>
- Founder checklist: <from release-checker>
- Result: <after a week live: the numbers, then kept or dropped>
```

## E1 · First log opens in "Enter totals" · review (exp/E1-totals-first-log)

Report: [2026-10-22](reports/2026-10-22-activation.md) · Branch: `exp/E1-totals-first-log` (commit 34cd6a8, 1 commit ahead of main)

- Hypothesis: the welcome screen, the Today card and the starting steps all promise "tap where you shot from,
  then how many went in" (Enter totals). But `src/app/(app)/basketball/new/page.tsx` opens a new player in
  "Track every shot" (`useState('track')`), which needs a MAKE or MISS tap after every shot while shooting.
  It cannot log a session from memory, and leaves the mode switch to an unguided choice.
- Change: a player with no saved session and no saved mode preference (`hoopiq-hoops-prefs-v1`) opens the
  logger in Enter totals. A saved preference still wins, so returning players are unchanged. Update
  `__tests__/hoops-logging.test.tsx`.
- Signal: finished setup to first hoops session within 7 days, from 18% (3 of 17) towards 30%, read over 2
  weekly data files. Under 30 players this is a hint; weight E0 notes above it. New baseline from
  `/admin/funnel` on 2026-10-22: 0 of 12 ([data](data/2026-10-22-funnel.md)); compare against that.
- Built: the session-count check the first-log tips already make (`basketball/new/page.tsx`) now also
  sets Enter totals when the count is 0 and `hoopiq-hoops-prefs-v1` is empty. Nothing is written to the
  phone until the player changes mode. Offline, signed out, or no answer: Track every shot, as before.
  3 new tests in `__tests__/hoops-logging.test.tsx`; the new-player test fails on main.
- Safety: PASS (2026-10-22). Files: `src/app/(app)/basketball/new/page.tsx`, `__tests__/hoops-logging.test.tsx`.
  Parent gate: no new feature, only the default of the existing logger behind the app's age gate. New
  personal data: none; reads the player's own session count (already read for the tips) and a key on the
  phone, writes nothing. Messages: no new copy; the existing Enter totals tip is neutral. AI provider, public
  surfaces: not touched. Access: client query on `training_sessions` for the signed-in user, under its
  existing row-level security (00002); no new route or table. Test file: no rules apply.
- Release check (2026-10-22): `npx tsc --noEmit` pass (a fresh clone needs `npx next typegen` first, for
  `LayoutProps` in `src/app/layout.tsx`; not this branch). `npx eslint` on both changed files pass.
  `npm test` pass, 729 passed, 1 skipped. New migrations: none. New `.env.example` variables: none.
- Founder checklist:
  1. Migrations to run in the Supabase SQL editor: none.
  2. Env vars to set in Vercel: none.
  3. Merge: on github.com open a pull request from `exp/E1-totals-first-log` into `main` and merge it.
     (Locally: `git checkout main && git merge --ff-only exp/E1-totals-first-log && git push`.) Then merge
     `agent-os` into `main` the same way, so the backlog and reports land too.
  4. After Vercel deploys, check deadeyeapp.vercel.app with a tester account that has no saved session,
     in a private window: Log shots opens with "Enter totals" pressed and the "Step 1 of 3" tip. It may show
     "Track every shot" for a moment while the app checks for saved sessions.
  5. With an account that has logged before, Log shots still opens in "Track every shot", unless that
     phone has a mode saved.
- Result:

## E2 · "Trained already? Log it" for players away from a court · idea

Report: [2026-10-22](reports/2026-10-22-activation.md)

- Hypothesis: most new players sign up away from a court. The "Not right now" branch of
  `src/app/(app)/welcome/WelcomeClient.tsx` and the end of the sample (`welcome/sample/SampleClient.tsx`)
  offer reminders, the IQ question and the tracker, but never logging a session they already trained today.
- Change: a "Trained today already? Log it by hand" link to `/basketball/new` on the "later" branch, and a
  "Log shots by hand" button beside "Open the tracker" in the sample's end card.
- Signal: first session within 7 days of setup, 18% towards 30%; and first sessions saved on the day of setup.
- Safety:
- Founder checklist:
- Result:

## E3 · Markers for the welcome answer and the by-hand logger · idea

Report: [2026-10-22](reports/2026-10-22-activation.md)

- Hypothesis: nothing is recorded between `welcome_seen` and a saved session on the by-hand path, so a
  stall at welcome, dashboard or logger looks the same in the counts.
- Change: add `welcome_court`, `welcome_later`, `log_opened` and `log_finish_opened` to `src/lib/events.ts`.
  Call `track()` in `WelcomeClient.tsx` and `basketball/new/page.tsx`, and list them on `/admin/funnel` and
  in `docs/funnel-counts.sql`. No migration: the `app_events` name check is a regex (00045).
- Signal: not activation itself; the next data file shows a count at each by-hand step.
- Safety:
- Founder checklist:
- Result:

## E0 · Ask 5 players why they stopped · founder

- Hypothesis: the players know why, and 5 answers beat a week of guessing at 17 players.
- Change: the founder messages 5 players who finished setup and logged nothing:
  what did you expect the app to do, what stopped you logging, what would
  make you open it after training.
- Signal: answers, paraphrased without names, in `data/YYYY-MM-DD-notes.md`.
- Result:
