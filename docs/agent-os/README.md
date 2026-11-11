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

**The hub:** [Deadeye Bench](https://claude.ai/artifact/8kXcpLQbJ2QSfkzosne5yE) is the
founder's one page: the calls waiting on them, the funnel, every agent, the schedule. The founder
approves or declines there; every run reads those decisions first and refreshes the page after
(`hub/README.md`).

**Schedule** (cloud routines, Europe/Dublin): weekly loop Mondays 09:00 (counts job 08:30);
morning check daily 08:00 (live errors, pull requests, hub); marketing Thursdays 10:00; learning
digest Fridays 16:00; club growth on the 1st of the month 09:30; safety and release review on
every agent pull request.

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
8. **marketing** drafts the week's posts and video ideas; **club-growth**
   plans clubs (when one is in talks, on trial or active, and monthly).
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

## Learning

Each agent keeps a knowledge file in `knowledge/` (founder's ask,
2026-11-07): the founder's corrections written as rules, a checklist it runs
on its own work before the founder sees it, and research findings with their
sources. It reads the file before every task, adds a lesson whenever the
founder corrects it, and researches its field again when the file is more
than 30 days old. `knowledge/README.md` has the rules and which sources
count.

To work like a professional in its field (founder's ask, 2026-11-11), each
agent also has:

- **A playbook skill** (`.claude/skills/<agent>-playbook/`): the method,
  the named standards it works to, its trade tools and a quality bar, with
  gold-standard examples in `examples.md`. Repo skills load in cloud runs
  too.
- **Research findings** in `knowledge/findings/<agent>.md`, searched when a
  task needs them, so the knowledge file stays short enough to read every
  time.
- **Its own memory** (`memory: project`, in `.claude/agent-memory/<agent>/`)
  for working notes between runs.
- **A results review**: before new work it checks how its earlier work
  turned out and writes the lesson under "Lessons from results".
- **A peer reviewer** (the agent-os skill's Peer review table).
- **An exam** (`exams/`): run with `/agent-os exam <agent>` after any change
  to the agent, to show the change helped.
- **Guard hooks** (`.claude/hooks/guard.mjs`): the harness blocks an agent
  writing outside its area, pushing to `main`, force-pushing, touching
  `.env.local`, or using a read-only tool to change something; the builder
  cannot push until tsc, lint and tests pass.

## Marketing

**marketing** (`.claude/agents/marketing.md`) runs on its own with
`/agent-os marketing`: TikTok and Instagram ideas, video scripts, a posting
calendar and founder posts, in `docs/agent-os/marketing/`. It aims content at
the same goal: a new player logging a first session. It only drafts. Every
post, message, ad and payment is the founder's, and no under-18 player is
shown or named without a parent's written consent.

## Video

**video-editor** (`.claude/agents/video-editor.md`, `/agent-os video`) turns
marketing's scripts and the founder's footage into finished TikTok and Reels
videos with HyperFrames and ffmpeg (founder's ask, 2026-11-10: marketing keeps
what makes a good video and the research; the editor has the craft and the
video skills). Every version is a new file kept for the founder to compare;
footage and videos stay out of git in the founder's recordings folder, and
the edit log goes in `docs/agent-os/video/`. Before the founder sees a cut,
the lead runs the critic panel (`video/critic-panel.md`): six teen-player
viewers who find every flaw, then the editor fixes what the footage allows.
It runs locally only, since cloud sessions cannot reach the footage.

## Permissions

| Tier | What |
| --- | --- |
| Free | Read the repo and docs, run tsc, lint and tests, write in `docs/agent-os/`, commit and push an `exp/*` or `agent-os` branch, open a pull request |
| On the founder's word | Merge a pull request the founder named in the conversation, with green checks and no new push since (rules in the agent-os skill) |
| Founder only | Push to main, run a migration, write production data, send anything to a player, parent or coach, post on social media, spend money, change pricing or legal text |
| Off limits | `.env.local`, every secret and the database; names, emails, user ids or any per-player data. Agents work from counts and redacted reports |

One exception to the database rule (founder, 2026-11-01): in a session the
founder is in, Claude may run `docs/check-migrations.sql` through the Supabase
connection in `.mcp.json`. It reads only table, column, function and index
names, never rows. Anything else, a migration included, stays founder only.
On the same terms, safety-reviewer may run Supabase's security advisors
(`get_advisors`), which return names and settings, never rows.

Read-only tools (founder, 2026-11-11), each listed in the agent's `tools:`
line and nowhere else:

| Agent | Tool | Only |
| --- | --- | --- |
| support-triage | Sentry; Vercel runtime errors and logs, deployments | Read. Never resolve, assign or mute. Copy no user id, email or name from a log or event. Sentry has no data until the app sends errors to it. |
| release-checker | Vercel deployments, build logs, runtime errors and logs; Chrome on preview links | Read. Never redeploy, promote, roll back or change env vars. Preview: tester account only, change nothing. |
| activation-analyst | Vercel Web Analytics (page views, events) | Aggregates only. |
| builder | Chrome on localhost | Tester account only. |
| marketing | Canva, Figma, Ahrefs, Similarweb | Drafts and research. Never publish or share. |
| club-growth | Gmail (drafts only, no recipient), Google Calendar (read free times), Google Drive (create and read its own docs), Canva | Never send, read the inbox, create events or share files. |
| video-editor | Canva, Adobe, Figma | Drafts. Never publish or share. |

Each needs the founder's one-time sign-in. An agent whose tool is not
connected says so and carries on without it.

GitHub enforces the main line: with branch protection on `main` (pull
request required, `checks` must pass, no force pushes), nothing reaches the
live app without a pull request and green checks, whoever pushes.

## Files

- `backlog.md`: the experiments, ranked. The single source of truth for what gets built.
- `data/`: weekly counts and paraphrased player notes, added by the founder.
- `reports/`: one activation report per week, written by the analyst.
- `exams/`: each agent's exam and the results log.
- `knowledge/findings/`: each agent's research, with sources.
- `video/`: the video editor's edit logs, the critic panel and the craft playbook.

## Clubs

**club-growth** (`.claude/agents/club-growth.md`, `/agent-os clubs`) grows
Deadeye through clubs, schools and academies: a pipeline of clubs in
`docs/agent-os/clubs/pipeline.md`, outreach drafts, trial plans, each club's
health from the weekly counts, and the coach-side features clubs need (`C`
items in the backlog). The Wexford Blazers are the first trial. It records
organisations and roles, never private contact details or player data, and
every contact, offer and agreement is the founder's.

## Where it runs

- **Local**: Claude Code in this repo, `/agent-os`.
- **Cloud**: claude.ai/code, pick the repo and branch, send `/agent-os`. A
  cloud session sees only what is pushed: the week's counts must be committed
  in `data/` first. It cannot reach Supabase or this laptop.
