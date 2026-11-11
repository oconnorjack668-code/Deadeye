Skills MISSING: metrics-review, statistical-analysis, synthesize-research, user-research, tracking audit - not installed (none is in the Skill tool's list). Worked from the knowledge file's rules instead.

# Activation report, 2026-11-09

Data: [`data/2026-11-09-funnel.md`](../data/2026-11-09-funnel.md). No notes file exists, so E0 has had no answers.
Founder, please send: (1) E0, 5 paraphrased answers; (2) days from first to second session for the 3 players
(not in the counts); (3) a look at `/admin/funnel` to confirm the file is right (see below).

## Numbers (Everyone, owner and test accounts out). Ranges are 95%, adjusted Wald.

| Step | 11-09 | vs 11-02 | vs 10-22 |
| --- | --- | --- | --- |
| Joined | 33 | 0 | +9 |
| Finished setup | 24 (73%, 55% to 85% of joined) | 0 | +6 |
| 1st hoops session | 3 of 24 (12%, 4% to 32%) | 0 | +1 (baseline 2 of 18, 2% to 34%) |
| 2nd session | 1 of 3 (6% to 80%) | 0 | 0 |
| 3rd session | 0 | 0 | 0 |
| Welcome seen / court / later | 7 / 0 / 0 | 0 | +5 / 0 / 0 |
| Tracker opened, set up, started, results, saved | 3, 3, 2, 2, 1 | 0 | +3, +3, +2, +2, +1 |
| Logger opened, Finish pressed (E3) | 0, 0 | 0 | new rows |

Every row is identical to 11-02. The 11-02 backlog note says nobody has signed up since 2026-10-24, so the
"Joined in 7 days" column is 0 everywhere and no cohort has had its 7 days. Target: 40% is 10 of 24, so 7 more
of the 21 who stalled must log by 11-19. That cannot be read as a 7-day rate: it is a re-engagement count.

**Biggest drop: finished setup to first session, 24 to 3 (21 lost, 88%).** Barrier: unknown without E0, and
the data cannot split can't, forgot and no reason yet. Walk below: the 17 or so who set up before the welcome
screen (10-21) never saw it and have only the dashboard to come back to, which points at **forgot** (no cue).

Small numbers: every step is under 30 players. Changes since 10-22 are hints. Of the 6 who set up since
10-22, 1 has a session (1 of 6, 2% to 58%), and the only new session marker is a tracker save, so that player
may not have used the by-hand logger E1 and E2 changed. Days to second session: not available.

## Path walk: finished setup to a saved session (M = `app_events` marker)

| Screen (file) | Taps | Dead end / unguided choice | M |
| --- | --- | --- | --- |
| Welcome ask (`welcome/WelcomeClient.tsx`) | 1 | Court / Not right now / Skip | `welcome_seen`, `welcome_court`, `welcome_later`; skip has none |
| Court branch (same) | 1 | Camera (primary) or by hand | none until the next page |
| Later branch (same) | 1 | By-hand link (E2), reminders card, sample, IQ, dashboard: 5 exits | none |
| Sample (`welcome/sample/SampleClient.tsx`) | 1 | End card now has "Log shots by hand" | `sample_played`, `sample_finished` |
| Dashboard Today (`dashboard/page.tsx` l.230) | 1 | Log shots / camera / programs link, then 4 starting steps (`components/StarterSteps.tsx`) and more cards. 3 of the 4 steps are not logging. No reminder prompt on this page | none |
| Logger (`basketball/new/page.tsx`) | 2 a spot | Opens in Enter totals for a first log (E1). Still shown at once: drill tabs, "+ Drill" menu, mode switch, "Shots per spot" buttons | `log_opened` |
| Finish panel (same) | 2 | Prefilled; Finish then Save | `log_finish_opened` |
| Saved (`basketball/page.tsx?saved=1`) | 0 | First-session celebration | none; saved = `training_sessions` row |
| Tracker (`video/page.tsx`, `components/video/ShotTracker.tsx`) | 9 in all | Camera or video unguided; rim taps | `tracker_opened`, `_setup`, `_started`, `_finished`, `_saved` |
| Tracker review (same, l.1849) | 1+ | **0 shots: save errors, text only, no by-hand link (still open since 10-22)** | `tracker_finished` only |

Findings:
1. Nothing moved between files, so E1 to E3 have had almost no audience. Their result is "not yet readable".
2. No marker for arriving on the dashboard or tapping the Today card, the one place a stalled player returns to.
3. Reminders sit only on the welcome "later" branch and profile; the dashboard never offers them.
4. The tracker 0-shot dead end is unfixed. Tracker path: 2 reached results, 1 saved (hint, 2 players).
5. All 5 logger markers read 0 for real players, so whether they record in production is unverified.

## Last experiment (shipped E1, E2, E3)

Read over 0 weeks of new signups (the rule is 2). E1 (Enter totals default): 3 of 24 vs 2 of 18, ranges overlap
almost entirely, hint only. E2 (by-hand links) and E3 (markers): 0 rows, no signups to reach them. All three
stay `kept` by default (cheap, no harm seen), not confirmed. Re-read when two weeks of signups exist.

## Top 3 new experiments (impact, effort, confidence)

| # | Experiment | Impact | Effort | Confidence and evidence |
| --- | --- | --- | --- | --- |
| E4 | Training-days reminder card on the dashboard for a player with no session (targets forgot) | low to medium | low: reuse `RemindersCard`, one marker, no migration | low: no E0 notes; research says reminders and if-then plans give small gains (d about 0.3), and about 17 of 24 never saw the welcome reminder. iPhone without the Home Screen app cannot get push, so reach is lower |
| E5 | Tracker "no shots detected" offers "Log this session by hand" (targets can't) | low | low: one link, one test | low: 1 of 2 who reached results did not save; code dead end is certain |
| E6 | Markers `dashboard_seen` and `today_log_tapped` for zero-session players | none directly | low: 2 names, no migration | high that it yields counts, but only useful once signups resume |

**NEXT: E4.** Smallest change aimed at the biggest drop that reaches players who are already stalled; the
others need new signups or one player. Founder actions matter more than any build this week: E0, and new signups
(clubs and marketing), since a funnel with no joiners cannot show whether the target was met by 11-19.
