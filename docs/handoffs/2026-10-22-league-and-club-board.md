# League picker and club boards (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: `git log exp/league-picker`, `git log exp/club-board` · Status: in progress (#31 and #32 open; need 00052 and 00053)

## Outcome
- **#31 League picker.** Coach setup and Team details have a League picker over the 39 competitions in
  `leagues.csv`: suggested for the team's age group, county area board and school level first, then
  every competition, plus "My league isn't listed". Age groups add U9, U11, U13, U15, U17. Clubs and
  leagues now have a fixed `id` column in their CSVs.
- **#32 Club boards.** `/clubs/<club>`: club hero, club challenge (one club total), team race for the
  week, notices from head coaches. A head coach asks to join; the founder approves in Owner tools →
  Club boards. Links on the Teams page and team pages.

## Decisions
- Founder asked for both, league picker first, then the club board, with a great UI. Claude had said
  the league picker needed no migration; it needs 00052 (a column on teams). Told the founder.
- Joining a board needs the founder's approval after checking with the club (Claude's call): otherwise
  anyone could make a team, name a club and read its board.
- No single player on a board, ever: team totals only for teams of 3+ players (`CLUB_TEAM_MIN`).
- Notices: head coaches only, no replies, no emails, phones, links or social accounts (enforced in SQL
  `has_contact_details`, mirrored in `src/lib/clubBoard.ts`), 5 a day. `is_club_member` is not callable
  by players (it would reveal a child's club).
- Club ids froze as they were, so saved home clubs are unchanged (checked against the old clubs.json).
- Privacy policy paragraph added for club boards (legal text): the founder approves it by merging.

## Where things are
- `supabase/migrations/00052_team_league.sql`, `00053_club_board.sql`
- `scripts/build-clubs.mjs` (both lists, fills new ids), `src/data/leagues.json`, `src/lib/leagues.ts`,
  `src/components/coach/LeagueOptions.tsx`
- `src/lib/clubBoard.ts`, `src/components/clubs/` (ClubBoard, ClubLinkCard, ClubBoardLink, ClubSearch),
  `src/app/(app)/clubs/[id]/page.tsx`, `src/app/api/teams/[id]/club/route.ts`,
  `src/app/(app)/admin/club-boards/page.tsx`
- Tests: `leagues`, `clubBoard`, `club-board-ui`, `agentCounts`, `coachSide`

## Checks
tsc, eslint (one old warning), `npm test` 833 passed, 1 skipped. 00052 and 00053 each run twice on a
scratch Postgres 16 with every case (see the pull requests). Board screens checked at 390px and 1100px.

## Open
- Founder: run 00052, say so, Claude merges #31. Then run 00053, say so, Claude merges #32.
- Live check after each: pick a league in Team details; ask to join a board, approve it, post a notice.

## Gotchas
- Never change an `id` in `directory.csv` or `leagues.csv`; leave it empty on a new row and run the script.
- The Kilkenny and South East league row says "Wexford to check", so Wexford teams get no area board
  suggestion until club-growth confirms it.
