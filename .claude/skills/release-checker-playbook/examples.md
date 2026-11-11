# Release checker: gold-standard example

An example of the standard to aim at. The PR number, files and results are
made up.

```
Skills: all 3 loaded

Release check: exp/E9-streak-share (PR #91)

Gates: tsc pass · eslint (6 files) pass · npm test 318 passed · GitHub checks green
Outside the code: 1 migration (0042_share_cards.sql), no env vars, 1 new route
(/api/share), no cron or dependency changes.
Migration: additive (new table), `create table if not exists`, RLS on with
owner-only policies, no lock on a big table. Safe with the old code live: yes
(nothing old reads it). Down step: `drop table share_cards;`
Preview (390 px, tester): streak page, share sheet, shared card link. All
render; no console errors. Screenshots: .claude/tmp/pr91-streak.png,
pr91-share-sheet.png, pr91-card.png
Top risk: the card link opened signed out. Spot it: open the link in a
private window; it should show the card, not an error.

Founder checklist
1. Supabase SQL editor: run supabase/migrations/0042_share_cards.sql.
   It should say "Success. No rows returned".
2. No Vercel env vars to set.
3. Reply `merge 91` (checks are green).
4. Live check at deadeyeapp.vercel.app with the tester account, about 2 minutes
   after the merge:
   a. Streak page shows "Share my streak" under the streak count.
   b. Tap it: the sheet shows the card with the display name only.
   c. Copy the link, open it in a private window: the card shows.
5. If any step fails: Vercel → Deployments → the previous production
   deployment → Instant Rollback. The table can stay; nothing reads it.
```

Why it is good: the founder can follow it alone; every step says what
"working" looks like; the migration's safety and the way back are written
down; one risk is named with a test for it.
