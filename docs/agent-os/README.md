# Deadeye Agent OS

A small team of agents working on one goal: **activation**, a new player
logging their first session within 7 days of finishing setup.

- Baseline, 2026-10-22: 2 of 18 players who finished setup (11%), from
  `/admin/funnel` "Everyone" with owner and test accounts left out. The first
  count (2026-10-19: 3 of 17, 18%) most likely included the founder's own
  account.
- Target: 40% by 2026-11-19. On that date the founder keeps, raises or
  replaces the target.

Everything the agents build serves that number until the target is met.

## The weekly loop

It runs by itself every Monday at 09:00 Irish time (a scheduled cloud
session), or on demand with `/agent-os` (`.claude/skills/agent-os/SKILL.md`).

1. **Weekly counts job** (`api/cron/agent-counts`, Monday 08:30 Irish time) saves
   this week's funnel and problem counts to `data/`. Counts only. Without
   its token set, the founder pastes them as before (`data/README.md`).
2. **support-triage** reads problem and crash reports, finds causes, ranks
   them; a P1 (crash, lost data, safety) is built first.
3. **activation-analyst** writes a report in `reports/`, updates
   `backlog.md` and marks one item `NEXT`.
4. **builder** builds the `NEXT` item on its own branch, with tests.
5. **safety-reviewer** checks the branch: minors, parents, personal data,
   messages to people.
6. **release-checker** runs the checks and writes the founder's checklist.
7. The lead opens a **pull request**; GitHub runs the `checks` workflow on it.
8. **marketing** drafts the week's posts and video ideas.
9. **Founder** reads the report and replies `merge <number>`; the agent
   merges. The founder runs any migration, checks it live and posts the
   approved content.
10. A handoff goes in `docs/handoffs/` (`.claude/skills/handoff/SKILL.md`).

The agents are defined in `.claude/agents/`. Codex can take the builder role
by working the `NEXT` item under the same rules.

Each agent loads skills for its field (the `skills:` list in its file), such
as testing for the builder and compliance for the safety reviewer. A skill
that fails to load is reported, never hidden: the agent opens its reply with a
`Skills MISSING` line, and `/agent-os` puts it first in the report to the
founder with the fix. The agent's own rules always win.

## Marketing

**marketing** (`.claude/agents/marketing.md`) runs on its own with
`/agent-os marketing`: TikTok and Instagram ideas, video scripts, a posting
calendar and founder posts, in `docs/agent-os/marketing/`. It aims content at
the same goal: a new player logging a first session. It only drafts. Every
post, message, ad and payment is the founder's, and no under-18 player is
shown or named without a parent's written consent.

## Permissions

| Tier | What |
| --- | --- |
| Free | Read the repo and docs, run tsc, lint and tests, write in `docs/agent-os/`, commit and push an `exp/*` or `agent-os` branch, open a pull request |
| On the founder's word | Merge a pull request the founder named in the conversation, with green checks and no new push since (rules in the agent-os skill) |
| Founder only | Push to main, run a migration, write production data, send anything to a player, parent or coach, post on social media, spend money, change pricing or legal text |
| Off limits | `.env.local`, every secret and the database; names, emails, user ids or any per-player data. Agents work from counts and redacted reports |

GitHub enforces the main line: with branch protection on `main` (pull
request required, `checks` must pass, no force pushes), nothing reaches the
live app without a pull request and green checks, whoever pushes.

## Files

- `backlog.md`: the experiments, ranked. The single source of truth for what gets built.
- `data/`: weekly counts and paraphrased player notes, added by the founder.
- `reports/`: one activation report per week, written by the analyst.

## Parked agents

Add these when activation meets its target, or when their trigger comes first:

- **club-growth**: when the Wexford Blazers trial starts.

## Where it runs

- **Local**: Claude Code in this repo, `/agent-os`.
- **Cloud**: claude.ai/code, pick the repo and branch, send `/agent-os`. A
  cloud session sees only what is pushed: the week's counts must be committed
  in `data/` first. It cannot reach Supabase or this laptop.
