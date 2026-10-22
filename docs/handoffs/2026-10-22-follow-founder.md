# Follow the founder, with founder posts (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: 2d70c14 (exp/follow-founder, on top of exp/founder-badge) · Status: in progress (branch pushed, not merged)

## Outcome
The founder card has Follow instead of Add friend. Followers get the newest founder post (challenge, tip or
app update) on their dashboard; the card lists the latest five. The founder writes and removes posts from
Owner tools → Founder posts and sees a follower count, never names.

## Decisions
- One-way follow, not friends: a friend sees friends-only photos and streaks; a follower shares nothing.
  The founder chose Follow after Claude proposed it this way.
- Posts are plain text (no links), 500 characters, no replies, no push. Readable by every signed-in
  player, as announcements; the dashboard card only for followers.
- Only the account with the owner role (`user_roles`) can be followed or post, the same account the
  Founder badge marks.
- No nudge to follow on the dashboard: discovery is the founder card. Revisit with the marketing agent.
- Privacy policy paragraph added (legal text): the founder approves it by merging.

## Where things are
- `supabase/migrations/00050_follow_founder.sql`: follows, set_follow, follower_count, founder_posts
- `src/app/api/founder/posts/route.ts`; `src/lib/founderPosts.ts`; `src/components/FounderPost{List,Card}.tsx`
- `src/app/(app)/players/[id]/FollowButton.tsx` and `page.tsx`; `src/app/(app)/admin/posts/`
- `src/app/(app)/dashboard/page.tsx`; `src/app/api/account/export/route.ts`; `src/app/privacy/page.tsx`
- Tests: `__tests__/founderPosts.test.ts`, `__tests__/follow-button.test.tsx`

## Checks
tsc, eslint, `npm test` (755 passed, 1 skipped): pass. 00050 run twice against a scratch Postgres 16 with
stand-in tables (results in the commit message). Safety: PASS, with the policy text for the founder.

## Open
- Founder: owner role row on their account (check query in the chat), then run 00050 in the SQL editor.
- Founder: merge `exp/founder-badge`, then `exp/follow-founder`, through pull requests.
- Founder: live check: post from Owner tools; on the tester, follow from the founder card and see the post
  on the dashboard; unfollow and it goes.
- Later: the marketing agent drafts posts and video ideas; the founder approves and posts.

## Gotchas
- Postgres tests need the postgres user to traverse the scratchpad; `pg_ctl stop` then fails on the data
  folder, so stop it with `pkill -u postgres -f "postgres -D"`.
