# Data Protection Impact Assessment (DPIA): Deadeye

**Status: DRAFT, 2026-11-07; Film and Plays rows, YouTube as a recipient,
R12 and R13 added 2026-11-14 (founder asked; read them before signing).**
Written by Claude from the code, the privacy
policy (`src/app/privacy/page.tsx`) and `docs/agent-os/knowledge/safety-reviewer.md`.
Not legal advice. It becomes the record once the founder and the adult who holds
the accounts (the controller, `LEGAL_NAME`) have read it, corrected it and signed
section 7. Review it every 6 months, and before any feature that adds a new kind
of personal data, a new audience or a new processor.

Why one is needed: the Data Protection Commission (DPC) lists large-scale or
systematic processing of children's data among the kinds that require a DPIA,
and its *Fundamentals for a Child-Oriented Approach to Data Processing* (2021)
expect one from any service directed at or likely to be used by children.
Deadeye is for players from 13, so most users are under 18.

## 1. What Deadeye does with personal data

| Data | Whose | Why | Legal basis | Kept |
| --- | --- | --- | --- | --- |
| Email, display name | Every player | Account, sign-in | Contract | Until the account is deleted |
| Age answer (16+ or not), age bracket | Every player | Parent approval under 16; age-appropriate defaults | Legal obligation (DPA 2018 s.31), contract | Account life |
| Parent name, email, approval times | Parents of 13-15s | Consent for the child | Consent (parent) | Account life |
| Profile: height, position, hand, level, goals | Player | Coaching, AI feedback | Contract | Account life |
| Training logs, shots, drills, workouts, tests, quiz scores | Player | The core service | Contract | Account life |
| Videos (only if uploaded), analysis numbers | Player | Video feedback | Contract | Account life |
| Routine import: pasted text or screenshot (passes through, not stored by Deadeye); import count (date, text or picture); imported programs, reps targets and notes | Player; anyone named or shown in the text or picture | Bring routines from other apps; count the free monthly allowance | Contract; parent consent for 13-15s | Text/picture: not stored by Deadeye, deleted by the AI provider within 30 days (up to 2 years if flagged for misuse). Count: up to 2 months. Programs: account life |
| Profile photo (optional) | Player; parent approves under 16 | Avatar | Consent | Account life |
| Saved hoops, tracker accuracy data, phone type | Player | Tracker | Contract; legitimate interest (accuracy, aggregate only) | Account life |
| AI coach chat and reports | Player | Coaching | Contract | Until cleared or account deleted |
| Friends, teams, coach posts, leaderboard (opt-in public) | Player, coach | Social and team features | Contract; consent for public leaderboard | Account life |
| Reminder settings, push address | Player | Reminders | Consent (switched on by the player) | Until switched off |
| Plan, founding offer dates, billing status | Player | Pro | Contract; legal obligation for payment records | Account life; Stripe keeps payment records |
| Crash reports, problem reports, app steps | Player | Fixing bugs, finding where new players stall | Legitimate interest | 90 days |
| Plays: saved plays (`play_saves`), play quiz attempts (score and the spots picked, `play_quiz_attempts`) | Player | Learning plays (IQ tab) | Contract | Account life. A head coach sees done and score for plays set for their team, never the spots picked, until 90 days after the due date |
| Coach plays and team playbooks (`plays` with an owner, `team_playbook`) | Coach | Drawing plays and sharing them with a team; players shown by number only, never by name | Contract | Until the coach deletes them or the account |
| Film: saved clips (`film_saves`), private notes on a clip (`film_notes`, free text up to 500 characters, only the player can read them), film attempts (score and answers, `film_attempts`) | Player | Learning to read the game from film (IQ tab) | Contract | Account life. A head coach sees done and score for film set for their team, never the answers or notes, until 90 days after the due date |
| Coach film packs (`film_packs` with an owner) | Coach | Grouping library clips to set for a team | Contract | Until the coach deletes them or the account |

Processors: Supabase (database, files), Vercel (hosting), Anthropic (AI coach:
receives profile and training numbers, never name, email, photo or video;
routine import: receives only the pasted text or screenshot, with no account
details; deletes API data within 30 days),
Stripe (payments), Resend or Gmail SMTP (email). Check each one's data
processing terms and where it stores data (EU or with transfer safeguards).

