# Builder knowledge

Last researched: 2026-11-07

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

## Checklist before pushing

- [ ] `npm ci` (no junction), `npx next typegen`, `npx tsc --noEmit`.
- [ ] `npx eslint <changed files>`: `next build` no longer lints, so this is
      the only place compiler and hooks errors show.
- [ ] `npm test`; new tests query by role or label, not test id.
- [ ] `npx next build` (Turbopack) when routes, workers, `public/` or config
      changed; a new `public/` file type is on the proxy skip list and test.
- [ ] Server access checks use `getClaims()` (or `getUser()`), never
      `getSession()`; no secret key in client code.
- [ ] New table: RLS on, one policy per operation `to authenticated`,
      `(select auth.uid())`, policy columns indexed, migration runs twice.
- [ ] 390px wide, both themes, no sideways scroll, taps 44px (`h-11`),
      colours from `docs/design.md`.
- [ ] Camera/video: `playsInline` + `muted`, tracks stopped on unmount, each
      `getUserMedia` error named, each stage has a time limit.
- [ ] Heavy work (model, decode, export) in a worker or chunked; no tap
      handler blocks the main thread.
- [ ] Signed-in or worker behaviour checked live with the tester session, or
      listed as unchecked in the handoff. Own paths staged; handoff written.

## What the research says

### Next.js 16 (read `node_modules/next/dist/docs/` first)

