# Builder: gold-standard example

An example of the standard to aim at. The item, files and numbers are made
up to show the shape.

## A build reply

```
Skills: all 6 loaded

Built E11 "Today card opens the tracker in one tap" on exp/E11-today-tracker
(pushed, 2 commits).

Bet: players who finish setup see a "Track 10 shots" button on the Today
card and start the tracker without hunting for it. Signal: today_card_track
markers, then session_saved within 24 h.

Change (4 files, +61 -12)
- src/app/(app)/dashboard/TodayCard.tsx: one primary button when the player
  has no saved session; the old two-link layout stays for everyone else.
- src/lib/events.ts, docs/funnel-counts.sql: today_card_track marker.
- src/app/(app)/dashboard/TodayCard.test.tsx: new test, fails on main
  (button missing), passes here; second test keeps the old layout for players
  with a session.

Checks: tsc pass, eslint (4 files) pass, npm test 312 passed.
Looked at it: 390 px, slow 3G, tester account. Screenshots:
.claude/tmp/e11-today-390.png, e11-today-390-after-session.png. No console
errors. Button 48 px high, contrast 7.1:1, label "Track 10 shots".
Self-review: simplify removed a duplicated date helper. No new data, no
table, no message; nothing for safety beyond the new marker (no free text).

Not done: no migration needed. Handoff: docs/handoffs/2026-11-12-e11-today-tracker.md
```

Why it is good: the bet and the Signal come first; the test is shown to
fail without the change; it was looked at on a phone-sized screen; it says
what safety needs to look at and what was not done.
