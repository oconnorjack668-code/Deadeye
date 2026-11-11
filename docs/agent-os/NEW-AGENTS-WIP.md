# New agents: work in progress (2026-11-11)

Founder asked for: designer, player-outreach, qa-tester (in that order), with
SEO/website and retention analyst kept as possible future agents. Also: a weekly
trend scan so the video editor and marketing know what is popular on TikTok ads.

Done on this branch:
- `.claude/agents/{designer,player-outreach,qa-tester}.md`
- `.claude/skills/{designer,player-outreach,qa-tester}-playbook/` (SKILL.md, examples.md)
- `docs/agent-os/exams/{designer,player-outreach,qa-tester}.md`
- folders: `design/`, `outreach/` (routes.md), `qa/`, `trends/` (ads.md, visual.md)
- marketing step 2 is now the weekly trend scan into `trends/ads.md`; video-editor reads both boards
- safety-reviewer and marketing peer-review lines name the new agents

Still to do:
- findings files `docs/agent-os/knowledge/findings/{designer,player-outreach,qa-tester}.md` (research)
- knowledge files `docs/agent-os/knowledge/{designer,player-outreach,qa-tester}.md` (lessons, checklist, Last researched)
- seed `trends/visual.md` from the designer findings
- wiring: `docs/agent-os/README.md` (team, permissions table, schedule), agent-os SKILL.md
  (args design/outreach/qa, steps, peer review table), `knowledge/README.md` table,
  hub `snapshot.json` agents + `index.html` AGENT names, AGENTS.md UI line
- `node scripts/sync-codex-agents.mjs`, then `--check`
- STATUS: add SEO + retention as future; handoff; PR
