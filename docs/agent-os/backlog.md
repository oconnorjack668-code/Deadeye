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

## E1 · First log opens in "Enter totals" · kept (shipped 2026-10-22)

Report: [2026-10-22](reports/2026-10-22-activation.md) · Branch: `exp/E1-totals-first-log` (commit 34cd6a8, 1 commit ahead of main)

- Hypothesis: the welcome screen, the Today card and the starting steps all promise "tap where you shot from,
  then how many went in" (Enter totals). But `src/app/(app)/basketball/new/page.tsx` opens a new player in
  "Track every shot" (`useState('track')`), which needs a MAKE or MISS tap after every shot while shooting.
  It cannot log a session from memory, and leaves the mode switch to an unguided choice.
- Change: a player with no saved session and no saved mode preference (`hoopiq-hoops-prefs-v1`) opens the
  logger in Enter totals. A saved preference still wins, so returning players are unchanged. Update
  `__tests__/hoops-logging.test.tsx`.
- Signal: finished setup to first hoops session within 7 days, from 11% (2 of 18,
  [2026-10-22](data/2026-10-22-funnel.md)) towards 30%, read over 2 weekly data files. Under 30 players this
  is a hint; weight E0 notes above it.
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
- Live check (2026-10-22, founder): merged to main (pull request 18). A new account's first log opens in
  Enter totals; an account that has logged before still opens in Track every shot.
- Result (2026-11-09, [report](reports/2026-11-09-activation.md)): 3 of 24 (12%, range 4% to 32%) against 2 of 18 (2% to 34%); a hint only, and the one new session marker is a tracker save. No signups since 2026-10-24, so almost no new player has met it. **kept** by default, not confirmed; re-read after two weeks of new signups.

## E2 · "Trained already? Log it" for players away from a court · kept (shipped 2026-10-25)

Report: [2026-10-22](reports/2026-10-22-activation.md) · Branch: `agent-os` (commit 204d097)

- Hypothesis: most new players sign up away from a court. The "Not right now" branch of
  `src/app/(app)/welcome/WelcomeClient.tsx` and the end of the sample (`welcome/sample/SampleClient.tsx`)
  offer reminders, the IQ question and the tracker, but never logging a session they already trained today.
- Change: a "Trained today already? Log it by hand" link to `/basketball/new` on the "later" branch, and a
  "Log shots by hand" button beside "Open the tracker" in the sample's end card.
- Signal: first session within 7 days of setup, 11% towards 30%; and first sessions saved on the day of setup.
  Read with E3's `log_opened` and `log_finish_opened` (how many reach the logger, and how many reach Finish).
- Built: the link sits as one quiet orange line above the reminders card (the sample stays the one highlighted
  row), padded to a 44px tap target; on the sample's end card it is an outline button between "Open the tracker"
  and "Back to my dashboard". Nothing else changes: both go to the existing logger, which already opens a
  first-time player in Enter totals (E1). Tests: `__tests__/welcome-activation.test.tsx` (the link on the later
  branch only, the button once the sample is watched); 4 of its tests fail on main.
- Safety: PASS (2026-10-25), after one BLOCK that was fixed. Files: `welcome/WelcomeClient.tsx`, `welcome/sample/SampleClient.tsx`.
  Parent gate: both links go to pages under `(app)/layout.tsx`, which sends ask-age and needs-parent players
  away before rendering, so no gate is bypassed. New personal data: none. Messages: the two link labels are
  neutral, no urgency or guilt. AI provider, public surfaces: not touched.
- Release check (2026-10-25): `npx tsc --noEmit` pass. `npx eslint .` clean, no warnings. `npm test` pass,
  870 passed, 1 skipped. New migrations: none. New `.env.example` variables: none.
