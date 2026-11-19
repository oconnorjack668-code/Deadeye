# Yearly club prices, /clubs, feedback option, founding competition (2026-11-18)

Agent: Claude Code, Opus 5.5 (with builder x2, club-growth, player-outreach, marketing, safety-reviewer) · Commits: dbff25d · PR: #144 (draft) · Status: in progress (waits for the founder)

## Outcome
Acting on advice from the founder's uncle: every club plan is priced per year, there is a public `/clubs` page, Settings has a real feedback option, and a founding competition is built behind a switch that stays off until its legal and setup steps are done. Outreach drafts and a 2-week shooting series plan are written.

## Decisions
- Price per year, not per season: seasons differ between clubs and countries, and players train most in the offseason (founder and uncle). Team Pass €179/yr or €19.99/mo; Club €899/yr up to 8 teams + €89 per extra team (Team Passes are cheaper below 6 teams); founding €59.99 per team per year, keeping its number (more generous than per season).
- Did not raise club prices 10x (uncle's idea): €999.99 a team would cost more per player than individual Pro. Flat club price raises the anchor instead.
- Competition judged on most useful feedback, not a random draw: a skill competition avoids the Irish promotional-draw prize cap (club-growth found a reported €2,500 limit). A solicitor still has to confirm (S50).
- No lifetime club prize: one year of the Club plan; players get Pro for life.
- Non-winners: "everyone who entered gets 25% off", never "second prize" (blacklisted under EU unfair practices rules). For under-18s the offer goes to the parent.
- Parent permission: under-18 entries count only after a parent approves by emailed link; under-16s use the account's approving parent, 16 and 17 year olds type a parent's email and tick that it is not theirs. Under-18 winners are confirmed with a parent by phone or in person.
- Launch switch `COMPETITION_LIVE` (safety-reviewer B1): merging is launching, so entry stays closed until S50.

## Where things are
- `src/lib/plans.ts`, `docs/sales/deadeye-club-plans.html` (+ PDF in `public/` and `docs/sales/`): prices.
- `src/app/clubs/page.tsx`: the clubs page. `src/app/competition/`, `src/lib/competition*.ts`, `src/app/parents/competition/`, `src/app/(app)/admin/competition/`: the competition.
- `supabase/migrations/00067_feedback_and_competition.sql`: not applied.
- `docs/sales/founding-competition-rules.md`: rules, with a founder-only checklist box on top.
- `docs/agent-os/clubs/2026-11-18-competition-outreach.md`, `docs/agent-os/outreach/2026-11-18-competition-outreach.md`, `docs/agent-os/marketing/2026-11-18-shooting-series.md`: drafts.

## Status changes
- Closed: none
- Opened: S49, S50, S51

## Gotchas
- The club-growth agent's write guard blocks `docs/sales/`; the main session moved its rules file there.
- `/clubs` and `/competition` needed an exact-path exception in `src/lib/supabase/middleware.ts` (`isPublicMarketingPath`), not `src/proxy.ts`; `/clubs/<id>` stays signed-in only.
- The pricing PDF is printed from the HTML with headless Chrome (`--print-to-pdf --no-pdf-header-footer`); page 1 still fits.
