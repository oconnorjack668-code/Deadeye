# Funnel data

Agents cannot read the live database, so this folder is all the data they get.

- `YYYY-MM-DD-funnel.md`: written every Monday at 08:30 Irish time by the weekly
  counts job (`api/cron/agent-counts`), from the same numbers as
  `/admin/funnel`, owner and test accounts left out, plus how many problem and
  crash reports are open. Counts only. The repo is public, so a step reached
  by 1 to 4 players reads "under 5", and when fewer than 5 joined in the 7
  days that column is not split by step; exact numbers are on `/admin/funnel`.
  Until `AGENT_DATA_GITHUB_TOKEN` is set
  in Vercel, the founder pastes `/admin/funnel` "Everyone" and "7 days" here.
- `YYYY-MM-DD-reports.md` (optional): open problem and crash reports from
  Owner tools → Player reports → "Copy for the agents", which takes out names,
  contact details, links and ids. The founder reads it before saving it.
- `YYYY-MM-DD-notes.md` (optional): what players said, paraphrased, with no
  names, ages or contact details.

A cloud session sees only what is pushed: files go on the `agent-os` branch.
