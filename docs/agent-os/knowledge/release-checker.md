# Release checker knowledge

Last researched: 2026-11-07

Read `README.md` in this folder for how this file works.

## Lessons from the founder

Newest first. Each one is a real release problem from a handoff.

- 2026-11-07 · Training reminders failed every day with 503 "VAPID keys
  missing": production never had push keys, and nobody noticed for weeks
  ([new-test-footage](../../handoffs/2026-11-07-new-test-footage.md)).
  **Rule:** every variable in `.env.example` that the changed code reads must
  be confirmed as set in Vercel Production, by name, before merge. A feature
  that needs a key is not "done" until the key is live and a real run worked.
- 2026-11-07 · The VAPID public key is `NEXT_PUBLIC_`, so it is built into the
  page; setting it is not enough
  ([new-test-footage](../../handoffs/2026-11-07-new-test-footage.md),
  [preview-signin](../../handoffs/2026-11-02-preview-signin.md)). **Rule:**
  after adding or changing any variable, the checklist says "redeploy", and
  for `NEXT_PUBLIC_` ones says why. Never change the VAPID pair once players
  have subscribed.
- 2026-11-02 · Previews use the live database: they hold the Supabase URL and
  public key, not the service key
  ([preview-signin](../../handoffs/2026-11-02-preview-signin.md)). **Rule:**
  on a preview, sign in only as the tester account and save nothing you would
  not want in production. A migration run "to test a preview" is a migration
  run on live data.
- 2026-11-01 · No `CRON_SECRET` in Vercel, so every scheduled job (reminders,
  weekly report, agent counts) got a 401 and the 26 Oct counts file was never
  written ([cron-secret-and-setup](../../handoffs/2026-11-01-cron-secret-and-setup.md)).
  **Rule:** when a branch adds or changes a cron, check `CRON_SECRET` exists in
  Production and the first scheduled run shows Worked at `/admin/cron-runs`.
- 2026-11-01 · The migration check found 1 of 256 objects missing: the
  `drill_favorites_drill_id_idx` index from 00042, which the founder believed
  was run ([cron-secret-and-setup](../../handoffs/2026-11-01-cron-secret-and-setup.md)).
  **Rule:** "I think it's run" is not a check. Before merge, the founder pastes
  `docs/check-migrations.sql`; it must list nothing missing.
- 2026-11-01 · `scripts/build-migration-check.mjs` silently does nothing on
  Windows ([tracker-upgrades](../../handoffs/2026-11-01-tracker-upgrades.md)),
  and `docs/check-migrations.sql` is generated, never hand-edited
  ([e2-e3](../../handoffs/2026-10-25-e2-e3-migration-check.md)). **Rule:**
  after a new migration, confirm the SQL file changed (git diff); if not,
  import `buildCheck` and call it.
- 2026-11-01 · The tracker upgrade merged without a release check; only the
  founder's memory said 00055 was run
  ([tracker-upgrades](../../handoffs/2026-11-01-tracker-upgrades.md)).
  **Rule:** every branch with a migration or new env var gets this agent's
  checklist, however small.
- 2026-11-01 · Merges go through a pull request the founder names ("merge
  51"), with `gh pr merge --match-head-commit <sha>`; `main` is protected
  ([tracker-upgrades](../../handoffs/2026-11-01-tracker-upgrades.md)).
  **Rule:** do not tell the founder to `git push` to main. The agent file's
  step 3 still shows `git merge --ff-only`; use the PR way until it is fixed.
- 2026-11-01 · Hobby keeps runtime logs about an hour; the cron "Run" button
  shows nothing ([cron-secret](../../handoffs/2026-11-01-cron-secret-and-setup.md)).
  **Rule:** test cron auth on `/api/cron/agent-counts` outside 08:xx Irish
  time ("skipped"). Never test with `/api/cron/reminders`: it sends reminders.


## Lessons from results

What the outcome of earlier work taught (see "Results review" in the agent
file). Newest first, each with the date, what happened, and the rule.

- None yet.

## Checklist

Run on the branch before writing the founder checklist. A failed line goes in
the reply; a failed check makes the first founder line "Send back to builder".

**Code**
- [ ] `npx tsc --noEmit`, `npx eslint <changed files>`, `npm test`: pass or
      fail recorded, with output for any fail.
- [ ] Branch is up to date with `origin/main` (checks ran on what will merge).

**Migrations** (each new file in `supabase/migrations/`)
- [ ] Safe to run twice: `if not exists`, `create or replace`, `drop ... if
      exists`, policies dropped before recreated.
- [ ] Additive only (new tables, columns, indexes, functions). A drop,
      rename or type change is a "contract" step: it ships only after the code
      that stopped using the old thing has been live a while. Flag it.
- [ ] No column with a volatile default (`now()` is fine; `clock_timestamp()`,
      `random()` rewrite the table). `NOT NULL` and foreign keys on a busy
      table: add `NOT VALID`, then `VALIDATE` as a second statement.
- [ ] New indexes: plain `create index if not exists` is fine on small
      tables (blocks writes while building); a big table runs at a quiet time.
- [ ] `docs/check-migrations.sql` was rebuilt and shows the new objects.
- [ ] Live code still works after the migration (it runs before the merge).

**Env vars** (diff `.env.example` against `origin/main`, and grep the diff for
`process.env.`)
- [ ] Every new or newly used variable is named in the founder checklist with:
      which Vercel environment (Production; Preview only if public and safe),
      Secret or Config, and where to get the value.
- [ ] Secrets (`*_KEY`, `*_SECRET`, tokens, service role) are Production-only
      and marked Secret. Never on Preview.
- [ ] The checklist says "Redeploy" after setting them; for `NEXT_PUBLIC_`
      ones, "the old value is built into the page until you do".
- [ ] A missing variable shows up visibly (`/admin/cron-runs`, an error page).

**Crons** (any change to `vercel.json` or `src/app/api/cron/`)
- [ ] Each schedule runs at most once a day (Hobby fails the deploy
      otherwise) and is fine landing anywhere in its hour.
- [ ] The route checks `Bearer ${CRON_SECRET}` and `CRON_SECRET` is in
      Production.
- [ ] A run twice or a missed run does no harm (no double reminders, no
      double counting): it checks what was already done.
- [ ] Founder checklist names the first run and "Worked" at `/admin/cron-runs`.

**Founder checklist** (step by step, one action per line)
- [ ] 1. Supabase → SQL editor: paste each migration in order, Run, see
      "Success". Then paste `docs/check-migrations.sql`: nothing missing.
- [ ] 2. Vercel → Settings → Environment Variables: each variable, its
      environment and type. Then Deployments → Redeploy (only if a variable
      changed and no merge follows).
- [ ] 3. Check the preview link signed in as the tester account (live data).
- [ ] 4. Reply "merge <number>"; the agent merges with green checks.
- [ ] 5. Live smoke test at deadeyeapp.vercel.app, tester account: the
      changed screen, sign-in, logging a session, and any cron at its next run.
- [ ] 6. If it is broken: Vercel → project → Instant Rollback (Hobby: only to
      the one before), then "Undo Rollback" once fixed, or new merges will not
      go live. Rollback does not undo a migration.

## Research

Findings with their sources are in `findings/release-checker.md`. Search it when a
task needs evidence; add new findings there, not here.
