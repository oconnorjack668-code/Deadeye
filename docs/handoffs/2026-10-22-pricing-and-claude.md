# Club pricing, the switch to Claude, and the club picker (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: e23f022, d3cb426 (agent-os), #33, #34 · Status: shipped

## Outcome
- Club pricing sheet: `docs/sales/deadeye-club-plans.pdf` (2 pages, A4) and its HTML, also served at
  `/deadeye-club-plans.pdf` and a private page (https://claude.ai/artifact/UCSMh57JfWd2BhSdrtX799). Contact:
  getdeadeye@gmail.com (already `SUPPORT_EMAIL` in Vercel).
- #33: chat and reports take their own AI model. Live on Anthropic, confirmed in the Anthropic Console:
  `AI_CHAT_MODEL=claude-haiku-5-5`, `AI_REPORT_MODEL=claude-sonnet-5-5`, `AI_MODEL` deleted.
- #34: "Pick your club" card on the dashboard (after the first log, `src/components/clubs/DashboardClubCard.tsx`);
  "Your club" moved to just after Account in Settings (`/settings#club`); website pricing has a "For clubs
  and teams" block with the PDF download. `__tests__/club-pricing.test.ts` keeps page and sheet prices equal.

## Decisions
- Prices end in .99 (founder): Team Pass €149.99/season or €19.99/month, up to 15 players; Club plan
  €99.99/team/season or €11.99/team/month from 4 teams; Pro €6.99/month or €49.99/year. Season 1 Sep to 31 Aug.
- Founding club offer (founder, after Claude's advice): first 3 clubs only, clubs of 4+ teams that use it weekly
  and share feedback; free until 31 January 2027, then €59.99/team/season or €6.99/month for as long as they
  stay subscribed; closes 31 December 2026. Other clubs: Coach Free, no free Pro trial. Blazers are club 1.
- Research (Claude): Irish season Sept training, Oct to Apr games, All-Irelands to early May; HomeCourt teams
  $1.50/player/month; club fees €205-€320; Stripe 1.5% + €0.25 EEA cards, SEPA €0.35.
- No monthly AI allowance: about 0.1c a question, so "unlimited" stays; add a fair-use daily limit to the terms
  before charging. Claude chosen over gpt-4o-mini (older, July 2024); the first injury answer was checked and safe.
- The shot tracker does not use the chat model: MediaPipe EfficientDet-Lite0 and Deadeye's code, on the phone.
- Tracker data: no downloaded YouTube; use CC BY 4.0 datasets (Roboflow "Basketball Detection v6", 48,110 images)
  and consented footage. The founder is injured and cannot film for now.

## Open
1. Club billing before 1 February 2027 (founding clubs start paying then): Stripe season and monthly prices,
   Pro for a whole team, club invoices, a club agreement. Accounts and agreements in the parent's name until 18.
2. Self-counting assignments ("200 shots by Sunday", from the tracker): the first paid coach feature to build.
3. Tracker: measure on the sample clip and consented or CC footage, then a Colab notebook to train on the dataset.
4. Founder: revoke the old OpenAI key after a week of good Anthropic usage; add "1 of 3 places taken" once the
   Blazers sign; review prices after the Blazers' first month.

## Gotchas
- `docs/sales/deadeye-club-plans.html` is the source: print it with headless Chrome (`--print-to-pdf`), copy the
  PDF to `public/`, and check page 1 still fits (its footer falls off with one extra line).
- WebFetch could not resolve sites here; `curl` through the proxy worked.
