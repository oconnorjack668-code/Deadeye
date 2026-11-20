Skills: all 8 loaded (designer-playbook read from its file: the designer agent type is not registered in this session)

# Screen review: every route, 20 Nov 2026 (second pass, signed in)

Asked by the founder: look over every screen and say what should change. Read first: `docs/design.md`,
`docs/agent-os/knowledge/designer.md`, `docs/agent-os/trends/visual.md` (11 Nov, 9 days old, not refreshed),
`docs/STATUS.md` (so shipped work is not raised again), the D1 backlog item (tracker review step: not re-raised).

## What was seen

- **Seen at 390 px, dark** (deadeye.ie): the public pages with a headless phone viewport, and every signed-in screen
  below through the tester's own session (each page in a 390 px frame inside the signed-in tab; light checked on about
  a third). Verdicts say **seen** unless marked "code".
- **Player side seen:** setup, welcome, Today (first run and after a first session), logger and its finish sheet,
  the result after saving, session page, Video AI, Hoops, Gym, Train, Programs, Drills, Plays, Film, IQ, Achievements,
  Streak, Leaderboard, Friends, Focus, AI Coach, Guides, Style Match, Games, Profile, Settings, Pro, the rank share card.
- **Coach side seen only as far as an under-18 account goes:** coach setup, coach home, Teams, Assignments, Playbook,
  draw a play. **Not seen:** a team page, roster, posts, assigning a play, the coach dashboard with data, team join.
  The tester's age bracket was 14-17 (my pick at setup), so setup let it join a team but not create one; I tried to
  raise the age to unlock team creation and the permission check refused, rightly (an adult attestation on a minor
  profile). I put the age bracket back to 14-17. So a **head-coach pass needs the founder or an adult account** (decision 6).
- **Not seen:** the live camera tracker (needs a real phone), session, workout and game share cards (no data),
  `/age-check`, `/parent-approval`, `/parents/*` (need a token), `/admin/*`, `/terms`.

## Every screen

Verdicts: **fine**, **small fixes**, **needs redesign**. Mockups A to E are listed after the ranking.

