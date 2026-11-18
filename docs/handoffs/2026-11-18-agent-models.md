# Agent model split (2026-11-18)

Agent: Claude Code, Opus 5.5 · Commits: 649ddcf (merged as 12fc3c9) · PR: #129 · Status: shipped

## Outcome
All 11 Agent OS agents ran on Opus (`model: inherit` plus `"model": "opus"`
in the founder's user settings). Each now has its own `model:` and
`effort:` line, so most token-heavy work runs on Sonnet at half Opus's price.

## Decisions
- Opus, high: safety-reviewer (defect finding drops sharply at low effort; child safety) and video-editor (founder asked for the best videos).
- Opus, medium: builder (production code; Opus leads Sonnet on coding) and activation-analyst (picks what gets built).
- Sonnet, high: release-checker, qa-tester, support-triage, designer. Sonnet, medium: marketing, club-growth, player-outreach (drafts the founder approves).
- No Haiku agents (no job is simple and checkable enough); Fable only by hand with `/model fable`.
- Main chat stays Opus 5.5 at medium: the founder's `modelSettings` already sets `claude-opus-5-5` to `medium`, which overrides the global `"effortLevel": "xhigh"`.
- Founder asked for the split to rest on research, not guesses. Sources: platform.claude.com "Choosing the right model" and "Optimizing for cost and intelligence"; code.claude.com "Model config". These are Anthropic's measurements, not tests on Deadeye's own work, hence S44.

## Where things are
- `docs/agent-os/README.md`, section Models: the table, the reasons, and the move-up-one-step rule.
- `.claude/agents/*.md`: the `model:` and `effort:` lines.

## Status changes
- Closed: none
- Opened: S44
(The items themselves live in `docs/STATUS.md`; this list never restates them.)

## Gotchas
- Codex's `.agents/skills/*` and `.codex/*` files were staged in the main checkout. They were left alone: the commit named only this session's paths (`git commit -- <paths>`).
- PR #129 was behind main (branch protection needs it up to date). `gh pr update-branch`, checks re-ran green, then merged at the checked commit.
- `scripts/sync-codex-agents.mjs --check` still passes: Codex agent copies carry no model lines.
