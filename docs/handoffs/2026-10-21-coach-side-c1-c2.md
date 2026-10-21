# Coach side C1 + C2: setup, coach home, mode switch, safeguarding (2026-10-21)

Agent: Claude Code (Opus 5.5) · Commits: d4a2c94, 4768623 · Status: shipped (00047 run by the user 21 Oct; live and checked with the tester)

Follows [funnel-demo-progress-coach-plan](2026-10-21-funnel-demo-progress-coach-plan.md). Spec and status: the plan doc, "Coach product", "Safeguarding" and "Coach roadmap" ([Deadeye next steps plan](https://claude.ai/artifact/RqfLp144xsDgauotzCHkhj)).

## Outcome
- First setup question: player, coach or both. Coach setup asks name, club, 18 or over and Garda vetting, makes the first team, and ends on a share screen with the code, a QR code, a join link (`/teams/join/<code>`, survives sign-up) and a message for parents.
- Coach home is free for one team: who trained, who went quiet, open assignments with done counts, quick actions. Plus `/coach/assignments` and a coach menu (Home, Teams, Assignments, Drills, Settings).
- Playing / Coaching switch in the top bar for "both" accounts; the last mode is saved on the profile (`app_mode`).
- Safeguarding in the database (00047): adult head coaches only, under-18s as assistants only, a team always keeps a head coach, coaches and under-18s can't become friends by code, card or old request. Report buttons on assignments and film answers. Parents who approved an under-16 see every coach post on the approval link.

## Decisions
- Coaching one team is free; Pro or owner can run up to 10 (create_team_with_details). Plan doc pricing (Claude, following the plan).
- Head coach = `role 'coach'` (unchanged, so film questions and roster details stay with adults); new `role 'assistant'` can post assignments and share the code only (Claude).
- Friend codes: blocked only between someone who coaches and an under-18; other adults keep codes, so siblings and families work (Claude, closes the C2 question).
- Coach-only accounts skip player setup; the dashboard sends coaching mode to `/coach` (Claude).
- "Roughly how many players" from the spec was left out: nothing would use it (Claude).
- Coach posts are reported through the existing player reports (Owner tools → Errors), with the post in the context, so no new table (Claude).

## Where things are
- `supabase/migrations/00047_coach_side.sql`: coach_profiles, app_mode, assistants, team limits, team_preview, friend rules.
- `src/lib/coachSide.ts` (+ `__tests__/coachSide.test.ts`), `src/app/(app)/coach/setup/page.tsx`, `src/app/(app)/coach/page.tsx`, `src/app/(app)/coach/assignments/`, `src/app/(app)/teams/join/[code]/`, `src/components/coach/TeamShare.tsx`, `src/components/layout/ModeSwitch.tsx`, `src/app/parents/CoachPosts.tsx`.
- New dependency: `qrcode` 1.5.4 (+ `@types/qrcode`).

## Open
- Checked live with the tester (desktop and 375px frames): Settings → Player & coach → setup (vetting refused until ticked) → team → share screen (QR decodes to the join link) → coach home → posting an assignment → team page → Playing / Coaching switch. Two fixes came out of it (4768623). The test team was deleted and the tester set back to player, but its coach_profiles row stays (no way to remove one in the app), so the tester now counts as a coach for the friend rule.
- Not checked live: the under-18 path, a second account joining by link, the parent view of coach posts, and the Report button (players only).
- Parents of 16 and 17 year olds have no parent link, so they can't see coach posts; needs parent emails (deadeye.ie, Resend) (user, then Claude).
- C3 (assignments that count themselves, weekly squad summary, season history) waits for 5 coaches using it for 3 weeks.
- Existing friendships between coaches and under-18s were left alone; decide whether to end them (user).

## Gotchas
- 00047 was tested in PGlite (embedded Postgres, in the job's tmp folder) with Supabase stubs: all 47 migrations load, 00047 runs twice, and 23 behaviour checks pass. The script is not in the repo; RLS is not exercised there (it runs as superuser).
- Heredocs with backslashes or apostrophes broke in the Bash tool; edits went through a JSON-driven replace script or the Edit tool.
- Some files are CRLF and some LF in the working tree; edits kept each file's own endings.
