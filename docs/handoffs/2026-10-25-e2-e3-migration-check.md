# E2 and E3, migration check, docs and housekeeping (2026-10-25)

Agent: Claude Code · Commits: see `git log 204d097^..515442b` · Status: PR open, not yet merged

## Outcome
- E2: a player who answers "Not right now" on the welcome screen is offered "Trained today already? Log it by hand", and the sample's end card has "Log shots by hand" beside "Open the tracker".
- E3: four new funnel steps (`welcome_court`, `welcome_later`, `log_opened`, `log_finish_opened`) on `/admin/funnel`, in the weekly counts file and in `docs/funnel-counts.sql`. No migration.
- `docs/check-migrations.sql`: one read-only query for the Supabase SQL editor that lists any table, column, function or index a migration should have made and did not.
- The deployment guide, testing guide and Play Store listing no longer call deadeye.ie the live address (it is not bought; the live address is deadeyeapp.vercel.app).
- `eslint .` is clean for the first time: the study quiz loader no longer trips the exhaustive-deps warning.

## Decisions
- E2's by-hand link on the welcome screen is a quiet orange line above the reminders, not a card: the sample stays the one highlighted thing under "While you wait". It is padded to a 44px tap target.
- E3's "Logging shots" is a new third group in the funnel, after "Shot tracker", because `tracker_saved` is added to that group by position.
- The migration check is built from the migration files by `scripts/build-migration-check.mjs`, and a test fails if a migration is added and the file is not rebuilt. It reads creates and drops in file order, so `team_roster` (dropped and recreated in 00034) is still expected.
- Proof the check is right: all 54 migrations were run in a scratch Postgres (PGlite, with Supabase's auth and storage stubbed): 0 of 256 missing. Leaving out 00045, 00051 and 00054, or 00020, 00038 and 00054, reported exactly those objects and nothing else.
- Not checkable by the query (they only change policies, grants or data): 00008, 00009, 00012, 00029, 00030, 00040.
- Icon tiles: left alone. The tile in `PageHeader` is deliberate section identity (its own comment: each tab owns a colour), and the 30 one-offs are separate small design calls. `docs/design.md` now says so; new screens should not add them. The founder can say if they want the one-offs flattened.
- The old handoff line "deadeye.ie: bought in the mam's name" is annotated, not rewritten.

## Where things are
- `src/app/(app)/welcome/WelcomeClient.tsx`, `welcome/sample/SampleClient.tsx`: E2 links, `choose()` for the E3 answers.
- `src/app/(app)/basketball/new/page.tsx`: `log_opened` on mount, `log_finish_opened` when Finish opens.
- `src/lib/events.ts`, `src/lib/funnel.ts`, `docs/funnel-counts.sql`: the event names and where they are counted.
- `scripts/build-migration-check.mjs`, `docs/check-migrations.sql`, `__tests__/migration-check.test.ts`.
- `__tests__/welcome-activation.test.tsx`, `study-quiz-page.test.tsx`; new cases in `funnel.test.ts` and `hoops-logging.test.tsx`.

## Open
- Founder: paste `docs/check-migrations.sql` into the Supabase SQL editor; run any migration it names. (The founder believes all are run; I cannot see the database.)
- Founder: merge the pull request; live check on a test account (see the backlog entries for E2 and E3).
- Founder, from earlier handoffs: `AGENT_DATA_GITHUB_TOKEN` in Vercel and branch protection on `main` (`2026-10-22-agent-automation.md`); revoke the old OpenAI key after a week of good Anthropic use; run 00054 if not yet and post the "early days" notice.
- Read E2 and E3 over two weekly data files before keeping or dropping them (Signal in the backlog).

## Gotchas
- `docs/check-migrations.sql` is generated: edit the script, not the file.
- The welcome screen page never goes network-idle in a browser (the reminders card keeps polling): wait for a button, not for idle, in Playwright.
- Playwright cannot play the sample here (no H.264); the E2 end-card link is tested with the tracker stubbed.
