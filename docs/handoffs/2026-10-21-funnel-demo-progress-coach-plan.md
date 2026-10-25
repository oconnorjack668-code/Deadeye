# Funnel, landing demo, first-week progress, FAQ and the coach plan (2026-10-21)

Agent: Claude Code (Opus 5.5) · Commits: 2ef40b2, 8a17d9b, d572bd5, 5b2f627, 131f895, 8a75adf · Status: shipped

Follows [app-review-fixes](2026-10-21-app-review-fixes.md). The plan lives in a Claude Doc: [Deadeye next steps plan](https://claude.ai/artifact/RqfLp144xsDgauotzCHkhj) (phases 1-5, coach section, open questions).

## Outcome
- Reminders: one daily cron at 16:00 UTC (4pm Irish winter), no time picker; `reminder_time` no longer read (2ef40b2). Goals and focus areas are tags on the profile.
- Phase 1, player funnel: `app_events` (00045, one row per player/step/day, server-only, 90 days), `/api/events`, `src/lib/events.ts`, Owner tools → Player funnel, `docs/funnel-counts.sql` (8a17d9b). Checked live with the tester.
- Phase 2: the real tracker on the landing page sample clip ("Watch it call real shots"), sign-up under the verdict, `signup_from_demo` counted at the welcome screen (d572bd5). Checked live, headless, phone size: 4/6 spot on.
- Phase 3: progress card after a save (`src/lib/progress.ts`), invite card while friendless, invites survive sign-up, dashboard folds until the first log, Add friend on a player card via `send_friend_request_to` (00046) (5b2f627). Checked live with the tester; a request was not sent.
- Crash filter now treats Chrome's "network error" as a dropped connection; Owner tools times in Irish time (131f895).
- Phase 4: ten-question FAQ with FAQPage JSON-LD; the account-deletion page said Profile, it is Settings (8a75adf). Live.
- Coach market research, pricing and safeguarding written into the plan doc (no code).

## Decisions
- Coaches free; income from Team Pass (~€149/team/season, players get Pro) and Club plan (~€499, 6 teams) (Claude recommended, user agreed).
- Founding club: Wexford Blazers BC, ~€99/team/season, kept for every season while it stays; its teams incl. the user's U18s trial first (user). See memory `coach-pricing-founding-club`.
- Profile friend requests never between an adult and an under-18, not even teammates: a coach is a teammate (Claude, per BI coaches-of-minors policy). Codes still work.
- deadeye.ie: bought in the mam's name, she does the residency proof; never tick "already hold a .ie" (user). **Note 2026-10-25:** this is whose name it goes in; the domain is not bought yet and the live address is deadeyeapp.vercel.app (user).
- Funnel uses our own table, no third-party analytics: many players are under 18 (Claude).

## Where things are
- Migrations 00045, 00046 (both run by the user 21 Oct). Env: `TEST_ACCOUNT_EMAILS` set in Vercel.
- `src/components/LandingDemo.tsx`, `src/lib/video/sampleClip.ts`, `src/components/basketball/AfterSession.tsx`, `src/app/(app)/admin/funnel/page.tsx`

## Open
- Next: coach side C1 + C2 (setup, home, menu, Playing/Coaching switch, safeguarding) before Wexford Blazers trials it. Plan doc "Coach product" and "Safeguarding". Claude.
- Phase 5 training gaps (warm-ups, easier versions, no-hoop drills, drill timer, metric sprints, growth pains). Claude.
- Tracker accuracy: needs 2-3 filmed sessions (user).
- deadeye.ie via the mam, then the setup checklist in the plan doc (parent emails, Resend, SUPPORT_EMAIL) (user).
- A real quote from a Wexford Blazers player or coach for the landing page (user). SEO guide pages wait for deadeye.ie.
- ~28 Oct: read Owner tools → Player funnel; it picks the next fix (user).
- Decide in C2: should friend codes also keep adults and under-18s apart?
- The FAQ answer on coaches must change when Team Pass ships.

## Gotchas
- Vercel: the user redeployed an old build, then deleted it while live → DEPLOYMENT_NOT_FOUND until a promote. A later push made no deployment; `create_deployment` (Vercel MCP, gitSource) fixed it. Memory `vercel-deploy-quirks`.
- The Chrome extension's network log showed 503 for keepalive POSTs that were 204; trust `performance.getEntriesByType('resource')`.
- Chrome-extension screenshots time out when the window is behind; read text instead. Headless Chrome over CDP (`node` script, port 9333/9334) works for signed-out pages.
- `TaskStop` on `next dev` left the node server on port 3100; find its PID and `Stop-Process`.
- No python on this machine; edit files with the Edit tool.
- Claude may not type passwords on the live site: the user signs the tester in.
