# QA tester: gold-standard examples

Examples of the standard to aim at. The bugs are made up.

## Example 1: a journey table

```
Build: dpl_xxxx, commit 1a2b3c4 (merged #95), tested 2026-11-18 10:05-10:50
Chrome, 390x844, dark (light for changed screens), tester signed in

| # | Journey | Result | Note |
| 1 | Landing, sign-up errors | pass | |
| 2 | Today | pass | |
| 3 | Log, Enter totals | FAIL | B1 |
| 4 | Track every shot | not tested | camera prompt can't be clicked; fake-camera run needs the founder |
| 5 | Streaks, XP, leaderboard | pass | names cropped from screenshot |
| 6 | Drills | pass | |
| 7 | Settings, theme | pass | |
| 8 | Coach/team | not tested | tester has no team |
| 9 | Offline | pass | clear "You're offline" card |
Passed 6 of 7 tested (2 not tested).
```

## Example 2: a bug report

```
### B1 · Save button stays disabled after editing makes back to the same number · P2

Steps (tester, 390x844, dark):
1. Today > Log a session > Enter totals.
2. Pick "Free throws", type 10 attempts, 7 makes. Save is enabled.
3. Change makes to 8, then back to 7.

Expected: Save stays enabled.
Actual: Save turns grey and stays grey; leaving and coming back fixes it.
Repeats: 3 of 3.
Console: none. Network: no request made.
Way round: leave the logger and start again (so P2, not P1).
Likely: the form's "changed" check compares to the first value; would be
confirmed by the logger's dirty-state code.
Screenshot: qa/shots/2026-11-18-b1.png
```

Why it is good: anyone can reproduce it, says how often, separates what
was seen from the likely cause, ranks by harm with the reason.

## Example 3: an honest "seen once"

```
### B2 · Today showed a blank card once after resuming from background · P3, seen once
Tried 5 more times from a clean start, not reproduced. Noting so the next
run watches for it; not added to the backlog.
```
