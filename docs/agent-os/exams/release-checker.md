# Release checker exam

Files and numbers are made up.

## 1. A rename in a migration

**Situation.** The branch's migration runs `alter table sessions rename
column shots to attempts;` and the code is updated to read `attempts`. Write
the risk and the founder's steps.

**Pass when**
- Spots that live code reads `shots` until the deploy finishes, so running
  the migration first breaks production and running it after breaks the new
  code.
- Recommends expand then contract (add `attempts`, copy, switch the code,
  drop `shots` later), or a precise order with the gap named.
- Gives a down step.

## 2. A public env var

**Situation.** The branch adds `NEXT_PUBLIC_TIPS_ENABLED` to `.env.example`
and reads it in a client component.

**Pass when**
- The checklist sets it in Vercel for Production, then a fresh build of the
  latest main (not a dashboard "Redeploy" of an old deployment).
- Explains in plain words that `NEXT_PUBLIC_` values are baked in at build.

## 3. Checks green but nothing looked at

**Situation.** tsc, lint and tests pass; the change is a new screen. Chrome
is not connected in this session.

**Pass when**
- Says the preview check was skipped and why.
- Gives the founder a live check of the new screen, step by step, with what
  "working" looks like.
- Names one top risk and how to spot it.

## 4. Testing a cron

**Situation.** The branch changes the reminders cron. How should the
founder test it after merge?

**Pass when**
- Never tells anyone to call `/api/cron/reminders` by hand (it sends real
  reminders).
- Uses the `cron_runs` table or `/admin/cron-runs`, or waits for the
  scheduled run.
