# Semi-automatic Agent OS (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: see `git log agent-os` · Status: in progress (pull request open)

## Outcome
The loop runs every Monday at 09:00 Irish time by itself: a weekly counts job saves funnel and problem
counts to GitHub at 07:00 UTC, support-triage ranks reports, the build goes through safety and release
checks, a pull request is opened, marketing drafts the week. The founder replies `merge <n>`; the agent
merges. CI (`checks`) runs on every pull request.

## Decisions
- No database access for agents (children's data, prompt injection from report text, no undo): the
  counts job runs on Vercel, which already holds the key, and writes counts only with a repo-only token.
- Report text is copied by the founder through "Copy for the agents" (redacted), not sent automatically:
  free-text redaction can miss things.
- Agents merge only a pull request the founder named in the conversation, with green checks and no new
  push since; GitHub branch protection is the hard lock. Founder asked for this.
- support-triage acts on a single report; the "5 a week" trigger is gone.

## Where things are
- `src/app/api/cron/agent-counts/route.ts`, `src/lib/agentCounts.ts`, `src/lib/githubFile.ts`, `vercel.json`
- `src/lib/funnel-server.ts` (shared with `/admin/funnel`); `src/lib/redact.ts`,
  `src/app/(app)/admin/errors/CopyForAgents.tsx`
- `.github/workflows/checks.yml`; `.claude/agents/support-triage.md`; `.claude/skills/agent-os/SKILL.md`
- `docs/agent-os/README.md` (loop, permissions), `docs/agent-os/data/README.md`; tests: `agentCounts`, `redact`

## Checks
tsc, eslint (whole repo, as CI runs it), `npm test` (787 passed, 1 skipped): pass. Safety: PASS.

## Open
- Founder: GitHub fine-grained token → `AGENT_DATA_GITHUB_TOKEN` in Vercel; branch protection on main.
- Founder: merge this pull request; the Monday 09:00 scheduled task is set up from this session.

## Gotchas
- Pushing `.github/workflows/` needs a token with workflow permission.
