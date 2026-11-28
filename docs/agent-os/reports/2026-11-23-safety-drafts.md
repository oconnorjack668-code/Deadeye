Skills: all 5 loaded (safety-reviewer-playbook, security-review, legal:compliance-check, legal:legal-risk-assessment, design:accessibility-review)

# Safety review of this week's drafts, 2026-11-23

Peer review of drafts on `agent-os` (nothing posted or sent). This is research,
not legal advice. Severity: `BLOCK` stops the send or post; `FIX` must be made
before it goes out; `NOTE` is good practice. The drafts were not edited.

## Verdicts

| # | Draft | Verdict |
| --- | --- | --- |
| 1a | Series posts, founder faceless (`marketing/2026-11-23-week.md`) | PASS WITH NOTES |
| 1b | Short list 3, 18 Nov footage (rebounder, surname on shirt) | **BLOCK** until re-cropped or consent is in writing |
| 1c | Day 7 competition line (Sun 29 Nov) | PASS WITH NOTES: one wording fix, and post only once S50 is done |
| 1d | S47 Play Store listing | PASS WITH NOTES: three wording fixes |
| 2 | Friends competition message and follow-up (`outreach/2026-11-23-outreach.md`) | PASS WITH NOTES: three wording fixes before it goes out |
| 3 | Wexford Blazers message (`clubs/2026-11-23-clubs.md`) | PASS WITH NOTES: one wording fix, and a parent copied in |

## Files and what kind they are

| File | Kind | Rules applied |
| --- | --- | --- |
| `docs/agent-os/marketing/2026-11-23-week.md` | copy, surface (posts showing an under-18), message (founder post in the app) | messages, public surfaces, new personal data (footage), ASAI children |
| `docs/agent-os/marketing/2026-11-18-shooting-series.md` (read for the Day 7 caption, line 109, and rules 1, 2, 8) | copy | messages, ASAI 7.7 |
| `docs/agent-os/outreach/2026-11-23-outreach.md` | message to under-18s | messages, parent gate, claims against code |
| `docs/agent-os/clubs/2026-11-23-clubs.md` | message to a club (DSCO, U18 team) | access/who sees what, safeguarding, parent gate |

Parent gate, AI provider and RLS rules: no new feature, data flow to the AI or table in these drafts. Each draft's claims were checked against the code (below).

## 1. Marketing week plan

### 1a. Series posts (founder under 18, faceless): PASS WITH NOTES

The plan keeps the series rules (series file line 22: no face, no school, kit, crest, court name or signage, captions not voice; tester account). Checked and fine: the founder post in the app (week file line 40) has no pressure, countdown or guilt.

