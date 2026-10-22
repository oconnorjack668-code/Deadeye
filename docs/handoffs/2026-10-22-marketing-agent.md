# Marketing agent and agent skills (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: see `git log agent-os` · Status: in progress (agent-os pushed, not merged)

## Outcome
A fifth agent, `marketing`, drafts TikTok and Instagram ideas, video scripts, a posting calendar and founder
posts into `docs/agent-os/marketing/`; `/agent-os marketing` runs it. Every agent now loads skills for its
field through a `skills:` list in its file.

## Decisions
- Marketing replaces the parked "content" agent. It drafts only: posting, messaging, ads and spending stay
  with the founder. No identifiable under-18s without a parent's written consent; ASAI code; 13+ platforms.
- Its content aims at the activation goal (first session), measured by `signup_from_demo` and first sessions.
- Skills are plugin skills from the founder's account; where one is not installed the agent skips it.

## Where things are
- `.claude/agents/marketing.md`; skills lists in all five `.claude/agents/*.md`
- `docs/agent-os/README.md` (Marketing section), `.claude/skills/agent-os/SKILL.md` (`marketing` argument)
- `docs/agent-os/marketing/ideas.md`: the running list

## Open
- Founder: merge `agent-os` into main; then `/agent-os marketing` for the first plan.

## Gotchas
- none
