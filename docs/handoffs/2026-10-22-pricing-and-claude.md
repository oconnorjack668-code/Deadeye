# Club pricing sheet and the switch to Claude (2026-10-22)

Agent: Claude Code, Opus 5.5 · Commits: e23f022, d3cb426 (agent-os), #33 · Status: shipped

## Outcome
- Club pricing sheet: `docs/sales/deadeye-club-plans.pdf` (2 pages, A4) and the HTML it prints from, also a
  private page (https://claude.ai/artifact/UCSMh57JfWd2BhSdrtX799). Contact: getdeadeye@gmail.com.
- AI: chat and reports now take their own model (#33). Live on Anthropic: `AI_CHAT_MODEL=claude-haiku-5-5`,
  `AI_REPORT_MODEL=claude-sonnet-5-5`, `AI_MODEL` deleted. The founder confirmed requests in the Anthropic Console.

## Decisions
- Prices (founder: end in .99): Team Pass €149.99/season or €19.99/month, up to 15 players; Club plan
  €99.99/team/season or €11.99/team/month from 4 teams; founding club 3 months free then €59.99/team/season
  or €6.99/month, fixed 2 seasons; Pro €6.99/month or €49.99/year. Season 1 Sep to 31 Aug.
- Research behind it (Claude): Irish season Sept training, Oct to Apr games, All-Irelands to early May; HomeCourt
  teams $1.50/player/month; club fees €205-€320; Stripe 1.5% + €0.25 EEA cards, SEPA €0.35.
- No monthly AI allowance: about 0.1c a question, so "unlimited" stays, with a fair-use daily limit to add to
  the terms before charging (Claude recommended).
- Wexford Blazers: 3 months free, not a full season; the founder may leave for a US scholarship next season.
- Tracker training data: no downloaded YouTube; use CC BY 4.0 datasets (Roboflow Universe "Basketball Detection
  v6", 48,110 images) and consented footage. Founder is injured, so no filming for now.

## Open
- Club billing (Stripe season and monthly prices, team-wide Pro, invoices, club agreement) before charging;
  accounts and agreements in the parent's name until 18. Charge only after 5 coaches use the free version 3 weeks.
- Founder: revoke the old OpenAI key after a week of good Anthropic usage.
- Founding offer wording: "first clubs" vs Blazers only, not decided.
- Tracker: measure on the sample clip and consented or CC footage; then a Colab notebook to train on the dataset.
