Skills: all 5 loaded (2026-11-23 E6 re-review at 7d4ab59; earlier today: drafts review)

# Safety reviewer knowledge

Last researched: 2026-11-23 (Google Play Families policy and target audience, for the S47 listing); 2026-11-18 (competitions and prizes for children, Play review rule, Art 14 notices); 2026-11-16 (EDPB 2/2023 on browser-sent events; press and children, ASAI free offers); 2026-11-13 (attribution links, ePrivacy, small numbers)

Read `README.md` in this folder for how this file works. This is research,
not legal advice: lines marked **(legal advice)** need a solicitor before the
founder relies on them. Strength: `law`, `regulator` (decision or official
guidance from the body that enforces it), `benchmark` (official but not
binding on Deadeye), `study`, `practitioner`.

## Lessons from the founder

None yet.

## Lessons from results

What the outcome of earlier work taught (see "Results review" in the agent
file). Newest first, each with the date, what happened, and the rule.

- 2026-11-23 · E6 re-review. The clause I approved on 16 Nov said "playing
  the sample clip" for two events (`sample_played`, `sample_finished`) and
  "saving a play you drew" for `play_drawn`, which also fires for a copied-in
  play. My DPIA R8 condition from 16 Nov was still not done a week later.
  Rule: for every `EVENT_NAMES` entry, write one line pairing it with the
  clause words that cover it, read from the place in the code that fires it.
  On a re-review, check each condition I set earlier.
- 2026-11-23 · Drafts review. My 18 Nov competition pass checked the rules
  against the code but not who opens the owner page: `/admin/competition`
  shows every entry's feedback (names on request) to the owner account the
  founder uses, while the rules and privacy page say the two judges read it
  with names hidden. The friends draft then said "tell me" what you liked.
  Rule: for any "read only by X" line, list every screen and account that
  shows the data (owner pages included) and who signs in to it.
- 2026-11-16 · E6 review. (1) I passed F2 and F3 (plays and film, 13-14
  Nov) although they added five `EVENT_NAMES` that the privacy page's closed
  list of app steps never named. The builder found it building E6 (S45).
  (2) My E3 verdict (25 Oct) said "the repo must stay private". The repo is
  public (GitHub API, 16 Nov), so the 1-to-4 counts in the funnel step rows
  were published for three weeks; PR #97 grouped only the route table. Rule:
  any change to `EVENT_NAMES` is checked against the privacy clause name by
  name. A condition I set is checked as a fact today, and if it is false it
  becomes a finding with a fix, not a note.