- Founder checklist:
  1. Migrations to run in the Supabase SQL editor: none.
  2. Env vars to set in Vercel: none.
  3. Merge the pull request that holds `agent-os` into `main` on github.com.
  4. After Vercel deploys, on a test account in a private window: sign up, answer "Not right now". "Trained
     today already? Log it by hand" shows under the intro, and opens the logger in Enter totals.
  5. Open Watch the tracker call a session, let it finish: the end card has Open the tracker, Log shots by hand
     and Back to my dashboard.
- Result: read after two weeks live, from `/admin/funnel` "Everyone", against 2 of 18 (11%). Merged and live 2026-10-25 (PR #45). As of 2026-11-01 no player has signed up since 2026-10-24, so nobody has reached it yet: the two weeks start from the first new signup. 2026-11-09: still none (33 joined, unchanged), welcome answers 0 and logger opens 0. **kept** by default, not confirmed.

## E3 · Markers for the welcome answer and the by-hand logger · kept (shipped 2026-10-25)

Report: [2026-10-22](reports/2026-10-22-activation.md) · Branch: `agent-os` (commit 204d097)

- Hypothesis: nothing is recorded between `welcome_seen` and a saved session on the by-hand path, so a
  stall at welcome, dashboard or logger looks the same in the counts.
- Change: add `welcome_court`, `welcome_later`, `log_opened` and `log_finish_opened` to `src/lib/events.ts`.
  Call `track()` in `WelcomeClient.tsx` and `basketball/new/page.tsx`, and list them on `/admin/funnel` and
  in `docs/funnel-counts.sql`. No migration: the `app_events` name check is a regex (00045).
- Signal: not activation itself; the next data file shows a count at each by-hand step.
- Built: `welcome_court` and `welcome_later` when a player taps their answer; `log_opened` when the logger
  page opens (either mode); `log_finish_opened` when Finish opens, which needs something logged. They show
  as two new rows under Welcome and a new "Logging shots" group on `/admin/funnel`, so they are also in the
  weekly counts file the Monday job writes (it reads the groups as they come). Same table and rules as every
  other step: one row per player, step and day. Tests: `welcome-activation.test.tsx`, `funnel.test.ts`,
  `hoops-logging.test.tsx`; the new ones fail on main.
- Safety: BLOCK, then PASS (2026-10-25). Files: `events.ts`, `funnel.ts`, `docs/funnel-counts.sql`,
  `basketball/new/page.tsx`, `welcome/WelcomeClient.tsx`. The reviewer blocked on two points, both fixed in this
  branch: the privacy policy (`src/app/privacy/page.tsx`) now names the welcome answer and the shot logger steps,
  and `app_events` is now in the data export (`api/account/export/route.ts`, with a test; it was missing for the
  older steps too). New personal data otherwise: none beyond a step name tied to the player id, one row a day,
  deleted with the account and after 90 days. The new counts are counts only: `/admin/funnel` is owner-only, the
  weekly file prints set sizes. Note: the funnel has no small-number suppression, so a count of 1 in the 7-day
  column is close to a statement about one player; the repo holding `docs/agent-os/data/` must stay private.
- Release check (2026-10-25): as E2 (same branch, same run).
- Founder checklist:
  1. Migrations to run in the Supabase SQL editor: none.
  2. Env vars to set in Vercel: none.
  3. Merge: with E2, the same pull request.
  4. After Vercel deploys, do the E2 live check on a test account, then open Log shots and press Finish with a
     spot logged. At `/admin/funnel` the new rows show 1 at each step you reached (the page counts players who
     joined in the window, so use a new test account).
  5. The next Monday data file in `docs/agent-os/data/` has the new rows under Welcome and "Logging shots".
- Result: read in the next data file, then after two weeks. As of 2026-11-01: 0 rows for all four steps, as expected with no signups since 2026-10-24 (not a fault). 2026-11-09: still 0 for real players, so the markers are unverified in production (test accounts are left out of the counts). **kept**; confirm on the first real signup.

## E4 · Training-days reminder on the dashboard for a player with no session · shipped 2026-11-09

Report: [2026-11-09](reports/2026-11-09-activation.md)

- Shipped: PR #74, merged and live 2026-11-09. Follow-up (branch `fix/e4-followups`, from the three safety
  notes): default days show as "Suggested" until reminders are on; a message after each save says what is still
  missing; `reminder_set` now fires only when reminders end up on (turned on, or days changed while on), so read
  it as reminders that can arrive; the privacy clause says so in its own sentence.

