# Deadeye

A mobile-first basketball player development app: log basketball sessions and
gym work, track goals and streaks, study the game, get AI coaching grounded in
your own logged data, and analyse shooting video on-device.

Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase · PWA

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in at least the Supabase keys + OWNER_EMAIL
npm run dev
```

You need a Supabase project. Create one, then apply everything in
`supabase/migrations/` in filename order (35 migrations) via the Supabase SQL
editor or the Supabase CLI, then `supabase/seed.sql`. Every migration is safe
to re-run: policies are dropped before they are created, tables and indexes use
`IF NOT EXISTS`, and content inserts skip rows that already exist.

One exception worth reading before you run it: `00025` deletes duplicate
post-session AI reports (keeping the oldest for each session) because the
unique index it adds cannot be created while duplicates exist. The file carries
a `SELECT` that previews exactly what it would remove.

Set `OWNER_EMAIL` to the account that should hold the `owner` role — it grants
unlimited AI credits, Pro features and the admin screens, and is enforced
server-side in `src/lib/auth.ts` (never from a client flag).

`.env.example` documents every variable the code actually reads, and which
features stay dormant without them. AI and Stripe features are optional: with
no key configured they show an honest "not configured" state rather than
fabricating output or silently failing.

## Quality gates

```bash
npm run lint        # eslint
npx tsc --noEmit    # types
npm test            # vitest (43 files, 361 tests, 1 skipped)
npm run build       # production build
```

All four are expected to pass, with exactly one accepted lint warning: a
`react-hooks/exhaustive-deps` on `loadQuiz` in `study/[id]/quiz/page.tsx`. Leave
it — the obvious fix (adding `loadQuiz` to the dependency array) ships an
infinite fetch loop, because the function is recreated on every render.

`stripe-webhook.test.ts` sets its own 30s timeout. Its first test pays for a
cold dynamic import of the Stripe SDK and the Supabase client, which runs past
vitest's 5s default whenever the machine is busy. If you see a timeout in a
test that passes on its own, suspect the same cause before suspecting the code.

`tsc --noEmit` in particular should stay at zero errors — the Supabase schema
types in `src/lib/supabase/types.ts` are hand-maintained (there is no
`supabase gen types` step), and a schema that doesn't satisfy the client's
`GenericSchema` constraint silently degrades every query to `never` without any
lint error. If you add a table or column in a migration, add it there too,
including its `Relationships: []` entry — and if you add an enum-like `CHECK`
constraint, widen the matching TypeScript union, which has drifted before.

## Layout

```
src/app/(auth)/       login, signup, verify, reset, update-password
src/app/(app)/        the app: dashboard, basketball, workouts (incl. fuel),
                      goals, ai-coach, study, drills, programs, guides, video,
                      leaderboard, achievements, friends, teams, games,
                      style-match, settings, profile, pro, admin
src/app/api/          route handlers (AI, Stripe webhook, push, crons, share)
src/lib/              auth, supabase clients + schema types, AI providers,
                      offline queue, scoring/stats helpers, video analysis
