# Deadeye promo v2: plan for approval

Status: shipped 2026-10-20. This file is the plan as approved; what shipped changed in review:

- **The final is the first promo with voice** (`../promo-classic`), not the new build in this folder. The user preferred the first promo's look once it had a voice. It keeps the first promo's footage, tracker graphics and end card, with: the logo sting after the first shot cut, new captions over the old ones (timed to the voice), "Train smarter" replaced by the real programmes screen, a watermark and a light grade.
- Voice: Kokoro `am_adam` at 1.04x, one clip per phrase, placed under its caption. Sound effects (synthesised, no licence needed) on the makes, the miss, the rim taps and the end card.
- Files: `docs/brand/deadeye-promo-voice.mp4`, `deadeye-promo-silent.mp4` (effects, no voice), the `-square` versions of both (1080x1080, the full video over a blurred fill), and the old one as `deadeye-promo-v1.mp4`.
- The new build in this folder (32s, its own footage edit and app screens) is kept as an alternative.

## 1. The old video (docs/brand/deadeye-promo.mp4, 24s, 1080x1920, silent)

| Time | What's on screen | Caption |
| --- | --- | --- |
| 0.0–3.9 | First shot from 16606, tracker HUD, ball trail, MAKE badge | WHAT IF YOUR PHONE COULD CALL EVERY SHOT? / IT JUST DID. |
| 3.9–5.4 | Logo sting on black | DEADEYE / THE AI SHOT TRACKER |
| 5.4–9.6 | Quick cuts of makes and misses, live HUD with count and % | MAKES. / MISSES. / EVERY REP. |
| 9.6–11.0 | Wider shot, make | COUNTED LIVE. |
| 11.0–13.6 | Setup, card over a blurred gym | TAP THE RIM TWICE. |
| 13.6–14.4 | Same card, green flash | ANY GYM. ANY ANGLE. |
| 14.4–16.3 | Form check mock-up (joints placed by hand) | FORM CHECK / SEE YOUR SHOT |
| 16.3–18.3 | AI coach chat mock-up (example reply) | AI COACH / ASK IT ANYTHING |
| 18.3–20.4 | Four feature tiles | BUILT FOR HOOPERS / TRAIN SMARTER: 150 drills, programmes, IQ quizzes, leaderboards |
| 20.4–22.0 | Dark footage | NO SENSORS. NO WEARABLES. JUST YOUR PHONE. |
| 22.0–24.0 | End card | DEADEYE / FIRST 100 PLAYERS: 3 MONTHS OF PRO FREE / deadeyeapp.vercel.app / Free to start · works in your browser · link in bio |

What I'd keep: the real footage with the tracker drawn over it, the condensed bold caption boxes in black with red for emphasis, the logo sting, the end card layout, and the captions staying in the middle band, clear of TikTok's right-hand buttons and bottom text.

What I'd change:
1. **Copy.** "Makes. Misses. Every rep." and "No sensors. No wearables. Just your phone." are three-beat lists. "Train smarter" and "Ask it anything" are slogans. Rewritten below.
2. **"Any angle" isn't true.** The tracker asks for 3 to 6 metres back, at an angle rather than side-on, at head height or higher (ShotTracker.tsx:699). Replaced with the real setup.
3. **"Tap the rim twice"** is close but vague. The app asks for the left edge of the ring, then the right (ShotTracker.tsx:833). New caption: "Tap both sides of the rim."
4. **Mock-ups out, real screens in.** The form check angles and the coach reply were illustrations. Feature moments now come from your screen recording.
5. **Numbers were missing or vague.** "Programmes" and "IQ quizzes" had no numbers. Every number now comes from the code (section 2).
6. **Pacing.** 14.0s and 16.3s each had a near-empty fade frame. Use hard cuts or quick pushes instead.
7. **Length.** About 27s instead of 24s, to fit the real app screens. Each feature beat is about 1.5s with a caption of six words or fewer.

## 2. On-screen claims and where each number comes from

