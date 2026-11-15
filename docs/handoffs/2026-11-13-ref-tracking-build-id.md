# Outreach routes, build id, first outreach plan (2026-11-13)

Agent: Claude Code, Opus 5.5 · Commits: `9a908b1`, `201b000` · PR: #97 (draft) · Status: blocked (founder's ePrivacy choice, S27)

## Outcome
PR #97 makes outreach links count: `/?ref=<route>` travels to `/signup?ref=` and is saved as
`user_metadata.signup_ref`; `/admin/funnel` and the weekly counts file split joined / set up /
1st session by route. Settings and every page show the build (commit · environment · time).
Player-outreach now reads the trend board and wrote its first plan (E0, Wexford press, FDYS).

## Decisions
- Route in the URL, not localStorage: avoids device storage. The safety review then showed the
  EDPB still reads a link code as ePrivacy 5(3); that choice is the founder's (S27, B5).
- Only codes in `ROUTES` (`src/lib/signupRef.ts`) are saved or counted, on save and on read:
  players can edit their own user_metadata and the counts file is in a public repo (safety B1).
- The counts file adds routes under 5 players together; `/admin/funnel` keeps them all (B2).
- Leaderboard left as is: profiles are private by default, so no test-account SQL filter (S24).
- Outreach ran as a general-purpose agent following its own agent file: the new agent types
  were added after this session started, so they were not registered here.

## Where things are
- `src/lib/signupRef.ts`, `src/lib/build.ts`, `next.config.ts` (`env` BUILD_*)
- `src/lib/funnel.ts` (`routes`), `src/lib/agentCounts.ts` (`publicRoutes`), `src/app/(app)/admin/funnel/page.tsx`
- `docs/agent-os/outreach/2026-11-13-outreach.md`, `docs/agent-os/outreach/routes.md`
- Safety review: PR #97 comment; knowledge in `docs/agent-os/knowledge/safety-reviewer.md`
- QA report (when written): `docs/agent-os/qa/2026-11-13-qa.md`

## Status changes
- Closed: S26
- Opened: S27, S28, S29 (S24, S25 updated)

## Gotchas
- The main checkout was behind origin (new agents missing locally); `git pull` it.
- Marketing's write to `trends/ads.md` was blocked by the stale guard path in the main
  checkout's `marketing.md` (S29).
- A fresh worktree needs `npx next typegen` before `tsc` (`LayoutProps`, `PageProps`).
- Hitting the usage limit stopped the QA agent once; it was resumed with SendMessage.
