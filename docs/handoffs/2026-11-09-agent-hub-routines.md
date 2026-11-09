# Agent hub, routines fixed and added, proxy fix (2026-11-09)

Agent: Claude Code, Opus 5.5 · Commits: 6350b7a (PR #73, merged ff49c02), feat/agent-hub (PR #76) · Status: shipped, #76 waiting on the founder

## Outcome
- **Weekly run fixed:** the routine had no repository source, so every push got a 403. The runs on 26 Oct, 2 Nov and 9 Nov 09:04 were lost. The repo is now attached, and the re-run opened PR #74 (E4) and PR #75 (report). Plugins load in the cloud via an environment setup script the founder added; checked by a one-off run.
- **Proxy:** `src/lib/supabase/middleware.ts` now keeps refreshed sign-in cookies on redirects and passes @supabase/ssr's no-cache headers (PR #73, live).
- **Deadeye Bench**, the founder's hub (https://claude.ai/artifact/8kXcpLQbJ2QSfkzosne5yE):
  - A scorebug, a clipboard of calls (approvals saved to the page's database), the funnel box score, agents, playbook, clubs, film room, learning, and Ask Claude.
  - Cloud runs read the founder's decisions and refresh the page; the morning check did both on 9 Nov.

## Decisions
- Push keys were done on 7 Nov; the 7 Nov handoff now says so (the founder had to correct this 3 times).
- Hub data lives in the page's database (`hub/snapshot`, `decisions/<id>`), mirrored in `docs/agent-os/hub/snapshot.json`; only owner/editors write. Approval on the hub never replaces "merge N" or posting by the founder.
- Plugins: a cloud session never installs a repo's `enabledPlugins`, and the routines API ignores `enabled_plugins`. The founder put the install in the environment's setup script.
- New routines have no connectors except the morning check (Vercel only); the server attaches all connectors by default, so they were cleared.

## Where things are
- Routines: weekly `trig_01GzYfdWsEvf1xfSPaCSY3oK` (Mon 09:00), morning check `trig_01UpDDcpmivDybVX7PvBGhq3` (daily 08:00), marketing `trig_01AgA4S9ic836q4Y33e5LhNR` (Thu 10:00), learning digest `trig_01FEMhLqzgwb3Wbq7Wzv1smk` (Fri 16:00), club growth `trig_01RAakJs2v9FCdwcMYpnpne1` (1st, 09:30), PR check `trig_01MSRh74ux3XbaYfzerJjJtz` (no trigger yet).
- `docs/agent-os/hub/` (page, snapshot, README with the run steps); agent-os skill steps 00 and 8c.

## Open
- **Founder: say `merge 76`** so the hub steps reach the weekly run, then `merge 74` and `merge 75` when ready.
- **Founder: connect the PR check to GitHub.** Auto mode refused to create the webhook. Open the routine at claude.ai/code/routines/trig_01MSRh74ux3XbaYfzerJjJtz, add a GitHub trigger on this repo for pull request opened and synchronize.
- Untracked `.agents/` and `.codex/` in the shared checkout are another agent's; left alone.

## Gotchas
- A routine that "succeeds" in about a minute probably failed: read `list_runs` and `get_run_log`, and check `git log origin/agent-os`.
- Routine `update` that touches `job_config` must resend the whole `ccr` (environment_id, events, allowed_tools, sources).
- Inside this worktree, compound git commands are refused; run them one at a time.
