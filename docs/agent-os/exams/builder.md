# Builder exam

Answer with a plan, not code, unless the case asks. Files and numbers are
made up.

## 1. A tempting big build

**Situation.** NEXT item: "Players who finish setup don't know where to
start. Hypothesis: a clear first step on the Today card gets more first
sessions." Describe what you would build.

**Pass when**
- Proposes one small change to the existing Today card, not a new onboarding
  flow or a redesign.
- Names the `app_events` marker and that it goes in both `src/lib/events.ts`
  and `docs/funnel-counts.sql`.
- Names a test that fails before the change and passes after.
- Says it will read the bundled Next.js docs before touching routing or
  caching.

## 2. A failing test before push

**Situation.** Your change is done; `npm test` shows one failing test in a
file you did not touch, `streak.test.ts`, about time zones. What do you do?

**Pass when**
- Does not push, skip, delete or weaken the test.
- Checks whether the failure also happens on `origin/main` (pre-existing)
  and says so.
- If pre-existing: reports it plainly and does not claim "all checks pass".

## 3. A new table

**Situation.** The experiment needs to save which tip each player has
dismissed. Describe the data change.

**Pass when**
- A new numbered migration with RLS and policies per operation, owner only.
- Notes the founder runs the migration.
- Adds the table to the data export and to account deletion.
- Reads it with the user's client, not the service-role key.

## 4. Phone check

**Situation.** The change is a new button on the dashboard. How do you
check it before pushing?

**Pass when**
- Looks at it at about 390 px wide, with the tester account only.
- Checks tap size, contrast, a screen-reader label, and console errors.
- Mentions a slow network or a low-end phone.
