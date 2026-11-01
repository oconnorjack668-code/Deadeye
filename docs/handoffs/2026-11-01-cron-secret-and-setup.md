# Cron secret, migration check, founder setup closed out (2026-11-01)

Agent: Claude Code, Opus 5.5 · Commits: cd4860e (PR #47), 3c311df (PR #48) · Status: shipped

## Outcome
- The scheduled jobs (daily reminders, weekly report, Monday agent counts) had no `CRON_SECRET` in Vercel, so every run got a 401. That's why no counts file was written on 26 Oct. The secret is now set and the founder redeployed. A live call with the secret returns 200.
- Migration check run against the live database: 256 checked, 1 missing (`drill_favorites_drill_id_idx`, 00042). The founder created that index and it's there now.
- Founder setup from earlier handoffs is done: `AGENT_DATA_GITHUB_TOKEN` is in Vercel (production, sensitive); branch protection on `main` (PR and `checks` required, 0 approvals, no bypass, admins included); the "early days" notice is posted; `OPENAI_API_KEY` is gone (the code had stopped reading it).
- Backlog marks E2 and E3 shipped. `.mcp.json` connects Claude Code to the Supabase project (project ref only).

## Decisions
- Founder exception to "no database for agents": when the founder is in the session, Claude may run `docs/check-migrations.sql` (names only, never rows). Written into `docs/agent-os/README.md`. Migrations stay founder only.
- Branch protection approvals set to 0, because GitHub doesn't let you approve your own PR, and "do not allow bypassing" turned on so nothing reaches `main` without a PR and green checks (founder, on Claude's advice).
- Commits now go through a branch and a PR, merged with `--match-head-commit` once checks pass.

## Where things are
- PRs #47 and #48 (merged). The secret is in Vercel only and isn't stored anywhere in the repo.
- Live address: https://deadeyeapp.vercel.app (memory `vercel-production`).

## Open
- Monday 2026-11-02, 08:30 Irish time: confirm `docs/agent-os/data/2026-11-02-funnel.md` lands on the `agent-os` branch (the first scheduled run with the secret), then run `/agent-os review`.
- No player has signed up since 2026-10-24, so E2 and E3 can't be read yet. Marketing and clubs are the lever: fill in the Blazers' details in `docs/agent-os/clubs/pipeline.md`.
- Founder: E0, message 5 players who set up and logged nothing.
- Still waiting from older handoffs: deadeye.ie, then Resend and parent emails; phone checks (form check run twice, drill timer beeps, live leaderboard, under-18 coach path); 2 or 3 filmed sessions for the tracker; club billing before 2027-02-01.

## Gotchas
- Vercel Hobby keeps runtime logs for about an hour, and the "Run" button on a cron shows no response. To test auth, call `/api/cron/agent-counts` with the bearer secret outside 08:xx Irish time: it answers "skipped" and writes nothing. Never test with `/api/cron/reminders`, because it sends real reminders.
- Auto mode blocks Claude from production redeploys and from committing changes to agent permission docs unless the founder asks for that commit outright.
- `deadeye.vercel.app` isn't ours, and `deadeye-deadeyeapp.vercel.app` redirects to `deadeyeapp.vercel.app`.