Other recipients (not processors): YouTube (Google) plays lesson, drill,
exercise and film videos. Nothing loads from YouTube or Google until the
player taps play on a video (`TapToLoadYouTube`, since F0). After the tap,
YouTube receives the IP address and device and browser details, the YouTube
IFrame API script loads from youtube.com for film clips, YouTube may store data
on the device (even in youtube-nocookie mode), and it can link what is watched
to a signed-in Google account. Deadeye sends YouTube no account details. Named
on the privacy page under "Cookies and videos" with a link to Google's privacy
policy. Videos are embedded from official channels that allow embedding (the
owner tool checks oEmbed); none is downloaded or hosted by Deadeye, and no
video is part of Pro (YouTube Developer Policies III.F.3.a).

Not done: no ads, no selling data, no third-party analytics or tracking, no
location data, no profiling for marketing, no direct messages between users.

## 2. Is it necessary and proportionate?

- Each item in section 1 serves a feature the player uses; the app works
  without the optional ones (photo, upload, public leaderboard, reminders).
- Video analysis and "Find the hoop" run on the phone; nothing is uploaded
  unless the player chooses to save a video.
- The AI provider gets the minimum for coaching (no name since 2026-11-07).
- Routine import sends only the text or picture the player chooses, shrunk on
  the phone (location data removed), with no account id. CSV import never
  leaves the phone. It stops when AI coaching is switched off.
- Retention: everything goes with the account; diagnostics after 90 days;
  unapproved under-16 accounts after 30 days.

## 3. Risks to players, and what reduces them

Likelihood and severity: low, medium, high. Residual is after the measures.

| # | Risk | Likelihood | Severity | Measures in place | Residual |
| --- | --- | --- | --- | --- | --- |
| R1 | One player sees or changes another player's data | Low | High | Row-level security on every table; write rules check the signed-in player; a test (`__tests__/rls-rules.test.ts`) fails the build if a rule slips | Low |
| R2 | A child's profile or photo is seen by strangers | Low | High | Profiles private by default (`is_public` false); photos friends-only by default; under-16 photos need a parent; leaderboard public only by choice | Low |
| R3 | An adult contacts a child through the app | Low | High | No private messages; coaches post to a whole team; coaches declare Garda vetting; teams joined by code; matches Basketball Ireland's 2025 rule against coach-minor direct messages | Low |
| R4 | A 13-15 year old uses the app without a parent knowing | Medium | Medium | Age asked at sign-up; under-16s locked until a parent approves by link; deleted after 30 days unapproved. Age is self-declared and the parent email is not verified | Medium |
| R5 | The AI coach gives harmful advice (injury, diet, distress) | Medium | High | Safety rules in every AI prompt (`persona.ts`); a check that adds Childline, Text 50808, Samaritans and 112/999 under any reply to a message about self-harm, distress or abuse (`src/lib/ai/safety.ts`); players can switch AI off | Low-medium |
| R6 | Engagement pressure on children (streaks, reminders) | Medium | Medium | Reminders off until the player turns them on; the "streak ends tonight" warning off by default for under-18s (00057); streak freezes; no leaderboard shaming copy | Low |
| R7 | Data breach at a processor | Low | High | Reputable EU-capable processors; keys only in Vercel; service key never on previews | Low-medium |
| R8 | Personal data in diagnostics or agent files | Low | Medium | Crash and problem reports kept 90 days; agents work from counts only; funnel steps first-party, once a day | Low |
| R9 | Video of players (faces, other children in shot) | Medium | Medium | Analysis on the phone; upload optional; videos never sent to the AI provider. No consent step for other people in shot | Medium |
| R10 | Marketing reaches or targets children unfairly | Medium | Medium | Marketing agent rules: no identifiable under-18s without written parent consent, ASAI code, no pressure, no money talk to under-16s | Low |
| R11 | A screenshot or pasted message carries other people's details (names, faces, phone numbers, other children) or the player's own to the AI provider | Medium | Low-medium | Sent only when the player chooses; shrunk on the phone; no account id; not stored by Deadeye; provider deletes within 30 days; a line on the screen asks players to crop out names and faces; the model is told not to copy names or numbers; stops when AI is off | Low |
| R12 | A third-party video player (YouTube) tracks a child's viewing | Medium | Medium | Nothing loads from YouTube or Google before a tap, and the card says "This plays from YouTube; YouTube sees that you watched it"; youtube-nocookie; no likes, subscribes or other YouTube actions; official channels only; named on the privacy page and the parents page; the rest of a lesson or drill works without playing the video. YouTube still receives IP and device details after the tap | Low-medium |
| R13 | Coaches monitor players too closely, or players feel pressured by film and play homework | Medium | Medium | Only head coaches (18+, not assistants) see results, and only done and score for film or plays they set, until 90 days after the due date; never the answers, the spots picked or private notes; teammates see nothing; no leaderboards or share cards for scores; a line on screen tells the player what the coach sees; no overdue pushes and no copy naming who has not done it; no comments or free-text coach feedback (that waits for C4 and parent visibility) | Low |

