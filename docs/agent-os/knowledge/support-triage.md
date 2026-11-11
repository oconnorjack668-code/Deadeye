# Support triage knowledge

Last researched: 2026-11-07

Read `README.md` in this folder for how this file works.

## Lessons from the founder

Newest first. Seeded 2026-11-07 from real failures in the handoffs.

- 2026-11-07 · The 2 open crash reports were from the founder's own live debugging on 3 Nov, already
  fixed by #65 (`2026-11-07-new-test-footage.md`). Chrome's "network error" on /dashboard was nearly
  chased hours after its fix too (`2026-10-22-signup-email-limit.md`). **Rule:** before ranking a
  crash, check its time against the merge and deploy times of the code it names. A crash older than
  its fix is history, not a P1.
- 2026-11-07 · Training reminders failed every day with "VAPID keys missing" and no player ever
  reported it (`2026-11-07-new-test-footage.md`). **Rule:** silent failures (cron, push, email)
  never arrive as reports. Read `/admin/cron-runs` and the counts too.
- 2026-11-03 · Find the hoop's bundled module worker loaded on the live site but never ran: no
  message, no error. It worked locally and in the webpack build; it was found only because every
  stage had a name and a time limit (`2026-11-03-rim-finder.md`). **Rule:** "works locally" is not a
  reproduction. Reproduce on the live site (Turbopack build, service worker in control) before
  calling a worker, model or cache bug fixed or unreproducible. When the cause is unknown, the
  smallest fix may be a stage name and time limit in the error report.
- 2026-10-25 · "Mark fixed" did nothing for MediaPipe crashes whose messages had line breaks
  (`2026-10-24-founder-notice.md`). **Rule:** group crashes by page plus the stable part of the
  message, never exact text; line breaks, numbers and ids vary.
- 2026-10-24 · Two different-looking crashes ("Packet timestamp mismatch", then "WaitUntilIdle
  failed") were one bug: the first left the shared body tracker broken
  (`2026-10-24-pose-timestamp-crash.md`). The fix rested on a unit test only. **Rule:** when crashes
  come from one page within minutes, ask whether the first caused the rest before splitting them.
  Say when a fix is unproven on a phone and put the phone check in the ticket.
- 2026-10-22 · A sign-up failed on Supabase's email rate limit, not our code; React #418 on the
  log-a-test page came from reading `window` in render (`2026-10-22-signup-email-limit.md`).
  **Rule:** check provider limits before reading code. For a React error number, look for `window`,
  `localStorage` or `Date` in render first.
- 2026-10-17 · Six "Script error." reports from iPhones were noise: no stack, from scripts the page
  does not own (comment in `src/lib/reportError.ts`). **Rule:** before ranking, drop what
  `isIgnoredError` would drop, and flag new noise the filter missed.


## Lessons from results

What the outcome of earlier work taught (see "Results review" in the agent
file). Newest first, each with the date, what happened, and the rule.

- None yet.

## Checklist before the founder sees a triage report

- [ ] Every crash's time compared with the deploy that could have fixed it.
- [ ] Noise removed (stackless "Script error.", extensions, in-app browser scripts, dropped
      connections) and the number removed given.
- [ ] Duplicates grouped by page plus the stable part of the message; possible chains (one crash
      causing the next) named.
- [ ] Each group has: phone and browser if known, home screen app or tab, page, what the player did,
      what they expected, what happened.
- [ ] Each cause points at a file and line, or says "not found from the code" and what would tell
      more (a stage name, a time limit, a log).
- [ ] Rank follows the P1/P2/P3 rules: lost data or a blocked first session is P1 from one report.
      The severity reason (crash, data loss, workaround or not) is written beside the rank.
- [ ] The phone traps below that match the symptom were checked.
- [ ] Silent failures checked: `/admin/cron-runs`, empty lists that could be RLS, push keys.
- [ ] Each fix ticket names the phone check the founder must run and says whether the fix is proven
      in a browser or only in a test.
- [ ] No name, email, id or identifying quote copied anywhere.

## Research

Findings with their sources are in `findings/support-triage.md`. Search it when a
task needs evidence; add new findings there, not here.
