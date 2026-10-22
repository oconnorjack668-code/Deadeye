# Activation report, 2026-10-22

**Founder: please add this week's counts to `data/`** (`docs/funnel-counts.sql` or `/admin/funnel`, owner and
test accounts subtracted). The only data is from 2026-10-19. It predates the welcome screen, sample clip and
starting steps (10-21), and tracker `app_events` were not yet recorded, so it cannot show their effect.

## Numbers (2026-10-19, all-time)

| Step | Players | Change |
| --- | --- | --- |
| Joined | 21 | no prior week |
| Finished setup | 17 (81% of joined) | no prior week |
| Logged 1st hoops session | 3 (18% of setup; 7 sessions) | no prior week |
| Saved a tracker run | 1 | no prior week |
| Logged a gym workout | 0 | no prior week |

12 of the 17 did nothing at all after setup. Every step is under 30 players, so these are hints, not results.

**Biggest drop: finished setup to first session, 17 to 3 (14 lost, 82%).** Joined to setup loses 4.

## Path walk: finished setup to a saved session

Onboarding ends on `/welcome` (`onboarding/page.tsx` pushes there). M = `app_events` marker.

| Screen (file) | Taps | Dead end / unguided choice | M |
| --- | --- | --- | --- |
| Welcome ask (`welcome/WelcomeClient.tsx`) | 1 | Court / Not now / Skip. The answer is not recorded | `welcome_seen` |
| Welcome "court" (same file) | 1 | Camera (primary) or by hand (secondary) | none |
| Welcome "later" (same file) | - | Reminders, sample, IQ, dashboard. No way to log a session already trained | none |
| Dashboard Today (`dashboard/page.tsx`) | 1 | Log shots / Track with camera / programs link, then 4 starting steps (`components/StarterSteps.tsx`) and the founding card: 7 choices | none |
| Shot logger (`basketball/new/page.tsx`, `components/basketball/FirstLogGuide.tsx`) | 2 a spot, or 1 a shot | **Opens in "Track every shot"** (`useState('track')`, line 130), but welcome, Today and starting steps all describe "Enter totals" (where, then how many). Unlabelled mode switch, "+ Drill" picker | none |
| Finish panel (same file) | 2 | Date, type, duration, RPE, quality prefilled; only Finish and Save needed | none |
| Saved (`basketball/page.tsx?saved=1`) | - | First-session celebration | `training_sessions` |
| Video AI (`video/page.tsx`, `VideoHub.tsx`) | - | Titled "Video AI", 5 tabs; Shots is default | `tracker_opened` (any visit) |
| Source (`components/video/ShotTracker.tsx`) | 1-2 | Live camera or "Video from your phone", unguided. Camera blocked: an error, the only way on is the file | `tracker_setup` |
| Rim set + adjust (`ShotTracker.tsx`, `RimAdjuster`) | 3 | Left edge, right edge, confirm | `tracker_started` |
| Tracking (`ShotTracker.tsx`) | 1 | Stop and review | `tracker_finished` |
| Review (`ShotTracker.tsx`) | 1+ | Zone defaults to "all-around". **0 shots detected: Save errors**; the only ways on are adding shots by hand or starting over | none |
| Saved (`basketball/[id]/page.tsx?saved=1`) | - | First-session celebration | `tracker_saved` |
| Sample (`welcome/sample/SampleClient.tsx`) | 1 | Ends on "Open the tracker" or dashboard; no "log by hand". Saves nothing (by design) | `sample_played`, `sample_finished` |

Fewest taps from the welcome screen: by hand 6 (court, by hand, spot, makes, Finish, Save), plus one more to switch
mode, since a new player starts in track mode. Tracker 9 (court, camera, live, allow, 2 rim taps, confirm, stop, save).

Findings:
1. The logger's default contradicts every message before it. A new player expecting "two taps a spot" gets a
   court plus MAKE/MISS buttons that need a tap per shot while shooting. Switching modes is up to them, with no guidance.
2. The manual path has no marker between `welcome_seen` and a saved session. Next week we can see tracker
   drop-off but not whether by-hand players stop at welcome, dashboard or logger.
3. The "Not right now" branch, where most new players are, never offers logging a session already trained today.
4. Tracker dead end: a run that detects nothing cannot be saved and does not offer the by-hand logger.

## Last experiment

No backlog item is `shipped`, so there is nothing to compare. E0 (founder asks 5 players) has no notes file yet.

## Top 3 new experiments

| # | Experiment | Impact | Effort | Confidence and evidence |
| --- | --- | --- | --- | --- |
| E1 | First log opens in "Enter totals" | medium | low: one default, one test | medium: the copy and default contradict each other in the code; no player notes yet |
| E2 | "Trained already? Log it" on Not right now and the sample's end | medium | low: two links | low: unknown how many new players trained that day; E0 would tell |
| E3 | Markers for the welcome answer and the by-hand logger | none directly, unblocks reading the funnel | low: 4 names, no migration (the name check is a regex) | high that it yields the counts |

**NEXT: E1.** It is the smallest change aimed at the biggest drop. It makes the logger match the promise that
gets players into it, and it also lets a player log from memory after training.