| Route | Verdict | Issues |
| --- | --- | --- |
| `/` landing | small fixes | Three orange buttons in the first 900 px and two different oranges (`orange-600` white text; bright `orange-500` dark text on the competition card). The competition card (6 lines) sits above the tracker clip, which is about 2,500 px down. Hero is text only. Mockup A. |
| `/login` | small fixes | Tagline "Player Development Operating System" is jargon; "Sign in to your player record" is corporate. Input border 1.55:1 on the card (3:1 needed). Mockup B. |
| `/signup` | small fixes | Placeholder is a real NBA player's name ("Jordan Clarkson", `signup/page.tsx:131`). Password rules inside an all-caps two-line label; age question after the password; copy reads like an HR form. Borders 1.55:1. Mockup B. |
| `/verify-email` | needs redesign | First screen after sign-up for anyone who must confirm. Tells a 13-year-old to "verify with SMTP in production". No resend, no "wrong email". 12px steps. Pulsing icon ignores reduced motion. Mockup B. |
| `/reset-password`, `/update-password` | small fixes | Old red icon tile; 1.55:1 input border. |
| `/clubs` | small fixes | Good copy. Seven then eight identical bordered cards; chip row cut off with no scroll hint. Coaches read it: low priority. |
| `/competition`, `/install`, `/privacy` | fine | Competition order (prize, CTA, rules) is right; install steps clear; privacy 16px and readable. |
| Unknown URL | small fixes | No `not-found.tsx`: a typo lands on the login screen. |
| `/onboarding` (mode, 3 steps) | needs redesign | Asks the name again and the **age bracket again** (signup already asked 16+ or 13 to 15). Bracket options "14 - 17 (High School)", "18 - 22 (College / Academy)": **no choice for a 13-year-old**, and American words. Levels: "Intermediate / High School", "Varsity, prep school", "College / Pro Pipeline, NCAA". Step 3: about 25 chips at 12px, US "Defense". Imperial units by default. Next and Finish are small, right-aligned. The tab bar and search stay on screen during setup. Mockup E. |
| `/welcome` and court screen | fine | The best screens in the app: two big choices, the rim-taps clip, three tips, camera and "by hand". Camera is big here, "Log shots" is big on Today (decision 3). |
| `/dashboard` first run | small fixes | Today card with one button is right. Under it: "Starting steps" whose fourth step is the Today card again, a reminders card (28 px day pills; an opt-in "Streak warning: if your streak would end tonight, one message"), then the **founding Pro offer with an amber "Claim 3 months of Pro free" button before any log**. |
| `/dashboard` after the first session | small fixes | Confirmed live: "1 days" (streak, consistency), "1 zones tracked". Today shows two `size="sm"` buttons (32 px, 12px text). Then Starting steps, Pro offer, competition line, "Pick your club", level card, a four-colour stat grid (orange, red on career %, green, cyan), two big gradient tiles (orange Hoops, teal Gym), shot chart: about six screens of cards for one session. Mockup C. |
| `/basketball/new` logger | small fixes | Excellent coach tips (Step 1, 2, 3 of 3), auto-scroll keeps court and numbers together. Number buttons about 40 px. Four orange items at once. |
| Logger finish sheet | small fixes | "Intensity RPE 6/10" and "How good was the session? 3/5": both sliders start mid-way and are saved untouched; RPE is coach jargon. Full-width Save is clear. |
| After the first save | needs redesign | Lands on the Hoops hub. A green card "First session logged! +20 XP" lists three promises and **never shows the player's number (6/10, 60%)**; then a cyan "Invite a friend" card. This is the activation and share moment. Mockup D. |
| `/basketball/[id]` session | small fixes | Clean; 60% big in orange. Subtitle "RPE 6/10 · Quality 3/5". Red-to-pink gradient Share button. |
| `/basketball` Hoops hub, `/workouts` Gym hub | small fixes | Good empty states. **The page scrolls sideways by 52 px**: the `PageHeader` glow (`w-[140%]`) widens the main scroller (427 against 375 px), so a horizontal scrollbar shows. Same on Train, Plays, Film, IQ. |
| `/video` Video AI | fine | Two clear rows, plain tips, "Your video stays on your phone". Title is `text-3xl`, bigger than other pages. |
| `/train` | fine | Grouped list with a "Next for you" card. Section names in four colours including purple (not in the colour table). |
| `/programs`, `/programs/[slug]` | small fixes | 10 of about 14 cards wear a gold PRO chip (a free player sees mostly locked plans; gold is a second accent). Descriptions end in "...". Detail page is good; "8% on week 1" is unclear. |
| `/drills`, `/drills/[slug]` | fine | 168 drills, 48 px timer, steps, cues, mistakes, tap-to-load video. Meta lines 12px. |
| `/plays`, `/film`, `/study` | fine | Court thumbnails, filters, question of the day first. PRO chips on about 60 percent of plays and 9 of 12 IQ sections. |
| `/achievements` | small fixes | Gradient Share button; nested boxes inside the streak card; 6-line explainer at 12 to 14px. Tier ladder is good (locked rows dim, not shaming). |
| `/streak` | small fixes | Calm and kind (rest day, freezes). Four pastel tints outside the colour table. |
| `/leaderboard` | needs a safety check | Podium shows the founder's profile photo (a young person's face) and full name to every player. The founder is under 18: confirm the parent's written consent for that photo. Age bands "U14, 14-17, 18+" leave a 13-year-old only "All ages". Dense first screen. |
| `/friends`, `/games`, `/focus`, `/profile` | fine | One-screen, plain empty states; Focus uses UK spelling ("Defence") and "Leave out names"; Profile has "See what others see". |
| `/ai-coach` | small fixes | Three zero-tiles for billing counters before anything to coach; "Log First Session" in title case; pink gradient tile. |
| `/guides`, `/style-match` | small fixes | Guides have no icon on the tile (blank green square) and mention "RPE". Style match asks for height first with an amber box; both fine. |
| `/settings` | small fixes | Well ordered; every privacy toggle is off by default (right). Native 16 px checkboxes: make the whole row the 44 px target. Role switch "Player / Coach / Player & Coach" selected state is solid red (a third red job). Very long single page. |
| `/pro` | small fixes | Honest ("Why Pro costs money", "Under 18? Talk to a parent or guardian"). Amber founding-offer card first. |
| Share card `/api/share/rank` | needs redesign | 1080 x 1350, not 1080 x 1920. Thin default sans, no heavy numbers, "Rookie" floating beside "Level 1", empty lower third, **display name printed by default**, old "AI BASKETBALL TRAINER" line. The free marketing, and the weakest-looking surface. Mockup D. |
| Log button, all signed-in screens | small fixes | Red 56 px circle covers the right edge of lists, the YouTube note, a drill's "Partner" label. Needs bottom padding or hide on scroll. Red here, orange for main buttons. |
| `/coach/setup` | small fixes | Good safety copy. Orange Continue next to indigo toggles. Under-18: Yes greyed, then Join only. |
| `/coach` home | needs redesign (first run) | Plain empty state with an **indigo** "Join a team"; setup and Teams use orange for the same job. Coach mode has its own indigo accent that `docs/design.md` does not list. Wordmark dropped from the header. |
| `/teams` | small fixes | Offers "Set up a team" to an under-18 account that cannot. Orange and indigo buttons side by side. |
| `/coach/assignments`, `/coach/playbook`, `/plays/new` | small fixes | Assignments is one line and a cyan link (third accent). "Set up a team" is an orange link in the playbook, cyan in assignments, indigo on Teams. Draw a play works well; selects truncate ("Half-court set", "Starts a") at 390 px. |
| Team page, roster, posts, assign a play, coach dashboard | not seen | Needs an adult head-coach account (decision 6). Code audit: 19 to 30 `text-xs`, `size="sm"` buttons, emoji (🙌, 🔒) as UI. |
| Error, loading | small fixes | `error.tsx` uses a 🏀 and `hover:bg-orange-500`; `loading.tsx` pulse has no reduced-motion still. |

