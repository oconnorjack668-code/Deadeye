# Routes

One row per route. Stage: `idea` · `drafted` · `sent` · `live` · `paused` · `dropped`.
Judged by first sessions, not visits. Under about 30 players a number is a hint.

Tracking: **no codes in links.** Share the plain address `https://deadeyeapp.vercel.app`. The
sign-up form asks an optional "Where did you hear about Deadeye?" with fixed answers
(`HEARD_FROM` in `src/lib/heardFrom.ts`): a friend or teammate, a coach or club, a youth club or
youth service, TikTok, Instagram, YouTube, radio or a newspaper, a basketball event or camp,
somewhere else. Nothing is picked for the player and they can skip it. `/admin/funnel` shows
joined, set up and 1st session by answer; the weekly counts file (public repo) adds answers
under 5 players together. Players who skip it show as "Didn't say".

Why not `?ref=` codes: the safety review of 13 Nov 2026 (B5) found that EDPB Guidelines 2/2023
read a code in a link as within ePrivacy Article 5(3), which would need consent. The founder chose
the sign-up question instead (option A). Do not add codes, UTM tags or QR codes that carry a code;
a QR code to the plain address is fine.

What this costs: the answer names a channel, not a route. Two routes with the same answer (two
creators on TikTok, say) cannot be told apart, so run one route per answer at a time, or judge
them by the dates their sign-ups arrived. A new answer is a builder change to `HEARD_FROM` and
needs a safety review (fixed answers only, never a person, school or team).

| Route | Type | Where (public link) | Audience | Self-promo rule | Stage | Answer at sign-up | Brought (visits / sign-ups / first sessions) | Next step | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Founder's network (E0) | network | n/a | about 5 players or parents the founder knows | n/a; the founder sends, one at a time | drafted | A friend or teammate | - | founder sends the message in `2026-11-13-outreach.md`; answers to the activation-analyst | 2026-11-13 |
| Wexford local media | press | [South East Radio contact](https://www.southeastradio.ie/contact-us/); [Wexford People](https://www.wexfordpeople.ie/) | Wexford households, parents of players included | editor decides, nothing paid; a sponsored slot is a labelled ad; a parent agrees to any interview or photo (founder under 18) | drafted | Radio or a newspaper | - | founder (with a parent) emails South East Radio, then the Wexford People | 2026-11-13 |
| FDYS youth service | partner (youth centre) | [fdys.ie](https://fdys.ie/) | young people at FDYS projects across Wexford | email the organisation only; its safeguarding rules; nothing collected at a youth night | drafted | A youth club or youth service | - | safety-reviewer reads the draft; designer makes the poster (QR to the plain address); founder sends | 2026-11-13 |
| Adult skills trainers | creator type | n/a (by type; channels in the founder's private notes) | adult trainers' followers, Ireland first | public business address only; `#Ad` and TikTok's commercial content setting if anything is given; ask for a Reel as well as a TikTok | idea | TikTok / Instagram (one creator route at a time) | - | draft a pitch: 60-second streak, or session 1 vs session 10 with their own number | 2026-11-13 |
| Adult women players and coaches | creator type | n/a (by type) | women's basketball audience on TikTok and Instagram | as above | idea | TikTok / Instagram (one creator route at a time) | - | find adult creators by type; same pitch | 2026-11-13 |
| Adult rec players who vlog progress | creator type | n/a (by type) | adult beginners | as above | idea | TikTok / Instagram (one creator route at a time) | - | find by type; "session 1 vs session 10" pitch | 2026-11-13 |
| Basketball Ireland national 3x3 | event | [ireland.basketball/3x3](https://www.ireland.basketball/3x3) | youth and adult 3x3 players, events from May | through the organiser; shooting-round station; no identifiable minor without written parental consent | idea | A basketball event or camp | - | draft to the organiser in spring, once the 2027 calendar is out | 2026-11-13 |