- Hypothesis: barrier **forgot** (no cue). About 17 of the 24 who finished setup did so before the welcome
  screen existed (10-21) and never saw its reminders card; `dashboard/page.tsx` has no reminder prompt, and
  reminders live only on the welcome "later" branch and the profile. Unconfirmed until E0 notes arrive.
- Change: for a player with no saved session, show the existing `RemindersCard` (`showWeekly={false}`) on the
  dashboard under the Today card and starting steps, with the copy "When do you next train? Pick your days."
  Nothing is asked on load: the card's existing tap flow asks for push permission. Add one marker,
  `reminder_set`, fired when the player saves training days (`src/lib/events.ts`; no migration, the name check
  is a regex). iPhone not installed to the Home Screen: no web push there; the card already says to add
  Deadeye to the Home Screen, and the reminder is the only thing lost, so reach is lower than it looks.
- Signal: `reminder_set` count, then first session within 7 days from 3 of 24 (12%). Under 30 players: a hint.
  Needs new signups or returning stalled players to read at all.
- Safety: PASS (2026-11-09), commit 9b23ff3, with three non-blocking notes. Files: `dashboard/page.tsx`,
  `profile/RemindersCard.tsx`, `events.ts`, `funnel.ts`, `docs/funnel-counts.sql`, `privacy/page.tsx`. Parent gate:
  the dashboard sits in the `(app)` layout, which sends under-16s without approval to `/parent-approval`. Personal
  data: one more step name in `app_events` (no free text), in the privacy policy, in the export, deleted with the
  account and after 90 days. Wording: neutral and a question, no urgency. Push permission only after the tap on
  "Turn on notifications on this device". Notes: (1) the policy clause says "saving training days" but the marker
  also fires on turning "Remind me" on; say "or turning reminders on", and split the clause into its own sentence
  (`privacy/page.tsx:122`). (2) The Mon/Wed/Fri default shows as picked before anything is saved, and a day tap
  gives no message; "Pick your days" can read as done with no reminder set until notifications are turned on.
  Consider "Saved. Turn on notifications to get the reminder." (3) `reminder_set` fires on a day tap even with
  reminders off, so it counts days saved, not reminders that can arrive; read it that way. DPIA: no new kind of
  processing (existing events table, existing push address); mention the step in the next DPIA update.
