# Deadeye Bench (the agent hub)

The founder's one page for the Agent OS: https://claude.ai/artifact/8kXcpLQbJ2QSfkzosne5yE
(private to the founder). Built 2026-11-09. Source: `index.html` here; data: `snapshot.json` here
and the page's database.

## What it shows

- **Scorebug**: activation (first sessions of players who finished setup) against the goal, days
  since a new player, next weekly run, overall status.
- **Today**: the clipboard of calls waiting on the founder (merges, approvals, the founder's own
  jobs), the funnel as a box score, the "injury report" (what's working), deadlines, a
  play-by-play log, and the words to send Claude.
- **Bench** (the 7 agents), **Playbook** (backlog), **Clubs** (pipeline), **Film room** (this
  week's posts), **Learning** (lessons and sources per agent), **Ask** (Claude answers from the
  page's data).

## The database (read and write it with the ArtifactData tool, `url` above)

| Collection / doc | Who writes | What |
| --- | --- | --- |
| `hub/snapshot` | Agents (via Claude) | The whole page's data, same shape as `snapshot.json`. |
| `decisions/<call id>` | The founder, from the page | `{status: approved | rejected | later | done, note?, pick?, at}` |

Only the owner (and editors) can write; anyone the page is shared with can read.

## Every run that touches the hub does this

1. **Read decisions first**: `ArtifactData list`, collection `decisions`. For each one that names
   a call your agent owns (`calls[].agent`):
   - `approved`: go ahead with what the call proposed, as the founder's go-ahead. A `pick`
     is the option chosen; a `note` changes the plan. Approval never covers posting, sending,
     spending or merging by itself: those still wait for the founder's words in chat.
   - `rejected` with a note: don't do it. Add the note to that agent's knowledge file under
     "Lessons from the founder" as a dated rule (`docs/agent-os/knowledge/<agent>.md`).
   - `done`: drop the call from the next snapshot.
   - `later`: keep the call, unchanged.
2. **Update `snapshot.json`** in the repo with what changed (numbers, calls, agents' last run and
   output, backlog, clubs, film, log, learn, health). Keep the shape. Newest log line first; keep
   at most 20 log lines. Set `updatedAt` (UTC) and `updatedBy` (the routine's name).
3. **Push it to the page**: `ArtifactData get` `hub/snapshot` for its `version`, then
   `ArtifactData set` `hub/snapshot` with `file_path` = `docs/agent-os/hub/snapshot.json` and
   `if_version` = that version. On a version conflict, re-read and redo once.
4. **Delete decisions you acted on** that are `done` or `rejected` (the page keeps them in
   "Decided" until then): `ArtifactData delete` with the version you read.
5. If the ArtifactData tool is missing in this session, still update `snapshot.json`, commit it,
   and put "Hub not updated: ArtifactData missing" first in the report.

## Rules

- Counts only, never names, emails or ids of players. The page can be shared later.
- Every number comes from a file in `docs/agent-os/data/` or a report; never estimate.
- A call has `id`, `kind` (`merge` | `approve` | `task`), `agent`, `title`, `detail`, and
  `words` + `link` for merges, `options` for a pick, `due` (YYYY-MM-DD) when there is one.
