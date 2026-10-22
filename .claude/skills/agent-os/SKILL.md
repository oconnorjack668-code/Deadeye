---
name: agent-os
description: Runs Deadeye's Agent OS weekly loop - activation review, build, safety review, release check. Use when the founder says /agent-os or weekly review, or asks what the agents should work on next.
---

# Agent OS

The goal, agents and permissions are in `docs/agent-os/README.md`. Read it
first. You are the lead: you dispatch each agent below with the Agent tool
and pass along only what the next one needs.

**Skills.** Every agent opens its reply with a `Skills:` line. If any says
`MISSING`, the first line of your report to the founder is
`Skills failed: <agent>: <names> (<error>)`, followed by how to fix it: in
Claude Code run `/plugin` and install or enable the plugin named before the
colon (e.g. `marketing` for `marketing:campaign-plan`); on claude.ai turn the
plugin on in Settings. Say what the agent did without it. A reply with no
`Skills:` line counts as a failure too.

Argument `review` runs step 1 only. Argument `marketing` dispatches only the
`marketing` agent and reports its plan's short list for the founder to approve.

## Steps

1. Dispatch `activation-analyst`. Done when a new report exists in
   `docs/agent-os/reports/` and `backlog.md` holds exactly one `NEXT`.
2. Dispatch `builder` on the `NEXT` item. Done when its `exp/*` branch is
   pushed with tsc, lint and tests passing.
3. Dispatch `safety-reviewer` on that branch. On `BLOCK`, send the reasons to
   `builder` once, then review again. A second `BLOCK` ends the run here.
4. Dispatch `release-checker` on the branch. Done when the backlog item holds
   the Founder checklist.
5. Commit the `docs/agent-os/` changes with a handoff
   (`.claude/skills/handoff/SKILL.md`), on the `exp/*` branch.
6. Report to the founder in under 15 lines: this week's numbers, the biggest
   drop, what was built and on which branch, the safety verdict, and the
   Founder checklist.

The run ends at step 6 with every merge, deploy, migration and outgoing
message waiting for the founder.
