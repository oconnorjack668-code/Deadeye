# New agents merged (2026-11-13)

Agent: Claude Code, Opus 5.5 · Commits: `82e08bb` (merge of #94) · PR: #94 merged; this handoff on its own docs PR · Status: shipped

Follows [2026-11-11-new-agents](2026-11-11-new-agents.md), which has the build, the
decisions and where every file lives.

## Outcome
PR #94 is on main: the designer, player-outreach and qa-tester agents (agent files,
playbooks, knowledge and findings, exams, hub cards, Codex copies) and marketing's weekly
TikTok and Instagram trend scan into `docs/agent-os/trends/ads.md`. Agent and docs files
only: nothing changed for players, no migration.

## Decisions
- Merged on the founder's word ("merge 94") after the `checks` workflow and Vercel passed,
  with `gh pr merge --merge --match-head-commit 2d984ee`, so only the reviewed commit merged.
- No separate PR was opened only to close S23 at merge time; it is closed here.

## Where things are
- Start the agents: `/agent-os design <task>`, `/agent-os outreach`, `/agent-os qa`
  (signed-in QA needs a local session: the tester account is in the founder's Chrome).
- The Monday loop now runs outreach (step 8o) and signed-out QA (step 1q); the Thursday
  marketing run fills the first ads trend board.
- The live hub page shows the new agent cards after the next run writes `hub/snapshot`
  (the repo's `docs/agent-os/hub/snapshot.json` already has them).

## Status changes
- Closed: S23
- Opened: none (S24, S25 still open)

## Gotchas
- `checks` was still running when the merge was asked for; `gh pr checks 94 --watch`
  waited for it rather than merging on a pending check.
