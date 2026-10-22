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

Run it with `/agent-os` (`.claude/skills/agent-os/SKILL.md`).

1. **Founder** adds this week's counts to `data/` (see `data/README.md`).
2. **activation-analyst** writes a report in `reports/`, updates
   `backlog.md` and marks one experiment `NEXT`.
3. **builder** builds the `NEXT` experiment on its own branch, with tests.
4. **safety-reviewer** checks the branch: minors, parents, personal data,
   messages to people.
5. **release-checker** runs the checks and writes the founder's checklist.
6. **Founder** approves: merge, deploy, run migrations, check live.
7. A handoff goes in `docs/handoffs/` (`.claude/skills/handoff/SKILL.md`).

The agents are defined in `.claude/agents/`. Codex can take the builder role
by working the `NEXT` item under the same rules.

## Permissions

| Tier | What |
| --- | --- |
| Free | Read the repo and docs, run tsc, lint and tests, write in `docs/agent-os/`, commit and push an `exp/*` branch |
| Founder approval | Merge or push to main, deploy, run a migration, write production data, send anything to a player, parent or coach, spend money, change pricing or legal text |
| Off limits | `.env.local` and every secret; names, emails, user ids or any per-player data. Agents work from counts |

## Files

- `backlog.md`: the experiments, ranked. The single source of truth for what gets built.
- `data/`: weekly counts and paraphrased player notes, added by the founder.
- `reports/`: one activation report per week, written by the analyst.

## Parked agents

Add these when activation meets its target, or when their trigger comes first:

- **club-growth**: when the Wexford Blazers trial starts.
- **support-triage**: when player problem reports pass about 5 a week.
- **content**: promo videos and posts.

## Where it runs

- **Local**: Claude Code in this repo, `/agent-os`.
- **Cloud**: claude.ai/code, pick the repo and branch, send `/agent-os`. A
  cloud session sees only what is pushed: the week's counts must be committed
  in `data/` first. It cannot reach Supabase or this laptop.
