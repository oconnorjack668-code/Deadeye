# Personal planner, TY timetable, Opera browser (2026-11-11)

Agent: Claude Code, Opus 5.5 · Commits: this handoff only · PR: docs-only (this branch) · Status: shipped

## Outcome
A personal session, not Deadeye product work. The founder's weekly planner
was fixed and redesigned, and published as a private page that syncs between
phone and laptop. A professional Transition Year home education timetable was
made as a personal document for the founder's family.
Opera is now connected to Claude in Chrome beside the Chrome tester browser.

## Decisions
- Planner saves to the founder's private claude.ai store (`data/users/<id>/planner`), with this browser as a fallback, so phone and laptop match: founder asked to use it on the phone.
- The published planner has no calendar export or print: claude.ai pages can't download `.ics` or print. The local file keeps calendar export.
- TY timetable built on the NCCA TY Programme Statement (in all schools from Sept 2025): English, Irish and Maths up to 2h a week each, electives 3-4h, one SPHE, portfolio and career class a week; 25h, Mon-Fri 9:00-14:55. Founder removed work placement and added volunteer underage coaching at Wexford Blazers.
- Told the founder plainly that the timetable must match the week he actually follows, since it is a signed document.
- Both browsers stay connected: Opera for everyday work, Chrome for tester-account tests (founder's choice). Device ids are in memory note `test-live-in-chrome`.

## Where things are
- `~/Documents/weekly_planner.html`: offline planner, saving fixed, with calendar export; original in `weekly_planner.backup-2026-11-11.html`.
- `~/Documents/homeschool-basketball-planner.html` → https://claude.ai/artifact/Jtz3jHLLBiNy7sEASJu2QX: redesigned planner page (private, syncs across devices).
- https://claude.ai/artifact/V7WxnSuUgBqqCwaTTAjw1G: Claude Doc "Home Education Weekly Timetable – Transition Year 2026–27".
- `~/Documents/Home Education Weekly Timetable - Transition Year 2026-27.pdf`: its 5-page A4 export.
- A Gmail draft carrying it (not sent; PDF not attached, Gmail refused attaching by file reference).

## Status changes
- Closed: none
- Opened: none (the timetable's next steps are personal, not Deadeye)

## Gotchas
- `window.storage` only exists inside claude.ai, so the old planner opened from Documents never saved; fixed with a localStorage fallback.
- Claude Docs export: the PDF came back too large for the reply and was saved to a tool-results file, then decoded with node. The docx came back inline as base64 and wasn't retyped.
- A Docs `replace` of the byline with `"as":"markdown"` kept its date and mention chips; deleting them needed `chars` deletes on the chip ids.
- Gmail `create_draft` file references failed for paths in Documents and in the job tmp folder; the draft was made without the attachment.
- switch_browser has to be called before a Connect prompt appears; saying "you'll see a prompt" without calling it shows nothing.
