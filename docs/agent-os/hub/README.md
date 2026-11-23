# Deadeye HQ (the agent hub)

The founder's one page for the Agent OS: https://claude.ai/artifact/8kXcpLQbJ2QSfkzosne5yE
(private to the founder). Built 2026-11-09, redesigned the same day after the founder's feedback
(plain headings, the real red logo, one Approve / Done / Later flow). Source: `index.html` here;
data: the page's database, mirrored in `snapshot.json` here.

## What it shows

- **Home**: the activation goal in a full sentence with progress, players, systems; what needs a
  decision; what's in progress; coming up; recent activity; systems.
- **To-do**: every open item in `docs/STATUS.md`, filtered by Needs decision / In progress / Later /
  Done. Built from STATUS by `scripts/status-to-hub.mjs`, never written by hand (below).
- **Growth** (funnel, experiments, weekly rate), **Agents** (with latest lesson and prompts to copy),
  **Clubs and content**, **Ask Claude** (answers from the page's data).

## The database (ArtifactData tool, `url` above)

| Collection / doc | Who writes | What |
| --- | --- | --- |
| `hub/snapshot` | Agents (via Claude) | The page's data, same shape as `snapshot.json`. |
| `decisions/<call id>` | The founder, from the page or its chat | `{status: approved | done | later, note?, pick?, at}` |
| `progress/<call id>` | The hub worker and any agent run | `{state: queued | working | done | blocked, summary, steps: [{at, text}], pr?, file?, updatedAt}` |

**The hub worker** (routine `trig_015kxehjQDGT72Yn4Fi3X7Lk`, 09:00 and 19:00 Irish time) picks up
approved calls (not merges), does what each `onApprove` says as the named agent, and writes its steps
to `progress/<call id>` so the founder can watch on the task card. An hour with nothing approved ends
in one line. **Chat** (the page's Chat tab) answers from the snapshot, decisions and progress, and can
approve, finish or push back a task when the founder asks; it never changes code or posts anything.

No decision document means the call is waiting for the founder. Only the owner and editors write.

## What the founder's buttons mean

- **Approve** = yes, go ahead. The call moves to In progress. The agent named on the call does what
  its `onApprove` line promised. A `pick` is the option chosen; a `note` changes the plan.
- **Approve to go live** (calls of kind `merge`): the founder's go-ahead to merge that pull request.
  Scheduled routines never merge (auto mode refuses giving them that standing permission, 9 Nov 2026).
  The next Claude Code session the founder opens checks `decisions` and merges approved pull requests
  whose GitHub checks are green, whose PR check safety verdict is PASS and whose branch is up to date
  (`gh pr merge --merge --match-head-commit <sha>`), then marks the decision done. Routines only report
  approved-but-unmerged pull requests in their notification.
- **Done** = finished. Drop the call from the next snapshot and delete the decision.
- **Later** = not this week. Keep the call; the next weekly run may put it back to waiting by
  deleting the decision.
- A **note** with feedback on how an agent worked becomes a dated rule in that agent's knowledge file
  under "Lessons from the founder".
- Approval never covers posting, sending, messaging anyone or spending money: those stay the
  founder's own actions.

## The to-do list comes from STATUS

Since 2026-11-18 the to-do list (`calls`) is built from the Open table of `docs/STATUS.md` on main: one
card per `S<n>` row, with the S id as the card id. Founder's reason: the hand-kept list still showed
pull requests merged days earlier as waiting, and missed open items. So:

- **To add, change or close a to-do, change STATUS**, never `calls`. Anything the founder must
  approve or do gets an `S<n>` row with an owner.
- **Open pull requests get a card each automatically** (id `pr-<number>`, "Code ready to go live"),
  read from GitHub's public API, and lose it when they are merged or closed. The PR check routine
  may write its safety verdict and checks into that card's `detail` (same id); the rebuild keeps it
  while the pull request is open.
- **Rebuild the list whenever STATUS changes on main**: every session right after its STATUS pull
  request merges (handoff skill, step 6), and the hub worker at every run:
  1. `ArtifactData get` `hub/snapshot` with `out_dir` (note its `version`).
  2. `node scripts/status-to-hub.mjs --snapshot <that file> --out <new file>` (reads
     `origin/main:docs/STATUS.md` itself).
  3. `ArtifactData set` `hub/snapshot` with `file_path` = the new file and `if_version`; on a
     conflict, redo from step 1 once.
- The page cannot read GitHub itself: the artifact sandbox blocks every outside site.
- **The founder's buttons on an S item**: Approve and Later are a decision for the item's owner to
  act on. Done means the founder says it is finished: the next session checks it, closes the row in
  STATUS with the evidence (or with "founder marked done in HQ on <date>" when only the founder can
  know), rebuilds the list and deletes the decision.

## Every run that touches the hub

1. **Start from the page's data**, not the repo file: `ArtifactData get` `hub/snapshot` (note its
   `version`). The repo's `snapshot.json` can be older.
2. **Read decisions**: `ArtifactData list` `decisions`, and act on those for your agent's calls as above.
3. **Edit the snapshot** with what changed, except `calls` (the to-do list), which only
   `scripts/status-to-hub.mjs` writes. Newest log line first, at most 20.
   Plain English everywhere: no jargon, no sports terms. Set `updatedAt` (UTC) and `updatedBy`.
4. **Save it**: write it to `docs/agent-os/hub/snapshot.json`, then `ArtifactData set` `hub/snapshot`
   with `file_path` and `if_version`. On a version conflict, re-read and redo once.
5. **Tidy decisions** you acted on that are done (delete with the version you read).
6. If the ArtifactData tool is missing, say "Hub not updated: ArtifactData missing" first in the report.

## Rules

- Counts only, never names, emails or ids of players.
- Every number comes from a file in `docs/agent-os/data/` or a report; never estimate.
