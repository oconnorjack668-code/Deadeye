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
`supabase/migrations/` in filename order (30 migrations) via the Supabase SQL
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
npm test            # vitest (37 files, 282 tests)
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

## Two deliberate design decisions

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

Shot tracking and form check run entirely in the browser via MediaPipe Tasks
Vision — frames never leave the phone. Shot detection uses a general-purpose
COCO object detector plus rim-crossing geometry, with the player confirming or
correcting every call before it is saved.

Detection runs on a **crop around the rim**, not the whole frame. The model
takes a 320px square input, so a 2561px-wide clip was downscaled about 8× and a
basketball landed on roughly a dozen pixels. Measured on real footage: the model
scored `person` at 0.919 but `sports ball` at only 0.174 full-frame, rising to
0.729 on the crop. The rim is measured from two taps — one on each side — rather
than assumed, which is what makes the crop possible and what lets the tracker
work on side-on footage or with the hoop near a frame edge.

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

Overall counting accuracy still has not been measured against labelled footage.
Treat the counts as assistive rather than authoritative, and keep the review
step before saving. `/admin/detector-bench` measures a clip and compares
full-frame against the crop.

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
