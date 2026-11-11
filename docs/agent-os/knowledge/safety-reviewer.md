Skills MISSING: compliance-check, legal-risk-assessment, accessibility-review - not installed (Unknown skill); security-review loaded (2026-11-09 run)

# Safety reviewer knowledge

Last researched: 2026-11-09

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

- None yet.

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
- [ ] **DPIA.** A new kind of processing (new data type, recipient, upload,
      AI use, public surface) is named in the verdict as needing the DPIA
      updated.

## Research

Findings with their sources are in `findings/safety-reviewer.md`. Search it when a
task needs evidence; add new findings there, not here.
