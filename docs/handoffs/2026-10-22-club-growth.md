# Club-growth agent (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: see `git log agent-os` · Status: in progress (pull request open)

## Outcome
A seventh agent, `club-growth`, grows Deadeye through clubs, schools and academies: a pipeline, outreach
drafts, trial plans, club health and the coach-side features clubs need. It runs in the Monday loop when a
club is in talks, on trial or active, monthly otherwise, and with `/agent-os clubs`. The Monday counts file
gains a Clubs section (coaches, teams, players on a team, assignments in 7 days; owner and tests left out).

## Decisions
- Not limited to the Wexford Blazers (first trial, seeded in the pipeline at `talking`): founder wants more clubs.
- Organisations and roles only, never private contact details or player data; every contact is the founder's.
- Safeguarding rules: Basketball Ireland policy, Children First Act 2015, Garda vetting, Children's Officer.
- Coach-side gaps become `C` backlog items as `idea`; the activation-analyst picks `NEXT`.

## Where things are
- `.claude/agents/club-growth.md`; `docs/agent-os/clubs/pipeline.md`; README "Clubs"; agent-os skill step 8b
- `src/lib/agentCounts.ts` (`clubCounts`), `src/lib/funnel-server.ts` (`loadClubCounts`), counts job route

## Open
- Founder: merge the pull request; fill in the Blazers' level, age groups and trial date in the pipeline.

## Gotchas
- none
