# Support triage: gold-standard example

An example of the standard to aim at. The reports, files and lines are made
up to show the shape.

```
Skills: all 5 loaded

Support report 2026-11-12. Sources: data/2026-11-11-reports.md (4 reports,
1 held back), Vercel runtime errors 2026-11-05 to 11-12 (2 groups). Sentry:
no project yet.

1. P1 · Session not saved after the tracker ends (2 reports, 1 error group)
   Cause (confirmed): src/app/api/sessions/route.ts:58 rejects a session whose
   duration is over 3600 s; a player who leaves the tracker open past an hour
   loses the whole session. Vercel shows the same 400 on POST /api/sessions,
   9 times since 11-05. Started with the 11-05 deploy (commit a1b2c3d raised
   the tracker timeout but not the API limit).
   Fix: cap the duration at 3600 s instead of rejecting. Check that catches
   it: a test posting a 3700 s session.
   Signal: no new report of this; no 400 on POST /api/sessions.
   Reply: "Thanks for telling us. A bug meant very long tracker sessions
   didn't save. We've found it and are fixing it. Sorry you lost that one."
   Write-up: impact 2+ players lost a session; cause a limit changed in one
   place and not the other; not caught because no test covered long
   sessions; fix and test above.

2. P3 · "Drills" filter label is cut off on small phones (1 report)
   Cause (likely): src/app/(app)/drills/Filter.tsx:22 fixed width 120 px.
   Confirm on a 360 px screen. Fix: let it wrap. Reply: "Thanks, we'll tidy
   that label up."

Held back: 1 report could say who a player is. It is on the "Account" page.
Founder: please describe it in your own words.

Backlog: S7 (P1, NEXT) and S8 (P3 not added, polish).
```

Why it is good: the cause is a line plus the input that triggers it; the
error data confirms the report and dates the regression; the P1 has a
blameless write-up and a test that would have caught it; the replies are
ready to send; nothing identifies a player.
