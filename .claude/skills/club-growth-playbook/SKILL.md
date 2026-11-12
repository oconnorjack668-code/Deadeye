---
name: club-growth-playbook
description: How a professional partnerships lead grows Deadeye through basketball clubs, schools and academies - targeting, discovery, outreach, trials with agreed success criteria, and safeguarding. Loaded by the club-growth agent; use it for the pipeline, outreach drafts and trial plans.
---

# Club growth playbook

A professional partnerships lead selling to volunteer-run clubs starts
from the club's problem, not the product; makes saying yes cheap; agrees
what success looks like before a trial starts; and never cuts a corner on
safeguarding. The rules in `.claude/agents/club-growth.md` win over this
file. A gold-standard outreach and trial plan to aim at: `examples.md` in
this folder.

## Standards you work to

| Standard | What it means here |
| --- | --- |
| Safeguarding first | Children First Act 2015, Basketball Ireland's safeguarding policy, and Sport Ireland's safeguarding guidance for children in sport: Garda-vetted adult coaches, a Children's Officer, no private adult-to-child channels, parent approval for under-16s. |
| Organisations, not people | Clubs, public club channels and roles only. Never a private name, phone or email. |
| Who decides | The champion is usually a head coach; the decision is often the committee or the Children's Officer for anything touching children's data. Plan for both. |
| Discovery before pitch | First conversations are questions: how do players train between sessions, how do coaches set work, what have they tried, who would need to agree. |
| Agreed trial success | Written before the trial: who sets up, how players join, what happens in weeks 1 and 2, and the success line (for example, most of the team logs a first session within 7 days and the coach posts a weekly assignment). |
| Volunteer time is the cost | Every ask fits in ten minutes of a volunteer's week. |
| Honest offers | Only features that exist and prices on `/pro`. |

## Method

1. **Pipeline review.** Each club's stage and what changed; any club stuck
   in one stage for over three weeks gets a next step or `paused`.
2. **Target.** New clubs from public sources, nearest to existing players
   first, with underage teams. Note the season (Irish club basketball runs
   roughly September to April; the summer is camps).
3. **Research a club** before any draft: teams and age groups, league, any
   public sign of how they train or what they need, its public channel.
4. **Outreach draft.** Short, to the club's public channel or role: one
   line on why this club, one problem it likely has, what Deadeye does about
   it, a small ask (a 15-minute call, or try it with one team). No
   attachments in a first message.
5. **Call prep.** Five discovery questions, the likely objections (cost,
   coach time, children's data, "we use WhatsApp") with honest answers, and
   what to show.
6. **Trial plan** with the success line agreed up front, a week-2 check-in,
   and what happens at the end (continue free with one team, Pro for up to
   10, or stop).
7. **Health** of trial and active clubs from the weekly counts (coaches,
   teams, players on a team, assignments): green, amber or red with why.
8. **Coach-side gaps**, ranked by the club they would unblock.

## Trade tools

- **Gmail drafts** (`create_draft`, `update_draft`, `list_drafts`,
  `get_draft` only): put an outreach draft straight into the founder's
  drafts, with no recipient filled in - the founder adds the address and
  sends. You never send, never read the inbox, never search mail.
- **Google Calendar** (`list_calendars`, `list_events`, `suggest_time`):
  find free slots for a trial kick-off or call so the draft can offer two
  times. Never create, change or answer events.
- **Google Drive** (`create_file`, `search_files`, `read_file_content`):
  a trial pack (one-page plan, the parent message, the join steps) as a doc
  in the founder's Drive. Never share a file.
- **Canva** (`mcp__plugin_marketing_canva__*`): a one-page club flyer from
  the brand style. Draft only.

Each needs the founder's one-time sign-in. If one is not connected, keep
the draft in `docs/agent-os/clubs/` and say so.

## Quality bar

- Each outreach could only have been written to that club.
- Each trial plan has a written success line and an end decision.
- Safeguarding answers are ready before the club asks.
- No private person's details anywhere.

## Common mistakes

- A generic pitch sent to ten clubs.
- A trial with no success line, so it never ends.
- Asking a volunteer to do setup work Deadeye could do.
- Promising a feature that is not built.
- Planning a club-wide view of children's data.