- NOTE `marketing/2026-11-23-week.md:16` - "faceless" covers the face but the 18 Nov clip shows a surname on a shirt, so a name or number on clothing identifies the founder too - DPC Fundamentals (child's best interests), BI photo guidelines (no names on images of minors) - for every series shoot: a plain top with no name, number or club kit; location off or stripped; Do Not Disturb on; post after leaving the court (knowledge checklist, "Photos and recordings").
- NOTE `marketing/2026-11-23-week.md:40` - "Free to start" in a post to players who already have the app reads as a nudge toward the paid plan and tells them nothing - ASAI children (no buying prompts) - drop the last two words in the in-app version.

### 1b. Short list 3, 18 Nov footage: BLOCK

- BLOCK `marketing/2026-11-23-week.md:18` and `:34` (also `:47`) - the clip shows a rebounder and the founder's surname on a shirt. The founder's word that the rebounder agreed is not the rebounder's consent, and if the rebounder is under 18 it needs a parent's written consent. The surname on a faceless video of an under-18 founder, plus "built in Ireland", makes him identifiable, and the agents' rule (`docs/agent-os/knowledge/player-outreach.md` line 98) needs a parent's yes before the founder's name appears anywhere - GDPR Art 6 and 8, DPC Fundamentals, Basketball Ireland photo guidelines (written parent consent for images of minors), series rule 2 (series file line 23) - the fix, either one:
  1. Re-crop or re-cut so the rebounder is fully out of frame (not only blurred) and the shirt name is cropped out. Then it passes with the 1a notes.
  2. Or get, in writing (a text or email is enough): the rebounder's own yes, and a parent's yes if the rebounder is under 18; and the founder's parent's yes to the surname being seen. Keep the messages.

  A blur of the rebounder's face is allowed by the 20 Nov rule but is not consent; the body, voice and hall can still identify them.
- FIX `marketing/2026-11-23-week.md:18` - until 1 or 2 is done, the video-editor does not cut this clip. Its method sends stills to the AI provider (STATUS S1 note), which is processing the rebounder's image with no lawful basis yet - GDPR Art 6 - hold the clip until the crop or the consent exists.

### 1c. Day 7 competition line: PASS WITH NOTES

Line under review (series file line 109): "Founding Competition: free to enter, closes 31 Dec, best feedback wins. Details at the link in bio (it opens the competition page)." Free entry, the close date and "judged, not drawn" are right, and there are no prizes and no "25% off" in the post (good: ASAI 7.5(c)).

- FIX `marketing/2026-11-18-shooting-series.md:109` (same line in posts 7 and 8, lines 141 and 151) - two conditions that decide whether a viewer can enter are missing: the parent rule and who can enter (13 and over, Republic of Ireland only; TikTok and Reels reach Northern Ireland and Britain, where the rules do not apply). The line also sits at the end of a long caption, hidden behind "more" - ASAI Children 7.7(c) and (f), knowledge checklist "Prize promos a child can see" - use this, in the first two lines of the caption and on the end card:
  > Founding Competition. Free to enter, ages 13+ in the Republic of Ireland. Under 18s need a parent's OK. Closes 31 Dec. The most useful feedback wins. Details at the link in bio.
- FIX `marketing/2026-11-23-week.md:33` - the series' own rule (series file line 29; STATUS S51) says competition lines go up only once S50 is done. S50 still has three open steps: (1) solicitor, (3) DPIA signed (S1), (5) second judge named. The posts reach many more children than five friends, and the page tells them "two adults" judge - GDPR Art 35 (DPIA before high-risk processing of children's data), ASAI 7.7 - before 29 Nov, at least name the second judge and sign the DPIA; the solicitor is the founder's call. If not done, post 4 goes up without the line (nothing else changes).

### 1d. S47 Play Store listing: PASS WITH NOTES

Checked true in the code: "players under 16 need a parent or guardian to approve their account" (`src/lib/parentApproval.ts` `ageGate`: under 16 and not approved means `needs-parent`); "For players aged 13+"; Free has a monthly AI allowance and Pro does not (`src/lib/plans.ts` lines 66, 89); coaching up to 10 teams (`plans.ts` line 73); 168 drills (`DRILL_COUNT`); no chat between players. The Pro text has no price, no urgency, no "only" and no "you'll fall behind" (ASAI children: fine).

