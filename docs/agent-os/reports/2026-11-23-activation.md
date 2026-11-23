Skills: all 7 loaded

# Activation report, 2026-11-23

Data: [`2026-11-23`](../data/2026-11-23-funnel.md) vs [`2026-11-16`](../data/2026-11-16-funnel.md); no notes file (E0 still
unanswered); Vercel Web Analytics not connected here. Counts from 1 to 4 are written "under 5" (safety rule, E6 review);
exact numbers are on `/admin/funnel`. Founder, please check `/admin/funnel`: the Everyone column matches 11-16 row for row.

## Numbers (Everyone, owner and test accounts out)

| Step | 11-23 | vs 11-16 | Joined in 7 days |
| --- | --- | --- | --- |
| Joined | 35 | 0 | 0 |
| Finished setup | 27 of 35 (77%, 61% to 88%) | 0 | 0 |
| 1st hoops session | **under 5 of 27** (under 19%) | 0 | 0 |
| 2nd session | under 5 | 0 | 0 |
| Welcome seen | 10 of 27 who set up (17 set up before it existed, 10-21) | 0 | 0 |
| Today card taps: Log shots / camera / program (live 11-17, #126) | 0 / 0 / 0 | new group | 0 |
| Video AI page / tracker opened / saved | 0 / under 5 / under 5 | 0 | 0 |
| Logger opened / Finish (E1, E3) | 0 / 0 | 0 | 0 |
| Reminders on (E4) | 0 | 0 | 0 |

**0 joined in the last 7 days**, so there is no cohort and no change can be read. The players who joined 9-16 Nov
(under 5) have now had their 7 days: none logged a first session. Every step is under 30 players: hints only.

**Biggest drop: finished setup to a first session, at least 23 of 27 lost.** Old: the same step in every file since
10-19. At least 23 of 27 never opened the logger or the tracker. Barrier still most likely **forgot** (no cue reaches
them and nothing shows whether they come back); unconfirmed without E0. This week adds one fact: since the new Today
card went live 6 days ago, 0 taps on any of its three buttons, out of an unknown number who saw it.

## Path walk: finished setup to a saved session (M = `app_events` marker)

| Screen (file) | Taps | Dead end / unguided choice | M |
| --- | --- | --- | --- |
| Welcome (`welcome/WelcomeClient.tsx`) | 1 | Court / Not right now (5 exits, nothing to do without a ball) / Skip (l.213) | seen, court, later; skip none |
| Home, no session (`dashboard/page.tsx` l.233-285) | 1 | `TodayFirstStep`: one "Log shots", quiet camera and program links; then starting steps, reminders card (E4), Pro offer | taps only: **no "seen", blind spot** |
| Logger (`basketball/new/page.tsx`) | 2+ | Opens in Enter totals for a first log (E1) | `log_opened`, `log_finish_opened` |
| Tracker (`video/page.tsx`, `ShotTracker.tsx`) | 9 | Camera or video unguided; rim taps; 0 shots: Save errors, no by-hand link (E5) | `video_opened` to `tracker_saved` |

Findings:
1. Home is now changed by three pieces of work with no "seen" marker under any of them: E4 (live 11-09), the Today
   card (#126, live 11-17, read S42) and D6 (PR #162, open). Each can only be read as taps out of nobody-knows.
   E6's `dashboard_seen` is the one denominator all three need.
2. The 17 who set up before 21 Oct never saw the welcome screen; nothing sends them there (idea E10).
3. Main still prints raw 1 to 4 counts in the public file (2nd-session row); the fix waits on E6's branch (due today).
4. E6's branch is 124 commits behind main. 5 of its 12 files changed on main since (`privacy/page.tsx` by #137,
   `funnel.ts`, `events.ts`, `dashboard/page.tsx`, `funnel-counts.sql`); PR #162 also edits `dashboard/page.tsx`.

## Results review (E1 to E4, read against their own lines)

- **E1** (11% towards 30%): 0 logger opens all-time; nobody has met it. Not enough players yet; stays `kept`.
- **E2** (by-hand link on "later"): under 5 shown it, 0 logger opens; not enough players, `kept`. **E3**: live, `kept`.
- **E4** final read, line set 11-16 "keep only if at least 1 player turns reminders on": 0. **`dropped`** by its line.
  Reach is unknown, so this says nothing about reminders in general. The card stays until D6 or a clean-up removes it.
- Last three predictions: E1 (30%) missed, reach; E4 had no number until week 2, then 0; E6 (read 11-30) cannot be
  read, not shipped. 0 of 4 bets since 10-22 could be judged on their idea: confidence still untested (lesson added).

## With 0 signups

No in-app change can be read until new players arrive, and the 12-31 input target (30 new players finishing setup)
needs about 5 a week from now. Activation's two jobs this week: (1) learn whether the 23 or more stalled players ever come
back (E6), which decides whether in-app bets can reach anyone at all; (2) hand acquisition to player-outreach and
club-growth, and E0 (5 conversations, no build) to the founder. Moving S42 is the lead's call: it needs new signups.

## Top 3 new experiments (ICE 1-5; all hints; reach for each depends on E6)

| # | Experiment | I | C | E | Confidence evidence |
| --- | --- | --- | --- | --- | --- |
| E10 | Send a no-session player who never saw the welcome there once, from Home | 3 | 2 | 4 | 17 of 27 set up before it existed; the welcome is the only screen that asks "at a court?" |
| E11 | Today's camera link reads "Track a clip from your phone" (no court needed) | 2 | 2 | 5 | camera beats logger all-time (under 5 vs 0 opens); after D6 merges |
| E12 | One picture for the rim taps in tracker setup | 2 | 2 | 3 | about half who open the tracker never start it; under 5 players |

Safety question first, not scored: one email to stalled players pointing back to Home (safety-reviewer first).

**NEXT: E6, `dashboard_seen`, brought up to date with main and opened as a PR.** Smallest build at the biggest
drop: no screen changes, and it carries the small-count fix for the public file. Builder fallback if "too big": the
counts fix first as its own PR, the marker second. Decision line unchanged (2 or fewer / 3-4 / 5 or more older
stalled players on Home); **read date moves** from 11-30 to 12-14 (files 12-07 and 12-14) if merged by 11-30,
otherwise 14 days after merge. The founder reads it on `/admin/funnel`. Guardrail: nothing on screen changes.
