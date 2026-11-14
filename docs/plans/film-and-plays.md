# Film and Plays: plan

Status: **plan, waiting on the founder's decisions** (section 11). Nothing is
built yet. Written 2026-11-13 from the founder's brief, the reference app in
`Documents/Deadeye hud idea`, and three agent reports: a code map (Explore),
coach research (club-growth) and a plan-stage safety review
(safety-reviewer).

## 1. The idea in one paragraph

The IQ tab becomes three things: **Lessons** (what is there today),
**Film** and **Plays**. Players watch curated basketball clips that stop at
the key moment and ask "what's the read?", save clips, and learn plays from
animated court diagrams with a quiz on their own role ("You're 3. Where do
you go after the pass?"). Coaches favourite clips, build a team playbook,
draw their own plays on a phone, and set film or plays as a team task with a
due date, then see who has done it and who has learned the play. Nobody else
in basketball does the "quiz on your role, coach sees who knows it" loop
well (club-growth, section 4); that is how this beats the reference app
rather than copying it.

## 2. What already exists (build on it, do not rebuild)

| Need | Already in the app | File |
| --- | --- | --- |
| Set a task for the team | `team_assignments` (title, details, in-app link, due date) and `team_assignment_completions` | `00022_games_and_teams.sql:92`, `coach/assignments/PostAssignment.tsx`, `ASSIGNMENT_LINKS` in `src/lib/coachSide.ts:49` |
| Who is staff | `is_team_coach`, `is_team_staff`, roles coach/assistant/player, head coach is 18+ | `00022:112`, `00047:149-151` |
| YouTube clips | `youtubeEmbedUrl` (youtube-nocookie), `isRealYoutubeId`, `DemoVideo` | `src/lib/video/youtube.ts`, `src/components/DemoVideo.tsx` |
| Quizzes | `study_items.quiz_questions` jsonb `{question, options[], correct_index, explanation}` and `study_progress` | `00005`, `study/[id]/quiz/page.tsx` |
| Player asks coach about their own clip | `film_questions` + coach `FilmQueue` (player's own uploads, structured verdicts) | `00035`, `film-questions/`, `coach/FilmQueue.tsx` |
| Save / favourite | `drill_favorites` owner-only pattern | `00042:17`, `drills/[slug]/FavoriteDrillButton.tsx` |
| Court drawing | SVG half court, 10 units per foot, 50x47 ft geometry | `src/components/basketball/CourtMarkings.tsx`, `src/lib/court.ts` |
| Free vs Pro | `hasPro()`, `ProLock`, per-row `is_free`, one copy of the plan wording | `src/lib/entitlements.ts`, `src/components/ProGate.tsx`, `src/lib/plans.ts` |
| Parents see coach posts | Last 60 days of assignments on the approval link (under-16s) | `src/app/parents/CoachPosts.tsx` |
| Owner tool for picking YouTube ids | Demo video picker | `src/app/(app)/admin/demo-videos/page.tsx` |

The existing `film_questions` feature (a player's own clip, asked of their
coach) stays as it is and moves under the Film tab as "Ask your coach".

## 3. The reference app, and how we do better

The founder's screen recordings (play designer, plays "Up", "New Play",
"Diamond"):

- Purple half court; offence black numbered circles, defence red, a ball.
- A play is a row of steps (6 to 14), 1 second each, with a scrubber,
  play/pause and restart.
- Moves are tagged and drawn: zigzag = dribble, line with a bar = screen,
  curved arrow = cut, dotted = pass.
- Step thumbnails with "+", and tools: Players, Timing, Details, Notes,
  Insert, Duplicate, Delete. Share button.

The PDFs in that folder are one file (same checksum), the old HoopIQ
redesign of our own tabs; the IQ screen there is lessons and quizzes, which
is what `/study` already is.

What we keep: step-based animation, the four line types, the thumbnail
strip. What we do better:

1. **Draw by dragging, not by menus.** Drag a player and the move is recorded
   for this step. Drag the ball holder = dribble; drag the ball to a
   teammate = pass; long-press then drag = screen; anyone else = cut. Tap a
   line to change its type. The step names itself ("1 passes to 2, 4
   screens for 1").
2. **Snap to real spots**: block, elbow, wing, corner, slot, top, from
   `court.ts`. Plays look clean without fiddling.
3. **Start from a set-up**: Horns, 4-out 1-in, 5-out, Box, Stack, 1-4 high.
4. **"Show my role"**: pick a number, everyone else fades, your path and
   your job at each step stay bright. This is what players actually need.
5. **Role quiz built from the drawing.** No extra work for the coach: the
   app knows where 3 goes at step 2, so it can ask, and the player answers
   by tapping a spot on the court.
6. **Undo/redo, mirror left-right, playback at 0.5x and 1x, step timing.**
7. **Age rules built in** (Basketball Ireland underage rules, 2024-25
   version, check the 2026-27 one before launch): a ball screen in an U11 play
   or a zone tag on an U14 play gets a plain warning.
8. **Deadeye's look, not purple** (`docs/design.md` bans purple-to-blue):
   court in zinc-900 with zinc-700 lines; offence tokens orange-500 with a
   white number; defence tokens zinc-300 rings marked X1-X5 (not red: red
   means misses in Deadeye); ball amber; pass lines dashed zinc-300. IQ page
   tone stays blue. Motion uses `--ease-deadeye` and respects reduced motion
   (step-by-step instead of animation).

## 4. Where it lives

- **IQ tab becomes a hub with three tabs at the top: Lessons · Film · Plays.**
  Routes: `/study` (as now), `/film`, `/film/[id]`, `/film/packs/[id]`,
  `/plays`, `/plays/[id]`, `/plays/[id]/quiz`, `/plays/new`,
  `/plays/[id]/edit`. `BottomNav` lights IQ for all of them.
- **Coach mode**: add **Playbook** to `COACH_NAV_ITEMS` (the team's plays and
  favourited film). An "Assign to team" button on every play and clip opens
  `PostAssignment` filled in.
- **Players see "From your coach" first** on the Film and Plays tabs when
  something is assigned.

## 5. Plays (v1)

Player side:
- Library grouped by type: principles, half-court sets, pick-and-roll,
  baseline and sideline out of bounds, press breaks, zone offence (U15+),
  end of quarter. Filters: age group, type. Search.
- Play page: animated diagram, scrubber, steps, "Show my role", coaching
  points, age tag, save.
- Role quiz: 3 questions per play, tap-the-spot answers, explanation after
  each.

Coach side:
- Editor (section 3), working one-handed on a phone first, wider on desktop.
- Copy any library play and edit it.
- Team playbook: add plays to a team; players on that team can view them.
- Assign a play with a due date; progress view (section 7).

Data (one migration, next number after `00057`):
- `plays`: id, `owner_id` (null = library, written by the server only),
  title, slug, category, `min_age` (U11..senior), tags, description,
  `coaching_points text[]`, `diagram jsonb`, `is_free`, `copied_from`,
  timestamps.
- `diagram` shape, versioned: `{ v: 1, court: 'half', players: [{id, side,
  label}], frames: [{ ms, positions: {id: {x, y}}, ball: id, actions: [{type:
  pass|dribble|cut|screen|handoff, from, to?, path: [{x, y}]}], note }] }`.
  Coordinates in feet on `court.ts` geometry. Validated by one shared
  function used by the editor, the server route and tests.
- `play_saves` (user, play), owner-only, like `drill_favorites`.
- `team_playbook` (team, play, added_by): staff write; team members read.
- `play_quiz_attempts` (user, play, score, answers, completed_at): see the
  RLS rules in section 8.

## 6. Film (v1)

Player side:
- Library: "From your coach", "Continue", then themes (spacing, help
  defence, closeouts, pick-and-roll reads, transition, out of bounds, press,
  shot selection), level, search, saved.
- Clip page: **tap to load** with the line "This plays from YouTube; YouTube
  sees that you watched it". The YouTube IFrame API starts the clip at its
  start time and pauses at each question moment. The question shows **below**
  the player (YouTube's rules forbid covering it). Answer, explanation, "see
  it again" (back 3 seconds), carry on. Captions on. Playback speed control.
- Save a clip. Private notes on a clip (length cap, only the player sees
  them).
- "Ask your coach" (the existing `film_questions`, unchanged).

Coach side:
- Favourite clips (same save table), build a **pack** of clips, assign a
  clip or a pack with a due date, see progress (section 7).

Content sources:
- **v1: curated clips from official channels that allow embedding**, stored
  as YouTube id + start + end only, never downloaded; and Deadeye's own
  filmed clips (adults, or under-18s with written parent consent, nobody
  else's children in shot).
- **Later**: coaches pasting a YouTube/Vimeo link (needs moderation and a
  report button). **Not planned**: coaches uploading team game film (shows
  other people's children; blocked until S1 is signed, legal advice, and a
  club/parent consent process exist).

Data:
- `film_clips`: id, `youtube_video_id` (11-char check), `start_s`, `end_s`,
  title, channel name (attribution), theme, level, `questions jsonb` (same
  shape as `study_items.quiz_questions` plus `moment_s`), `is_free`,
  published_at. Server writes only; signed-in users read.
- `film_packs` and `film_pack_clips`: library packs (server) and coach packs
  (owner).
- `film_saves` (user, clip), owner-only. `film_notes` (user, clip, text),
  owner-only.
- `film_attempts` (user, clip, answers, score, completed_at).
- Owner tool: extend `admin/demo-videos` into a clip picker that checks a
  video allows embedding (oEmbed) before it can be saved.

## 7. Assigning and progress

- `team_assignments` gains `play_id`, `film_clip_id`, `film_pack_id`
  (at most one set, CHECK constraint); `link` is filled in from it.
  `PostAssignment` gets a picker for them next to `ASSIGNMENT_LINKS`.
- **A player can always open what their coach assigned, even if it is a Pro
  play or clip.** Team homework is never behind a paywall.
- Coach progress view per assignment:
  - each player: not started / done, and for plays "knows it" (quiz passed);
  - each question: how the team split across the answers.
  - **Not** each player's individual answers (founder decision, section 11).
- Teammates see nothing of each other's progress (the existing completion
  ticks are visible to teammates, `00022:165`; film and play progress comes
  from the attempt tables instead, which they cannot read).
- No overdue push by default; reminders, if any, go to the whole team and
  never name who has not done it.

## 8. Safety rules the builder must follow

From the safety review; each phase's pull request is reviewed against them.

1. RLS on every new table, a policy per operation, explicit GRANTs,
   re-runnable migration, rebuilt `docs/check-migrations.sql`.
2. Library tables (`plays` with null owner, `film_clips`, library packs):
   signed-in read, service_role write.
3. Attempts, saves, notes: the player has full access to their own rows.
   **Head coaches only** (`is_team_coach`, not assistants, who can be under
   18) can SELECT attempts, and only for plays or clips assigned to their
   team, until 90 days after the due date. No teammate read.
4. Coach plays: owner full access; a team member can read one only when it
   is in their team's playbook or assigned.
5. No comments, threads, mentions, free-text coach feedback, public
   profiles, leaderboards or share cards for film or quiz scores. (Coach
   notes to a player need C4 first and must show on the parent view.)
6. Iframes are built only with `youtubeEmbedUrl(id)` from a stored id. No
   raw URLs. No YouTube likes/subscribes.
7. Every new table `ON DELETE CASCADE` from the user; coach plays go with the
   coach's account; every table is in `api/account/export`.
8. Plays use numbers 1-5, never player names. Library diagrams are drawn by
   us, not copied from books or FastModel.
9. Copy written for a 13-year-old, no pressure. Questions work from the
   keyboard.
10. Screen line where it applies: "Your coach sees whether you did it and
    whether you got it right."

Paperwork before Film goes live (not before building):
- Privacy page: name YouTube/Google as a recipient, what it gets (IP, device)
  and a link to Google's privacy policy; say coaches see done/score for work
  they assign. **The YouTube line is already missing today** (S27 in
  `docs/STATUS.md`).
- `WhatParentsAgreeTo.tsx`: mention film and play assignments.
- DPIA (`docs/legal/dpia.md`): rows for attempts, saves, notes, coach plays;
  YouTube as a recipient; new risks (third-party embed tracking, coaches
  monitoring players). Film goes live only after S1 is signed with these
  rows in.

## 9. Free and Pro

| | Free | Pro / Team Pass |
| --- | --- | --- |
| Assigned plays and film | Always | Always |
| Plays library | ~12 plays (principles + a few sets) | All |
| Film library | ~15 clips, 2 packs | All |
| Coach: editor and saved plays | 5 saved plays, 1 team playbook | Unlimited, up to 10 teams |
| Later: club playbook shared across a club's teams | | Club plan |

The numbers are a starting point. `src/lib/plans.ts` must be updated in the
same pull request that adds a limit, so the Pro page stays true.

## 10. Build order

Each phase is one branch and one pull request (`exp/` naming as usual), with
tests, then safety-reviewer and release-checker, then the founder merges.
This is founder-directed work outside the activation loop: the founder
names the phase ("build F2") and the builder agent follows the same rules
as for a backlog item.

| Phase | What | Agents | Rough size |
| --- | --- | --- | --- |
| **F0** | Fix the privacy page YouTube line and make lesson videos tap-to-load (S27). Small, live today. | builder, safety-reviewer | ~half a day |
| **F1** | Plays viewer and library: IQ hub tabs, `/plays`, `/plays/[id]`, animated diagram, "Show my role", saves, 10 seed plays. | designer mocks up the IQ hub, play page and court look first; builder; qa-tester on the preview; founder checks the basketball | 2-3 days |
| **F2** | Play editor, coach plays, team playbook, role quiz, assign a play, coach progress view, Free limits in `plans.ts`. | designer (editor on a phone), builder, safety-reviewer, release-checker, qa-tester | 4-6 days |
| **F3** | Film: clips, packs, player with questions, saves and notes, assign, progress, owner clip picker, privacy/DPIA updates. Live only after S1. | designer, builder, safety-reviewer, release-checker, qa-tester | 4-6 days |
| **F4** | Content to launch level: ~38 plays, ~60 clips, ~150-200 questions, 10 assignment packs; then ~5 clips a week. | builder drafts diagrams and questions; founder approves; marketing uses it for posts | ongoing |
| Later | Coach-pasted links, club playbook, defence and full court in the editor, printable playbook, GIF export, coach notes (after C4). | club-growth shows F2 to the Wexford Blazers coach once it is live | |

Tests in each phase (Vitest, `__tests__/`): diagram validation and
interpolation, quiz generation from a diagram, age-rule warnings, Free/Pro
limits, RLS static checks (`rls-rules.test.ts` covers new tables), page
tests with the Supabase fake, and the assignment picker. Check each phase on
the preview link with the tester session before it goes live.

Starter content (club-growth): 6 principles (4-out 1-in, 5-out pass-cut-fill,
dribble-drive, give-and-go, back-door, spacing), 10 half-court sets (3 Horns
variations, Floppy, Spain PnR U15+, Chin, UCLA, Flex, Stack, 1-4 high), 3
pick-and-roll basics, 5 BLOB, 4 SLOB, 2 press breaks, 4 zone offences (U15+),
2 end of quarter. Each with coaching points, age tags and a 3-role quiz.

## 11. Decisions for the founder

1. **Where it lives**: IQ tab with Lessons · Film · Plays (recommended), or
   cards in the Train hub.
2. **Order**: Plays first (recommended: no copyright or privacy blockers,
   and it is what coaches asked for most), or Film first.
3. **What a coach sees**: done / knows-it per player and the team's answer
   split (recommended), or every player's answers (needs a DPIA update and a
   safety review first).
4. **Free limits**: the numbers in section 9.
5. **Timing**: activation is the agents' goal until 19 Nov (2 of 18 players
   at baseline). Suggest F0 now, F1-F2 ready for the January club restart so
   the Wexford Blazers coach has a weekly thing to assign; F3 after S1 is
   signed. Do not mention Plays to clubs until it is built.
6. **Who picks clips**: the builder can shortlist official-channel clips
   and draft questions; the founder approves each before it goes live.
