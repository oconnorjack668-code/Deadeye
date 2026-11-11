# New agents: designer, player outreach, QA tester (2026-11-11)

Agent: Claude Code, Opus 5.5 · Commits: on branch `worktree-new-agents-designer-outreach-qa` · PR: see S23 · Status: in review

## Outcome
Three new Agent OS agents, each with the full set the other eight have (agent file with
guard hooks, playbook skill and examples, knowledge file, researched findings, exam, hub
card, Codex copy): **designer** (artist and product designer who researches basketball
visual culture), **player-outreach** (players through communities, adult creators,
partners, events, referrals, store listing) and **qa-tester** (live app at phone size with
the tester account). Marketing now runs a weekly TikTok and Instagram trend scan into
`docs/agent-os/trends/ads.md`, which the video-editor, designer and outreach read.

## Decisions
- Designer, then outreach, then QA; SEO/website and a retention analyst kept as future
  agents (founder). Recorded in `docs/agent-os/README.md` under "Future agents".
- The video editor had lasting TikTok ad rules but no "what is popular this week" input;
  the trend scan went to marketing (it owns research), not the editor (founder's question).
- Designer drafts only; screen changes go to the builder as `D<n>` backlog items;
  `docs/design.md` changes only after the founder approves.
- Outreach never drafts a DM to a young person the founder does not know; communities and
  creator types only, no people; non-cash referral rewards only. Backlog prefix `G<n>`.
- QA uses support-triage's P1 to P3 ranks; signed-in runs are local only (tester account
  is in the founder's Chrome); cloud runs do signed-out pages and Vercel errors.

## Where things are
- `.claude/agents/{designer,player-outreach,qa-tester}.md`, `.codex/agents/*.toml`
- `.claude/skills/{designer,player-outreach,qa-tester}-playbook/`
- `docs/agent-os/knowledge/{designer,player-outreach,qa-tester}.md` and `findings/`
- `docs/agent-os/exams/{designer,player-outreach,qa-tester}.md`
- `docs/agent-os/{design,outreach,qa,trends}/`
- Loop: `.claude/skills/agent-os/SKILL.md` steps 1q, 2d, 8o; args `design`, `outreach`, `qa`

## Status changes
- Closed: S22
- Opened: S23, S24, S25

## Gotchas
- The usage limit stopped the three research subagents mid-run; resuming them with
  SendMessage after the reset kept their work.
- In a worktree session, long multi-step shell commands were refused; scripts in the job
  tmp folder, run one per command, worked.
