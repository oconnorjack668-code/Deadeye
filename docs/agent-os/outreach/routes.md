# Routes

One row per route. Stage: `idea` · `drafted` · `sent` · `live` · `paused` · `dropped`.
Judged by first sessions, not visits. Under about 30 players a number is a hint.

Tracking: **no codes in links.** Share the plain address `https://deadeye.ie` (the old `deadeyeapp.vercel.app` redirects to it, S53). The
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
| Founder's network (E0) + competition | network | n/a | about 5 players or parents the founder knows (13 or over, Republic of Ireland for the competition) | n/a; the founder sends, one at a time, never a group | drafted (sent? not confirmed, 23 Nov) | A friend or teammate | 23 Nov: 0 joined in 7 days; other answers under 5 together, 0 first sessions; nothing can be credited | this week's one route: send the 23 Nov competition message to up to 5 known players; founder reports a count sent and what got stuck | 2026-11-23 |
| Wexford local media | press | [South East Radio contact](https://www.southeastradio.ie/contact-us/); [Wexford People](https://www.wexfordpeople.ie/) | Wexford households, parents of players included | editor decides, nothing paid; a sponsored slot is a labelled ad; a parent agrees to any interview or photo (founder under 18) | drafted (sent? not confirmed) | Radio or a newspaper | - | founder (parent copied) sends the 16 Nov version to South East Radio, then the Wexford People | 2026-11-16 |
| FDYS youth service | partner (youth centre) | [fdys.ie](https://fdys.ie/) | young people at FDYS projects across Wexford | email the organisation only; its safeguarding rules; nothing collected at a youth night | drafted | A youth club or youth service | - | safety-reviewer reads the email; founder sends; poster (S33, designer then safety-reviewer) only if FDYS says yes | 2026-11-16 |
| Adult skills trainers | creator type | n/a (by type; channels in the founder's private notes) | adult trainers' followers, Ireland first | public business address only; `#Ad` and TikTok's commercial content setting if anything is given; ask for a Reel as well as a TikTok | idea | TikTok / Instagram / YouTube (one creator route at a time) | - | draft once routes 1 to 3 are sent: "makes in one minute, beat my number" or session 1 vs session 10 | 2026-11-16 |
| Adult women players and coaches | creator type | n/a (by type) | women's basketball audience on TikTok and Instagram | as above | idea | TikTok / Instagram (one creator route at a time) | - | find adult creators by type; same pitch | 2026-11-13 |
| Adult rec players who vlog progress | creator type | n/a (by type) | adult beginners | as above | idea | TikTok / Instagram (one creator route at a time) | - | find by type; "session 1 vs session 10" pitch | 2026-11-13 |
| Basketball Ireland national 3x3 | event | [ireland.basketball/3x3](https://www.ireland.basketball/3x3) | youth and adult 3x3 players, events from May | through the organiser; shooting-round station; no identifiable minor without written parental consent | idea | A basketball event or camp | - | draft to the organiser in spring, once the 2027 calendar is out | 2026-11-13 |
| Sports Active Wexford | partner (Local Sports Partnership, Wexford County Council) | [Sports Active Wexford](https://www.wexfordcoco.ie/community-and-sports/sports-active-wexford) | county-wide; monthly newsletter; no basketball programme seen in its Feb to May 2026 newsletters | email the organisation's published address; the council decides; nothing paid | idea | Somewhere else (no closer answer) | - | after FDYS: ask for a line in the monthly newsletter | 2026-11-16 |
| Public courts (council MUGAs) | partner (court) | [New Ross Town Park](https://www.wexfordcoco.ie/node/213); new courts funded for Wexford town, Rosslare and Gorey ([South East Radio](https://www.southeastradio.ie/news/wexford/basketball-to-benefit-from-funding-announced-today/)) | anyone who shoots at an outdoor court | the council's permission before any poster; QR to the plain address only | idea | Somewhere else (one route per answer at a time) | - | check which courts are built; ask the council by email | 2026-11-16 |
| In-app friend invites | referral | in the app: Friends, Invite (`/friends/add/<code>`) | players' own friends | the player passes the link on themselves; non-cash only; no league table of inviters | live (feature exists, not promoted) | A friend or teammate (same as E0, can't be told apart) | - | nothing to build; promote only after E0 has been read | 2026-11-16 |
| Play Store listing | store | not live (after billing, STATUS S3) | Android searchers | Google Play metadata policy; honest claims; 13+ audience agreed with safety-reviewer | idea | Somewhere else | - | wait for S3 | 2026-11-16 |
