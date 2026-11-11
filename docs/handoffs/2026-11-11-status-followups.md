# Status follow-ups: merges, last overclaims, dataset credits (2026-11-11)

Agent: Claude Code, Opus 5.5 · Commits: 4809180 (#85), 33340da (#81), 77bf1e8 (#86), this branch · PR: #85, #81, #86 merged; this docs PR · Status: shipped

## Outcome
The status file and SessionStart hook are live on main (#85). The 9 Nov HQ
redesign handoff finally reached main (#81). The last overclaiming wording
is gone from the live site: every page now says "counts your makes and
misses" (checked live on /login after #86 deployed). The hoop model's
credits link 3 of its 4 datasets.

## Decisions
- #81 conflicted with main on `docs/handoffs/INDEX.md`; resolved (main's STATUS note and 11 Nov lines first, then the 9 Nov line) and merged only after the founder said `merge 81` again: a new push needs a new yes.
- Founder believed the two overclaims were already fixed. Only the homepage was (#80, via its own metadata); `layout.tsx`'s site-wide description still served "Track every shot" on /login, /signup, /privacy, /pro, plus `public/manifest.json`, the welcome page and the Play Store draft. All four fixed in #86 with the homepage's wording.
- New STATUS rule (founder's correction): an item names every place it applies and which are already done, checked where people see it (live site, grep every copy). S7 had said "still there" without saying the homepage was done, so it read as finished work raised again.
- Dataset links from the founder: X-Basket is `x-qfelz/x-basket-2`; basketball-computer-vision is `basketballcomputervision/basketball-computer-vision`. Basketball Shot Tracking not found by the founder or by web search; the Colab exports are not on the laptop.
- Links not added to the app's credits (`src/app/privacy/page.tsx` #credits): legal text is founder-only; asked, no answer yet.
- DPIA stays unsigned for now (founder: signing later).

## Where things are
- `docs/STATUS.md`: S2 (Shot Tracking link), S14 (routine not seen), S20 (merge this PR).
- `ml/rim-detector/ATTRIBUTION.md`: the dataset links.
- `.claude/skills/handoff/SKILL.md`: the precision rule.

## Status changes
- Closed: S4 (#81 merged), S7 (#86, live check), S18 (#85 merged).
- Opened: S19 (C4 consent draft), S20.
- Narrowed: S2 (3 of 4 linked).

## Gotchas
- `!` commands run in the session's working directory: from a worktree, `git pull` pulls the PR branch, not the founder's main folder. Exit the worktree first.
- `gh pr merge --match-head-commit` needs the full 40-character sha.
- `git merge-tree --write-tree A B` tests a merge without touching the tree; worktree sessions refuse compound git commands, so run each plainly.
- Next.js page metadata overrides `layout.tsx`'s, so a homepage fix does not fix the other pages: check several live pages.
