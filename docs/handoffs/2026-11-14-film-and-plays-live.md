# Film and Plays on the IQ tab, merged and live (2026-11-14)

Agent: Claude Code, Opus 5.5 (builder, safety-reviewer, release-checker, club-growth, Explore and research subagents) · Commits: 6b33618, 14a6a92, 331b22d, 7cd17ed, 18807ee, ef67c68, 30988eb, 408041a, ff804b2, 63e71b3, 90cc725, merge 9d7e9f4 · PR: #112 (with #98; #101, #102, #105, #109 closed as merged through it) · Status: shipped

## Outcome
The IQ tab is now Lessons · Film · Plays. Plays is open to everyone: 36 library plays (12 free) as animated court diagrams with "Show my role", a phone play editor, a role quiz, team playbooks and plays set as team assignments with a coach progress view. Film is built (39 free starter clips that stop for questions, saves, private notes, packs, assigning, owner clip tool) but closed to players until `FILM_LIVE=true`. Every YouTube video now loads only after a tap.

## Decisions
- Founder asked to "do and build all" without answering the plan's decisions: the plan's recommended options were used (IQ tab, Plays first, coaches see done / knows-it and team totals, never individual answers).
- All film free (founder, 14 Nov): YouTube Developer Policies III.F.3.a forbid charging to watch embedded video.
- Film closed behind `FILM_LIVE` until the DPIA (S1) is signed: new data about children and a new recipient (YouTube) should not start before the assessment covering them is signed. Owner can always open it. Lead's call; founder flips it.
- Starter clips: 39 from coaching and league channels, checked for embedding, family-safe and Ireland; Jr. NBA dropped as likely Made for Kids; questions at clip end because no one picked moments. Founder can swap any in Owner tools.
- Safety-review fixes made before the migrations ran (cheapest then): team totals only from 3 answers, coach visibility from when an item was set (`team_assignments.item_set_at`), `rel=0` on embeds.
- Migrations 00060 to 00064 applied to live before the merge (founder asked); release-checker confirmed old code works with them.

## Where things are
- `docs/plans/film-and-plays.md`: the plan; `docs/plans/film-clips-to-pick.md`: clip themes and question ideas.
- `src/lib/plays/*`, `src/components/plays/*`, `src/app/(app)/plays/*`, `src/app/(app)/coach/playbook`: Plays.
- `src/lib/film/*` (switch in `live.ts`), `src/components/film/*`, `src/app/(app)/film/*`, `src/app/(app)/admin/demo-videos`: Film.
- `src/components/video/TapToLoadYouTube.tsx`: every YouTube embed.
- `supabase/migrations/00060`-`00064`; `docs/legal/dpia.md` (Film and Plays rows, R12, R13).

## Status changes
- Closed: old S27 (privacy page YouTube, now under Recently done)
- Opened: S36

## Gotchas
- Builder subagents hit usage limits three times (Fable, then Opus); the lead finished each from the work left on disk.
- Main took 00059 and reused S27/S28 while this was on branches: plays migration renumbered 00059 to 00060; Film and Plays became S36.
- The F1-F3 stack had five draft PRs with stacked bases; merging the top one (#112) into main and closing the rest was simpler than merging each.
- Worktree sandbox refuses long multi-line shell commands; write scripts to a file or use the Edit tool.
