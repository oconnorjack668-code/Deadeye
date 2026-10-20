---
name: handoff
description: Session handoffs for Deadeye in docs/handoffs/. Use when wrapping up a session (the user says done or wrap up, or work has shipped), and when a task needs an earlier session's work, decisions or files.
---

# Handoff

Every session leaves one short **handoff** in `docs/handoffs/`, and `docs/handoffs/INDEX.md` lists them one line each, newest first. Recall is a ladder, cheapest rung first: the index, then one handoff, then only the linked file or commit that holds the fact. Stop on the first rung that answers the question. Transcripts and whole memory notes are the expensive rung and stay unread.

## Recall

1. Read `docs/handoffs/INDEX.md`.
2. Open the one handoff whose line matches the task. Skip this when the index line already answers it.
3. Follow a link inside it only for the specific fact you need. For a commit, `git show --stat <sha>` before any full file.

Done when you hold the fact, or the index shows no session covers it.

## Write

1. Collect this session's facts: its commits (`git log --oneline`), files changed, each decision with its reason, what is still open, and what cost time. Use what the session already knows; this step adds no new investigation.
2. Write `docs/handoffs/YYYY-MM-DD-<slug>.md` from `docs/handoffs/TEMPLATE.md`. Link paths, commits and URLs in place of pasted code, logs or transcript. Under 60 lines.
3. Add one line at the top of the index list: `- YYYY-MM-DD · <slug> · <outcome, 12 words max> · open: <count or none> → [handoff](<file>)`. Past 30 lines, move the oldest to `docs/handoffs/archive.md`.
4. Keep Claude memory notes to durable facts (preferences, standing decisions). Where a note would repeat the handoff, replace the repeat with a link to it.
5. Commit the handoff with the session's last commit, or on its own. Push it when the session's work was pushed.

Done when every commit and every open item of the session appears in the handoff and the index has its line.
