# Focus Finder live, checked and followed up (2026-11-14)

Agent: Claude Code, Opus 5.5 · Commits: 7858348 (#103), a50e762 (#107), fb535ee (#106), feat/focus-followups · PR: #103, #106, #107 merged; follow-ups PR open · Status: shipped, follow-ups awaiting merge

## Outcome
Focus Finder merged on the founder's "merge 103" and checked live as the tester: the AI week plan (Sonnet 5.5,
6 drills, 3 film, a 6-day week, free text not stored) and Send to team (test team, assignment with names only).
Two fixes from the live check, then the S34 follow-ups: defensive reading in the matcher, delete one plan,
arrow keys on the mode switch, and a team name field for coaches.

## Decisions
- Delete one plan through a server route (RLS check, then service-role delete of that row only), not a new
  `ai_reports` DELETE policy: no migration to run by hand, and other report types stay undeletable.
- Matcher reads clauses: "we give up / allow…", "they hit / get / score…", "…against us / on us" flip attacking
  matches to their defensive side (`DEFENSIVE_SIDE` in `src/lib/focus/weaknesses.ts`). "Give up when I miss" is not defence.
- Test team made on the founder's word (answered 18+ and ticked the vetting box for the tester). Tester is now
  player + coach, left on the playing side.
- Founder answered: no other under-16 has signed up since the parent page changed, so no fresh consent.

## Where things are
- `src/lib/focus/weaknesses.ts` (clauses, DEFENSIVE_SIDE), `src/app/api/focus/plan/[id]/route.ts` (delete)
- `src/app/(app)/focus/AiPlanView.tsx` (two-tap delete), `FocusFinder.tsx` (arrow keys)
- `src/app/(app)/teams/[id]/TeamClient.tsx` (team name field, same checks as setup)
- `__tests__/focus-followups.test.tsx`

## Status changes
- Closed: the safety review's consent question (in Recently done)
- Opened: none; S34 now "merge the follow-ups, then rename the test team"

## Gotchas
- The live site is slow to report "loaded" to the Chrome tools (45s timeouts); the pages work. Use get_page_text
  or `find` after a wait instead of screenshots, and check results in the database.
- Coach setup prefills name fields: typing appended ("TestTest", a doubled team name). Clear a field before typing.
- `main` requires branches up to date: merge main in and wait for checks before `gh pr merge`.
- jest-dom matchers are not typed for `tsc` in this repo; use `getAttribute` and `toBeTruthy` in tests.
