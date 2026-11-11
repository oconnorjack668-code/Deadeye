---
name: agent-os
description: Runs Deadeye's Agent OS weekly loop - support triage, activation review, build, safety review, release check, pull request, marketing, clubs. Use when the founder says /agent-os or weekly review, when the Monday scheduled run starts, or when the founder asks what the agents should work on next.
---

# Agent OS

The goal, agents and permissions are in `docs/agent-os/README.md`. Read it
first. You are the lead: you dispatch each agent below with the Agent tool
and pass along only what the next one needs.

**Skills.** Every agent opens its reply with a `Skills:` line. If any says
`MISSING`, the first line of your report to the founder is
`Skills failed: <agent>: <names> (<error>)`, followed by how to fix it: in
Claude Code run `/plugin` and install or enable the plugin named before the
colon (e.g. `marketing` for `marketing:campaign-plan`); on claude.ai turn the
plugin on in Settings. Say what the agent did without it. A reply with no
`Skills:` line counts as a failure too.

Arguments: `review` runs steps 1 and 2 only. `support` runs step 1 only.
`marketing` runs step 8 only. `clubs` runs step 8b only. `video` runs step
8v only (local sessions: the footage is on the founder's laptop). `exam <agent>` or
`exam all` runs the agents' exams (`docs/agent-os/exams/README.md`) and
nothing else. No argument runs everything, as the Monday 09:00 scheduled
run does; it skips 8v and exams.

## Steps

00. Read the founder's decisions on the hub (Deadeye Bench) and act on them,
   as `docs/agent-os/hub/README.md` says. Pass each agent the decisions on
   its own calls when you dispatch it.
0. Read the newest file in `docs/agent-os/data/`. If it is more than 7 days
   old, the weekly counts job did not run: say so first in the report
   (check `AGENT_DATA_GITHUB_TOKEN` in Vercel and the job's log), then go on
   with what there is.
1. Dispatch `support-triage` when the counts show open reports or crashes,
   or there is report text newer than the last support report. A P1 it
   finds becomes the `NEXT` item.
2. Dispatch `activation-analyst`. Done when a new report exists in
   `docs/agent-os/reports/` and `backlog.md` holds exactly one `NEXT` (a P1
   from step 1 stays `NEXT`).
3. Dispatch `builder` on the `NEXT` item. Done when its `exp/*` branch is
   pushed with tsc, lint and tests passing.
4. Dispatch `safety-reviewer` on that branch. On `BLOCK`, send the reasons to
   `builder` once, then review again. A second `BLOCK` ends the build here:
   no pull request.
5. Dispatch `release-checker` on the branch. Done when the backlog item holds
   the Founder checklist.
6. Open a pull request from the `exp/*` branch into `main` (GitHub tools).
   Title: the item and its id. Body: what changed for players, the checks
   with results, the safety verdict, any migration, and the Founder
   checklist. Do not merge it.
7. Commit the `docs/agent-os/` changes with a handoff
   (`.claude/skills/handoff/SKILL.md`) on `agent-os`, push it, and open or
   update the pull request from `agent-os` into `main`.
8. Dispatch `marketing`. Done when its plan exists.
8v. On `/agent-os video` with a script and the footage's folder: dispatch
   `video-editor`. When it says a cut is ready, run the critic panel
   (`docs/agent-os/video/critic-panel.md`): six critics at once, then merge
   their files into `critique-vN-SUMMARY.md`. Dispatch `video-editor` again
   with the summary for the next version. Done when the founder has the
   versions side by side and the edit log in `docs/agent-os/video/`.
8b. Dispatch `club-growth` when `docs/agent-os/clubs/pipeline.md` has a club
   in `talking`, `trial` or `active`, and on the first Monday of each month
   in any case. Done when its plan exists.
8c. Update the hub: `docs/agent-os/hub/snapshot.json` and its `hub/snapshot`
   document, with this run's numbers, calls (one per pull request, approval
   and founder job), agents, backlog, clubs, film, log and learn
   (`docs/agent-os/hub/README.md`). Commit it with step 7's changes.
Peer review runs inside the steps above (table below). Pass the reviewer
only the work to review and its own agent file's "Peer review" lines; send
its findings back to the author once, then move on.

9. Report to the founder in under 20 lines: any `Skills failed` line first,
   then the numbers and biggest drop, problems found and their ranks, what
   was built, the safety verdict, the pull request links, the marketing
   short list, the clubs (stages, health, outreach drafts waiting), and the
   Founder checklist. End with the exact words to send
   to merge, e.g. `merge 31`.

## Peer review

Professionals have their work checked before it ships. Each agent's file
says who reviews it; you dispatch the reviewer.

| After step | Reviewer | Checks |
| --- | --- | --- |
| 2 (analyst picks `NEXT`) | builder | Is `NEXT` the smallest build that tests the bet? "Too big" goes back to the analyst once. |
| 1 (a P1 found) | builder, during step 3 | Does the code agree with the root cause? |
| 3, 4, 5 | safety-reviewer, release-checker | As now. Release-checker also checks the safety verdict has a line per changed file. |
| next run after a merge | release-checker | `get_runtime_errors` since the deploy; new errors on changed routes go to support-triage. |
| 8 (marketing plan) | safety-reviewer | Ideas showing a person who may be under 18, upsell copy, claims. |
| 8v (each cut) | critic panel, marketing, safety-reviewer | As in `docs/agent-os/video/critic-panel.md`; safety-reviewer when a person may be under 18. |
| 8b (club drafts) | marketing, then safety-reviewer | Tone and brand of outreach; trial plans touching children's data. |

## Merging, only on the founder's word

A pull request is merged only when all of these hold:

- The founder has named that pull request in this conversation and said to
  merge it ("merge 31", "yes, merge the E2 one"). Approval of the plan, a
  report, or a different pull request is not approval to merge this one.
- Since they said it, nothing new was pushed to it. A new push needs a new
  yes.
- Its `checks` workflow is green and GitHub says it can merge. Never bypass
  branch protection, never force, never merge with failing checks or a
  safety `BLOCK`.
- If it holds a file in `supabase/migrations/`, the founder has said the
  migration is run, or has said to merge first because the code works
  without it. Ask when they have not said.

Then merge it, confirm it merged, and give the founder the live checks from
its checklist. Deploys follow the merge on Vercel by themselves; migrations,
messages to players and anything that costs money stay with the founder.
