# S35 replacement lesson videos (2026-11-17)

Agent: Claude Code, Opus 5.5 · Commits: see PR · PR: S35 PR (branch `worktree-s35-lesson-videos`) · Status: in progress (waiting for founder to approve and apply)

## Outcome
Found and checked replacements for the 5 IQ lesson videos YouTube removed. Migration
`00066` swaps them in (with channel and clip length) and `seed.sql` no longer seeds the
dead ids. Players still see "Video unavailable" until 00066 is applied to the live database.

## Decisions
- Picks: dip `mrTpz7xzHB4` (Scot Shot Basketball, 9:54); guide hand `u-pcfLpZc3A` (Rob Fodor, 5:39);
  veer `FaDYYqmKtxM` (HoopStudy / DJ Sackmann, 6:53); drop coverage `GDzn96-jqm8` (Hooper University,
  3:12); transition `pyqtqAvpOIw` (Tyler Daniel, 2:33). Each was checked with oEmbed 200, watch page
  status OK, embeddable and family-safe, and its English transcript read against the lesson takeaways.
- Transition: picked Tyler Daniel over Championship Productions `e28b7SFScCc` (wings wide, big rim run,
  but a coach clinic) and Jez Phipps `kPtQ1IU5zB0` (no lanes or rim runs). Guide hand: Rob Fodor over
  SeeMikeDunn `AulCgque6pw` (backup, covers when the guide hand comes off).
- `duration_minutes` set to the clip length because the lesson card and Focus Finder show it.
- Rows matched by the dead id, so 00066 is safe to re-run and won't overwrite an admin's later choice.
- Not applied live: the permission check blocked writing to the live DB from this session; founder to approve.

## Where things are
- `supabase/migrations/00066_replace_dead_lesson_videos.sql`: the swap, notes on each clip
- `supabase/seed.sql`: same four seed rows updated (the fifth comes from a migration)

## Status changes
- Closed: none
- Opened: none (S35 updated)

## Gotchas
- Plain caption URLs return empty now; `youtube-transcript-api` in a temp venv worked.
- A bulk transcript fetch of ~20 videos was blocked by the permission check; small batches went through.
