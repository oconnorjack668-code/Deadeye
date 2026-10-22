# Tester reset: start a tester login again as a new player (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: 7af585b (exp/tester-reset) · Status: shipped (merged 4a418a3, founder checked it live)

## Outcome
Logins in `TEST_ACCOUNT_EMAILS`, never the owner, get a "Tester: start again as a new player" card at the
bottom of Settings. It deletes the account, makes it again with the same email and a password typed on the
card (no email sent), clears the browser's Deadeye data, signs back in and opens setup. Built so the founder
can re-run the E1 live check, and any first-run check, without a new email address.

## Decisions
- Delete and re-create rather than clearing tables: reuses `deleteAccount` (videos, photo, Stripe) and cannot
  miss a table added later. The new account copies only the sign-up name and age answer, so the
  `handle_new_user` trigger (00036) builds what a real sign-up would. Founder asked for a reusable reset.
- Gated server-side on the tester list and not-owner, failing closed. Worst case, a real email listed by
  mistake can only reset its own account, which Delete account already allows.
- The password is checked with the sign-up rules before anything is deleted.

## Where things are
- `src/lib/testAccounts.ts`: the tester list and `resetTesterAccount`
- `src/app/api/account/reset-tester/route.ts`: the route; `src/app/(app)/settings/ResetTesterCard.tsx`: the card
- `src/app/(app)/settings/page.tsx`: shows the card; `src/app/(app)/admin/funnel/page.tsx`: same tester list
- `__tests__/testerReset.test.ts`: 10 tests; `.env.example`: the `TEST_ACCOUNT_EMAILS` comment

## Checks
tsc, eslint on the 7 changed files, `npm test` (739 passed, 1 skipped): pass. Safety: PASS (no new personal
data kept, no messages to players, server-side access check, no new table). No migrations, no new env vars.
Checked live by the founder after the merge.

## Open
- none. Done 2026-10-22: merged to main, tester email in `TEST_ACCOUNT_EMAILS`, reset checked live by the
  founder, E1 marked `shipped`.

## Gotchas
- If Supabase refuses the password after the delete (its own policy can be stricter), the old account is gone
  and the card says to sign up again with the same email. A password that passes the sign-up form avoids it.
- The reset clears every `hoopiq-*` and `deadeye-*` key in that browser, so run it where the owner account has
  no unsynced offline saves, or in a private window.
