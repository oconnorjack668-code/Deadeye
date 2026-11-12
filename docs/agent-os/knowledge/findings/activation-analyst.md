# Activation analyst findings

Research for the activation-analyst agent: what the evidence says, each finding with its
source. The rules file (`../activation-analyst.md`) holds the founder's lessons and the
checklist and is read before every task; this file is searched when a task
needs it (grep the `###` headings). No line cap: replace a weaker finding
when a better source arrives, rather than adding beside it.

## What the research says

### Onboarding and first value

- Tutorials did not help: 70 users, 4 apps; with a tutorial, task success
  91% vs 94% without, and users rated tasks harder. **Deadeye:** fix the
  first log screen itself; do not add a walkthrough in front of it.
  [source](https://www.nngroup.com/articles/mobile-tutorials/), 2020, moderate.
- Empty screens should show status, teach what belongs there and give a
  direct path to fill them; in-context help sticks better than a forced
  tour. **Deadeye:** dashboard, progress and leaderboard with no sessions
  should each point to "Log a session".
  [source](https://www.nngroup.com/articles/empty-state-interface-design/), 2021, practitioner.
- Apple: get people to the action quickly; keep onboarding brief and
  optional, since people want to start at once. **Deadeye:** every setup
  question must earn its place against the 7-day goal.
  [source](https://developer.apple.com/design/human-interface-guidelines/onboarding), live page checked 2026, official.
- 69% of products top for day-7 activation were also top for 3-month
  retention. **Deadeye:** backs the 7-day goal as the early number.
  [source](https://amplitude.com/blog/7-percent-retention-rule), 2025, practitioner.
- 93 popular well-being apps kept a median 3.9% of users at 15 days.
  **Deadeye:** most loss is in the first days; that is where change pays.
  [source](https://www.jmir.org/2019/9/e14567), 2019, moderate.

### Habits: the first session and the second

- Habits took a median 66 days (range 18 to 254) to become automatic;
  missing one chance did not derail them. 96 adults. **Deadeye:** expect no
  habit in week one; aim for a repeated cue and never punish one missed
  day. [source](https://doi.org/10.1002/ejsp.674), 2010, moderate.
- Gym habits took months (hand washing weeks); for 76% of gym-goers, time
  since the last visit was a top predictor of going again. Millions of
  check-ins. New members needed about 4 sessions a week for 6 weeks, kept
  simple and fun ([111 people](https://pubmed.ncbi.nlm.nih.gov/25851609/),
  2015, moderate). **Deadeye:** the gap after the first session is the
  danger zone; track days to second session and prompt within a few days.
  [source](https://doi.org/10.1073/pnas.2216115120), 2023, strong.
- If-then plans ("when X, I will Y") raise goal reaching: d = 0.65 over 94
  tests; a 2024 update of 642 tests found d = 0.27 to 0.66. For physical
  activity alone the effect is smaller (g = 0.31, 0.24 at follow-up) and
  larger when plans cover a barrier. **Deadeye:** end setup with "When do
  you next train? Log it straight after." Cheap, small but real.
  [2006](https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f),
  [2024](https://doi.org/10.1080/10463283.2024.2334563),
  [physical activity 2013](https://doi.org/10.1080/17437199.2011.560095), strong.
- Gym visits rise after "fresh starts": a new week, month, term or
  birthday. **Deadeye:** time prompts for Mondays and the start of school
  terms (September, after midterm and Christmas).
  [source](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf), 2014, moderate.
- 54 four-week programmes, 61,293 gym members: about 45% raised visits by
  9 to 27% while running, few lasted after. Best: small rewards for coming
  back after a missed workout. Experts could not predict the winners.
  **Deadeye:** reward the comeback, not only the streak; test ideas rather
  than trusting a hunch, ours included.
  [source](https://doi.org/10.1038/s41586-021-04128-4), 2021, strong.

### Reminders and notifications

- A push raised the chance of using the app in the next 24 hours by 3.9%
  (11.8% at midday on weekends); 1,255 users, randomised per message.
  **Deadeye:** reminders give small, short nudges; time matters.
  [source](https://mhealth.jmir.org/2018/11/e10123), 2018, moderate.
- Walking suggestions added 24% more steps in the next 30 minutes on
  average, over 100% in the first days, then faded over six weeks; 44
  adults. **Deadeye:** early reminders carry most weight; send few.
  [source](https://pmc.ncbi.nlm.nih.gov/articles/PMC6401341), 2018, moderate.
- Half of 11 to 17s got 237 or more notifications a day; about 200 teens.
  **Deadeye:** a generic ping drowns; it must be personal and come at the
  moment the player chose (after training).
  [source](https://commonsensemedia.org/press-releases/teens-are-bombarded-with-hundreds-of-notifications-a-day), 2023, moderate.
- On iPhone and iPad, web push works only for a web app added to the Home
  Screen (iOS 16.4+), and permission must follow a tap. **Deadeye:** an
  iPhone player who has not installed the app cannot get a push at all;
  any reminder experiment reaches fewer players than it looks.
  [source](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), 2023, official.
- Never ask for permission on page load; give context, ask after a positive
  signal; a block is nearly permanent.
  [source](https://web.dev/articles/push-notifications-permissions-ux), live page, official.

### Gamification, streaks and leaderboards

- Gamification raised physical activity by g = 0.42 over 16 trials (2,407
  people); 0.23 against a non-game programme, 0.15 at follow-up.
  **Deadeye:** XP and streaks help a little; they will not rescue a hard
  first step. [source](https://www.jmir.org/2022/1/e26779), 2022, strong.
- In a 602-person trial, competition in groups of three with a weekly
  leaderboard added 920 steps a day and was the only arm still ahead after
  the game ended. **Deadeye:** small team-mate or friend tables beat one
  big table. Adults, so check with teens.
  [source](https://pubmed.ncbi.nlm.nih.gov/31498375/), 2019, moderate.
- An unbroken streak in a log keeps people going; a broken one lowers
  engagement, more so when people blame themselves, less when they can
  repair it. Seven studies. **Deadeye:** offer a streak repair and never
  lead a reminder with a broken streak.
  [source](https://doi.org/10.1093/jcr/ucac029), 2023, moderate.

### Teens and youth sport

- Across 21 studies (ages 5 to 19), enjoyment went with intending to keep
  playing (r = 0.45). For actually staying: intrinsic motivation (SMD 0.74),
  coach support (0.68), peer support (0.50), parents (0.37), feeling
  competent (0.33). **Deadeye:** fun and visible improvement first; the
  coach side and friends matter more than parent messages.
  [source](https://doi.org/10.3389/fpsyg.2022.871936), 2022, strong (few studies per factor).
- Review of 43 studies: youth drop out over lack of enjoyment, feeling not
  good enough, social pressure, other priorities, injury and growth.
  **Deadeye:** a first session's numbers must not make a beginner feel bad;
  frame them as a starting point.
  [source](https://doi.org/10.1177/1356336X14555294), 2015, moderate.
- Young players rated trying hard, learning and improving, positive
  coaching and team friendships as the core of fun; adults misjudged what
  kids value. 142 players. **Deadeye:** praise effort and improvement, not
  raw score. [source](https://doi.org/10.1123/jpah.2013-0180), 2015, moderate.
- Ireland, 8,881 aged 10 to 19: about 1 in 5 stop sport at the move to
  secondary school, and about 30% fewer girls play at secondary level.
  **Deadeye:** players 13+ are in the drop-out years; check through
  founder notes that the app works for girls as well as boys.
  [source](https://www.sportireland.ie/sites/default/files/media/document/2023-10/2022%20CSPPA%20Summary%20Report.pdf), 2023, official.
- 72% of 13 to 17s on social apps say they feel closer to friends.
  **Deadeye:** friend and team features fit why teens open apps.
  [source](https://www.ofcom.org.uk/media-use-and-attitudes/media-habits-children/children-and-parents-media-use-and-attitudes-report-2025), 2025, official (UK).

### Reading small numbers

- For rates from small samples use the adjusted Wald interval (add about
  two successes and two failures); 1 of 5 has a range of 2% to 64%.
  **Deadeye:** 3 of 24 is about 4% to 32%; 2 of 18 was about 2% to 34%, so
  11% to 13% is noise. A rise to 40% would sit outside today's range.
  [source](https://measuringu.com/wald/), live page, practitioner (Sauro and Lewis method).
- Zero events in n means the true rate could still be up to 3/n (95%).
  **Deadeye:** 0 of 10 reaching a step does not prove nobody will.
  [source](https://doi.org/10.1001/jama.1983.03330370053031), 1983, strong.
- Five users find most usability problems in a round. **Deadeye:** E0's
  five conversations can find the main blocker. [source](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/), 2000, practitioner, dated but standard.
- Interview themes stop changing after 9 to 17 interviews in a fairly
  similar group (23 studies). **Deadeye:** if five notes disagree, aim for
  9 to 12 before ranking themes.
  [source](https://pubmed.ncbi.nlm.nih.gov/34785096/), 2022, strong.

## Open questions

- Which barrier is the real one (can't, forgot, no reason yet)? Needs E0
  notes; no study answers it for Deadeye.
- How many players are on iPhone without the app installed (no push)? Is
  there an install marker?
- What first session feels like a win to a 13 to 17 player: 5 minutes,
  25 shots, one drill? No research found on this.
- Do club or coach-invited players activate faster than solo signups?
- Most streak, reminder and leaderboard trials are on adults; look for
  teen trials next.
- What the DPC's Fundamentals for children say about nudges, streaks and
  reminders for under-18s; check with the safety-reviewer's file before
  proposing any.
