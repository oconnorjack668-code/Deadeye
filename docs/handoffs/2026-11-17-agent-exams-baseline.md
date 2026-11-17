# Agent exams baseline (2026-11-17)

Agent: Claude Code, Opus 5.5 · Commits: see PR · PR: docs-only, branch `worktree-agent-exams-baseline` · Status: shipped (once merged)

## Outcome
First `/agent-os exam all`: all 11 agents sat their exams. Baseline 39 of 49
cases pass, 10 partial, 0 fail. Five agents scored full marks (club-growth,
marketing, release-checker, safety-reviewer, support-triage). This closes S12
and the last part of S25.

## Decisions
- One dispatch per agent with all its cases (11 dispatches), not one per case
  (49): far cheaper, recorded in the results run notes in case a per-case run
  scores differently. Lead's choice.
- Graded strictly (`pass` only when every line holds), as `exams/README.md` says.
- Support-triage's real-code side finding (session retry delete-then-insert)
  checked by the lead in `src/lib/offline.ts` and opened as S39 rather than
  fixed here: it needs a triage rank and the builder.

## Where things are
- `docs/agent-os/exams/results.md`: one row per agent, the partial cases and why.
- `docs/STATUS.md`: S39 (retry risk), S40 (fix the partials, add the no-blur
  rule to marketing, re-run).

## Status changes
- Closed: S12, S25
- Opened: S39, S40

## Gotchas
- A heredoc append through Bash was refused by the worktree guard ("too
  complex to verify"); the Edit tool works.
- Several agents flagged stale lines in their own knowledge files (builder:
  "signed-in features cannot be checked on previews" is out of date since
  2 Nov). Not changed here; worth doing with S40.