- FIX `marketing/2026-11-23-week.md:89` - "Shot tracking runs on your phone" sits under CHECK YOUR FORM, so it reads as a promise about all video. It is true for tracking and for form check (`FormCheck.tsx` saves only a numbers summary to `video_analyses`, line 153; no upload), but a player can upload a clip to ask a coach (`film-questions/AskClient.tsx` line 72, `storage.from('videos')`) and the Data safety form lists uploaded videos - GDPR Art 12 and 13 (clear, true information), knowledge checklist "Outreach drafts tell the truth" - replace with: "Shot tracking and form check run on your phone. Video is uploaded only if you choose to send a clip to your coach."
- FIX `marketing/2026-11-23-week.md:109` - a 13-year-old reading the Pro sentence is not told a parent pays. The app's own Pro page already says it (`src/app/(app)/pro/page.tsx` line 153) - ASAI Children 7.5 (no direct appeal to children to buy) - add after the Pro sentence: "Under 18? Talk to a parent or guardian before buying Pro."
- FIX `marketing/2026-11-23-week.md:109` - "AI coaching with no monthly allowance": Pro has a daily fair-use cap (#156), so this can read as unlimited - ASAI (no misleading claims), knowledge checklist "Promo and upsell copy" - say "AI coaching with no monthly allowance (a daily fair-use limit applies)".
- NOTE - Play Console: declare the target audience as 13-15, 16-17 and 18+, never under 13, and keep the imagery free of anything that appeals to younger children. Google says listing imagery and words affect how it judges the audience, and wrong answers can get the app removed ([Google Play Families policy](https://support.google.com/googleplay/android-developer/answer/9893335), read 2026-11-23). The Data safety form must say the same as the listing (uploaded clips, AI provider).
- NOTE (outside these drafts, for S3) - `src/app/api/billing/checkout/route.ts` starts a Stripe checkout for any signed-in player, with no age step; the rules (section 8) and the Pro page say a player under 18 needs a parent to buy. Before billing goes live in January, the builder should add a parent step or confirmation for under-18 accounts. FIX SOON, not a block today (billing is off).
- NOTE - describing Pro in a Play listing whose Play build has no way to buy it may raise a Play payments question. That is a platform matter for release-checker, not child safety.

## 2. Friends competition message: PASS WITH NOTES

One to one, to people the founder knows, 13 and over, Republic of Ireland; free entry, close date, parent rule and rules link all present; no prizes, no "25% off", no "tell your friends", no countdown; follow-up once and then stop. Checked in the code: a hand-typed session counts (`src/lib/competition-server.ts` line 70 counts any `training_sessions` row; the manual logger writes one, `basketball/new/page.tsx` line 287); the page says "Two adults pick" (`src/app/competition/page.tsx` line 142). The follow-up (line 42) passes as written.

- FIX `outreach/2026-11-23-outreach.md:31` - "Then press Enter and tell me one thing you liked" tells a child their feedback goes to the founder. The rules (`docs/sales/founding-competition-rules.md` line 102) and the privacy page (`src/app/privacy/page.tsx` lines 139-140) say the two judges read entries with names hidden, and the founder is not a judge - GDPR Art 5(1)(a) and 13, knowledge checklist "Rules a child agrees to match who reads the data" - change to: "Then press Enter and write one thing you liked and one thing you'd change."
- FIX `outreach/2026-11-23-outreach.md:35` - a 13 to 15 year old meets the account approval before they can log a session, and the message only mentions the entry email, so they may stop at the gate without knowing why - GDPR Art 12 (plain words for a child), DPA 2018 s31 - change to: "If you're under 16, a parent or guardian approves your account first. If you're under 18, they also get an email to OK your entry, and it only counts once they do. Closes 31 December. Full rules are on that page."
- FIX `outreach/2026-11-23-outreach.md:44` - the parent message reads as if the entry email is only for under-16s; parents of 16 and 17 year olds get it too (rules section 9) - GDPR Art 12 - change to: "If they're under 16 you'll get a link to approve their account. If they're under 18 you'll also get an email to approve their entry."
- NOTE - the founder's friends are judged by the founder's parent. Names are hidden, but to keep it fair the founder does not tell the judges who he messaged, and the second judge is named before judging (S50 step 5) - ASAI sales promotions (fair running of a promotion).

## 3. Wexford Blazers message: PASS WITH NOTES

U18 team (13 and over, fine); head coach 18+ who declares vetting (true: `coach/setup/page.tsx` line 118; the message does not say Deadeye checks it); under-16s need a parent's approval (true); no offer or money in the message; a plain "not now". The DSCO gets the full facts before any team starts (16 Nov clubs file, line 33, which names teammates' view and film questions).

- FIX `clubs/2026-11-23-clubs.md:27` - "There are no private messages, coaches post to the whole team" leaves out the one exception the DSCO facts name: a player can send a head coach a clip with a question and gets a written answer to that player, and a parent of a 16 or 17 year old does not see it (`supabase/migrations/00035_film_questions.sql`; 16 Nov lesson). A Children's Officer reading the first message would take it as no one-to-one channel at all - Basketball Ireland policy for coaches of minors, knowledge checklist "Who sees what, per role" - change to: "There's no chat: coaches post to the whole team. The one exception, a player asking the head coaches about a clip of themselves, is in the summary."
- FIX `clubs/2026-11-23-clubs.md:27` - the founder is under 18 and is writing to adults at a club and offering to come to a training night - agents' rule for the under-18 founder (`docs/agent-os/knowledge/player-outreach.md` line 98: a parent copied on any email to an organisation), BI safeguarding (groups that include other adults) - copy a parent into the email, and a parent or another adult goes with the founder to the training night.
- NOTE `clubs/2026-11-23-clubs.md:27` - "players join with a QR code on the spot": under-16s join but cannot use the app until a parent approves. The trial plan already covers this (16 Nov line 28); say it at the training night so nobody is surprised.

## Found while checking (live, outside these drafts): FIX SOON

- `src/app/(app)/admin/competition/page.tsx` lines 104 and 125 - the owner page shows every entry's feedback, and names on request, to the owner account (the one the founder uses for Owner tools). The rules (line 102) and the privacy page (lines 139-140) say the two judges read entries with names hidden. Either only the promoter and the second judge open this page, or the rules and privacy page say "the Deadeye team also reads feedback to improve the app" - GDPR Art 5(1)(a) and 13 - founder decides which; builder changes the wording. I passed this on 18 Nov without checking who opens the owner page (lesson added).

## Data map (new or changed personal data in these drafts)

| Data | About | Why | Lawful basis | Stored | Who reads | Sent to | Export / deletion | Kept |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 18 Nov clip: rebounder's image and body | rebounder (age unknown) | promo post | consent, **not yet obtained in writing** (finding 1b) | founder's phone and the "Deadeye shooting videos" folder; stills in video-editor sessions | founder, video-editor | AI provider via stills, if cut (held until consent) | not app data; delete the raw clip if not used | **blank: decide** (suggest delete within 30 days if not posted) |
| 18 Nov clip: surname on shirt | founder (under 18) | none needed | parent's yes needed (finding 1b) | as above | as above | as above | crop it out | n/a once cropped |
| Friends' names and numbers | founder's friends (13+) | one-to-one message | none needed by Deadeye (founder's own contacts) | founder's phone only | founder | nothing | only counts reach the repo (outreach line 44) | not held by Deadeye |
| Competition entries, parent emails | entrants, parents | competition | existing (18 Nov review, DPIA R14) | `competition_entries` (00067, RLS on) | judges; owner page (see FIX SOON) | Resend (parent email) | export and deletion in place; daily retention job | to 30 Sep 2027 |

## What I did not check

- I did not see the 18 Nov footage (not in the repo) or know the rebounder's age; the verdict rests on the STATUS S48 note and the draft.
- I did not open the live `/competition` page or the live app (no browser for this role); claims were read from the code on `agent-os`.
- Play Console target-audience and Data safety answers are not in the repo; not checked.
- Whether the video-editor has already taken stills from the 18 Nov clip: not checked.
- S50 and S1 status taken from main's `docs/STATUS.md` (fetched today), not confirmed with the founder.
- No migration in these drafts, so the Supabase security advisors were not run. The security-review skill found nothing: these are text drafts with no code.
- Accessibility: no screen in these drafts; the listing text is plain and short (no emoji), nothing to flag.

## Self-check (knowledge file checklist)

Ticked: private by default (no new surface), no new way for strangers to reach a player (one to one, known people only), contact details never shown, 13 and over everywhere we pitch, offers and prizes through a parent (no 25% in player messages), prize promo conditions in the main text (finding 1c), rules match who reads the data (finding 2 and FIX SOON), who sees what per role (finding 3), photos and recordings for posts (findings 1a, 1b), outreach drafts tell the truth (findings 1d, 2), promo and upsell copy (finding 1d), DPIA named (finding 1c). Not applicable: RLS, AI coach, push, events, export (no code).
