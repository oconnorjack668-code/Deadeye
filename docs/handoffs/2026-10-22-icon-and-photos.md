# Browser icon and profile photos on lists (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: d947903 (exp/browser-icon, merged), 8656f58 (exp/profile-photos) · Status: in progress (photos branch pushed, not merged)

## Outcome
- The browser tab showed the old HoopIQ icon: `src/app/favicon.ico` was never replaced. Rebuilt from
  `public/logo.png` at 16, 32 and 48 px. Merged (pull request 22).
- Profile photos now show on the leaderboard (podium, rows, the "You" card) and on the top-bar avatar,
  for the people allowed to see them. Before, only the player card and own profile showed them.

## Decisions
- New database check `visible_photo_paths` (00049) instead of checking photos in TypeScript: it is the same
  rule as `player_card` (00043), runs under the viewer's session, and the database stays the one place
  that decides. Founder asked for photos on these screens.
- Same audience as before: "Everyone" was always "anyone who can open your player card", and the new check
  keeps player_card's gate. No privacy policy or consent text changes.
- Until 00049 is run, `visiblePhotoUrls` gets an error and every row keeps its emoji, so merge order is safe.

## Where things are
- `supabase/migrations/00049_photos_on_lists.sql`: the check
- `src/lib/photos-server.ts` `visiblePhotoUrls`; `src/lib/leaderboard-server.ts` adds `photoUrl` to each row
- `src/app/(app)/leaderboard/page.tsx`, `Standings.tsx`, `src/app/(app)/layout.tsx`, `src/components/layout/Navbar.tsx`
- `__tests__/visiblePhotos.test.ts`: 5 tests

## Checks
tsc, eslint on changed files, `npm test` (744 passed, 1 skipped): pass. 00049 run twice against a scratch
Postgres 16 with stand-in tables: own photo shown (even pending or only me); public with everyone, friend
and teammate with friends shown; friends-only stranger, pending, only me, non-public stranger and pending
friend request hidden; nothing signed out; anon refused. Safety: PASS. Migration: 00049 for the founder.

## Open
- Founder: run `supabase/migrations/00049_photos_on_lists.sql` in the Supabase SQL editor.
- Founder: merge `exp/profile-photos` into main through a pull request.
- Founder: live check (below in the reply): own photo in the top bar and on the leaderboard; a friend sees it.

## Gotchas
- Postgres here refuses to run as root and cannot reach the scratchpad: it needed traverse permission on
  the scratchpad folders for the postgres user (removed afterwards).
