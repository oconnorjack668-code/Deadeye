# Agents to professional level; live status file (2026-11-11)

Agent: Claude Code, Opus 5.5 (plus one subagent for the video editor) · Commits: cda2eb5..37632d9 (merged as b676120), this branch · PR: #84 (merged), handoff-status PR · Status: shipped

## Outcome
Every Agent OS agent now has a brief, a playbook skill with named standards
and gold-standard examples, a short rules file plus a findings file, its own
memory, results review, peer review, an exam, guard hooks and read-only
trade tools. The video editor was upgraded (voice order, word-timed
captions, registry effects, brand video style, exam). New chats now start
from `docs/STATUS.md`, not from old handoffs.

## Decisions
- Founder asked for agents "with the skills of a professional in their field": playbooks, standards, examples, exams and tools, not only more rules.
- Brief goes at the top of each agent file, not in memory: it is the agent's prompt, read in cloud and by Codex too.
- Knowledge split into rules (read every time, under 200 lines) and findings (no cap): every file had hit the 200-line cap.
- Guard hooks enforce the permission table (`.claude/hooks/guard.mjs`); Ahrefs is read-only for marketing because it can create and delete social posts.
- Founder agreed (2026-11-11) to Sentry, Vercel logs and the sign-ins. Sentry and Similarweb skipped for now (S15): the app sends nothing to Sentry, and Similarweb refuses automatic sign-in.
- Status file plus SessionStart hook instead of Obsidian: Obsidian is only a viewer over the same markdown and does not stop stale handoffs; a single closed-with-evidence list does. Founder can still open `docs/` as an Obsidian vault to browse.
- Codex agent files are generated (`scripts/sync-codex-agents.mjs`), never hand-edited.

## Where things are
- `.claude/skills/<agent>-playbook/`: method, standards, tools, examples.
- `docs/agent-os/knowledge/<agent>.md` and `findings/<agent>.md`; `docs/agent-os/exams/`.
- `.claude/hooks/guard.mjs`, `.claude/hooks/session-status.mjs`; hooks in each agent file and `.claude/settings.json`.
- `docs/STATUS.md`: open items and recently done.
- `docs/agent-os/README.md`: learning, permissions table for the tools.
- `docs/brand/video-style.md`, `.claude/skills/video-editor-playbook/`.

## Status changes
- Closed: none open before (STATUS starts today, seeded from the last 7 handoffs and checked: PRs #74, #75, #76 were merged though the 9 Nov handoff listed them as open).
- Opened: S1-S18 (seeded).

## Gotchas
- Worktree sessions refuse compound shell commands and `git -C` to the main checkout; write scripts to the job tmp folder and run them plainly.
- `.gitignore` hid `.claude/hooks/`; now tracked, with `.claude/agent-memory/`.
- Canva names tools with hyphens; guard regexes must split on `-` and `_`.
- `!` commands run in Git Bash, not PowerShell: give bash syntax.
- Fresh worktree: run `npx next typegen` before `tsc` (LayoutProps).