src/components/       UI primitives and feature components
supabase/migrations/  schema, RLS policies and seed content
__tests__/            unit tests
```

Auth session refresh runs in `src/proxy.ts` (Next.js 16 renamed `middleware` to
`proxy`). Every player-owned table has RLS restricting rows to their owner, and
video is kept in a private bucket.

Both password-reset entry points — "Forgot password?" on `/login` and "Email me
a reset link" in Settings — send their email to
`/auth/callback?next=/update-password`, so the recovery code becomes a session
before the player reaches the form that sets the password. `/update-password` is
deliberately **not** in the proxy's `isAuthPath` list: needing a session to open
it is what proves the emailed link was genuine, and a stale or reused link fails
the exchange in the callback and lands on `/login`.

Owner-only tools live at `/admin`, reachable from the shield badge in the
header. They include a detector benchmark for measuring shot detection against
a real clip.

The same measurement runs headlessly, with ffmpeg decoding the frames, which
takes seconds rather than minutes and needs no browser or person:

```bash
DEADEYE_BENCH_CLIP=/path/to/clip.mp4 \
DEADEYE_BENCH_RIM=0.5253,0.2194,0.5865,0.1991 \
DEADEYE_BENCH_3FRAME=1 DEADEYE_BENCH_LEARN=1 \
DEADEYE_BENCH_MAKES=4.1,13.9,20.1,25.2,50.3 \
npx vitest run __tests__/clipBench.test.ts
```

`DEADEYE_BENCH_MAKES` is the hand-labelled times of the shots that went in; give
it and the run scores every call and prints which ones were wrong. Without it
you get counts, and counts hide a change that gets two calls wrong in opposite
directions while leaving the total unmoved — which has happened once already.

`DEADEYE_BENCH_SAMPLE_FPS` decodes at a different rate. It is how the app's
former **2× analysis speed** option was measured, and why that option no longer
exists: at 15 fps instead of 30 it cost one call in ten, collapsing a miss 1.92
half-rims outside the ring to 1.06 and calling it good. Halving the samples
puts the sighting below the rim *after* the ball has deflected off it, which is
lost information rather than a tuning problem. It failed toward inventing
makes, so there was no honest way to keep both the speed and the accuracy.

`DEADEYE_BENCH_ATTEMPTS` is the times of every shot taken, made or not. With
it the run is also scored on shots it never called and calls with no shot
behind them, which scoring only the calls cannot see.

`DEADEYE_BENCH_CANVAS` draws the hoop crop at a smaller size, which is how the
smaller pictures a slow phone falls back to are measured (see
`src/lib/video/workload.ts`). `DEADEYE_BENCH_NONET=1` runs without watching the
net. `DEADEYE_BENCH_TRACE` and `DEADEYE_BENCH_NETTRACE` write the ball's
position and the net's movement on every frame to CSV files.

`DEADEYE_BENCH_RIM` is the two rim taps as `x,y,x,y` normalised to the frame.
The test skips without those variables, so the normal gates are unaffected. Set
`DEADEYE_BENCH_FFMPEG` if ffmpeg is not on PATH.

There are two labelled clips. The first is the one above: 51s, 10 attempts,
filmed from the side. The second is a 2:39 session with two rebounders and a
second ball, filmed from far away and low down with the hoop side-on. It has
31 attempts, 10 of them made:

```bash
DEADEYE_BENCH_RIM=0.3574,0.4479,0.4037,0.4479 DEADEYE_BENCH_SAMPLE_FPS=30 \
DEADEYE_BENCH_MAKES=23.6,43.55,49.4,53.8,90.45,98.25,109.3,128.9,136.8,154.75 \
DEADEYE_BENCH_ATTEMPTS=5.25,10.45,15.65,23.6,28.5,39.4,43.55,49.4,53.8,58.0,62.9,66.55,71.6,78.05,84.9,90.45,95.2,98.25,101.9,109.3,112.7,116.7,121.5,128.9,132.5,136.8,140.4,144.8,149.15,154.75,158.4
```

The labels were made frame by frame. The clearest sign of a make there is the
net moving. On that clip the tracker as it was before called 27 of the 31
attempts and got 17 right, with 9 calls where there was no shot. Watching the
net, following each ball separately and waiting to see what happens after the
rim took it to all 31 called, 28 right and 1 extra call. The first clip stayed
at 10 of 10. The three still wrong are hard cases. One ball hit the rim,
bounced towards the camera and fell past the front of the net while the net
was still shaking from the hit. The other two were makes that bounced a metre
up off the ring and dropped back in.

## Three deliberate design decisions

**A streak survives one rest day.** `STREAK_REST_DAYS` in
`src/lib/achievements.ts`, matched by `my_training_streaks()` in migration
`00031` — the two must agree, because the dashboard takes the count from the
database and decides "at risk" in TypeScript. A daily streak in a training app
is otherwise a mechanic arguing with itself: `trainingLoad.ts` advises rest
after six straight days, and the streak then punished the rest it had just
recommended. Two missed days still breaks it, and the count is days *trained*,
not days elapsed, so Mon/Wed/Fri is 3 rather than 5. "At risk" now fires only
once the rest day is spent, instead of every day the player had yet to train —
a warning that appears daily is one nobody reads.

**Fuel tracking is habits, not calories.** `fuel_logs` records whether you ate
before and after training, water, sleep and energy — there is no intake total in
the schema and no composite score in the UI. Players start at 13, a numeric
intake target aimed at teenagers is a documented route into disordered eating,
and it would contradict the safety rules the AI coach already enforces. Don't
add macros without an explicit decision to, and age-gate them if you do.

**The IQ section is designed not to be finishable.** A question of the day walks
a per-player shuffle of the whole pool, so every question is seen once before
any repeats — 300 questions is 300 days. Adding content extends that directly;
it is not the only lever.

## On-device video

Shot tracking and form check run entirely in the browser — frames never leave
the phone. Shot tracking is `motionBall.ts` plus rim-crossing geometry and needs
no model at all, so it starts instantly and works offline; form check uses
MediaPipe Tasks Vision for pose. The player confirms or corrects every call
before it is saved.

Detection runs on a **crop around the rim**, not the whole frame. This began as
a fix for the object model's 320px square input, and it still earns its place:
it keeps the pixel work to one small square however large the footage is, and it
is what sizes the ball. A 2561px-wide clip was downscaled about 8× and a
basketball landed on roughly a dozen pixels. Measured on real footage: the model
scored `person` at 0.919 but `sports ball` at only 0.174 full-frame, rising to
0.729 on the crop. The rim is measured from two taps — one on each side — rather
than assumed, which is what makes the crop possible and what lets the tracker
work on side-on footage or with the hoop near a frame edge.

The two taps go on the ring's **left and right edges** — the ends of the long
axis of the ellipse a ring projects to from any angle but dead level. They set
the crop size and the make window, so they matter more to accuracy than light
or camera shake, and `rimTapProblem` rejects a pair that `rimFromEdges` would
have had to clamp (front-and-back taps, a double tap, or one tap on the
backboard) rather than silently measuring a sliver. A genuinely side-on rim is
narrow and that is correct, so only narrower than the clamp floor is refused.

A measured rim can be **remembered per hoop** (`src/lib/video/rimMemory.ts`), so
a returning player taps nothing: the saved list appears on the calibrate step
and starts tracking immediately. It is kept in `localStorage` rather than the
database on purpose — a rim is only valid for the camera position it was
measured from, and where a given phone sits is a property of that phone. The
offer to save appears in the review step, once the player can see whether the
detection actually worked.

Those two taps also carry the rim's **tilt**, because a rim is only horizontal
on screen when the camera is square to it. The crossing test works from the
ball's height relative to the tilted line rather than one averaged `y`; with a
tilt of zero it reduces to exactly the comparisons it replaced, so a level rim
behaves as before. The error it removes grows with how flat the ball's path is,
which means it matters most on the side-on clips the two taps exist to support.

**Frame coverage is the current bottleneck, not confidence.** Playing a clip at
1× and inferring on whatever frames arrive measured 14.3 fps on a 30 fps clip —
under half the frames, and about three frames per shot near the rim. That is too
few to watch the ball cross it, which is why a measured run called every shot
`inferred` rather than seen, and why 8 gaps over `LOST_BALL_MS` turned three
real makes into misses. `/admin/detector-bench` can now step frame by frame
(`src/lib/video/frameStep.ts`) instead, which decouples frames analysed from
inference speed at the cost of running longer than the clip. The bench keeps
both modes so the two can be compared on one clip, and labels every report with
which produced it.

**The COCO object model is the wrong tool here, and `motionBall.ts` replaces
it.** Measured on one real clip (2336×1080, 30 fps, 1540 frames, 10 attempts and
5 makes by hand count), at every single frame:

| | object model | motion, 2-frame | motion, 3-frame |
|---|---|---|---|
| ball found in | 7.1% | 60.8% | 37.1% |
| longest blind gap | 11,067 ms | 3,364 ms | 3,598 ms |
| attempts (10 real) | 5 | 11 | **10** |
| makes (5 real) | 1 | 6 | 4 |
| calls that were guesses | 4 of 5 | 0 of 11 | **0 of 10** |
| time | 311 s | 14 s | 17 s |

The frames show why the model struggles: a heavily motion-blurred maroon ball in
dim indoor light, seams smeared away — outside what a model trained on sharp,
mostly orange balls recognises. `motionBall.ts` finds the ball by what it does
instead. The camera does not move, so differencing frames leaves the player and
the ball and discards everything static, including a rim that happens to be the
same colour as the ball. Nothing assumes a colour — players' balls differ, and a
tracker looking for orange would fail on the clip that prompted it. Size comes
from the rim, already measured (a ball is ~0.53 of a rim's width), so there is no
pixel constant to tune per clip.

Three-frame differencing is the default: two frames light up both where a fast
ball was and where it is, and on this clip that counted one shot twice, 1.3s
apart. It costs one frame of lag, and it needs the ball to move further than its
own width between frames — true in flight, false for a ball resting on the
floor, which is the right behaviour.

`ballTracker.ts` adds colour **without costing a tap**: shape and motion find
the ball unaided, and the colours of the confident finds are collected until
their median can sharpen later frames. On the clip above that lifted detections
from 37.1% to 44.5% of frames and median ball-likeness from 0.553 to 0.630,
while still calling 10 attempts with no guesses, having learned `rgb(87, 56,
52)` by itself. It only learns from three-frame detections, because a two-frame
mask also covers where the ball *was* — where the current frame shows wall, so
the colour reads back as a blend (measured at 0.33 similarity to a ball that was
a perfect match).

With the ten shots hand-labelled, make/miss is **10 of 10 correct**. The rim was
placed carefully by hand and this is one clip in one hall with one ball, so it
is a real number but a narrow one.

Getting the last one right needed a fix upstream of the make test, and the
diagnosis is worth keeping. A made shot was being called a miss, and the
crossing came out **2.85 half-rims** from centre — sitting between genuine
misses at 2.87 and 3.43, so no make threshold could ever have separated them.
The frames showed why: a friend was passing the ball back after every shot, so
there was a second moving, ball-sized object below the rim for most of the
session, and the detector was pairing the real ball above the rim with *him*
below it. `MAX_BALL_RIMS_PER_SEC` now rejects a crossing the ball could not
physically have reached. Afterwards the margins separate cleanly: makes at 0.18
to 0.64, misses at 1.21 and up.

`DetectedShot.crossMargin` records that distance, which is what made the
diagnosis possible — "wrong by a hair" and "wrong by a metre" need completely
different fixes and the app previously could not tell them apart.

**A failed experiment worth not repeating.** The crossing rests on just two
sightings, the last above the rim line and the first at or below it, so one
badly centred ball can decide a make. Fitting a line across the recent track
instead — principled, and robust to noise in a unit test — measured *worse* on
real footage: 7 of 10, having changed exactly two calls and got both wrong. The
likely reason is that the path is least straight at the moment that matters, as
a ball clipping the rim or dragging through the net deflects, and a fit reaching
200ms back averages that deflection into the crossing. Locality beat smoothing.
The code is in git history at `ba3c0c0`; don't re-add it without labelled clips
to test against.

**Do not tune `MAKE_MARGIN` to fix a bad call.** Both times a call looked like
a threshold problem it was not: fitting the crossing to a track measured worse,
and the last wrong call was a rebounder being mistaken for the ball. Check
`crossMargin` first — a wrong call well outside the ring is a tracking fault,
not a threshold one. A "borderline" band marking near-misses as unclear was
tried and removed: once the real bug was fixed it only ever flagged correct
misses.

Overall counting accuracy still has not been measured against labelled footage.
Treat the counts as assistive rather than authoritative, and keep the review
step before saving. `/admin/detector-bench` measures a clip and compares
full-frame against the crop.

The tracker can **call shots out loud** — silent by default
(`src/lib/video/trackerSound.ts`). Makes and misses are chosen separately,
because they are not equally interesting: a make is the thing worth hearing and
most people want nothing for a miss unless it is funny, so misses default to
silent. The voice has styles (score only, call and score, hyped, makes only) and
picks from whichever voices the browser offers.
A phone on a tripod is several metres away and the player is usually facing the
hoop, so vibration is useless and a glance costs the next rep; sound is the part
of the confirmation that actually reaches them. Tones are synthesised through
the Web Audio API rather than shipped as files, so there are no assets to load
and nothing to break offline, and the choice is kept in `localStorage` because
it belongs to the device rather than the account. Every audio path swallows its
own failures: a sound that will not play must never stop a shot being counted.

## Asking a coach about a read

`/film-questions` lets a player mark one moment in their own game film and ask
a coach on one of their teams whether it was the right decision. The IQ lessons
teach the game in the abstract; this is the only place the app engages with a
decision the player actually made.

The player's own read is **required before the question can be sent**, and that
is the mechanism rather than a form field — comparing what they thought with
what the coach says is the whole exercise, and `readAccuracy` tracks how often
the two agree (over answered questions only, silent below five, with "depends"
counting as neither).

**Access follows the question.** A coach has no read on `video_assets` at all.
`/api/film-questions/[id]/clip` is the only broker: it takes a *question* id,
leans on the row-level security in `00035` to decide whether the caller may see
it, and returns a signed URL that expires in ten minutes. A caller cannot pass
a storage path or an asset id, so there is no way to reach a second clip, and
deleting a question revokes the access with it. Missing and forbidden return the
same 404 so the route cannot be used to discover which ids exist.

The column grant in `00035` is the other half: a coach can write only
`verdict`, `coach_note`, `answered_by` and `answered_at`. It limits players to
the same columns deliberately, so a question cannot be edited after an answer
lands.

**Keep apostrophes out of comments in migration files.** SQL clients that split
a script client-side, including the Supabase editor, can read one inside a `--`
comment as an opening string literal and fail on a bracket far from the real
problem. `00035` carries a note saying so, after it happened.

## Lesson videos

`study_items.youtube_video_id` holds a real YouTube id, and the lesson page
embeds it via `youtube-nocookie`. A lesson still holding `'placeholder'` falls
back to a YouTube search and says so.

If you curate more, verify the id before committing it: YouTube's oEmbed
endpoint returns the title and channel for a real video and HTTP 400 for an
invented one. Use the `author_name` it returns as the channel, rather than
typing one in.

## Historical docs

`IMPLEMENTATION.md`, `VERCEL_DEPLOYMENT.md` and `DEPLOYMENT_TESTING.md` date
from the first day of the build and describe a much smaller version of the app
(19 pages, 6 migrations). Useful for shape, unreliable on specifics — this
README and `.env.example` are the current source of truth.
