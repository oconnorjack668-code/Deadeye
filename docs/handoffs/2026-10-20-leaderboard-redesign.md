# Leaderboard redesign (2026-10-20)

Agent: Claude Code, Opus 5.5 · Commits: 0c7836c · Status: shipped

## Outcome
The leaderboard went from a plain list to a standings page players want to climb. There's a "your standing" card with rank, points and streak, plus "N pts to catch {name}, about N training days" and a Train button aimed at the activation problem. Tabs now carry your rank on each board. There's a top-3 podium, and every row shows an emoji avatar, level, streak and a points bar. Merged to main as a fast-forward.

## Decisions
- Avatars and levels come from the service role, and only for user_ids `leaderboard_page()` already returned. `player_card()` already shows emoji and level to that same set (public, friend, teammate or self), so nothing new is visible and no migration was needed. Decided by Claude, approved when the user said merge.
- Photos stay off the board: they have their own approval and visibility rules, so they belong on the player card.
- Colours follow f421a64: red for "you" and rank identity; gold, silver and bronze only for podium tiers.
- Merged with no PR: the user said "merge", the `gh` CLI isn't installed, and main was an ancestor of the branch, so it went in as a fast-forward push.

## Where things are
- `src/app/(app)/leaderboard/page.tsx`: the page (data loading, standing card, tabs, empty states, challenges)
- `src/app/(app)/leaderboard/Standings.tsx`: `Podium` and `StandingRow`
- `src/lib/leaderboard.ts`: `chaseFor()` (who to catch and the gap) and `shareOfLeader()`, tested in `__tests__/leaderboard.test.ts`
- `src/lib/leaderboard-server.ts`: `leaderboardLooks()`, the service-role emoji/colour/level lookup
- Branch `worktree-leaderboard-redesign`: same commit as main at 0c7836c, safe to delete

## Open
- Look at the live board on a phone with real players. It was only checked with sample data, and nobody confirmed the Vercel deploy. Waits on the user.

## Gotchas
- A headless Chrome phone screenshot looked clipped at 390px because Chrome has a minimum window width of about 500px. Fix: pin the preview `<body>` to `width:390px`.
- Previewing a page behind a login: a throwaway vitest file mocked `@/lib/auth`, `@/lib/supabase/server` and the looks lookup, then `renderToStaticMarkup`. After that, a postcss and `@tailwindcss/postcss` build and `chrome --headless --screenshot`. None of that was committed.
- A fresh worktree has no `node_modules`. A junction to the main checkout's copy works. Remove it with `(Get-Item path).Delete()` so only the link goes. `tsc` then reports `LayoutProps` missing until you run `npx next typegen`.
- The auto-mode check blocked the push to main ("Merge Without Review"). The user added the allow rule `Bash(git push origin *:main)` with `/permissions`.
- The GitHub repo was renamed HoopIQ → Deadeye. `origin` now points at `https://github.com/oconnorjack668-code/Deadeye.git`.