- Founder checklist (release-checker, 2026-11-09, branch `exp/E4-dashboard-reminder`, commit 9b23ff3, up to date
  with `origin/main`). Checks: types pass, eslint on the 7 changed files pass, tests pass (1021 passed, 2 skipped).
  No migrations. No new env vars. Skills: deploy-checklist was not installed, so this follows the release-checker
  knowledge file's checklist.
  1. Migrations to run in the Supabase SQL editor: none. The `reminder_set` name fits the existing `app_events`
     name rule (`^[a-z_]{1,40}$`), so nothing to run.
  2. Env vars to set in Vercel: none new. The card already reads `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; confirm by name
     that `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are both in Vercel Production (Settings ->
     Environment Variables). Without them the card's push button cannot work. If you had to add either, then
     redeploy (the public one is built into the page until you do). Never change the pair once players have
     subscribed.
  3. Merge: the agent opens the pull request for `exp/E4-dashboard-reminder` (none exists yet). When its checks are
     green, reply `merge <PR number>`. `main` is protected, so it goes through the pull request, never a direct
     push; the agent merges with `--match-head-commit 9b23ff3`.
  4. After Vercel deploys, at deadeyeapp.vercel.app signed in as the tester account (use one with no saved
     session, or a new test account):
     - Dashboard shows the "Training reminders" card reading "When do you next train? Pick your days." with no
       weekly-report toggle, and the browser does not ask for notification permission on load.
     - Tap a day: it saves with no error. Tap "Turn on notifications on this device" on a phone installed to the
       Home Screen: the permission prompt appears only then.
     - Save a session for the tester account: the card is gone from the dashboard.
     - `/admin/funnel` shows a "Reminders" row with 1 after you saved days (new test account; test accounts may be
       left out of the counts, as with E2).
     - Open `/privacy`: the events clause mentions saving training days.
  5. If it is broken: Vercel -> project -> Instant Rollback, then "Undo Rollback" once fixed. No migration to undo.
  - Known, non-blocking (from the safety notes, builder may fix in a follow-up): (1) the privacy clause should say
    "or turning reminders on" and be its own sentence (`privacy/page.tsx:122`); the marker fires on that too, so
    until fixed the policy is slightly narrower than the behaviour. (2) The Mon/Wed/Fri default shows as picked
    before anything is saved, with no "saved" message. (3) `reminder_set` means days saved, not a reminder that
    can arrive, and fires from any RemindersCard (profile, welcome, dashboard); read it that way.
- Result:

## E5 · Tracker "no shots detected" offers a by-hand log · idea

Report: [2026-11-09](reports/2026-11-09-activation.md)

- Hypothesis: barrier **can't**. `components/video/ShotTracker.tsx` (l.1849) shows only advice when a run finds
  0 shots, and Save errors; the player's only ways on are adding shots by hand or starting over. 2 players
  reached results and 1 saved.
- Change: below that text, a "Log this session by hand" link to `/basketball/new`.
- Signal: tracker saved plus first session, from 1 of 2 who reached results. Hint at best (2 players).
- Safety: <safety-reviewer verdict>
- Founder checklist: <from release-checker>
- Result:

## E6 · Markers for the dashboard and the Today card · idea

Report: [2026-11-09](reports/2026-11-09-activation.md)

- Hypothesis: the dashboard is where a stalled player returns, and nothing records arriving there or tapping
  "Log shots", so a stall before the logger looks like no activity.
- Change: add `dashboard_seen` (zero-session players) and `today_log_tapped` to `src/lib/events.ts`, list them
  on `/admin/funnel` and in `docs/funnel-counts.sql`. No migration.
- Signal: counts at the two steps in the next data file; not activation itself.
- Safety: <safety-reviewer verdict>
- Founder checklist: <from release-checker>
- Result:

## E0 · Ask 5 players why they stopped · founder

- Hypothesis: the players know why, and 5 answers beat a week of guessing at 17 players.
- Change: the founder messages 5 players who finished setup and logged nothing:
  what did you expect the app to do, what stopped you logging, what would
  make you open it after training.
- Signal: answers, paraphrased without names, in `data/YYYY-MM-DD-notes.md`.
- Result:

## C4 · Parents of 16 and 17 year olds can see coach posts · idea
- Hypothesis: a DSCO checks that coach contact with minors includes other adults (BI social media policy). Parents of under-16s see every coach post on their approval link; parents of 16 and 17 year olds have no link, so a club with U16 to U18 teams (the Wexford Blazers have U18) may stop at the DSCO.
- Change: let a 16 or 17 year old's parent receive the same read-only view of coach posts, by a parent email the player enters and the parent confirms. No messages, no new data shown to the coach. Founder decides the consent and data-protection wording first (parent emails are personal data; deadeye.ie and Resend already exist).
- Signal: not a funnel step. It unblocks a trial team with players aged 16 and 17; read as "a club with U16+ teams starts a trial" and "no DSCO objection on this point".
- Safety: pending (safety-reviewer: minors, parent emails, privacy text).
- Founder checklist: pending.
- Result:
