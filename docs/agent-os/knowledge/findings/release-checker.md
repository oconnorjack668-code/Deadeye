# Release checker findings

Research for the release-checker agent: what the evidence says, each finding with its
source. The rules file (`../release-checker.md`) holds the founder's lessons and the
checklist and is read before every task; this file is searched when a task
needs it (grep the `###` headings). No line cap: replace a weaker finding
when a better source arrives, rather than adding beside it.

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