- 2026-11-16 · Focus Finder (PR #103) and the FDYS draft (PR #97 O1) came
  back in the drafts review. (1) I passed "Send to team" without asking what a
  Free player meets when they open it: the list can hold IQ lessons in a Pro
  section, and `study/[id]/layout.tsx` has no coach-set exception (plays and
  film do), so a child can hit a paywall on work their coach set. (2) My O1
  fix, "videos stay on the phone unless the player uploads one to ask a
  coach", left out uploads kept to watch back. Rule: for anything a coach can
  set, open it as a Free player on that team; for any "stays on the phone"
  line, list every upload path in code (`storage.from(`) first.
- 2026-11-16 · Clubs draft: the DSCO facts said teammates see nothing, while
  `team_roster` (00034) gives every member each teammate's weekly totals,
  shots and game averages, and film questions are a written coach answer to
  one player. Rule: club and DSCO wording is checked against the RPCs and RLS
  (what a head coach, assistant, teammate and parent each get), not against
  the feature's own notes.
- 2026-11-11 · Routine import re-review: I asked for import-count rows to be
  "deleted before last month" without saying when. The builder deleted them on
  the player's next import, so a player who stops importing keeps them for
  ever while the policy says "up to two months". Rule: when I ask for a
  retention, I say it must run on a schedule (the daily housekeeping in
  `src/app/api/cron/reminders/route.ts`), not on the player's next use.

## Checklist (every branch, beside the rules in the agent file)

- [ ] **Private by default.** Anything new another person can see (profile,
      photo, stats, clip, share card, leaderboard row) starts hidden or
      friends-only; the player switches it on. Nothing new is public by default.
- [ ] **No new way for strangers to reach a player.** No suggestions of people
      outside the player's network, no search by name, no open comments, no
      adult-to-child one-to-one messages. Coach to player stays one-to-team.
- [ ] **Contact details never shown.** Email, phone, school, town, date of
      birth never reach another user's screen or a share card, even as the
      price of unlocking a feature.
- [ ] **Location.** No geolocation; region or country only if the player chose
      it, never next to a name on a public surface.
- [ ] **Minimal data.** Each new field or event is needed ("would it work
      without this?"); events carry no free text, names or device details.
- [ ] **Video and photos.** Raw video stays on the device unless the feature
      needs it uploaded; no face recognition or anything that singles a
      person out (biometric data). Photos moderated, friends-only by default.
- [ ] **Parent gate.** Under-16s reach the feature only after parent approval.
- [ ] **No profiling for marketing.** A child's data never targets offers or
      upsells. Marketing email or push to an under-16 needs parent consent.
- [ ] **No engagement pressure.** No new streak-loss warnings, countdowns,
      guilt or reward loops fed by the child's data; push is opt-in and easy
      to turn off. Nudges toward privacy are fine; a big "share" button over a
      small "keep private" fails.
- [ ] **AI coach.** Clearly an AI; can be switched off; sends only what the
      privacy policy names (`src/lib/ai/context.ts`); keeps `COACH_SAFETY` in
      every prompt (`src/lib/ai/persona.ts`); AI text shown outside the AI
      Coach screen says it is AI.
- [ ] **Push and prompts.** Permission is asked only after a tap, never on
      load; the card says what will be sent and when; what a tap saves is
      shown to the player ("Saved"); a marker counts what really happened,
      and the privacy clause names every action that fires it.
- [ ] **Plain words.** New data use is explained where it happens, for a
      13-year-old, including why a setting is off for them.
- [ ] **Promo and upsell copy** (ASAI): no pester power, no "only/just" on a
      price, no "left behind", no results an ordinary player cannot reach.
- [ ] **Parent page in step.** Any new data sent to a processor (AI, email,
      storage) is named in `src/app/parents/WhatParentsAgreeTo.tsx` as well
      as the privacy policy, and every switch that page promises (AI off in
      Settings) still stops the new feature. Under-16 consent covers only what
      the parent was told.
- [ ] **"Not kept" is true at the processor too**, and every short notice
      (parent page, screen line) carries the policy's exceptions ("deleted by
      <processor> within 30 days, longer only if flagged"); re-check if an env
      var can switch the model or provider.
- [ ] **Uploads that can show other people** get a line at the point of
      upload (crop out names, faces, numbers); the AI is told not to copy them;
      the player can remove anything read before it is saved.
- [ ] **AI that reads player content** (prompt injection, OWASP LLM01): no
      tools, nothing else in the context, output validated and shown only to
      the same player, who checks it before it is saved.
- [ ] **Counters and logs have a retention, run by a schedule.** A row kept
      only to count a monthly limit is deleted when it no longer counts by the
      daily housekeeping job (not only on the player's next use, which never
      comes for players who leave), and the policy's "kept for up to X" is true
      for a player who never comes back.
- [ ] **The repo is public.** Anything a cron or agent commits (weekly counts,
      data notes, reports) is world-readable and stays in git history after an
      account is deleted. A value that came from a user (URL parameter,
      user_metadata, form text) reaches a committed file only if it matches a
      fixed list in code; any count under 5 is grouped ("smaller routes").
      The under-5 rule covers every column of a public table, weekly columns
      included, not only the totals (PR #97 re-review, N1).
- [ ] **Outreach drafts tell the truth about the app.** What a draft says
      (video stays on the phone, nothing collected, parent approval) is checked
      against the code and the privacy page before it passes (PR #97 re-review,
      O1: the FDYS draft missed coach uploads).
- [ ] **Every app step is named.** A branch that adds to `EVENT_NAMES`
      (`src/lib/events.ts`) names each new step in plain words in the privacy
      clause "A few steps you reach in the app", and the clause still matches
      its own "no page tracking" style promises (E6, S45). On every clause
      change, write one line per name with the clause words that cover it,
      read from the place in the code that fires it (E6 re-review:
      `sample_finished`, copied-in plays).
- [ ] **Public counts, every table and every week.** Under-5 check on every
      table `src/lib/agentCounts.ts` writes, and on the change between two
      published files (subtraction); check visibility with `gh api
      repos/<owner>/<repo>`, never a note (E6, PR #97).
- [ ] **Retention jobs report their failures** (log or return what they
      could not do), so a "cleared after X" promise cannot quietly lapse.
- [ ] **user_metadata is the player's to write** (sign-up, `auth.updateUser`):
      never trusted for access, publishing or where a player came from.
- [ ] **Tracking links are in ePrivacy too** (EDPB 2/2023 paras 49-51: a
      source code in a URL is Art 5(3), like a cookie). Ask the player on the
      form rather than reading a code from the link.
- [ ] **Auth metadata in the export.** Anything saved in user_metadata or
      app_metadata is added to the `account` block of the export route.
- [ ] **Coach-set work opens for every player on the team.** Anything a
      coach can set (assignment, Focus list, play, film, IQ lesson) opens for a
      Free player on that team, or the coach cannot set it. A child never meets
      "part of Pro" on homework their coach set (ASAI children, pester power).
- [ ] **Who sees what, per role.** Any text for a club, DSCO, parent or
      player saying who can see a child's data names all five: head coach,
      assistant, teammate, parent of an under-16, parent of a 16-17 year old,
      checked against `team_roster`, `film_questions` and the plays RLS.
- [ ] **13 and over, everywhere we pitch.** No club email, trial plan or post
      aimed at a team or group mostly under 13 (U13 and younger); an U14 team
      gets the "anyone still 12 waits" line.
- [ ] **Photos and recordings for posts.** Location off or stripped; no
      distinctive court, school or club kit, and no name or number on clothing
      (the 18 Nov clip had the founder's surname); posted after leaving; Do Not
      Disturb on; Free, non-owner account. Anyone else in frame is cropped out
      or gives written consent (a parent's if under 18) before the clip is cut,
      since cutting sends stills to the AI provider (2026-11-23).
- [ ] **DPIA.** A new kind of processing (new data type, recipient, upload,
      AI use, public surface) is named in the verdict as needing the DPIA
      updated.
- [ ] **The support line never depends on the AI succeeding**: shown from
      the player's text in the browser (`needsSupportLine`, `src/lib/ai/safety.ts`)
      or on the error path too (Focus Finder, PR #103).
- [ ] **Stored AI input.** No reader, no storing (free text above all); if
      stored, the policy names it (Focus Finder, PR #103).
- [ ] **Merge is launch.** Main deploys to production. A feature whose own
      notes list checks "before launch" (solicitor, promoter named, DPIA,
      billing) has a switch that is off by default, or the merge waits. Look
      for in-app links to it (dashboard, Settings) as well as the page.
- [ ] **Emails to someone a child named.** A parent or other adult whose
      address came from a child gets, in the first email: who we are, that
      the child gave us the address, how long it is kept, a privacy link, and
      what to do if they are not the parent (GDPR Art 14).
- [ ] **Rules a child agrees to match who reads the data.** Competition or
      offer terms are read line by line against the code and the process
      (a second judge is a recipient; "read by the promoter only" is then false).
- [ ] **Offers and prizes for under-18s go through a parent.** Discount or
      prize emails and winner contact go to the approving parent; posts aimed
      at players carry no discount line (ASAI 7.5(c), 7.7).
- [ ] **Prize promos a child can see** (homepage, posts, cards): prizes may
      be shown, but the closing date and the parent rule sit in the main text,
      not small print (ASAI 7.7(c), (f)); the entry steps are stated; a
      headline says how many win ("10 players win"), not "Win"; "for life" or
      similar is qualified as the rules define it (7.7(g)); shown only while
      `entriesOpen()` (homepage card review, 2026-11-18). Posts also carry who
      can enter (13+, Republic of Ireland; TikTok reaches NI and Britain) in
      the first caption lines or end card, never after "more" (2026-11-23).
- [ ] **The founder is under 18.** Any draft where he writes to an
      organisation or meets a club copies in a parent, and an adult goes with
      him; his name never appears without a parent's yes (2026-11-23).

## Research

Findings with their sources are in `findings/safety-reviewer.md`. Search it when a
task needs evidence; add new findings there, not here.
