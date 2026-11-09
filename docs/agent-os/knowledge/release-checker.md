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

## What the research says

**Database migrations**

- Most `ALTER TABLE` forms take the strongest lock, which blocks even plain
  reads until it finishes. **Deadeye:** keep each migration short; never mix a
  big data update with schema changes on a table players use. [source](https://www.postgresql.org/docs/current/sql-altertable.html), 2026, official.
- Adding a column with a fixed default needs no table rewrite; a volatile
  default (`clock_timestamp()`) or a stored generated column rewrites the
  whole table. `NOT VALID` then `VALIDATE` adds a constraint without blocking
  writes for the check. **Deadeye:** the migration lines above. [source](https://www.postgresql.org/docs/current/sql-altertable.html), 2026, official.
- A waiting `ALTER TABLE` queues every query behind it; a short
  `set lock_timeout = '5s'` makes it fail fast instead of freezing the app.
  Never set it globally. **Deadeye:** worth adding at the top of a migration
  that alters a busy table (sessions, shots). [source](https://www.postgresql.org/docs/current/runtime-config-client.html), 2026, official; queueing detail from [practitioner](https://thebuild.com/blog/all-your-gucs-in-a-row-lock_timeout/), practitioner.
- Plain `CREATE INDEX` blocks writes (not reads) while building;
  `CONCURRENTLY` does not, but cannot run inside a transaction and leaves an
  INVALID index if it fails. `IF NOT EXISTS` does not check an existing index
  is the right one. **Deadeye:** tables are small, so plain is fine; the SQL
  editor may wrap a run in a transaction, so `CONCURRENTLY` needs its own
  paste. [source](https://www.postgresql.org/docs/current/sql-createindex.html), 2026, official; [Supabase indexes](https://supabase.com/docs/guides/database/postgres/indexes), 2026, official.
- Change a schema in three steps: add the new thing, move the code over, then
  remove the old thing in a later release. **Deadeye:** never ship a drop or
  rename in the same release as the code change, since migrations run before
  the merge. [source](https://martinfowler.com/bliki/ParallelChange.html), 2014, practitioner (widely used).
- Supabase's own advice is CLI migration files tracked in
  `supabase_migrations.schema_migrations`, never editing the remote database
  directly. **Deadeye:** we paste by hand, so that table is empty for us and
  `check-migrations.sql` is our only record of what is applied. Keep it
  current. [source](https://supabase.com/docs/guides/deployment/database-migrations), 2026, official.
- Free Supabase projects get no daily backups or point-in-time restore;
  Supabase says to export with `supabase db dump` yourself. **Deadeye:** before
  any migration that drops or rewrites data, the founder takes a dump first.
  [source](https://supabase.com/docs/guides/platform/backups), 2026, official.
- Supabase Branching gives each PR its own empty database built from the
  repo's migrations; Vercel can also stage a production build on its own URL,
  but with production data. **Deadeye:** Branching is the way out of "previews
  use live data" later. [source](https://supabase.com/docs/guides/deployment/branching), 2026, official; [Vercel](https://vercel.com/docs/deployments/environments), 2026, official.

**Vercel**

- Env var changes apply only to new deployments; `NEXT_PUBLIC_` values are
  inlined at build time, and dynamic lookups (`process.env[name]`) are never
  inlined. **Deadeye:** "set it, then redeploy" on every variable line. [source](https://vercel.com/docs/environment-variables), 2026, official; [Next.js docs](https://nextjs.org/docs/app/guides/environment-variables) (v16.4.2 in `node_modules`), 2026, official.
- Each deployment keeps the `CRON_SECRET` it was built with. A 401 on every
  run means a wrong or missing secret, or a pasted space; after editing it,
  redeploy and read the first run's log. **Deadeye:** exactly the 26 Oct
  failure. [source](https://vercel.com/docs/cron-jobs/manage-cron-jobs), 2026, official.
- Crons run only on production, are never retried, are best effort, and can
  occasionally run twice. **Deadeye:** crons cannot be tested on a preview;
  every job must be safe to repeat and catch up after a miss. [source](https://vercel.com/docs/cron-jobs/manage-cron-jobs), 2026, official.
- Hobby: at most once a day per cron (more fails the deploy), and a job fires
  anywhere in its hour. Crons do not follow redirects. **Deadeye:** fine for
  reminders; never promise a minute. [source](https://vercel.com/docs/cron-jobs/usage-and-pricing), 2026, official.
- Instant Rollback on Hobby goes back one deployment only, keeps that
  deployment's old env vars and crons, and turns off auto-promotion until
  "Undo Rollback". It does not touch the database. **Deadeye:** the founder's
  "it's broken" step, plus the warning that the next merge stays hidden until
  undone. [source](https://vercel.com/docs/instant-rollback), 2026, official.

**Process**

- Branch protection does not bind admins unless "Do not allow bypassing" is
  on; "strict" checks need the branch up to date with main. **Deadeye:** ask
  the founder to confirm both (Open questions). [source](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), 2026, official.
- Google's launch checklists justify each item with a past failure and roll
  out in stages with an automatic rollback. **Deadeye:** that is why the
  lessons above feed the checklist. [source](https://sre.google/sre-book/reliable-product-launches/), 2016, official (Google SRE book).
- A 19-item checklist used at three points cut surgical deaths from 1.5% to
  0.8% across 8 hospitals (7,688 patients; before-and-after, no control
  group). **Deadeye:** short, ordered checklists work, even for experts. [source](https://www.nejm.org/doi/full/10.1056/NEJMsa0810119), 2009, peer-reviewed.

## Open questions

- Does the SQL editor run a whole paste as one transaction (a failed line
  undoing the rest)? Decides whether migrations need `begin; ... commit;`.
- Is "Do not allow bypassing" on for `main`, and are checks "strict"?
- When to move to Supabase Branching or a second project, and its cost.
- A smoke test the agent can run after merge: a health route that checks the
  database and that env vars exist, without showing values.
- Vercel calls Cron Jobs legacy and plans "Schedules": what changes on Hobby?
