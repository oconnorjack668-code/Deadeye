# Deadeye status

The one place for what is open now and what was recently done. Every
session reads it first (a SessionStart hook prints it into each new Claude
Code chat; Codex reads it via `AGENTS.md`) and updates it before it ends
(`.claude/skills/handoff/SKILL.md`). Handoffs are history: an "Open" line in
an old handoff is what was open *that day*, not now.

Last updated: 2026-11-11 (agent-upgrades + handoff-status sessions)

## Rules

- **This file wins over any handoff, memory note or subagent report.** If
  they disagree, check the evidence (PR state, code, `cron_runs`, the live
  site) and fix whichever is wrong.
- **Never tell the founder something is broken or still to do from an old
  note.** Say "unconfirmed since <date>" or check it first.
- **Close with evidence.** Move a done item to "Recently done" with the date
  and how it was confirmed (PR merged, commit, query, live check). Keep
  "Recently done" to the last 21 days; older lines are deleted (git keeps
  them).
- Every open item has an id (`S<n>`, never reused), an owner, the date it
  was opened and when it was last checked and how.

## Open

| Id | What | Owner | Since | Last checked |
| --- | --- | --- | --- | --- |
| S1 | Sign the DPIA (`docs/legal/dpia.md`, section 7) with the account holder, then its 6 open actions. Add the marketing footage pipeline (stills go to Anthropic in Claude Code sessions). | Founder | 2026-11-07 | 2026-11-11: file still says DRAFT |
| S2 | Hoop model credits: three dataset links in `ml/rim-detector/ATTRIBUTION.md` still "to confirm", but rim-finding shipped 3 Nov. CC BY needs the credit. Founder sends the Roboflow links; then add them. | Founder, then builder | 2026-11-03 | 2026-11-11: still "to confirm" |
| S3 | Billing: deadeye.ie, then Resend, then Stripe Pro live by 2027-01-08; club billing by 2027-02-01 (`docs/founder-setup-guide.md`). | Founder | 2026-11-09 | 2026-11-09 |
| S4 | Merge PR #81 (handoff for the 9 Nov HQ redesign and hub worker). Until it merges, that session's handoff is missing from main. | Founder (`merge 81`) | 2026-11-09 | 2026-11-11: open |
| S5 | Tuesday video v4: parent/adult consent for the shooter and the bystander in clip 16761, then post with a TikTok/Meta library sound (AI label if the AI voice is used). | Founder | 2026-11-11 | 2026-11-11 |
| S6 | Send the promo's numbers per platform (profile visits, link taps, post dates) into `docs/agent-os/marketing/results.md`. | Founder | 2026-11-11 | 2026-11-11 |
| S7 | Site meta description says "Track every shot" (`src/app/layout.tsx:21`): banned wording. One-line fix. | Builder | 2026-11-11 | 2026-11-11: still there |
| S8 | Tracker visuals: flame beside the count, not over it; MAKE/MISS beside the rim; no underline on the export end card. | Builder | 2026-11-11 | 2026-11-11 |
| S9 | `docs/brand/promo-video/PLAN.md` says 150 drills; the app has 168 (`DRILL_COUNT`). | Marketing | 2026-11-11 | 2026-11-11 |
| S10 | New filming for posts: phone in shot on a bag, head height, not facing windows, nobody else in the hall, a girl player for some posts. | Founder | 2026-11-11 | 2026-11-11 |
| S11 | Getting players in: no new signups since 2026-10-24 (as of 9 Nov). Wexford Blazers trial (`docs/agent-os/clubs/pipeline.md`), first social posts, E0 (message 5 players). | Founder + agents | 2026-11-09 | unconfirmed since 2026-11-09 |
| S12 | Run the first agent exams to set a baseline: `/agent-os exam all`. | Lead (local) | 2026-11-11 | 2026-11-11 |
| S13 | Hoop finder: retry with the live camera on a phone (Chrome's permission bubble blocked it in testing). | Founder | 2026-11-03 | unconfirmed since 2026-11-03 |
| S14 | PR check routine (`trig_01MSRh74ux3XbaYfzerJjJtz`) not yet seen firing on an agent PR; check it ran on #84. | Lead | 2026-11-09 | unconfirmed since 2026-11-09 |
| S15 | Error tracking: Sentry is not in the app, so support-triage has only Vercel errors (kept about an hour on Hobby). Adding Sentry needs a backlog item and a safety review. | Founder decides | 2026-11-11 | 2026-11-11 |
| S16 | `.agents/skills/agent-os/` in the main checkout is an untracked, outdated Codex copy of the agent-os skill: regenerate or delete. | Founder decides | 2026-11-11 | 2026-11-11 |
| S17 | Optional: delete the unused `OPENAI_API_KEY` in Vercel; check `src/proxy.ts` refreshes sessions as current Supabase docs say. | Founder / builder | 2026-11-09 | unconfirmed since 2026-11-09 |

## Recently done (do not raise again)

- 2026-11-11 · Agents to professional level: playbooks, briefs, exams, guard hooks, trade tools, video-editor upgrade. PR #84 merged (b676120). Canva, Figma, Ahrefs, Adobe connected; Sentry and Similarweb skipped (S15).
- 2026-11-11 · Old hand-made `.codex/agents/*.toml` removed from the main checkout; generated ones in sync (`node scripts/sync-codex-agents.mjs --check`).
- 2026-11-11 · Video-editor agent, Tuesday video v1-v4, marketing week plan: PRs #82, #83 merged.
- 2026-11-10 · Landing demo says "count makes and misses": PR #80 merged.
- 2026-11-09 · E4 reminders card, weekly run, Deadeye Bench hub: PRs #74, #75, #76 merged (checked 2026-11-11).
- 2026-11-07 · **Push keys (VAPID) are set.** Every reminders run since 7 Nov returns 200 in `cron_runs`. Never list push keys or "reminders don't send" as open.
- 2026-11-03 · Rim-finding ("Find the hoop for me") shipped and checked live (credits still open: S2).
