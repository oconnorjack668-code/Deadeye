# Builder knowledge

Last researched: 2026-11-14 (YouTube IFrame API, developer policies, oEmbed)

Read `README.md` in this folder for how this file works. Stack then: Next.js
16.4.2, React 19.2.8, eslint-plugin-react-hooks 7.1.1, Vitest 5 + jsdom.

## Lessons from the founder

Newest first. Seeded 2026-11-07 from the Gotchas in `docs/handoffs/` (file
in brackets).

- 2026-11-03 · A Turbopack-bundled worker (hoop finder) was created on the
  live site but never ran: no message, no error. Local `next build --webpack`
  hid it. **Rule:** build locally with Turbopack (plain `next build`), never
  `--webpack`; run any worker on the live site before calling it done. A worker
  that pulls a CDN runtime is a plain file in `public/workers/`; the tracker's
  bundled `new URL(...)` module worker does work. (2026-11-03-rim-finder)
- 2026-11-03 · Signed-in features cannot be checked locally or on previews:
  they cannot reach Supabase. **Rule:** check them on the live site in the
  founder's Chrome with the tester session (memory `test-live-in-chrome`);
  the founder types passwords, never Claude. Signed-out checks can use a temp
  page under `/parents/`; delete it and `.next/dev` after, or `next build`
  fails on stale types. (2026-11-03-rim-finder, 2026-10-21-app-review-fixes,
  2026-10-23-sample-rim-fix)
- 2026-11-03 · Windows: PowerShell `Set-Content` wrote a BOM that broke
  `JSON.parse`; Bash heredocs drop backslashes; the space in "Vivobook S16"
  splits unquoted paths; Git Bash rewrites `/route` args; a script's
  run-directly check compared mismatched paths. **Rule:** write files with
  Write/Edit or Node, quote paths, `MSYS_NO_PATHCONV=1`, import a script's
  function rather than run it. (2026-11-03-rim-finder,
  2026-11-01-tracker-upgrades, 2026-10-21-app-review-fixes)
- 2026-11-03 · Editing tracker source during a bench run corrupted it. **Rule:**
  no edits in `src/lib/video/` while a bench runs. (2026-11-03-tracker-accuracy-bench)
- 2026-11-02 · Turbopack refuses a `node_modules` junction to the main
  checkout; tsc reports `LayoutProps` missing in a fresh tree. **Rule:** `npm
  ci` in the worktree, then `npx next typegen`, then tsc.
  (2026-11-02-tracker-video-export, 2026-10-22-agent-os-first-loop)
- 2026-11-02 · `requestVideoFrameCallback` never fired on an off-page video;
  the export stalled. **Rule:** off-page video uses `requestAnimationFrame`;
  every frame loop has a time limit that names the stalled stage.
  (2026-11-02-tracker-video-export)
- 2026-11-02 · `NEXT_PUBLIC_*` values are fixed at build time. **Rule:** after
  one changes in Vercel, rebuild before testing. (2026-11-02-preview-signin)
- 2026-11-01 · The React Compiler lint bailed out of all of ShotTracker over
  one `setFraming(null)` in an effect cleanup, reported as "Cannot call impure
  function" in unrelated functions. On 10-21 a caller declared above
  `startTracking` did the same. **Rule:** when compiler errors appear in code
  you did not touch, bisect by stubbing or cutting your change; move effect
  logic into a small hook; declare helpers below the functions they call.
  (2026-11-01-tracker-upgrades, 2026-10-21-first-run-tutorial)
- 2026-11-01 · A plain `:root` later in `globals.css` won a specificity tie and
  kept light mode dark; Chrome throttled a covered window to ~2 fps. **Rule:**
  theme overrides are `:root[data-theme=…]`, check both themes; bring the
  window to the front before judging speed. (2026-11-01-ui-polish-desktop)
- 2026-10-25 · The pricing PDF downloaded the login page: `src/proxy.ts`
  skipped images and video but not `.pdf`. `.mp4` (10-21) and `.onnx` and
  `/workers/` (11-03) needed the same fix. **Rule:** every new file type or
  folder in `public/` goes on the proxy matcher's skip list with a case in
  `__tests__/proxy-matcher.test.ts`. (2026-10-25-e2-e3-migration-check)
- 2026-10-23 · Playwright's Chromium cannot play H.264; polling pages never go
  network-idle. **Rule:** serve a VP9 WebM copy via `page.route`; wait for a
  button or `load`. (2026-10-23-sample-rim-fix, 2026-10-25-e2-e3-migration-check)
- 2026-10-22 · A logged error was chased that a commit had already fixed;
  (10-20) other agents leave uncommitted files in shared folders. **Rule:**
  compare error and commit times first; stage your own paths by name.
  (2026-10-22-signup-email-limit, 2026-10-20-tracker-streaks-gym-avatars)
- 2026-10-19 · Route files may only export handlers and config; jsdom lacks
  `scrollIntoView`. **Rule:** keep route constants unexported; stub missing
  DOM APIs. (2026-10-19-activation-logging-reports)


## Lessons from results

What the outcome of earlier work taught (see "Results review" in the agent
file). Newest first, each with the date, what happened, and the rule.

- 2026-11-13 · The privacy page fell behind the code three times: catch-up
  commits after review for the funnel steps (`3207e06`, 25 Oct) and the
  tracker (`4f104e6`, 1 Nov), then S27, where lesson videos had loaded
  YouTube's player with no mention of it. **Rule:** a change that sends data
  to another company, or keeps something new, updates `src/app/privacy/page.tsx`
  in the same branch, and says in the reply whether the parents' page and
  DPIA need the founder. (Checklist: the "another company" line.)

## Checklist before pushing

- [ ] `npm ci` (no junction), `npx next typegen`, `npx tsc --noEmit`.
- [ ] `npx eslint <changed files>`: `next build` no longer lints, so this is
      the only place compiler and hooks errors show.
- [ ] `npm test`; new tests query by role or label, not test id. jest-dom
      matchers (`toHaveAttribute`, `toHaveFocus`) pass in Vitest but fail
      `tsc`: use `getAttribute`, `textContent`, `document.activeElement`.
- [ ] `npx next build` (Turbopack) when routes, workers, `public/` or config
      changed; a new `public/` file type is on the proxy skip list and test.
- [ ] Server access checks use `getClaims()` (or `getUser()`), never
      `getSession()`; no secret key in client code.
- [ ] New table: RLS on, one policy per operation `to authenticated`,
      `(select auth.uid())`, policy columns indexed, migration runs twice.
- [ ] 390px wide, both themes, no sideways scroll, taps 44px (`h-11`),
      colours from `docs/design.md`.
- [ ] Nothing loads from another company (iframe, image, font, script) before
      the player asks for it; a YouTube video goes through `TapToLoadYouTube`
      (or `FilmClipPlayer`, which shares its tap card); the privacy page names
      whoever receives data.
- [ ] A `'use server'` file exports only async functions: constants and
      helpers live in `src/lib/` (caught on F3 before it shipped).
- [ ] Camera/video: `playsInline` + `muted`, tracks stopped on unmount, each
      `getUserMedia` error named, each stage has a time limit.
- [ ] Heavy work (model, decode, export) in a worker or chunked; no tap
      handler blocks the main thread.
- [ ] Signed-in or worker behaviour checked live with the tester session, or
      listed as unchecked in the handoff. Own paths staged; handoff written.

## Research

Findings with their sources are in `findings/builder.md`. Search it when a
task needs evidence; add new findings there, not here.
