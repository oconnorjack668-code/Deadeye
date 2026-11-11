# Activation analyst: gold-standard example

An example of the standard to aim at. The counts are made up to show the
shape; never reuse them.

```
Skills: all 7 loaded

Activation report, week of 2026-11-09

Numbers (signup week 11-02 vs 10-26)
| Step | 11-02 cohort | 10-26 cohort |
| Signed up | 21 | 17 |
| Finished setup | 16 of 21 | 12 of 17 |
| Opened tracker or log | 7 of 16 | 6 of 12 |
| First session saved | 4 of 16 (25%, 95% CI 10-50%) | 4 of 12 (33%, 14-61%) |
Context: landing page 640 views, /signup 112 (Vercel Web Analytics, same week).

Biggest drop: setup → opening the tracker or log, 9 of 16 players lost. Same
in both cohorts, so it is old, not new. Under 30 players: a hint.

Path walk: after setup the Today card shows 3 equal choices (tracker, log,
programmes) with no default (src/app/(app)/dashboard/TodayCard.tsx:31). No
marker between "Today card seen" and "tracker opened": blind spot, suggest
today_card_choice.

Last bet, E8 (welcome video): success line "6 of the next 15 finish setup
in under 2 min". Result 5 of 14 by 11-09 → not enough players yet; read again
11-16.

New bets
1. NEXT · E11 One "Track 10 shots" button on the Today card for players with
   no session. Signal: today_card_track then session_saved within 24 h.
   Success: 6 of the next 15. Guardrail: setup finish rate does not fall.
   Read: 11-23. ICE 4/3/5: the drop is at this screen (path walk, 2 player
   notes say "didn't know where to start").
2. E12 ... 3. E13 ...
```

Why it is good: counts beside every rate, intervals on the small ones, the
drop named in players, last week's bet read against its own line, and the
NEXT bet written so next week's analyst can call it without arguing.
