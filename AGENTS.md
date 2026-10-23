<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Codex and Claude Code collaboration

This repository may be worked on by both Codex and Claude Code. Treat the
working tree as shared: do not overwrite or revert another agent's
uncommitted changes.

Either agent may commit and push the other's work (the user decided this on
2026-10-20), but only once it is complete and has been checked: read the diff,
confirm it does what it set out to do, and run the relevant checks (at least
`npx tsc --noEmit`, lint on the changed files, and the tests that cover them).
Work that is unfinished, failing, or not understood stays uncommitted; say so
instead.

- By default, use a dedicated branch or Git worktree for each independent
  task. When the user explicitly chooses a shared checkout, Codex and Claude
  Code may work from the same folder, but each agent must own different files
  or a clearly separate change area.
- Before editing, inspect `git status` and the relevant files. If a file has
  uncommitted changes from another agent, do not edit it while that work is in
  progress; commit it once it is complete and checked (above), or leave it.
- Keep durable project decisions in repository documentation, not only in an
  agent conversation. `CLAUDE.md` imports this file, so these rules apply to
  both agents.
- Session handoffs: before picking up earlier work, read
  `docs/handoffs/INDEX.md`; when a session ends, write one, following
  `.claude/skills/handoff/SKILL.md`.
- Agent OS: activation work (the weekly funnel loop, its backlog, its agents
  and their permissions) runs from `docs/agent-os/README.md`. Read it before
  taking a backlog item.
- UI work: read `docs/design.md` (colours, spacing, components, what to
  avoid) before adding or changing a screen.
- Never read, print, commit, or modify `.env.local`. Use `.env.example` for
  configuration requirements.
- Before handing work over, run the smallest relevant verification, report the
  branch and files changed, and leave the worktree in a reviewable state.
- Database migrations, generated types, and shared app routes need especially
  careful ownership: only one agent should change a given migration sequence
  or route area at a time.
