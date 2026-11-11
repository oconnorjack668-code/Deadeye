# Agent knowledge

Each agent keeps one file here: what it has learned about doing its job well
for Deadeye. The agent reads its file before every task and adds to it after.
The founder asked for this on 2026-11-07, after a promo video needed many
rounds of small fixes: agents should learn from research and from the
founder's corrections, so the same mistake is not made twice.

| File | Agent | Field |
| --- | --- | --- |
| `marketing.md` | marketing | Sports and basketball ads, short video, social, youth audiences |
| `video-editor.md` | video-editor | Short-form and sports video editing, sports advertising, sound, platform specs (long technique notes in `../video/playbook.md`) |
| `club-growth.md` | club-growth | Selling to clubs and volunteer coaches, trials, youth sport in Ireland |
| `activation-analyst.md` | activation-analyst | Onboarding and activation in consumer, fitness and sports apps |
| `support-triage.md` | support-triage | Triage, crash grouping, browser and phone failure patterns |
| `builder.md` | builder | Next.js, React, Supabase, testing, PWA and camera on phones |
| `safety-reviewer.md` | safety-reviewer | Children's data and safety: GDPR, Irish DPC, age-appropriate design |
| `release-checker.md` | release-checker | Release checks, migrations, rollbacks, Vercel and Supabase |

## What each file holds

1. **Lessons from the founder.** Every correction the founder makes, written
   as a rule: what went wrong, the rule that prevents it, the date. Newest
   first. These win over research: the founder knows the audience.
2. **Checklist.** The checks the agent runs on its own work before the
   founder sees it, built from the lessons and the research. Done means every
   box is ticked or a failed box is named in the reply.
3. **What the research says.** Findings that change what the agent does,
   each with its source link, the year, how strong the evidence is, and one
   line on what it means for Deadeye.
4. **Open questions.** What the agent still does not know and would research
   next.

Keep each file under 200 lines. When a better source replaces a weaker one,
replace the old line rather than adding beside it.

## Sources

Best first:

1. Peer-reviewed studies and meta-analyses (Google Scholar, PubMed, journals).
2. Official guidance from the platform or regulator: TikTok Creative Center
   and TikTok for Business, Meta for Business, Google and Apple developer
   docs, the Data Protection Commission, ASAI, Coimisiún na Meán, Basketball
   Ireland, Sport Ireland.
3. Large industry studies with a stated method and sample (Nielsen, Kantar,
   Ipsos, platform-commissioned research).
4. Practitioner write-ups and case studies: useful for ideas, weak as proof.
   Mark them `practitioner`.

Never treat a single blog post, a "top 10 tips" list or an AI-written page as
evidence. Note the sample size and the year; advice about social platforms
older than about two years is marked `dated`. Write findings in your own
words with a link; never copy an article or someone's creative work.

## When an agent learns

- **Every task:** read your file first. Run its checklist before showing the
  founder anything.
- **Every correction:** when the founder changes, rejects or fixes your work,
  add a lesson before you finish, and a checklist line if one would have
  caught it.
- **Every month, or new ground:** if `Last researched` is more than 30 days
  old, or the task is a kind you have no findings for, research first (aim
  for 5 to 10 good sources) and update the file.

The privacy rules in `docs/agent-os/README.md` still apply: no player names,
quotes that could identify a player, or per-player data in these files.
