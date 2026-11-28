# Activation analyst knowledge

Last researched: 2026-11-16

Rules for this file: `README.md`. Strength: **strong** (meta-analysis, large
trial), **moderate** (one trial or field study), **practitioner**, **official**.

## Lessons from the founder

None yet.


## Lessons from results

What the outcome of earlier work taught (see "Results review" in the agent
file). Newest first, each with the date, what happened, and the rule.

- 2026-11-23: E6 (a marker, no screen change) passed safety on 11-16 but was
  bundled with a privacy clause waiting on the founder and a counts-file fix,
  got no PR, and fell 124 commits behind main. Its 11-30 read became
  impossible, and meanwhile two more Home changes (#126 live, #162 open)
  shipped with no "seen" marker either. 0 of 4 bets since 10-22 could be
  judged on their idea. Rule: a measurement item a decision depends on goes to
  a PR the day it passes safety, split from anything waiting on approval; if
  it slips, move its read date in the backlog that day, never the line. And
  any change to a screen gets its "seen" marker in the same build or first.

- 2026-11-16: E4 shipped with a Signal of "the `reminder_set` count" and no
  marker on the dashboard where its card sits, so after a week it can neither
  win nor lose (0 reminders, out of an unknown number who saw it). Rule: a
  bet's success line is a number of players out of a counted denominator, and
  the screen it changes must already have a marker, or the item adds one.
- 2026-11-16: E1 to E4 (10-22 to 11-09) reached at most 3 real players
  between them: signups stopped 10-24 to 11-08, and nothing showed whether
  stalled players come back to the screens we changed. Confidence calls
  cannot be judged yet. Rule: before picking `NEXT`, estimate how many players
  will see the change before its read date; under 5, pick a screen every new
  player sees, or measure reach first.

## Checklist

### Weekly report

- [ ] Under 50 players, every rate is "x of n" with its 95% range (adjusted
      Wald): 3 of 24 is 13%, range about 4% to 32%. 0 of n: up to 3/n.
- [ ] A change is a hint unless it repeats in two data files and the ranges
      barely overlap. Never "worked" or "failed" off one week.
- [ ] Players are counted by setup week, once their full 7 days have passed.
- [ ] A shipped change is read over at least two weeks of new signups;
      reminder and novelty effects fade.
- [ ] The founder's player notes come before percentages. Five conversations
      find the main blockers; 9 to 12 are needed before calling a theme.
- [ ] The biggest drop is named as one barrier: **can't** (too many steps,
      no court, unsure what to do), **forgot** (no cue), or **no reason yet**
      (no payoff seen). Each proposed fix says which barrier it targets.
- [ ] Days from first to second session are reported too.
- [ ] Counts from 1 to 4 are written "under 5" in reports and the backlog,
      and no figure is given that lets one be worked out (no "24 lost" next
      to 27, no range built from it). 0 and 5+ are fine.
- [ ] Every open bet's read date is checked against whether its change is
      live on main; not live means move the date today and say so.
- [ ] If a data file matches the previous one row for row, say so and ask the
      founder to check `/admin/funnel`; when "Joined in 7 days" is 0 there is
      no cohort, so no experiment can be read (11-09: none since 10-24).

### Backlog items

- [ ] Removes or shortens a step before adding explanation; no new tour.
- [ ] A screen a new player sees empty says what goes there, with one button.
- [ ] Reminders: the player picks when ("after training on Tuesday");
      permission is asked after a tap and after some value, never on first
      load. The item says what happens on an iPhone where the app is not
      installed to the Home Screen (no web push there).
- [ ] Streaks and XP: no guilt or loss wording; a missed day does not wipe
      visible progress; there is a way to repair or keep a streak.
- [ ] Comparison is with a small group of team-mates or friends, not only a
      national table where a new player starts at the bottom.
- [ ] Words suit 13 to 17s: getting better, choice, friends and team. No
      pressure, urgency or shame (also a safety-reviewer rule).
- [ ] The Signal names a step with an `app_events` marker and an expected
      size, and says "hint" when fewer than 30 players will reach it.
- [ ] The success line is "x of the next n" with n counted by a marker on
      the changed screen (no marker, no bet), plus a read date.
- [ ] Reach check: how many players will see this before the read date?
      Under 5: choose a screen every new player sees, or measure reach first.
- [ ] The success line is a number written before the build ("at least 6 of
      the next 15 new players open the tracker within 7 days"), set from the
      current rate. A formula with X in it is not a success line.
- [ ] An idea that messages people (parents, players by email or push),
      shows a child to others, or keeps new personal data is not scored
      with the growth ideas. It goes in its own line as "safety question
      first: safety-reviewer" and is ranked only after it passes. (Exam,
      2026-11-17: a weekly email to parents was given an ICE score.)

## Research

Findings with their sources are in `findings/activation-analyst.md`. Search it when a
task needs evidence; add new findings there, not here.
