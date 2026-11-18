---
name: handoff
description: Session handoffs and the live status file for Deadeye (docs/STATUS.md, docs/handoffs/). Use when wrapping up a session (the user says done or wrap up, or work has shipped), and when a task needs an earlier session's work, decisions or files, or asks what is done or still to do.
---

# Handoff

Two kinds of record, with different jobs:

- **`docs/STATUS.md` is the present**: what is open now and what was done in
  the last 21 days, each item with an id, owner and when it was last checked.
  It is updated every session and printed into every new Claude Code chat by
  a SessionStart hook. It wins over everything else.
- **Handoffs are history**: one short file per session in `docs/handoffs/`,
  listed one line each in `docs/handoffs/INDEX.md`. They say what a session
  did and why. They are never edited later, so their "Open" lines go stale;
  never read them as current.

Founder's reason (2026-11-11): new chats kept repeating finished items as
still to do (push keys were raised four times after they were done) because
open items lived only in old handoffs and nothing closed them.

## Recall

1. Read `docs/STATUS.md` from main (the SessionStart hook prints
   `origin/main`'s copy; otherwise `git fetch origin main && git show
   origin/main:docs/STATUS.md`). Never trust the checkout's own copy: a
   checkout on an old branch has an old one (S35 was reported open on
   18 Nov a day after it closed). If the hook warned that commits landed
   since it changed, check its items against those commits.
2. For history (why something was done, where it lives): the index, then the
   one matching handoff, then only the linked file or commit
   (`git show --stat <sha>` before any full file). Stop on the first rung
   that answers.
3. **Before telling the founder something is open, broken or still to do,
   confirm it is current**: it is in STATUS's Open table, or you checked the
   evidence now (PR state with `gh pr view`, the code, `cron_runs`, the live
   site). An item found only in an old handoff, a memory note or a
   subagent's report is "unconfirmed since <date>" until checked. Strike
   unchecked claims from subagent reports before relaying them.

Done when you hold the fact, or STATUS and the index show no session covers it.

## Write (at the end of every session that changed anything)

1. **Update `docs/STATUS.md` first.**
   - Each open item this session finished: move it to "Recently done" with
     the date and the evidence (PR number, commit, query, live check).
   - Each open item this session checked but did not finish: update its
     "Last checked" cell with the date and what was seen.
   - Each new open item: a new row with the next unused `S<n>` id, an owner
     (founder, a named agent, or "founder decides"), today's date. Name
     every place it applies and which are already done, checked where
     people see it (live site; grep for every copy), so a part-done item
     never reads as a finished one raised again.
   - Delete "Recently done" lines older than 21 days. Update the
     `Last updated` line.
2. Collect this session's facts: commits (`git log --oneline`), files
   changed, each decision with its reason, what cost time. Use what the
   session already knows; this step adds no new investigation.
3. Write `docs/handoffs/YYYY-MM-DD-<slug>.md` from `docs/handoffs/TEMPLATE.md`.
   Link paths, commits and URLs in place of pasted code, logs or transcript.
   Under 60 lines. Its **Open** section lists only STATUS ids (`S7, S12`),
   not the items' text, so it cannot drift from STATUS.
4. Add one line at the top of the index list: `- YYYY-MM-DD · <slug> ·
   <outcome, 12 words max> → [handoff](<file>)`. Past 30 lines, move the
   oldest to `docs/handoffs/archive.md`.
5. Keep Claude memory notes to durable facts (preferences, standing
   decisions, ids). Never put an open to-do in a memory note; it goes in
   STATUS. Where a note repeats STATUS or a handoff, replace it with a link.
6. **Get it onto main now.** Every later chat reads STATUS from main, so an
   update on an unmerged branch is invisible to them (PR #81 sat unmerged
   from 9 to 11 Nov). Put STATUS and the handoff in their own docs-only pull
   request, on a fresh branch from `origin/main` (a worktree if the checkout
   holds other work), and **merge it yourself as soon as its checks pass**
   (`gh pr update-branch <n>` first if it is behind main). A docs-only PR
   changes only `docs/STATUS.md`, `docs/handoffs/` and the index. Any PR
   that also touches code, migrations, config or skills is not docs-only:
   it waits for the founder, and STATUS lists it as "merge <n>" for them.
   Founder's decision, 2026-11-18: sessions self-merge docs-only STATUS PRs
   so the record reaches main within minutes. If the merge fails (conflict
   with another session's STATUS edit), rebase on main, keep both edits,
   and merge again; never leave it for the founder.

Done when every commit and decision of the session is in the handoff, every
item the session opened or closed is reflected in STATUS, the index has its
line, and the docs-only pull request holding them is merged into main.
