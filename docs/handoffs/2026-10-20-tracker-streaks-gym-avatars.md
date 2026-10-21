# Tracker accuracy, progression, gym and drill tools, avatars (2026-10-20)

Agent: Claude Code (Opus 5.5, with sub-agents for the programmes, the gym and drills review, and the sounds) · Session 5e7aa9b2, 19 Oct 16:09 to 20 Oct 17:00 Irish time. Its later promo and coach work has [its own handoff](2026-10-20-promo-video-and-coach-format.md) · Commits: listed by feature below · Status: shipped, all pushed to main

## Outcome
- Tracker (7b7ebd3, 433a1ef, 22cffc5): the bench now runs clips the way a phone does. It calls 313 of 341 shots right across 11 tap positions, and all 31 when the taps are on the ring's edges. About 1 call in 10 is marked Unclear, down from a third. Players can now magnify the hoop to drag or nudge the two rim dots, and the tracker adds a filming checklist and a warning when the ring is under 70 px.
- Progression (1795dee, fdad35c, b20a67c): levels 1–50, streak bonus XP and milestone payouts, 33 badges with progress bars, and a level-up celebration. Streak freezes (one per 7 training days, up to 2), a Streaks page and an evening "your streak ends tonight" reminder. Existing players' XP jumped.
- Training (f7c6373, 2812d9b): 8 new programmes, 5 of them Athleticism, which makes 4 free and 18 with Pro. Beginners no longer get risky lifts. Jump-test units, partner drills, layups counting as shooting and wrong library tags are fixed, and an unfinished workout no longer replaces a new one.
- Gym and drills (3820487, 128a084, 69fd64b, ce1a719, cde5e31): sets in reps, seconds or metres; editing and deleting workouts, tests and hoops sessions; a history page per exercise; drill search and favourites; YouTube demo videos chosen in Owner tools. A CC0 swish and rim clank play on make and miss, with one sound setting for the logger and the tracker.
- Account and profile (c3f4bde, dcb5f88, 572c19f, b5d6baf): deleting an account cancels Pro at Stripe first, and "Download my data" covers everything. Players get emoji avatars, optional photos with a choice of who sees them, levels on player cards, and a fuller profile and settings. Owner tools has a Player reports tile.
- Project (13058ad, 0216121): Codex's `AGENTS.md` rules and its export change were checked and committed, and migrations 39–43 are ticked in `docs/launch-checklist.md`. Codex can now commit and push. Installed Hyperframes, Supabase, Postgres best practices, Expo, Shaders, humanizer and `gws` 0.22.5, and made auto mode the default.
- Committed for the player-reports chat (645d5d4c), after checking its work: fce9a70 and dfc250b (two-tap spot totals, a hoops session saved in 3 requests), 821f0e4 (players who've logged nothing are sent to log first), and 1829f96 (Report a problem; its migration 00038 has since been run).

## Decisions
- Test the tracker the way a phone runs it: every 60fps frame, with 11 tap positions up to 14 px off. The user's phone run did worse than the bench, and this reproduced it. The method is in Claude memory `tracker-bench-clips`.
- Improve the phone setup instead of chasing the last few calls: the clip's rim was about 50 px wide, which limits accuracy more than the code does now. The user asked for the movable dots.
- Streak freezes live in the database (00041), so the dashboard, leaderboard, friends and teams all count streaks the same way.
- Beginners get no depth jumps, hang cleans, Nordics, good mornings or barbell lifts, because players can be 13. The review found the problem and the user said to fix it.
- Sounds come from Freesound (CC0). Myinstants was ruled out because its clips are for personal use and the uploaders may not own them.
- Avatars are a fixed set of 16 emojis on 9 colours, so nobody can put words on a card. Photos are optional, with Only me, Friends and teammates, or Everyone. For under-16s the parent approves by email only, because the security review found that a link sent to the player let them approve their own photo.
- Either agent may commit and push the other's checked work. That's the user's rule, now in `AGENTS.md`.
- Codex has `workspace-write` and network access, not full access. `approval_policy` stays `on-request` because auto mode won't let Claude turn off another agent's prompts. The user will change it if the prompts annoy them.
- Every plugin and skill stays (the user's call, in memory `use-every-skill`). Only the failing `plugin:data:definite` server was turned off, and only for this project.

## Where things are
- `src/lib/video/shotDetector.ts`, `ballTracker.ts`, `rimAdjust.ts`, `src/components/video/ShotTracker.tsx`, `RimAdjuster.tsx`: the tracker. Bench options and results are in `README.md` (search `DEADEYE_BENCH_APP`).
- `src/lib/achievements.ts`, `achievements-server.ts`, `streakHub.ts`, `src/app/(app)/streak/page.tsx`, `src/lib/reminders.ts`: levels, badges, streaks and reminders.
- `src/lib/programs.ts` (`__tests__/programContent.test.ts` checks every reference in it), `src/lib/generator.ts` (builder safety), `src/lib/performanceTests.ts` (jump units), `src/lib/exercises.ts`.
- `src/components/profile/AvatarEditor.tsx`, `src/app/api/profile/photo/route.ts`, `src/app/parents/photo/[token]/`, `src/lib/accountDeletion.ts`, `src/app/api/account/export/route.ts`.
- `src/lib/video/trackerSound.ts` (lists the sound sources), `public/sounds/`, `src/app/(app)/admin/demo-videos/`.
- `supabase/migrations/00039`–`00043`: programmes, tag fixes, streak freezes, favourites and demo videos, then avatars, photos and levels.
- `~/.codex/config.toml`: Codex's settings. The original is backed up at `~/.claude/jobs/5e7aa9b2/tmp/codex-config.backup.toml`, which goes when that job is deleted.

## Open
- Try the new screens on a phone, because nobody has clicked through them yet: the rim adjuster, streaks, gym units, edit and delete, drills, avatars and settings. Waits on the user.
- Parent emails: buy `deadeye.ie` (free on 19 Oct; about €6 the first year at Blacknight, then about €37 a year, possibly before VAT), then set up Resend and the two Vercel settings. Until then, under-16s can't add a photo and parents approve by link only. No current player is under 16.
- ~~Reminder time~~: decided 21 Oct, once a day at 16:00 UTC with no picker ([funnel-demo-progress-coach-plan](2026-10-21-funnel-demo-progress-coach-plan.md)).
- Tracker: film 2–3 normal sessions with the recommended setup, so the bench can measure typical accuracy. Waits on the user's clips.
- Not yet built from the review: warm-ups and cool-downs, easier versions of exercises, team and off-ball drills, drills without a hoop, advice on growth pains, sprint tests in metres, and a drill timer. Demo videos still need choosing in Owner tools.
- Optional: `gws` needs a Google OAuth `client_secret.json` in `~/.config/gws/`, though Claude's Google connectors may be enough. Codex's `approval_policy` can go to `"never"`. Turning on "Dynamic workflows" in `/config` would let a full Claude Security scan run.

## Gotchas
- The session hit its usage limit three times. The programmes sub-agent stopped partway, and its migration and checker were finished by hand. Check what a stopped agent left before redoing its work.
- Other chats and Codex left uncommitted files in the same folder. Stage only your own paths, and check whose a change is before committing it.
- Codex said it had pushed when it hadn't. Its sandbox had no network, and the old `hoopiq-codex` worktree kept its git records outside the folder Codex could write to. The settings above fixed it. Confirm a push with `git reflog` and `git ls-remote`.
- `npm install -g @googleworkspace/cli` fails on this ARM laptop. Google's x64 release binary works under emulation; check its checksum first.
