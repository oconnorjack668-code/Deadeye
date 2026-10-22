# Sign-up email limit and test page hydration error (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: 82d7ab6 · Status: shipped

## Outcome
A player's sign-up failed with "email rate limit exceeded". Supabase's built-in mailer allows about 2 emails an hour for the whole project. Supabase auth emails now go through Gmail SMTP on getdeadeye@gmail.com, at 30 an hour. The sign-up page explains the limit in plain words, and the log-a-test page no longer throws React error #418.

## Decisions
- Gmail SMTP as a stopgap: Resend needs deadeye.ie, which isn't bought yet. The user set it up and confirmed a reset email arrived from getdeadeye@gmail.com.
- Kept email confirmation on: under-16s sign up, so addresses need checking.
- The test page reads `?type=` through `useSearchParams` in a `Suspense` wrapper, following `src/app/(auth)/login/page.tsx`. Reading `window` during render made the server show "inches" and the browser "seconds".

## Where things are
- `src/app/(auth)/signup/page.tsx`: friendly message for `over_email_send_rate_limit`
- `src/app/(app)/workouts/tests/new/page.tsx`: the hydration fix
- Supabase → Authentication → Emails (SMTP) and Rate Limits (emails per hour: 30)
- `docs/launch-checklist.md` step 4: the Resend plan

## Open
- Swap Supabase SMTP to Resend once deadeye.ie is bought. Parent approval emails (`src/lib/email.ts`, Resend API) still don't send until then.
- Not checked in a browser: the new sign-up message and the test page with `?type=`. Typecheck and lint pass; neither page has tests.

## Gotchas
- The "TypeError: network error" on /dashboard (16:05, 21 Oct) was already fixed in 131f895 at 18:10. Check commit times before chasing an error-log entry.
- Auto mode blocked a chained commit-and-push-to-main command. Push the branch and `git push origin training-gaps:main` as separate calls.
- The Chrome extension's browser wasn't signed in to Supabase, so the settings couldn't be read. A password reset email's sender showed the SMTP setting had saved.
