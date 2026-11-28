Skills MISSING: modern-web-guidance - not installed

# E6: dashboard_seen marker for no-session players (2026-11-16)

Agent: Claude Code, Opus 5.5 (builder, weekly Agent OS run) · Commits: 0e35d1f, plus this docs commit · PR: none (branch `exp/E6-dashboard-seen` pushed) · Status: in progress (awaiting review)

## Outcome
A player who finished setup but has no saved hoops session now leaves one `dashboard_seen` row a day when they
open the dashboard. Nothing changes on screen. It shows on `/admin/funnel` and in the weekly counts file
(a new last group, "Coming back") and in `docs/funnel-counts.sql`. The privacy page names the step.

## Decisions
- Size: E6 is already the smallest build that tests the bet (one marker). No smaller cut: the funnel and
  privacy lines are what make it readable and lawful (builder peer review).
- Fired from a client effect in the dashboard's `totalSessions === 0` block (the reminders block, not the
  Today card, which also needs no active program), so a prefetch never counts as a visit (findings).
- No device storage for "once a day": `/api/events` already keeps one row per player, step and day.
- New funnel group placed last so the existing groups keep their rows in the weekly counts file and the
  tracker group keeps the index `tracker_saved` is pushed onto.
- Privacy wording: one phrase added, ", opening the dashboard before you have logged any shots,", after the
  welcome answers; `LAST_UPDATED` to November 16, 2026. "No page tracking" left as is (the founder may want
  to look at it, since this step is a screen open, like the welcome, logger and tracker opens already are).
- No migration: `app_events.name` is checked by a regex (00045).

## Where things are
- `src/app/(app)/dashboard/DashboardSeen.tsx`: the marker (renders nothing)
- `src/app/(app)/dashboard/page.tsx`: placed in the `metrics.totalSessions === 0` block
- `src/lib/events.ts`, `src/lib/funnel.ts`, `docs/funnel-counts.sql`, `src/app/privacy/page.tsx`
- `__tests__/dashboard-seen.test.tsx` (new), `__tests__/funnel.test.ts`, `__tests__/privacy-page.test.tsx`:
  the new tests fail on main 0454f77 (4 failures, checked in a scratch worktree) and pass on the branch
- `docs/agent-os/knowledge/builder.md`: lesson and checklist line for new steps in the privacy clause

## Status changes
- Closed: none
- Opened: S44, S45 (first written as S39, S40; renumbered 18 Nov, main had used those ids)

## Gotchas
- The main copy of `docs/agent-os/backlog.md` still has the older E6 idea; the NEXT version is on `agent-os`,
  so the backlog was not edited on this branch (the lead adds the Built line there).
- Not checked live: signed-in pages cannot reach Supabase locally. After merge, check a row appears for a
  fresh no-session tester.
