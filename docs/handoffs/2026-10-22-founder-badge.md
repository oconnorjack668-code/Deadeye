# Founder badge (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: see `git log exp/founder-badge` · Status: in progress (branch pushed, not merged)

## Outcome
The owner shows with a "Founder" badge on their player card and on the leaderboard (podium and rows). Their
card no longer has Add friend for players who are not already friends or mid-request.

## Decisions
- Badge from the owner role in `user_roles` (00001), written only by the server, so it cannot be faked
  by a display name. `OWNER_EMAIL` alone does not show it: the founder's account needs the role row.
- Label "Founder" rather than "Owner": reads as status to players, not admin powers. One word in
  `src/components/FounderBadge.tsx` to change.
- Follow button not built: following needs something to deliver (founder updates). Proposed to the founder.
- Existing friendships with the founder are untouched.

## Where things are
- `src/lib/owners-server.ts`, `src/components/FounderBadge.tsx`
- `src/lib/leaderboard-server.ts` (`isOwner` on each row), `src/app/(app)/leaderboard/Standings.tsx`,
  `src/app/(app)/players/[id]/page.tsx`; test in `__tests__/visiblePhotos.test.ts`

## Checks
tsc, eslint, `npm test` (745 passed, 1 skipped): pass. Safety: PASS. No migration, no env vars.

## Open
- Founder: make sure the account has the owner role row (SQL in the reply), then merge the branch.
- Founder: for server-side enforcement, turn off "Allow friend requests" in Settings → Privacy; friend
  codes then stop too.
- Founder: decide on Follow (one-way updates from the founder).

## Gotchas
- none