| Claim | Source |
| --- | --- |
| 150 drills, all on Free | `supabase/migrations/00013_drill_library.sql` (150 rows); `src/lib/plans.ts` FREE_PLAN "All 150 drills" |
| 18 programmes | `00014_training_programs.sql` (10) + `00039_more_programs.sql` (8) |
| 4 programmes free | `00037_free_and_pro.sql` line 119 (3) + `00039` line 177 (Strength Foundations); `plans.ts` says 4 |
| 36 IQ lessons in 12 sections | `00012_study_expansion.sql` header (12 sections × 3 lessons); `src/lib/dailyIq.ts` |
| 300 quiz questions | `00012` (252) + `00029_iq_question_expansion.sql` (48). The app's IQ screen shows "300 quiz questions" (recording 0:21) |
| A new IQ question every day, free | `00028_daily_iq.sql`, `dailyIq.ts`; `plans.ts` "the question of the day" |
| Levels 1 to 50 | `src/lib/achievements.ts` MAX_LEVEL = 50 |
| 33 badges (not used on screen: no badge screen in the recording) | `achievements.ts`, 33 `badge({...})` entries |
| A rest day won't break your streak | `00031_rest_day_streaks.sql`; dashboard text "Safe - a rest day will not break it" |
| A streak freeze for every 7 days you train, hold up to 2 (optional: could replace caption 14) | `00041_streak_freezes.sql` freeze_every = 7, max_freezes = 2 |
| Gym logger with 160+ exercises | `supabase/seed.sql` (25) + `00011_gym_library_and_routines.sql`, 166 unique names; landing page says "160+" |
| 3 AI reports a month and 3 coach questions a day on Free (not planned for the video) | `src/lib/entitlements.ts`, `src/lib/ai/chat.ts` |
| Pro €6.99/month or €49.99/year (not planned for the video) | `plans.ts` PRO_PRICE_FALLBACK |
| First 100 players get 3 months of Pro free | `src/lib/founding.ts` FOUNDING_PLACES = 100, FOUNDING_MONTHS = 3 |
| Founder price €4.99/month after (not planned for the video) | `founding.ts` FOUNDER_PRICE_FALLBACK |
| Free to start, works in the browser | Free plan in `plans.ts`; web app at deadeyeapp.vercel.app |
| "Aim is earned" | The app's own line under the logo (login and signup pages, app header) |

## 3. Screen recording map (Screen_Recording_20261020_170041_Chrome.mp4, 1:14, 1080x2340)

| Time | Section | Usable for |
| --- | --- | --- |
| 0:00–0:03 | Home: Level 5 Prospect, 474 XP, this week, shooting 44.8%, streak (rest day safe), consistency, Hoops/Gym tiles | Levels and streak |
| 0:04–0:05 | Home: your shot chart, zone percentages | Shot chart |
| 0:06 | Loading | No |
| 0:07–0:09 | Hoops tab: New session, Track with your camera, Log a game, Drill library tile, career 44.8%, recent sessions | Drills tile, sessions |
| 0:10–0:12 | Gym tab: Start workout, Exercise library, Performance tests, Fuel, routines, empty history | Gym logger |
| 0:13–0:18 | Train menu: Programs, Workout builder, Goals, Drill library, Play style match, Guides, Game stats, Achievements, Friends, Leaderboard, AI coach, Ask coach, Video AI, Teams, Coach dashboard, Deadeye Pro | Quick scroll of everything |
| 0:19–0:21 | Basketball IQ: question of the day, answered correctly | IQ |
| 0:21–0:26 | IQ: 5 of 36 lessons done, 12 sections, 300 quiz questions, section list | IQ numbers |
| 0:27 | Hoops tab again | No |
| 0:28–0:31 | Video AI: Shots / Form / Jump / Film / Clips, camera tips, live camera or video from your phone, form over time | Setup tips, form check |
| 0:32–0:33 | Loading | No |
| 0:34–0:35, 0:37 | Home with your name ("Jack O Connor, 1-day streak") and "What are you working on today?" | Cropped below the name |
| 0:36 | The + menu: Hoops session, Gym workout, Track with camera, Game stats | Maybe |
| 0:38–0:40 | Loading | No |
| 0:41–0:51 | Programmes, Shooting filter | Programmes |
| 0:52–0:53 | Home again (your name) | No |
| 0:54–1:01 | Loading | No |
| 1:02–1:13 | Programmes, All, scrolled through every one | 18 programmes |

### Second recording (16889.mp4, 1:22, 1080x2340)

| Time | Section | Usable for |
| --- | --- | --- |
| 0:00–0:02 | Ask Coach: suggested questions, typing "How do I make my 3 pointer more consistent" | Coach question |
| 0:03–0:10 | "Coach is thinking..." | Cut |
| 0:11–0:18 | Coach reply scrolling | Coach answer (crop to the "1. Spot Shooting" block) |
| 0:19–0:27 | Video AI Form tab, first clip loading and playing | No |
| 0:28–0:32 | First form result (knee bend 3°, looks off) | No |
| 0:33–0:39 | Train menu scroll | No |
| 0:40–0:44 | Form tab: "Your form over time" | Maybe |
| **0:45–0:53** | **Phone gallery picker: personal photos and faces** | **Never use** |
| 0:54–0:59 | Clip chosen, Analyse my form, clip plays | No |
| 1:00–1:13 | Form result: skeleton with joint angles, stepping Dip / Set point / Release / Landing; knee 44°, elbow 38°, release 70°, 434 ms, jump ≈35.6 cm, balance 99% | Form check |
| **1:14.5–1:16** | **Notification: another person's name ("... replied to your Chat")** | **Never use** |
| 1:16–1:21 | AI feedback panel ("Only these numbers are sent, never your video") | Maybe |

App bug spotted: the coach reply shows raw markdown ("### Drills", "### Cues to Focus On") instead of headings. The video crops around it, but players see it in the app.

Privacy: no other real player's name, photo or stats appears anywhere. Friends and Leaderboard only show as menu rows. Your own name appears at 0:34–0:37 and 0:52; it's allowed, but I'd crop it out anyway.