## 4. Open actions

1. **R4, parent check (legal advice):** decide whether the email link is enough
   for the riskier features (photos, AI chat, uploaded video), or whether those
   need a stronger parent check. Revisit when deadeye.ie and Resend are live,
   since parent emails then go from Deadeye's own domain.
2. **R4, turning 16:** decide what happens to the parent approval and under-16
   settings when a player turns 16.
3. **R9, others in shot:** add a line on the upload screen asking players not to
   upload clips where other people can be identified without their OK.
4. **Processors:** keep copies of each processor's data processing agreement;
   note where Anthropic and Vercel store data and the transfer safeguard.
5. **Breach plan:** write who does what if data leaks (the DPC must be told
   within 72 hours where there is a risk to people).
6. **Records of processing (GDPR Art. 30):** section 1 can serve as the record;
   keep it in step with the privacy policy.
7. **R11, routine import:** checked 2026-11-11 against Anthropic's Data
   Processing Addendum (effective 2025-02-24): it covers "all data or other
   information submitted through the Services", whatever the format, so
   screenshots are covered; transfers out of the EU use the EU Standard
   Contractual Clauses (Modules 2 and 3) and the UK addendum; the DPA is part
   of Anthropic's Commercial Terms, which apply to API keys from the Anthropic
   Console. It does not name a data location (processing is in the US through
   its listed subprocessors). Done 2026-11-11: the founder confirmed the
   AI_API_KEY comes from Anthropic and saved a copy of the DPA. Before
   changing AI_CHAT_MODEL, AI_MODEL or AI_PROVIDER, re-check the provider's
   retention for that model (Anthropic's "covered models" differ) and the
   import wording. Still open (legal advice): sources disagree on whether
   Anthropic is on the EU-US Data Privacy Framework list; the SCCs are a valid
   basis either way, but record a check of dataprivacyframework.gov or a short
   transfer impact assessment. Parents who approved
   before 2026-11-11: none to tell; the founder confirmed on 2026-11-11 that
   no under-16 had signed up, so every parent approval is given on the
   updated parent page, which names routine import.

## 5. Consultation

The views of players and parents are to be sought: ask a few parents of under-16
players and a club's safeguarding officer (DSCO) to read sections 1 and 3. If a
high risk remains after the measures, the GDPR requires consulting the DPC
before going ahead (Art. 36). None is high after the measures today.

## 6. Sources

- DPC, Fundamentals for a Child-Oriented Approach to Data Processing (2021)
- DPC, list of processing that requires a DPIA (2019)
- GDPR Articles 8, 25, 30, 33, 35, 36; Data Protection Act 2018 s.31
- European Commission, guidelines on protection of minors under DSA Art. 28 (2025)
- Basketball Ireland safeguarding policy (2025)
- Full links: `docs/agent-os/knowledge/safety-reviewer.md`

## 7. Sign-off

| Role | Name | Date | Decision |
| --- | --- | --- | --- |
| Founder | | | |
| Controller (account holder) | | | |
| Next review | | 2027-05-07 | |
