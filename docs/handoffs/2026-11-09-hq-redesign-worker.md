# Deadeye HQ redesign, hub worker, E4 shipped and checked live (2026-11-09, afternoon)

Agent: Claude Code, Opus 5.5 · Merges: #74 (615e648), #75 (5b16bb3), #77 (49d959e), #78 (53670e0), #79 (52fd5ef), #80 (55c74a4) · Status: shipped

Follows [agent-hub-routines](2026-11-09-agent-hub-routines.md).

## Outcome
- **E4 live:** reminders card on the dashboard for players with no session (#74); follow-ups from its safety notes (#77): suggested days until reminders are on, a message after each save, `reminder_set` only when reminders end up on. Checked live on the reset tester account (card, suggested days, all three messages, no console errors).
- **Hub redesigned as Deadeye HQ** (#78), same URL, pinned to the founder's sidebar: app layout, real red logo, plain headings, goal and status in words, every to-do with Approve, then Done or Later, plus an "If you approve" line (`onApprove`).
- **Chat and progress** (#79): the Chat tab answers from the hub's data and can approve, finish or push back tasks. Approved tasks show progress (Queued, Working, Finished, Blocked) written to `progress/<id>` by the new **hub worker** routine.
- **First worker run:** landing page now says "count makes and misses" (#80, live); C4 parent consent wording drafted in `docs/agent-os/clubs/2026-11-09-parent-consent-16-17.md`.

## Decisions
- Founder feedback on the first hub: confusing buttons and sports headings, unexplained goal, orange logo. Rebuilt in plain English; Approve means "yes, go ahead"; every call needs `onApprove`.
- Hub worker runs at **09:00 and 19:00** only (founder chose this to save usage; hourly was the first version). Each approved task runs once; a check with nothing to do ends in one line.
- Routines may not merge: auto mode refused giving them that standing permission. Approved merges are done by Claude in the next chat, or the founder merges.
- Play Store waits until deadeye.ie is live and the DPIA is signed (aim 31 Dec); App Store only when iPhone players ask. Both are on the hub.

## Where things are
- `docs/agent-os/hub/` (`index.html`, `README.md` with button meanings and run steps, `snapshot.json`); hub https://claude.ai/artifact/8kXcpLQbJ2QSfkzosne5yE
- Hub worker routine `trig_015kxehjQDGT72Yn4Fi3X7Lk`; other routine ids in the earlier handoff.
- `src/app/(app)/profile/RemindersCard.tsx`, `__tests__/reminders-card-event.test.tsx`.

## Open
- Welcome page still says "calls every make and miss" (worker left it for the founder).
- Founder: read the C4 consent draft; the hub's remaining to-dos (Blazers trial by 16 Nov, E0, DPIA, domain, then Stripe, then Play Store).
- The tester account is a fresh player with setup done, Tue saved, reminders off.

## Gotchas
- `ArtifactData` refuses `out_dir` under `.claude/` paths; save to a folder in Documents and delete it after.
- Hub writes need `if_version`; routines write between your reads, so re-read on a mismatch and keep their log lines.
- `calls` is a list, so `str_replace` can't edit it: resend the whole list with `update`.
- Routine `update` that changes `job_config` must resend the whole `ccr`, or the prompt is lost.
