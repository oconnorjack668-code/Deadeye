# App search (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: see `git log exp/app-search` · Status: in progress (branch pushed, not merged)

## Outcome
A search icon in the top bar finds things to do, places in the app (Settings sections included) and
drills, exercises, IQ lessons, programmes and guides. Full screen on phones, a panel on computers, `/`
opens it. Recent picks stay on the phone.

## Decisions
- No player search: most players are under 18; players are reached by leaderboard, friend codes, teams.
- Screens and actions are a hand-written list in `src/lib/search.ts` with everyday words, so it is instant
  and offline; content comes from `/api/search` under the player's session (RLS decides).
- Nothing typed is stored or logged. A count of searches with no results was offered, not built.
- The overlay renders through a portal: the top bar's `backdrop-blur` makes `fixed` children relative
  to the 64px bar (seen in a Chromium screenshot; jsdom tests cannot catch it).

## Where things are
- `src/lib/search.ts` (entries, matching, `cleanSearch` now shared with the drill library)
- `src/app/api/search/route.ts`; `src/components/search/AppSearch.tsx`; `src/components/layout/Navbar.tsx`
- Deep links: `video/page.tsx` + `VideoHub.tsx` (`?tab=`), `workouts/exercises/page.tsx` (`?open=`),
  `settings/SettingsClient.tsx` (section ids)
- Tests: `__tests__/search.test.ts` (every href is a real page), `searchRoute.test.ts`, `app-search.test.tsx`

## Checks
tsc, eslint, `npm test` (778 passed, 1 skipped): pass. Screenshots at 390px and 1100px wide in headless
Chromium. Safety: PASS. No migration, no env vars.

## Open
- Founder: merge `exp/app-search` through a pull request; live check on a phone and a computer.
- When a new page or setting is added, add it to `SEARCH_ENTRIES`; the href test catches renamed pages.

## Gotchas
- To screenshot a component without Supabase: render it in a throwaway vitest file, save
  `document.body.innerHTML`, build CSS with `postcss` + `@tailwindcss/postcss` on `globals.css`, then
  `/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell --screenshot`.
