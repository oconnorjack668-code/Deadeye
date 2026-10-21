# App walkthrough as a test player, and the fixes (2026-10-21)

Agent: Claude Code (Opus 5.5) · Commits: e133853 on `fix/app-review-2026-10-21` · Status: on the branch, waiting for the user to say merge

Follows [first-run-tutorial](2026-10-21-first-run-tutorial.md).

## Outcome
- Logged in as the tester (deadeyetester@gmail.com) on the live site and walked 40 pages. No JS errors, no failed requests and no sideways scroll at phone width; `/admin` is a 404 for a non-owner. Then fixed everything found.
- Rude display names: "Nipple twister" was on the public leaderboard. Added a word filter (`src/lib/nameFilter.ts`) at signup, setup and Settings. Migration 00044 adds a trigger that turns blocked names into "Player" and cleans existing ones. Added an owner "Reset this name" button on `/players/[id]`.
- Other fixes:
  - The quick-log "+" covered Ask Coach's send button; there is now room under it on every page.
  - The shot logger scrolls MAKE/MISS into view after a spot is tapped.
  - Video AI buttons now come before the tips.
  - Setup no longer saves a default height or age, and its wording is plainer.
  - "1 days", "0.0%" before any shots, and day-one "3%" consistency.
  - Spelling (program, defense) and "four free programs", not three.
  - Header and games-form layout on phones.
- Sample clip: on the live site, iPhone-sized runs sometimes missed the first make (3/5). The clip now downloads fully before it plays, and the tracker preloads its sounds; the swish was fetched at the first make, with a ~100ms stall.

## Decisions
- Names are replaced, not refused, in the database, so signup never fails on the trigger. The app refuses first with a message (Claude).
- The two lists live in TS and SQL; `__tests__/nameFilter.test.ts` fails if they drift. Short words that hide inside names (ass, dick, cock) are whole-word only (Claude).
- Spelling follows the majority already in the app and the database content: "program", "defense" (Claude; the user said fix everything).
- Renamed focus areas keep their old names working in `recommend.ts` and on load in setup.
- Play Style Match's 6.6s was a Vercel cold start (warm: 0.76s). Nothing changed.
- The user's own full name on the leaderboard stays (user).

## Where things are
- `supabase/migrations/00044_display_name_filter.sql`, `src/lib/nameFilter.ts`, `src/app/api/admin/reset-name/route.ts`, `src/app/(app)/players/[id]/ResetNameButton.tsx`
- Tests: `__tests__/nameFilter.test.ts`, `reset-name.test.ts`, plus additions to `dashboard-metrics` and `recommend`

## Open
- Merge `fix/app-review-2026-10-21` to main: waits on the user (fast-forward; main was at 7cefa24).
- Run 00044 in the Supabase SQL editor (user). Until then, the app's own check blocks new rude names, but the existing one stays.
- After the merge, re-check signed-in pages as the tester on the live site. Previews can't sign in ("Failed to fetch"; likely no database env vars on previews).
- Sample clip: the miss was intermittent (failed 4 of 16 live phone-sized runs, all in one stretch; 0 of 12 locally). Re-test on the live site after the merge.

## Gotchas
- Git Bash rewrites `/route` arguments into Windows paths: prefix `MSYS_NO_PATHCONV=1`.
- `networkidle` never fires on Vercel previews or YouTube-embedding pages; wait for `load`.
- Shell-escaped regexes in `node -e` lose their backslashes; write scripts to files.
- The local dev server and previews can't reach the database, so signed-in checks only work on the live site.
