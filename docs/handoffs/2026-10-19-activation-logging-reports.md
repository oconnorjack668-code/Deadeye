# Faster shot logging, a first-session nudge, and player reports (2026-10-19)

Agent: Claude Code, Opus 5.5 · Commits: dfc250b, fce9a70, 821f0e4, 1829f96 (committed by the main agent) · Status: shipped

## Outcome
Entering totals in a hoops session is two taps per spot (court, then makes), and saving takes 3 requests however many drills. New players with nothing logged now land on "Log your first shots" instead of a programme pitch. Players can send "Report a problem" from Settings and the crash screen; the owner reads them in the errors tab.

## Decisions
- Log-shots before camera on the first-session card: the tracker was still being fixed. Swap them once it is reliable (Claude, user agreed by building on it).
- Reports need sign-in and cap at 10 a day: free text from logged-out visitors would collect spam (Claude).
- Reports cascade-delete with the account, unlike crash reports: they are the player's own words. Kept 90 days by the cron job, included in the data export (Claude).
- Privacy policy wording for reports was written by Claude to match the existing policy, not checked by a lawyer.

## Where things are
- `src/app/(app)/basketball/new/page.tsx`: totals entry, remembered mode and shots per spot, spot kept in the draft
- `src/lib/offline.ts`: batched `saveBasketballSession`
- `src/app/(app)/dashboard/page.tsx`: first-session branch of the Today card
- `src/components/ReportProblem.tsx`, `src/app/api/reports/route.ts`, `supabase/migrations/00038_player_reports.sql`: reports
- `src/app/(app)/admin/errors/page.tsx`: Player reports section above Crashes
- Usage numbers from 2026-10-19 (21 players, 17 set up, 3 ever logged, 12 did nothing): Claude memory `usage-snapshot`

## Open
- ~~Confirm 00038 has been run~~: done, `to_regclass` found the table (2026-10-20).
- Add a "Tracker got this wrong?" report link on the tracker results, once tracker work in `ShotTracker.tsx` settles.
- Message 3 or 4 of the players who set up and did nothing, to learn why they left. Waits on the user.

## Gotchas
- Claude cannot read the live database: auto mode refuses it as "Production Reads" even after the user agrees. Hand the user count-only SQL for the Supabase SQL editor, one query at a time.
- The errors tab hides resolved rows, so counts from SQL can exceed what it shows. The 4 "Script error." rows that week predated the 0c27635 filter and were marked fixed.
- jsdom lacks `scrollIntoView` and jest-dom matcher types are not in tsconfig: stub the first, use plain DOM checks in tests.
- Next route files may only export handlers and config; keep constants unexported.