## App-wide patterns (counts from `src/`, 20 Nov)

- Page titles: 14 different `<h1>` class strings (27 `text-3xl`, 10 `text-2xl`, 9 `text-xl font-black`; only 10 match
  design.md's `text-xl md:text-3xl`). Only the four hubs use `PageHeader`.
- `Button size="sm"` is `h-8 text-xs`, used 52 times; right for secondary actions, wrong for a main action.
- 48 hand-built `bg-orange-600` buttons beside `<Button>`; 15 files with `hover:bg-orange-500` under white text.
- Colour jobs outside the table: red Log button, red active tab and red selected role; indigo coach mode; amber Pro
  offers; cyan, purple and pastel tints on streak, train and assignments. Orange is the one that works.
- Control borders: `border-zinc-700/80` on the card is **1.55:1 dark and 1.36:1 light** (3:1 needed, WCAG 1.4.11).
  `border-zinc-500/70` is **3.30:1 dark and 3.22:1 light**.
- 61 `bg-gradient-to`, 16 `backdrop-blur`, `text-[10px]` still in `Navbar.tsx` and `ShotHeatMap.tsx`, 6 `animate-pulse`
  and 13 `animate-spin` with no reduced-motion rule.
- Spelling and words for Ireland: "Defense", "High School", "College", "Varsity", "NCAA" in setup; `Focus` already uses UK spelling.

## Ranked changes (each can become a D item)

Re-ranked after the signed-in pass. Impact on the first session and coming back first, then polish. S under half a
day, M a day or two, L more. Moved up: the post-save result (new), setup (now seen), the sideways scroll (new bug).
Moved down: landing order (S50 is the founder's call).

1. **Show the result after the first save (M).** Replace the green "First session logged" card with a result screen:
   "6/10", "60% from Mid top", one orange "Go again", an equal "Done for today", a quiet "Share this result"; invite and
   club move to Today later. Files: `src/app/(app)/basketball/new/page.tsx` (save redirect), the Hoops `FirstSession`
   card, `basketball/[id]/page.tsx`. Activation and share moment. Mockup D.
2. **Rewrite "Check your email" (S).** Remove "verify with SMTP in production", two plain steps, "Send it again"
   (Supabase `auth.resend`, 60 s cooldown; new behaviour, builder confirms the rate limit), "Wrong email? Start again".
   `src/app/(auth)/verify-email/page.tsx`. Mockup B.
3. **Fix setup for Irish players (S to M).** Drop the second age question (signup has it) or show a bracket a 13-year-old
   can pick ("13-15", "16-17", "18 and over"); replace "High School / College / Varsity / NCAA" with club, school, senior;
   "Defence"; metric default for height; full-width Next and Finish; hide the tab bar on `/onboarding`. `onboarding/page.tsx`,
   `src/lib/focusAreas.ts`. Mockup E.
4. **Sign-up and sign-in form (S).** Placeholder "e.g. Sam" (remove the NBA name), sentence-case 14px labels, password
   rule as a hint, "Create your account", drop the "Operating System" tagline. `(auth)/signup`, `login`, `reset-password`. Mockup B.
5. **Control borders to 3:1 (S).** `border-zinc-500/70` in `Input.tsx`, `Select.tsx`, the age radio cards and the agree
   checkbox. One class changes every form. Check light.
6. **Today for a new player: one thing, then calm (S).** Hide the founding Pro offer until after the first log (the
   competition line already waits), drop the "Starting steps" row that repeats the Today card, `Button` default size
   on Today buttons, white stat numbers, "day" singular, "zone" singular. `dashboard/page.tsx`, `FoundingCard.tsx`,
   `StarterSteps.tsx`. Safety-reviewer to read the Pro offer timing. Mockup C.
7. **Share cards to the brand (M).** 1080 x 1920 plus a 1080 x 1350 version, Geist Black numbers, one orange number,
   name off until the player turns it on, "Aim is earned". `src/app/api/share/[kind]/route.tsx`, `ShareCardButton.tsx`.
   Mockup D. Marketing reads these.
8. **Fix the sideways scroll (S).** `overflow-x-clip` on the `PageHeader` wrapper. `components/layout/PageHeader.tsx`.
   Visible on six hubs.
9. **Landing: proof first, one orange (S to M).** Founder decision 1. `src/app/page.tsx`, `LandingHeader.tsx`. Mockup A.
10. **Colour jobs: Log button and nav, coach mode (S).** Decision 2 and 5. Log button orange (same action, same colour),
    active tab white, Log menu rows neutral (mockup C); coach mode: choose orange buttons with the indigo kept for the mode
    switch only. `QuickLog.tsx`, `BottomNav.tsx`, `ModeSwitch.tsx`, coach pages.
11. **Log button stops covering content (S).** Bottom padding on the app shell or hide on scroll.
12. **One page title and one orange button (S to M).** `PageTitle` component (`text-xl md:text-3xl font-black`); replace
    the 48 hand-built orange buttons and `hover:bg-orange-500` with `<Button>` or a shared link class.
13. **Words for a 13-year-old (S).** RPE becomes "How hard was it?" (logger sheet, session page, guides); "Log First Session"
    becomes "Log shots"; "8% on week 1" explained; leaderboard age bands that include 13.
14. **Small-print sweep (S).** Reduced-motion rule for `animate-pulse`/`animate-spin`; remove `text-[10px]`; study quiz
    gradient text and ✨; 🏀 in `error.tsx`; 🙌, 🔒, 📹; a branded 404; blank Guides tile icon; 44 px privacy rows; two
    gradient Share buttons to the plain style.
15. **Programs and Pro chips (S).** Gold PRO chip on 10 of 14 programs: show it only on the detail page, or use a quiet
    zinc chip, so a free player is not shown mostly locked cards.
16. **Coach side pass (M).** Needs an adult account (decision 6): team page, roster, posts, assign a play, coach dashboard.

## Mockups

Static HTML with the app's Tailwind classes (v4 browser build 4.1.11, Geist) and PNG, today beside the proposal. Made-up
data. In `docs/agent-os/design/mockups/`:

- A. `2026-11-20-review-landing.html` and `.png`. Before: `2026-11-20-review-before-home-390.png`.
- B. `2026-11-20-review-auth.html` and `.png` (sign up, check your email, sign in). Before: `2026-11-20-review-before-{signup,verify,login}-390.png`.
- C. `2026-11-20-review-home.html` and `.png` (Today stats and the Log menu; the "today" side is rebuilt from the live
  classes and now confirmed against the live screen).
- D. `2026-11-20-review-first-session.html` and `.png` (the result after the first save, and a 1080 x 1920 share card
  with the safe area marked). Before: `2026-11-20-review-before-sharecard-rank.png` (live).
- E. Setup: copy list in change 3 (no mockup: it is wording and layout of existing screens).

## Checks on the proposals

| Check | A landing | B auth | C home, Log menu | D result and card |
| --- | --- | --- | --- | --- |
| Text 4.5:1 | pass (`zinc-400` 7.76:1, orange-400 8.79:1) | pass (hint 7.24:1, white on orange-600 5.18:1) | pass (emerald-400 9.65:1) | pass: white on zinc-950 about 19:1, orange-400 8.79:1, `zinc-400` 7.76:1 |
| Controls 3:1 | pass (`zinc-500/70` 3.30:1) | pass (3.30:1 dark, 3.22:1 light) | pass | pass (Done for today border `zinc-500/70`) |
| Touch 44 px | pass | pass | pass (Today button 44, Log 56) | pass (Go again 48, Done 48, Share link 44) |
| Type scale, 12px floor | pass | pass | pass | pass (96px result is a display number: add `text-8xl`-size to the scale only if the founder agrees) |
| One orange | pass | pass | pass | pass (Go again; card has one orange number) |
| Reduced motion | still poster | no pulse | none added | no count-up needed; result is static |
| 360 px | pass | pass | pass | pass (6/10 at 96px fits 330 px) |
| Safe zones (card) | n/a | n/a | n/a | pass: mark and numbers inside y 270 to 1500 |
| Light theme | not rendered | border measured | not rendered | not rendered |
| Names, faces | none | made-up | made-up | no name by default; no face |

## For the founder to decide

1. **Competition on the landing page (S50).** Recommend a one-line row under the tracker clip (mockup A). Alternative:
   keep the card, move only the clip up.
2. **Red or orange.** Today red is the logo, the Log button, the active tab and a selected role; orange is the action.
   Recommend Log button orange, active tab white, red kept for the logo and misses (mockup C).
3. **Which first step leads, camera or log by hand?** Welcome says camera, Today says "Log shots". I recommend "Log shots"
   first everywhere and the camera second until S42's numbers (about 8 Dec).
4. **Shorten setup?** Only name and age are required; steps 2 and 3 could be "Finish later". Needs the analyst's numbers
   (3 of 27) and safety-reviewer.
5. **Coach mode colour.** It uses indigo for buttons on some screens and orange on others. Recommend orange for actions,
   indigo only on the mode switch and the "COACHING" label.
6. **A head-coach pass.** The tester is a minor, so it cannot create a team and I will not mark it as an adult. Either you
   do the walk-through on a team you hold, or an adult tester account is made, then I do change 16.
7. **Photo on the leaderboard.** The founder's own photo and name show to every player. Confirm the parent's written
   consent is held (safety-reviewer).
8. **Pro offer timing.** Recommend no Pro card before the first log, for under-16s especially.
9. **Display number size.** The result number at 96px is outside the type scale (48px is the top): approve one display size
   (`text-8xl`) for result screens and share cards, or tell me to stay at 48.

## What I changed on the tester account (to switch back)

- Finished setup as a player with age bracket "14-17" and the goals that were already saved; **logged one session by hand**
  (Mid top, 6 of 10, 20 Nov): it gives the tester "1 session, 1 day streak, Level 2, 72 XP, 1 badge". Delete it from the session page ("Delete session") or use "Tester: start again as a new player" in Settings to get a fresh first-run state.
- Changed role to "Player & Coach" in Settings to see coach screens, then **back to "Player"** (Settings, checked). The coach setup left the "Coach setup" step done and a "Coaching" mode switch visible in the header while the role is Player & Coach; role is Player now.
- Raised the age bracket to 18-22 for one save to try unlocking team creation, then **put it back to 14-17** (checked on the profile).
- No team was created or joined, nothing was posted, no invite was sent. The harness was a throwaway frame in the open tab (not saved).

## Lessons from results

Nothing of mine has shipped yet (D1 is being drawn; the 13 Nov tracker review shipped as PR #99). A review needs the real
screen and the tester session does not survive a domain move (added to the knowledge file). New: the app's most
important moment (after the first save) was invisible from the code and plain once seen.
