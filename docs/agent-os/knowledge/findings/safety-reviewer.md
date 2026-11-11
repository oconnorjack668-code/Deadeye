# Safety reviewer findings

Research for the safety-reviewer agent: what the evidence says, each finding with its
source. The rules file (`../safety-reviewer.md`) holds the founder's lessons and the
checklist and is read before every task; this file is searched when a task
needs it (grep the `###` headings). No line cap: replace a weaker finding
when a better source arrives, rather than adding beside it.

## What the research says

### Irish DPC: the Fundamentals

- The 14 Fundamentals (final Dec 2021) apply to any service likely to be used
  by children, and a child is anyone under 18: all players 13 to 17, not only
  under-16s. In short: a floor of protection for all; clear consent; legitimate
  interests never against the child; know your audience; tell children even
  when a parent consented; child-friendly privacy notices; children can use
  their rights; consent doesn't make a child an adult; prove your checks work;
  don't shut children out or give them less; a minimum age is no excuse; no
  profiling for marketing; DPIA for all children's data; protection by design
  and default. [DPC Fundamentals](https://www.dataprotection.ie/sites/default/files/uploads/2021-12/Fundamentals%20for%20a%20Child-Oriented%20Approach%20to%20Data%20Processing_FINAL_EN.pdf), 2021, regulator.
- Its design list (s.7.3): public must not be the default; no contact
  suggestions outside the child's network; geolocation off; no nudge layouts;
  avoid autoplay and "reward loops" fed by the child's data; avoid children's
  biometric data; small audience by default; tell the child when a parent can
  see their activity. **For Deadeye:** this is the checklist's backbone. Same
  source, 2021, regulator.
- Parental controls do not replace safe defaults; the controller must set the
  protective option. **For Deadeye:** parent approval does not make a
  public-by-default feature acceptable. Same source, 2021, regulator.
- When a child account "matures", old data should not just carry over and
  parent links end by agreement. **For Deadeye:** decide what happens at 16.
  Same source, 2021, regulator.
- Contract as the legal basis for under-18s is "complex" in Irish law.
  **For Deadeye:** the basis for each kind of processing is a **(legal
  advice)** question. Same source, 2021, regulator.
- Marketing email or SMS needs opt-in consent, from a parent for under-16s,
  and a free opt-out in every message. **For Deadeye:** founder or promo
  emails to under-16s need parent consent; in-app posts the player chose to
  follow are safer. Same source s.6.1, 2021, regulator.

### DPC decisions: what the big apps got wrong

- **TikTok, €345m (2023):** child accounts, videos and comments public by
  default; "Family Pairing" let an unverified adult link to a child; unclear
  information; design nudging children to public settings ruled unfair (dark
  patterns). **For Deadeye:** the parent link needs some check (refusing the
  player's own email is the floor); never nudge toward public.
  [DPC press release](https://www.dataprotection.ie/en/news-media/press-releases/DPC-announces-345-million-euro-fine-of-TikTok), 2023, regulator.
- **Instagram, €405m (2022):** 13 to 17 year olds switching to business
  accounts had phone and email published; accounts public by default.
  **For Deadeye:** coach view, club board or share cards must never publish
  contact details. [Clifford Chance](https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2022/09/instagram-hit-with-historic-gdpr-fine.html), 2022, practitioner (of a regulator decision).

### GDPR and Irish law

- Art. 8 GDPR with s.31 Data Protection Act 2018: under 16, consent for an
  online service must come from a parent. [DPA 2018 s.31](https://revisedacts.lawreform.ie/eli/2018/act/7/section/31/revised/en/html), 2018, law.
- "Reasonable efforts" to verify a parent, proportionate to risk: email can
  do for low risk, stronger proof for high risk. **For Deadeye:** the emailed
  link likely suits training logs; video upload, public surfaces or AI chat
  raise the risk **(legal advice)**. [EDPB consent guidelines](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en), 2020, regulator; DPC Fundamentals s.5.2.
- The DPC's DPIA list includes profiling children to target marketing or
  online services, and biometrics used to identify someone. **For Deadeye:**
  a written DPIA should exist and be updated per feature. [DPC DPIA list](https://www.algoodbody.com/insights-publications/data-protection-commission-confirms-list-of-processing-operations-requiring), 2018, regulator (via practitioner).
- Video is not biometric (special category) data unless processed to identify
  someone uniquely, as face recognition does. **For Deadeye:** ball and rim
  tracking is ordinary personal data; "find me in the clip" would cross into
  Art. 9. [EDPB video guidelines 3/2019](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_201903_video_devices_en.pdf), 2020, regulator.

### Push notifications and device consent

- ePrivacy Regulations 2011 (S.I. 336/2011) Reg. 5(3): storing or reading
  information on a user's device needs consent unless strictly necessary for a
  service the user asked for; consent can be given by technical means. **For
  Deadeye:** the browser's push prompt after the player taps "Turn on
  notifications" is the right shape; never prompt on load. Whether a push
  address counts under Reg. 5 is unsettled in what I found **(legal advice)**.
  [DPC cookie sweep report](https://www.dataprotection.ie/sites/default/files/uploads/2020-04/Report%20by%20the%20DPC%20on%20the%20use%20of%20cookies%20and%20other%20tracking%20technologies.pdf), 2020, regulator.
- ICO guidance for games (2023): avoid nudges that push children to weaken
  privacy, with care around time-limited offers; a stronger "yes" than "no".
  Nothing found that says notifications must be off by default; the DSA
  guidelines above are the closest. **For Deadeye:** a reminder the player
  opts into is fine; the streak warning stays off by default under 18.
  [Hill Dickinson summary](https://www.hilldickinson.com/insights/articles/privacy-protection-children-new-ico-guidance-game-developers), 2023, practitioner.

### Age-appropriate design (benchmarks)

- UK ICO Children's Code: high-privacy defaults, geolocation off, no nudges
  to weaken privacy, no data use that keeps children hooked, tell the child
  when a parent monitors. The DPC calls its Fundamentals "entirely
  consistent" with it. [ICO Code](https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf), 2020, benchmark.
- ICO fined Reddit £14.47m and Imgur's owner £247k (Feb 2026): self-declared
  age was not enough where children were likely users, and neither had a
  DPIA. **For Deadeye:** the age answer is self-declared; the DPIA must say
  why that is proportionate. [Chambers](https://chambers.com/articles/children-s-privacy-enforcement-intensifies-lessons-from-ico-s-reddit-and-imgur-decisions), 2026, practitioner.
- EU Commission DSA Art. 28 guidelines (July 2025): minors private by
  default; streaks, read receipts, autoplay and push off by default; easy
  block and mute; AI chatbots say they are not human and can be turned off.
  Micro and small enterprises are exempt, so not binding on Deadeye today.
  **For Deadeye:** the "streak ends tonight" push (`src/lib/reminders.ts`) is
  what they want off by default for minors. [Commission](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors), 2025, benchmark.
- Coimisiún na Meán's Online Safety Code binds designated video-sharing
  platforms, not Deadeye. Its first investigation (X, Sept 2026) was about
  weak age checks and parental controls hard to find at sign-up.
  [Online Safety Code](https://www.cnam.ie/online-safety-code/), 2024, benchmark;
  [Law Society Gazette](https://www.lawsociety.ie/gazette/top-stories/2026/september/cnams-first-probe-under-online-safety-code/), 2026.

### Safeguarding in youth sport

- Basketball Ireland (2025): coach-minor direct messages banned on every
  platform; talk in groups that include other adults; otherwise email with a
  parent copied; no images of minors shared without a parent's written
  consent; no tagging. **For Deadeye:** never add coach-to-player private
  chat. [BI policy for coaches of minors](https://ireland.basketball/uploads/ed/BI%20Social%20Media%20Use%20Policy%20for%20Coaches%20of%20Minors_2025.pdf), 2025, regulator (sport body).
- Basketball Ireland filming rules: coaching video needs prior parent and
  club consent, secure storage, deletion when no longer needed, never shared
  outside the coaching team or posted publicly; no full names on images; 16+
  can consent themselves. **For Deadeye:** any coach view of clips needs
  consent and a deletion rule. [BI video and photo guidelines](https://ireland.basketball/uploads/ed/BI%20Safeguarding%20Guidelines%20on%20Videoing%20and%20Photography%20Permission.pdf), undated (live 2026), regulator (sport body).
- Children First Act 2015: providers of "training, recreational ... or
  physical activities to children" must assess risk and publish a Child
  Safeguarding Statement within 3 months. Clubs are covered; whether an app
  is a provider is unclear **(legal advice)**. [Children First Act](https://revisedacts.lawreform.ie/eli/2015/act/36/revised/en/html), 2015, law.

### Marketing to children (ASAI)

- No exploiting credulity; no implying a child is inferior or unpopular
  without the product; no pester power; no exaggerated results; "only" or
  "just" must not shrink a price; no asking children for personal data
  without parental permission. **For Deadeye:** Pro upsells, founding offers
  and promos are covered. [ASAI Code: Children](https://adstandards.ie/code/children/), 2024, regulator (self-regulatory).

### AI with minors

- Anthropic: services with minor users must disclose the AI and follow
  child-privacy law; it recommends age checks, filtering, monitoring and its
  child-safety system prompt, audits, and can suspend. **For Deadeye:**
  `COACH_SAFETY` exists; check whether AI chat also has moderation.
  [Anthropic guidelines](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors), 2026, regulator (provider terms).
- EU AI Act Art. 50 (from 2 Aug 2026): people must be told they are dealing
  with an AI unless obvious. **For Deadeye:** "AI Coach" likely covers it;
  AI text in push, email or posts must say so. [Cooley](https://www.cooley.com/news/insight/2026/2026-08-03-eu-ai-act-transparency-obligations-take-effect-2-august-2026), 2026, practitioner.
- 72% of US 13 to 17 year olds have used AI companions; a third felt
  uncomfortable with something one said; a quarter shared personal details.
  **For Deadeye:** keep the coach on basketball; don't drift into companion
  talk. [Common Sense Media](https://commonsensemedia.org/press-releases/nearly-3-in-4-teens-have-used-ai-companions-new-national-survey-finds), 2025, study (n=1,060, US).

### Sending player content to an AI provider

- Anthropic API (commercial) inputs and outputs are deleted from its backend
  within 30 days; kept up to 2 years (classifier scores 7 years) if flagged
  for a Usage Policy breach; Files API files stay until deleted. From 9 June
  2026 "covered models" (Mythos-class) keep 30 days even for zero-retention
  customers; Haiku and Sonnet are not covered. Commercial terms: no training
  on customer content. **For Deadeye:** "not kept" is only true of Deadeye;
  the policy and screens must say the AI provider deletes it within 30 days.
  [Anthropic Privacy Center, retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data),
  updated 2026-07-01, provider terms;
  [covered models](https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-covered-models), 2026, provider terms.
- OWASP LLM01:2025 (prompt injection) adds multimodal attacks: instructions
  hidden in an image can steer the model, and no current defence fully stops
  them. **For Deadeye:** any AI call that reads a pasted text or screenshot
  must have no tools and no other player's data in context, and its output
  must be validated and shown only to the player who sent it.
  [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/), 2025, benchmark;
  [CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-image-prompt-injection-multimodal-llm-2026/), 2026, practitioner.
- EDPB Opinion 28/2024 (asked for by the DPC): if the purpose can be met
  without the personal data, processing it is not necessary; deployers should
  use safeguards against storing or regurgitating personal data. **For
  Deadeye:** a routine screenshot needs only the exercises, so ask players to
  crop out names and faces and tell the model not to copy them.
  [EDPB Opinion 28/2024](https://edpb.europa.eu/system/files/2024-12/edpb_opinion_202428_ai-models_en.pdf), 2024, regulator.

## Open questions

- Does a new AI use need fresh consent from parents who approved before it
  existed, or is an updated parent page and a notice enough? **(legal
  advice)** Not needed for routine import (Nov 2026): the founder confirmed no
  under-16 had signed up, so no earlier approval existed. Ask again the next
  time a new AI use ships once under-16s are on the app.
- Does Deadeye's Anthropic agreement (DPA) cover images, and where is the data
  processed (EU or SCCs)?

- Is there a written DPIA covering video, AI coach and public surfaces?
- Legal basis for each kind of processing, for 16-17s and approved under-16s?
  **(legal advice)**
- Is the emailed parent link enough for photos, AI chat, team membership?
  **(legal advice)**
- Does Children First apply to Deadeye, or only to clubs using it? **(legal advice)**
- What happens to parent approval and under-16 data at 16?
- Does Reg. 5 ePrivacy apply to a web push subscription? **(legal advice)**
- Next research: AI Act Art. 5 (exploiting age), a DPC or EDPB text on push
  notifications, Sport Ireland's online safeguarding text.