- **`middleware` is now `proxy.ts`, Node.js runtime only, for optimistic
  checks, not authorization;** real checks go "as close as possible to your
  data source". Deadeye: proxy refreshes the session and redirects; pages,
  actions and RLS decide. [Next auth guide (local 02-guides/authentication.md)](https://nextjs.org/docs/app/guides/authentication), 2025, official.
- **Turbopack is the default for dev and build; `next build` no longer lints;
  browser floor is Safari 16.4 / Chrome 111.** [Next.js 16 blog](https://nextjs.org/blog/next-16), 2025, official.
- **`next typegen` makes `PageProps`/`LayoutProps` without a build;**
  `params`, `searchParams`, `cookies()`, `headers()` are async only.
  [Next 16 upgrade guide (local)](https://nextjs.org/docs/app/guides/upgrading/version-16), 2025, official.
- **Caching is opt-in.** Deadeye has no `cacheComponents`, so `fetch` is not
  cached by default. If `use cache` comes in: `revalidateTag(tag, 'max')`,
  `updateTag` for read-your-writes. Never cache a response that sets cookies.
  [Caching, previous model (local)](https://nextjs.org/docs/app/guides/caching-without-cache-components), 2025, official.

### React and the React Compiler

- **Deadeye lints with the compiler's rules but does not compile with it:** no
  `reactCompiler: true`, no `babel-plugin-react-compiler`; the errors come from
  eslint-plugin-react-hooks 7. Enabling it is stable but slows builds (Babel).
  [reactCompiler config (local)](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler), 2025, official.
- **The compiler skips code that breaks the Rules of React;** `"use no memo"`
  isolates a suspect component while debugging; React 19.2's `useEffectEvent`
  moves non-reactive logic out of effects, a cleaner fix for effect bail-outs.
  [React: compiler debugging](https://react.dev/learn/react-compiler/debugging), 2025, official.
- **Render is pure and idempotent; side effects in handlers or effects; never
  mutate props, state or hook values; hooks at top level.** Keep existing
  `useMemo`/`useCallback`. [Rules of React](https://react.dev/reference/rules), [Compiler intro](https://react.dev/learn/react-compiler/introduction), 2025, official.

### Supabase: RLS and auth

- **Server code protects pages with `getClaims()`; never trust `getSession()`
  (cookies can be forged).** Proxy must return the response carrying refreshed
  cookies; refreshing in two places can revoke the session. Deadeye's
  `src/lib/supabase/middleware.ts` already uses `getClaims`.
  [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs), 2025, official.
- **RLS on every exposed table; `to authenticated`; `(select auth.uid())`;
  index policy columns; no `user_metadata` in policies; `security definer`
  functions pin `search_path = ''` outside exposed schemas; views use
  `security_invoker = true`.** Check cost with `explain analyze` ("Rows Removed
  by Filter" = missing index). [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [RLS performance](https://supabase.com/docs/guides/database/postgres/row-level-security-performance), 2025, official.
- **RLS is tested with pgTAP (`supabase test db`).** Deadeye's PGlite checks
  run as superuser and skip RLS (2026-10-21 handoff): policies are untested.
  [Supabase testing](https://supabase.com/docs/guides/database/testing), 2025, official.

### Testing

- **Query as a user would:** `getByRole`, `getByLabelText`, text; `getByTestId`
  last. [Testing Library queries](https://testing-library.com/docs/queries/about/), current, official.
- **Mostly integration tests, few mocks, no implementation details;** pure
  logic (`rimFinder.ts`, `overlayTimeline.ts`) gets unit tests.
  [Kent C. Dodds, Write tests](https://kentcdodds.com/blog/write-tests), 2019, practitioner.
- **Vitest cannot render async Server Components:** test their logic as
  functions and the page end to end or live. [Next Vitest guide (local)](https://nextjs.org/docs/app/guides/testing/vitest), 2025, official.

### Performance on low-end phones

- **Core Web Vitals at the 75th percentile, mobile separate:** LCP ≤ 2.5s,
  INP ≤ 200ms, CLS ≤ 0.1. [web.dev Web Vitals](https://web.dev/articles/vitals), 2024, official.
- **INP covers every tap in the visit.** It is input delay + handler + paint;
  long tasks during load are the usual cause. Do only the visual update in the
  handler, defer the rest, don't read layout after writing styles, keep the DOM
  small. [web.dev INP](https://web.dev/articles/inp), [optimize INP](https://web.dev/articles/optimize-inp), 2024, official.
- **Test against a ~$250 Android (Galaxy A24 4G class) on 9 Mbps / 100ms;** a
  3s load allows about 0.3–0.6 MiB of JS. The 36 MB model and CDN runtimes
  stay off first load, fetched on demand.
  [Performance Inequality Gap 2026](https://infrequently.org/2025/11/performance-inequality-gap-2026/), 2025, practitioner (stated method).
- **Hidden tabs get no `requestAnimationFrame`; timers fire at most once a
  second:** tracking or export behind another app stalls; pause and say so.
  [Chrome background tabs](https://developer.chrome.com/blog/background_tabs), 2017, official, dated.

### Camera, video and workers on phones

- **`getUserMedia` needs HTTPS; its prompt may never settle; `exact`
  constraints fail with `OverconstrainedError` without asking,** so request
  `facingMode: 'environment'` as a preference. Name `NotAllowedError`,
  `NotFoundError`, `NotReadableError` (camera busy) separately; stop tracks
  before switching or leaving. [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), 2025, official.
- **iPhone plays inline only with `playsinline`; autoplay needs muted, and
  unmuting without a tap pauses.** [WebKit video policies](https://webkit.org/blog/6784/new-video-policies-for-ios/), 2016, official, dated (still current).
- **Safari's MediaRecorder writes MP4 (H.264/AAC), Chrome's WebM:** pick with
  `isTypeSupported`, as `pickRecordingType` does. [WebKit MediaRecorder](https://webkit.org/blog/11353/mediarecorder-api/), 2020, official, dated.
- **`requestVideoFrameCallback` fires only when a frame reaches the compositor,
  Baseline since Oct 2024:** feature-detect, fall back to rAF. [MDN rVFC](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), 2024, official.
- **Home-screen iOS web apps have a history of camera trouble,** including
  the prompt returning each launch. Test the camera from the home-screen icon
  on a real iPhone. [WebKit bug 215884](https://bugs.webkit.org/show_bug.cgi?id=215884), 2021, practitioner (bug report).

### Accessibility

- **WCAG 2.2 AA: targets 24×24 CSS px (2.5.8), 44×44 (2.5.5) advised for
  important controls; Deadeye's `h-11` exceeds AA.** Text 4.5:1, large text
  (24px, or 18.5px bold) 3:1, controls 3:1 (1.4.11), no rounding (4.49 fails).
  [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), 2023, official.

## Open questions

- Turn on `reactCompiler: true`? Measure build time and ShotTracker re-renders.
- Why did the bundled hoop-finder worker fail on Vercel when the tracker's runs?
- Real INP/LCP from players' phones: Speed Insights, or `web-vitals` events?
- Does camera permission persist across launches of the iOS home-screen app?
- pgTAP RLS tests for tables holding children's data: who runs them, when?
- WebGL in workers on the oldest supported iPhones (Safari 16.4): only bug
  threads found, no release notes.
