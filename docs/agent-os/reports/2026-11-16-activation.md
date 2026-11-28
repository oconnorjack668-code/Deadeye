Skills: all 7 loaded

# Activation report, 2026-11-16

Data: [`2026-11-16`](../data/2026-11-16-funnel.md) vs [`2026-11-09`](../data/2026-11-09-funnel.md); no notes file (E0 unanswered); Vercel Web
Analytics not connected here. Founder, please send: E0's five answers, and days from 1st to 2nd session for the 3.

## Numbers (Everyone, owner and test accounts out; ranges 95%, adjusted Wald)

| Step | 11-16 | vs 11-09 | Joined in 7 days |
| --- | --- | --- | --- |
| Joined | 35 | +2 | 2 |
| Finished setup | 27 of 35 (61% to 88%) | +3 | 2 of 2 |
| 1st hoops session | **3 of 27 (11%, 3% to 29%)** | 0 | 0 of 2 (their 7 days are not up) |
| 2nd session | 1 of 3 | 0 | 0 |
| Welcome seen / court / not right now | 10 / 1 / 1 | +3 / +1 / +1 | 2 / 0 / 1 |
| Sample played / to the end | 2 / 2 | +1 / +1 | 1 / 1 |
| Tracker opened / source picked / started / results / saved | 4 / 4 / 2 / 2 / 1 | +1 / +1 / 0 / 0 / 0 | 0 at every step |
| Logger opened / Finish (E3) | 0 / 0 | 0 | 0 |
| Reminders on (E4) | 0 | new row | 0 |

First signups since 10-24: 2, whose 7 days are not up, so no cohort can be read. Every step is under 30 players:
all changes are hints. Against the 10-22 baseline (2 of 18, 2% to 34%): +1 first session in four weeks.

**Biggest drop: finished setup to first session, 27 to 3 (24 lost).** Old, not new: it is the same step in every file
since 10-19 (14, 16, 21, 21, 24 lost). Inside it, at least 23 of 27 never opened either way to log: the by-hand logger
has 0 opens all-time, the tracker 4. Barrier: most likely **forgot** (no cue reaches them: 0 reminders on, and nothing
shows whether they ever come back), unconfirmed without E0. Of the few who start, all chose the camera.

## Path walk: finished setup to a saved session (M = `app_events` marker)

| Screen (file) | Taps | Dead end / unguided choice | M |
| --- | --- | --- | --- |
| Welcome ask (`welcome/WelcomeClient.tsx`) | 1 | Court / Not right now / Skip | `welcome_seen`, `_court`, `_later` (now seen firing live); skip none |
| Court branch (same) | 1 | Camera (primary) or by hand | next page's marker |
| Not right now (same) | 1+ | 5 exits: by-hand link (E2), reminders card, sample, IQ, dashboard. Nothing to do now with a ball | none |
| Dashboard, no session (`dashboard/page.tsx` l.231-300) | 1 | Today: Log shots (primary), camera, programs; then 4 starting steps (3 not logging), then the E4 reminders card | **none: blind spot** |
| Logger (`basketball/new/page.tsx`) | 6 from welcome | Opens in Enter totals for a first log (E1) | `log_opened`, `log_finish_opened` |
| Tracker (`video/page.tsx`, `components/video/ShotTracker.tsx`) | 9 | Camera or video unguided; 2 rim taps and confirm | `tracker_opened` to `_saved` |
| Tracker review (`ShotTracker.tsx` l.2016, save l.1398) | 1+ | **0 shots: advice text, Save errors, no by-hand link (open since 10-22)** | `tracker_finished` |
| Reminders (`profile/RemindersCard.tsx`) | 3+ | Days, "Remind me", then device push; iPhone must install to the Home Screen first | `reminder_set` (only when on) |

Findings:
1. Welcome markers now fire live, so the logger's 0 is real: nobody has opened it since 10-25. Players reach for the
   camera: 4 tracker opens, 3 before anyone could answer "court" (so from the dashboard's second button or the menu).
2. The tracker loses 3 of the 4 who try it (2 never started, 1 did not save). `tracker_setup` fires when the source is
   picked (`ShotTracker.tsx` l.467), before the rim taps: "set the rim" overstates it. support-triage is checking it.
3. No marker shows a stalled player returning to the dashboard: E4 has no denominator, and "never came back" looks
   the same as "came back and did not tap".
4. A reminder needs 3+ taps and push (iPhone: Home Screen install too): 0 of 27. 5. The counts file calls itself
   public; the E3 safety note says `data/` must stay private. Lead: please confirm.

## Last experiments (read against their own lines)

- **E1** (line: 11% towards 30%): 0 logger opens, nobody has met it. Not enough players yet; stays `kept`.
- **E2**: 0 of 1 shown the "later" link and 0 of 2 who finished the sample opened the logger. Hint; stays `kept`.
- **E3**: welcome answers confirmed live; `kept`. **E4** (week 1 of 2): 0 reminders on, out of an unknown number who
  saw the card; no numeric success line was set, so it cannot win or lose. Final read 11-23.
- Results review: four changes since 10-22 reached at most 3 real players between them; confidence calls cannot be
  judged yet. The lesson is reach (knowledge file).

## Top 3 new experiments (ICE 1-5; all hints at today's volume)
| # | Experiment | I | C | E | Confidence evidence |
| --- | --- | --- | --- | --- | --- |
| E7 | Today card for a no-session player leads with "Track with the camera", by hand second | 3 | 2 | 5 | 4 tracker opens vs 0 logger opens all-time; tracker saves only 1 of 4 |
| E8 | "Got a clip of you shooting? Track it now" on Not right now (upload, no court needed) | 3 | 2 | 4 | the one path to a session from the sofa; unknown how many have clips |
| E9 | "Add to my calendar" (.ics, nothing stored) in the reminders card when push is off | 2 | 2 | 3 | 0 of 27 reminders on; if-then plans d about 0.3; works on iPhone without install |

**NEXT: E6, one marker `dashboard_seen` for players with no session.** Smallest build at the biggest drop; it tests
the bet behind every dashboard item (E4, E7): do stalled players come back at all? Line, set now, read 11-30: older
no-session players on the dashboard 2 or fewer: stop dashboard bets, E8 and E0 next; 5 or more with at most 1 opening
the logger or tracker: E7 next. Guardrail: nothing on screen changes.

## Target (40% by 11-19): replace

3 of 27 (11%, 3% to 29%); 40% is 11 of 27, 8 more in 3 days: it will be missed. The level is fair (a 500-product
survey: average 34%, median 25%), but at 2 signups a week no 7-day rate can be read for months. Replace with:
(1) 30 new players finishing setup by 2026-12-31, the input every read needs; (2) 10 players with a first session
by 2026-12-31 (now 3); (3) the 7-day rate on the first 30 who set up after 11-16: 9 of 30 (30%), 40% the stretch.
