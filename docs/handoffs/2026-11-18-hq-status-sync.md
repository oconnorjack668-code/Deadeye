# STATUS read from main, self-merged STATUS PRs, Deadeye HQ built from STATUS (2026-11-18)

Agent: Claude Code, Opus 5.5 · Commits: 8f51541, c69acb4, 717d716, 8344ef3, 3b6e231, 5120da5, 936d300, c690b20, a5b355b · PR: #133, #135-#142 · Status: shipped

## Outcome
New chats read STATUS from main, so an old checkout no longer hands them a stale to-do list. Sessions merge their own docs-only STATUS PRs, so updates reach main in minutes. Deadeye HQ's to-do list is now generated from STATUS plus open PRs, with a plain "Next step" title per item, groups (go live, your jobs, ideas, waiting on an agent) and an "updated X ago" line. The privacy page names the Today card taps (#137, the #126 safety BLOCK).

## Decisions
- Film stays live (`FILM_LIVE=true` since 14 Nov) though the DPIA is unsigned: founder plans to sign 19 Nov; fallback is `FILM_LIVE=false` and a redeploy (S36, S1).
- Docs-only STATUS/handoff PRs self-merge once checks pass; code, config, migrations and skills still wait for the founder (founder, after weighing a direct push to main: PRs keep conflict handling and a record).
- HQ reads STATUS through `scripts/status-to-hub.mjs`, not live from GitHub: the artifact sandbox blocks every outside host, and there is no GitHub connector. The founder approved option 1 (live read); it could not be built, so option 2 was.
- Open PRs get HQ cards automatically from GitHub's public API (repo is public); the PR check's verdict is kept on its `pr-<n>` card while the PR is open.
- Founder (18 Nov): weekend posts 13-15 Nov never made and promo openings dropped (video not good enough), so neither moved to STATUS; Blazers trial and the two club emails not started (S11).
- #117 and #87 closed on the founder's word; #95 (the `agent-os` branch) kept open, harmless.
- `docs/brand/promo-video/PLAN.md` records a shipped video, so its 150 drills were not rewritten; a dated note says the app has 168.

## Where things are
- `.claude/hooks/session-status.mjs`: prints `origin/main:docs/STATUS.md`, warns when behind.
- `scripts/status-to-hub.mjs`, `__tests__/status-to-hub.test.ts`: STATUS + open PRs to the hub snapshot's `calls`.
- `docs/agent-os/hub/README.md` ("The to-do list comes from STATUS"): how and when to rebuild.
- `docs/agent-os/hub/index.html`: mirror of the live page, https://claude.ai/artifact/8kXcpLQbJ2QSfkzosne5yE (version 6).
- Routines updated (prompts): hub worker `trig_015kxehjQDGT72Yn4Fi3X7Lk` rebuilds the list every run; PR check `trig_01MSRh74ux3XbaYfzerJjJtz` writes `pr-<n>` cards.
- `.claude/skills/handoff/SKILL.md` and `.agents/skills/handoff/SKILL.md` (now identical), `AGENTS.md`: read main's STATUS, self-merge rule, rebuild HQ after merging.

## Status changes
- Closed: S9, S14, S17, S46
- Opened: S47, S48
- Updated: S1, S6, S11, S16, S36, S45; every open row has a Next step
(The items themselves live in `docs/STATUS.md`; this list never restates them.)

## Gotchas
- The main checkout `C:\Users\Vivobook S16\Documents\deadeye` is on `chore/agent-model-split`, 35+ commits behind main, with another agent's staged `.agents/` and `.codex/` files. All work here used worktrees from `origin/main`; nobody has pulled that checkout.
- GitHub requires PR branches up to date with main: merges failed until `gh pr update-branch` and a re-run of checks (about 4 min each). Auto-merge is off for the repo.
- `tsc --noEmit` in a fresh worktree fails on `RouteContext`/`LayoutProps` until `npx next typegen` runs.
- A worktree can borrow `node_modules` with `mklink /J`; remove it with `rmdir`, never `rm -rf`, or the main copy goes too.
- STATUS's column and the script had to merge together: main's earlier script read columns by position.
