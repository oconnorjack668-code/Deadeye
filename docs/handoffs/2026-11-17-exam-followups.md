# Exam follow-ups: save fix, Today card, agent fixes (2026-11-17)

Agent: Claude Code, Opus 5.5 · Commits: 2654c24 (#125), a8a9dc1 (#126), 0202da3 (#127) · PR: #125, #126, #127 merged; this docs PR · Status: shipped

## Outcome
The founder ordered the fixes the agent exams turned up, and all are live. Saves no
longer lose a session on retry or when the phone can't keep it. New players get one
"Log shots" step on Today, with markers for each way in. The agents' knowledge files
cover the 10 partial cases, and 9 of 10 pass on re-run.

## Decisions
- Retry checks for a complete server copy before deleting anything (not upsert): the
  drills get new ids on each try, so an upsert would duplicate them. Lead's call.
- Today card: one button, other ways in as quiet links, with no designer mockup. It is a
  small change the founder ordered directly; a read is due about 8 Dec (S42).
- "0 attempts saved" was not fixed: it was a made-up exam case, and the code already
  blocks it (STATUS, recently done).
- Blur: S41 is read as an in-app player setting. The founder's no-blur rule for promo
  videos stands, and marketing's checklist now has it.
- Branches behind main were brought up to date with `gh pr update-branch` (main's
  commits only) under the founder's merge word, then merged once the checks passed.

## Where things are
- `src/lib/offline.ts`, `src/components/TodayFirstStep.tsx`, `src/lib/events.ts`,
  `src/lib/funnel.ts`, `docs/funnel-counts.sql`: the code changes.
- `docs/agent-os/knowledge/*.md`, `docs/agent-os/exams/results.md`: agent fixes and scores.
- Tester account: onboarded as player and coach; test team "Deadeye Test Team" (TW6BBR).

## Status changes
- Closed: S39, S40
- Opened: S42, S43
- Updated: S11

## Gotchas
- Previews are separate sites: a live sign-in doesn't carry over, so the #126 check
  ran on the live site after the merge.
- Each merge put the other PRs behind main (strict protection), so each one needed an
  update and a fresh check run.
- Re-run agents read knowledge files from the checkout, so don't switch branches while
  they run. Two re-runs stopped on the 5-hour usage limit and were run again later.
