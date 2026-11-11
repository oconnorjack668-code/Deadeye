---
name: activation-analyst-playbook
description: How a professional product analyst finds and fixes activation drop-off in Deadeye - funnel and cohort analysis, small-number statistics, experiment design and ranking. Loaded by the activation-analyst agent; use it for the weekly funnel review and for picking the NEXT experiment.
---

# Activation analyst playbook

A professional product analyst defines the moment a player gets value,
measures how many reach it and where they fall away, and only calls a
result when the numbers can carry it. Each experiment is a written bet with
its success line set before it ships. The rules in
`.claude/agents/activation-analyst.md` win over this file. A gold-standard
report to aim at: `examples.md` in this folder.

## Standards you work to

| Standard | What it means here |
| --- | --- |
| One activation event | Deadeye's is a first saved training session after setup. Every funnel step leads to it. |
| Cohorts, not totals | Compare players by the week they signed up. A total mixes old and new players and hides change. |
| Small-number honesty | Under about 30 players at a step, a change is a hint. Give a 95% interval (Wilson) for a rate, and Fisher's exact test when comparing two small groups. Never a percentage without its count ("4 of 9", not "44%"). |
| Pre-registered bets | Before building: hypothesis, the Signal step, the success line ("at least 5 of the next 15 new players"), the guardrail (what must not get worse), and the read date. |
| ICE ranking | Impact, Confidence, Ease, each 1 to 5, with the evidence for Confidence written down. |
| Qualitative beats quantitative when numbers are small | The path walk and the founder's player notes outrank a percentage built on 6 players. |

## Method

1. **Numbers.** Latest count at each step and change since the last data
   file, as counts and rates with intervals. When Vercel analytics are
   connected, add page views for the landing page, sign-up and welcome
   pages for the same week as context (visits, not players).
2. **Biggest drop.** The step that loses the most players in absolute
   numbers, and whether the drop is new (cohort) or old.
3. **Path walk.** Walk the code path from setup to a saved session (agent
   file step 2). For each screen: file, taps, dead ends, unguided choices,
   whether an `app_events` marker records it. A step with no marker is a
   blind spot: say so and suggest the marker.
4. **Read last week's bet** against its pre-registered success line. Write
   `kept`, `dropped` or `not enough players yet` with the count.
5. **New bets.** Three experiments aimed at the biggest drop, each with
   hypothesis, Signal, success line, guardrail, read date and ICE with
   evidence. Pick `NEXT`: the smallest change at the biggest drop.
6. **Check your own numbers** before writing: every rate has a count,
   every claim has its source file.

## Trade tools

- **Vercel Web Analytics** (read-only: `count_pageviews`,
  `aggregate_pageviews`, `count_events`, `aggregate_events`,
  `list_event_types`): page views and any custom events, for project
  `prj_wS5DUVgjIv6ydFZvTcy5mDKLJj6X`, team `team_LQgMyesmWsnM8TxS03hpAcxM`.
  If Web Analytics is off or returns nothing, say so and use `data/` only.
  Report aggregates only.
- **Charts** (dataviz skill when loaded): one funnel chart per report is
  enough.

## Quality bar

- Every number has its count and source; small numbers are called hints.
- The biggest drop is named in players, not only percent.
- Last week's bet is read against the line set before it shipped.
- `NEXT` has a success line, a guardrail and a read date.
- Under 80 lines.

## Common mistakes

- Calling a change from 3 of 7 to 5 of 8 a result.
- Comparing all-time totals instead of signup-week cohorts.
- Choosing a big redesign when a one-screen change tests the same idea.
- Moving the success line after the result is in.
- Forgetting that a step with no marker cannot be measured.
