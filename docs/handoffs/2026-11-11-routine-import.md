# Gym routine import (2026-11-11)

Agent: Claude Code (cloud session) · Commits: 3434b18, 0cff528, fb78a80, 99bfdf9, a1ee73a, 456006a, f523d27 · PR: #88, #89, #90, #91 (all merged) · Status: shipped

## Outcome
Players can import routines from other gym apps at `/workouts/import`: paste text or a screenshot (read by the AI, 10 free a month, 100 Pro) or a Strong/Hevy/spreadsheet CSV (read on the phone, no limit). They check and edit a preview before saving; two or more routines save as a program. Routines keep reps targets and notes, which the logger shows. Migration 00058 run by the founder.

## Decisions
- Free with a monthly limit, not Pro: import is how players switch apps, and Pro is not live until January (founder agreed).
- CSV is parsed in the browser: no upload, no AI, no limit.
- Name matching is exact or same-words-reordered only; a wrong match would merge two exercises' history.
- The AI coaching switch also stops paste/screenshot import: it is what parents and the policy describe as the AI off switch (safety review, BLOCK 1).
- Import-count rows are kept about two months, cleared by the daily `cron/reminders` housekeeping (safety re-review).
- No parent re-consent: the founder confirmed no under-16 has signed up, so every approval uses the updated parent page.
- Anthropic terms checked here, not left to the founder: DPA covers images, EU SCCs; founder confirmed the key is Anthropic's and saved the DPA.

## Where things are
- `src/lib/routineImport.ts`: CSV reader, cleaning, name matching, saving, allowance and retention helpers.
- `src/app/api/workouts/import/route.ts`: the AI read, limit, parent gate, AI switch.
- `src/lib/ai/routineImport.ts`: extraction prompt; `src/lib/ai/provider.ts` gained image input.
- `src/app/(app)/workouts/import/page.tsx`: the screen; `workouts/page.tsx` groups programs.
- `supabase/migrations/00058_routine_import.sql`: tables, columns, tighter routine and routine-exercise rules.
- `docs/legal/dpia.md`: data row, R11, action 7. Privacy policy and parent page updated.

## Status changes
- Closed: S20
- Opened: S21

## Gotchas
- The safety-reviewer agent runs `git diff origin/HEAD...`; a fresh clone has no `origin/HEAD`. Fix: `git remote set-head origin main`.
- `npx tsc` fails on `LayoutProps` until `npx next typegen` runs; delete `.next` after a temporary preview route or its stale types break tsc.
- The repo had no `node_modules`; `npm ci` takes a few minutes.
- Screens were checked with a temporary page under `/about-*` (public in the proxy) and Playwright with mocked Supabase calls; never committed.
- A retention "delete before last month" written into the route only ran on the player's next import; schedule retention jobs, don't tie them to use.
