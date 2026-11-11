---
name: release-checker-playbook
description: How a professional release engineer checks a Deadeye branch before the founder merges it - checks, migrations, env vars, preview check, rollback plan and the founder's checklist. Loaded by the release-checker agent; use it for any exp/* branch check.
---

# Release checker playbook

A professional release engineer makes a release boring: every risk is named
before the merge, the person merging can follow the steps alone, and there
is a way back if it goes wrong. The rules in
`.claude/agents/release-checker.md` win over this file. A gold-standard
checklist to aim at: `examples.md` in this folder.

## Standards you check against

| Standard | What it means here |
| --- | --- |
| Automated gates | tsc, eslint on changed files, `npm test`, and the GitHub `checks` workflow green on the pull request. |
| Expand, then contract | A migration only adds (tables, nullable columns, policies) in the same release as the code. Renames and drops wait for a later release, once no live code uses the old shape. |
| Backwards compatible | The new code works before and after its migration is run, or the checklist says "run the migration first" in bold. |
| Rollback plan | Vercel Instant Rollback returns to the previous production deployment. A migration that cannot be undone by rollback is named, with its down step. |
| Smoke test | After the merge, the founder checks the changed screens on the live site with the tester account, in a set order. |
| Change failure rate | Track whether each release needed a fix afterwards (Results review). |

## Method

1. **Gates.** Run tsc, eslint on the changed files, `npm test`. Record pass
   or fail with the failing output.
2. **What changes outside the code.** Compare with `origin/main`: new files
   in `supabase/migrations/`, new variables in `.env.example`, new routes,
   new cron entries in `vercel.json`, new dependencies in `package.json`.
3. **Migration review.** For each migration: additive only? Safe to run
   twice (`if not exists`)? RLS on for new tables? Locks a big table? Works
   with the old code still live? Write the down step.
4. **Preview check.** When Chrome is connected and the pull request has a
   Vercel preview: open the preview at 390 px wide, signed in as the tester
   (previews use the live database: read only, change nothing that is not
   the tester's). Walk the changed screens and save a screenshot of each.
   Read the console for errors. When the deployment failed, read its build
   log (`get_deployment`, `list_deployment_events`).
5. **Risk.** Name the one thing most likely to break and how the founder
   would notice.
6. **Founder checklist**, in order: send back to builder (if any gate
   failed), migrations to run in the Supabase SQL editor, env vars to set in
   Vercel ("then redeploy"), how to merge (`merge <PR number>` once checks
   are green), what to check live (screens, in order, with what "working"
   looks like), and how to roll back.
7. **After the merge** (the next run): `get_runtime_errors` for the
   production project since the deploy. New errors on changed routes go to
   support-triage.

## Trade tools

- **Chrome** (`mcp__claude-in-chrome__*`, local only): preview check and
  screenshots.
- **Vercel** (read-only: `get_deployment`, `list_deployments`,
  `list_deployment_events`, `get_runtime_errors`, `get_runtime_logs`): build
  status, build logs, errors after a deploy. Project
  `prj_wS5DUVgjIv6ydFZvTcy5mDKLJj6X`, team `team_LQgMyesmWsnM8TxS03hpAcxM`.
  The Hobby plan keeps runtime logs about an hour, so read them soon after a
  deploy. You never redeploy, promote, roll back or change env vars.

If a tool is not connected, say which check was skipped.

## Quality bar

- The founder can follow the checklist alone, top to bottom, without
  asking.
- Every migration has a down step and a "safe with old code" answer.
- Each changed screen has a preview screenshot, or a line saying why not.
- One named top risk, with how to spot it.

## Common mistakes

- Missing an env var that is only read at build time (`NEXT_PUBLIC_*`): it
  needs a fresh build, not only a redeploy of an old one.
- Telling the founder to "Redeploy" an old deployment from the dashboard:
  that rebuilds the OLD commit.
- A migration that drops or renames something live code still reads.
- Calling `/api/cron/reminders` to test: it sends real reminders.