Not in either recording: the live tracker screen (the shooting footage covers it), the achievements/badges page and the drill library list.

## 4. Script

Captions are the same in both versions. In the voice version, the voiced parts have captions that match the spoken words. Voice: Kokoro `am_michael`. No sound effects and no music in the files; add a commercial-library track when posting if you want one.

### Voice (three spots only)

| Spot | Line |
| --- | --- |
| Hook (0.2–3.4) | "Set your phone down and shoot. It counts for you." |
| Tracker (5.0–9.4) | "It calls your makes and misses as they happen. You just keep shooting." |
| Ending (24.4–28) | "Deadeye's free to start. The first hundred players get three months of Pro." |

### Captions

| # | Caption |
| --- | --- |
| 1 | Set your phone down and shoot. |
| 2 | It counts for you. |
| 3 | DEADEYE / Aim is earned |
| 4 | Make. |
| 5 | Miss. That counts too. |
| 6 | Live, while you're still shooting. |
| 7 | Tap both sides of the rim. |
| 8 | Film a shot. It measures your form. |
| 9 | Ask the coach about your own numbers. |
| 10 | See where you hit from. |
| 11 | 150 drills, all free. |
| 12 | 18 programmes. 4 are free. |
| 13 | 36 IQ lessons and a question every day. |
| 14 | Level 1 to 50 as you train. |
| 15 | A rest day won't break your streak. |
| 16 | Gym days count too. 160+ exercises. |
| 17 | All you need is a phone and a hoop. |
| 18 | End card: DEADEYE / Free to start / First 100 players get 3 months of Pro free / deadeyeapp.vercel.app / Works in your browser. Link in bio. |

Caption 9 leans on the coach's own subtitle, "Answers use your own training data" (recording 2, 0:00).

## 5. Storyboard (about 28s, 1080x1920, 30fps)

Rec 1 = Screen_Recording_20261020_170041_Chrome.mp4, rec 2 = 16889.mp4.

| # | Time | Picture | Caption | Voice |
| --- | --- | --- | --- | --- |
| 1 | 0.0–2.0 | 16606 first shot, HUD at 0/0 | 1 | Hook |
| 2 | 2.0–3.6 | Ball drops, MAKE badge, HUD goes to 1/1 | 2 | Hook |
| 3 | 3.6–5.0 | Logo sting, as before | 3 | |
| 4 | 5.0–9.6 | Quick cuts from 16606 and 16761: make, miss, make, HUD counting | 4, 5, 6 | Tracker |
| 5 | 9.6–11.0 | Rim-tap setup, as before, a tap mark on each side of the ring | 7 | |
| 6 | 11.0–13.0 | Rec 2 1:00–1:13 sped up: skeleton and angles stepping through the shot, then the 44° / 38° / 70° cards | 8 | |
| 7 | 13.0–15.2 | Rec 2 0:00–0:02 (question typed), cut to 0:11–0:13 cropped to "1. Spot Shooting" | 9 | |
| 8 | 15.2–16.6 | Rec 1 0:04–0:05, shot chart, zoomed on the half court | 10 | |
| 9 | 16.6–18.6 | Rec 1 0:07–0:08 Drill library tile, then 1:02–1:10 programmes scrolling fast | 11, 12 | |
| 10 | 18.6–20.2 | Rec 1 0:19–0:22, question of the day, then "36 lessons" | 13 | |
| 11 | 20.2–21.4 | Rec 1 0:00–0:01, level card with the XP bar | 14 | |
| 12 | 21.4–22.6 | Rec 1 0:01–0:02, streak card ("rest day will not break it") | 15 | |
| 13 | 22.6–23.8 | Rec 1 0:10–0:12, gym tab | 16 | |
| 14 | 23.8–25.4 | Dark shooting footage, as the old "no sensors" shot | 17 | Ending |
| 15 | 25.4–28.0 | End card | 18 | Ending |

App screens sit in a rounded phone-screen card over blurred gym footage (the old video's look), with the status bar cropped off, zoomed so the important part fills about 80% of the width. Captions stay between 20% and 70% of the height and left of the right-hand 15%. Never use rec 2 0:45–0:53 (gallery) or 1:14.5–1:16 (notification with a name), or rec 1 frames showing your name.

Square 1080x1080 cuts: the same timeline with the footage and cards reframed.

## 6. Build notes

- HyperFrames project in this folder, so it can be edited later. Voice samples in `voice-samples/` are for choosing only.
- Kokoro runs through kokoro-js (Node), because Python isn't installed for `hyperframes tts`. Same model (Kokoro-82M) and licence (Apache-2.0).
- ffmpeg: the static build in `%LOCALAPPDATA%\Temp\deadeye-bench\ffmpeg-bin\ffmpeg.exe`.
- Show a draft before polishing. Then: rename the old file to `docs/brand/deadeye-promo-v1.mp4`, deliver `deadeye-promo-voice.mp4` and `deadeye-promo-silent.mp4`, plus square cuts.
