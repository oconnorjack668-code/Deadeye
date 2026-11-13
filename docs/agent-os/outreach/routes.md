# Routes

One row per route. Stage: `idea` · `drafted` · `sent` · `live` · `paused` · `dropped`.
Judged by first sessions, not visits. Under about 30 players a number is a hint.

Tracking: `?ref=<route>` on every link, pointing at the home page `/` (or `/signup`), never a
deeper page. The code names a route type or a public community, never a person, a handle, a
school or a youth team. **The app keeps only codes listed in `ROUTES` in `src/lib/signupRef.ts`**
(safety review, 2026-11-13): a new route's code goes into that list (a builder change) before
its link is shared, or its players count as "no route". From PR #97 (open on 2026-11-13, not
live until merged) the app saves it at sign-up and `/admin/funnel` shows joined and 1st session
by route; the weekly counts file (public repo) adds routes under 5 players together. Players who
type the bare address (radio, print, word of mouth) show as "no route".

| Route | Type | Where (public link) | Audience | Self-promo rule | Stage | Ref | Brought (visits / sign-ups / first sessions) | Next step | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Founder's network (E0) | network | n/a | about 5 players or parents the founder knows | n/a; the founder sends, one at a time | drafted | ref=friends | - | founder sends the message in `2026-11-13-outreach.md`; answers to the activation-analyst | 2026-11-13 |
| Wexford local media | press | [South East Radio contact](https://www.southeastradio.ie/contact-us/); [Wexford People](https://www.wexfordpeople.ie/) | Wexford households, parents of players included | editor decides, nothing paid; a sponsored slot is a labelled ad; a parent agrees to any interview or photo (founder under 18) | drafted | ref=wexford-press | - | founder (with a parent) emails South East Radio, then the Wexford People | 2026-11-13 |
| FDYS youth service | partner (youth centre) | [fdys.ie](https://fdys.ie/) | young people at FDYS projects across Wexford | email the organisation only; its safeguarding rules; nothing collected at a youth night | drafted | ref=fdys | - | safety-reviewer reads the draft; designer makes the QR poster; founder sends | 2026-11-13 |
| Adult skills trainers | creator type | n/a (by type; channels in the founder's private notes) | adult trainers' followers, Ireland first | public business address only; `#Ad` and TikTok's commercial content setting if anything is given; ask for a Reel as well as a TikTok | idea | ref=creator-trainer | - | draft a pitch: 60-second streak, or session 1 vs session 10 with their own number | 2026-11-13 |
| Adult women players and coaches | creator type | n/a (by type) | women's basketball audience on TikTok and Instagram | as above | idea | ref=creator-women | - | find adult creators by type; same pitch | 2026-11-13 |
| Adult rec players who vlog progress | creator type | n/a (by type) | adult beginners | as above | idea | ref=creator-rec | - | find by type; "session 1 vs session 10" pitch | 2026-11-13 |
| Basketball Ireland national 3x3 | event | [ireland.basketball/3x3](https://www.ireland.basketball/3x3) | youth and adult 3x3 players, events from May | through the organiser; shooting-round station; no identifiable minor without written parental consent | idea | ref=bi-3x3 | - | draft to the organiser in spring, once the 2027 calendar is out | 2026-11-13 |
