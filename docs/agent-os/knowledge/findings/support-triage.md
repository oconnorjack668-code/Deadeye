# Support triage findings

Research for the support-triage agent: what the evidence says, each finding with its
source. The rules file (`../support-triage.md`) holds the founder's lessons and the
checklist and is read before every task; this file is searched when a task
needs it (grep the `###` headings). No line cap: replace a weaker finding
when a better source arrives, rather than adding beside it.

## What the research says

### Triage practice

- Severity (how bad) and priority (how soon) are separate. Mozilla rates S1 (data loss, no
  workaround, blocks people) to S4 (cosmetic) and sets priority from severity plus context; Google's
  tracker keeps P0 for a full outage with no workaround and P1 for many users with only a painful
  workaround. **Deadeye:** our P1/P2/P3 is priority; write the severity reason beside it. [Mozilla
  DOM triage](https://wiki.mozilla.org/Platform/DOM_Bug_Triage), 2020+, official practice, medium;
  [Google Issue Tracker](https://developers.google.com/issue-tracker/concepts/issues), current,
  official, medium.
- A good report is one bug, a short summary of the problem (not the fix), exact steps, whether it
  happens always or sometimes, expected versus actual, the environment, and facts kept apart from
  guesses. **Deadeye:** rewrite each group into this shape and mark which parts are the player's
  words and which are our guess. [Mozilla bug writing
  guidelines](https://bugzilla.mozilla.org/page.cgi?id=bug-writing.html), current, official, strong.
- Error tools group by fingerprint, then the app's own stack frames, then error type and message.
  Grouping by message is unreliable because messages change, and minified code ruins grouping
  without source maps. **Deadeye:** `/admin/errors` keys on message plus page; treat it as rough and
  regroup by meaning. [Sentry event
  grouping](https://docs.sentry.io/concepts/data-management/event-grouping/), current, official,
  strong.
- Stop the harm first, then examine, diagnose and test the likeliest cause. Ask what changed last: a
  working system keeps working until a change or new load. Correlation is not cause; record what was
  ruled out. **Deadeye:** start every group from the merges just before its first report. [Google
  SRE book, ch. 12](https://sre.google/sre-book/effective-troubleshooting/), 2016, official, strong.

### Camera and recording on phones

- Safari's MediaRecorder writes MP4 (H.264 and AAC) only; detect with
  `MediaRecorder.isTypeSupported`, never by browser name. **Deadeye:** `pickRecordingType` already
  does this, so an iPhone-only recording failure is more likely memory or a stopped camera track
  than the format. [WebKit blog](https://webkit.org/blog/11353/mediarecorder-api/), 2020, official,
  strong.
- On iOS, a second `getUserMedia` call for another camera stops the first; its track goes muted and
  the preview turns black. **Deadeye:** "camera goes black" after switching or reopening the
  tracker: look for a second call or a stream not stopped. [WebKit bug
  179363](https://bugs.webkit.org/show_bug.cgi?id=179363), 2017 to 2022, bug tracker, medium.
- In a home screen web app, iOS has re-asked for the camera after URL or hash changes and does not
  keep the grant between launches. **Deadeye:** "it keeps asking for the camera" on an installed
  iPhone app is platform behaviour; P3 unless it blocks a session. [WebKit bug
  215884](https://bugs.webkit.org/show_bug.cgi?id=215884), 2020 to 2025, bug tracker plus a 2025
  Apple forum report, medium.
- iOS Safari caps total canvas memory (about 384 MB on iOS 15, less on older phones) and draws blank
  canvases once over it; old canvases linger unless sized to 0. **Deadeye:** blank frames or a blank
  export after a long iPhone session suggests canvases not released.
  [pqina](https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/) and [WebKit
  bug 195325](https://bugs.webkit.org/show_bug.cgi?id=195325), 2019 to 2022, practitioner plus bug
  tracker, medium, `dated`.

### Workers, WebAssembly and models

- `importScripts()` throws in a module worker (use `import`), and bundlers can emit it into one.
  **Deadeye:** this was the 3 Nov crash; any "importScripts" crash means a worker built the wrong
  way. [MDN
  importScripts](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts),
  current, official, strong.
- WebAssembly memory tops out at 4 GB and Chrome ArrayBuffers near 2 GB; loading a big model with
  `arrayBuffer()` can fail, and models should be cached (Cache API). **Deadeye:** the 36 MB int8 rim
  model is far inside this on desktop. [ONNX Runtime large
  models](https://onnxruntime.ai/docs/tutorials/web/large-models.html), current, official, strong.
- On low-end and 32-bit Android, Chrome has failed to grow WebAssembly memory past about 256 MB
  ("Cannot allocate Wasm memory"). **Deadeye:** an out-of-memory from the hoop finder or body
  tracker on a cheap Android is a device limit; the fix is a smaller input or a clear message, not a
  retry. [Unity
  forum](https://discussions.unity.com/t/android-chromium-unable-to-grow-allocated-memory-above-256mb-confirmed/818820),
  2020, practitioner, weak, `dated`.

### Storage, offline and the service worker

- Safari storage is best-effort: under pressure or after long disuse it deletes whole sites, least
  recently used first. `navigator.storage.persist()` is granted mostly to home screen apps.
  **Deadeye:** "my offline session vanished" on an iPhone may be eviction; ask: Safari or home
  screen app, and how long ago? [WebKit storage
  policy](https://webkit.org/blog/14403/updates-to-storage-policy/), 2023, official, strong;
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
  says the same for all browsers.
- Safari deletes all script-written storage (localStorage, IndexedDB) for a site after 7 days of
  Safari use without a visit; home screen apps keep their own count. **Deadeye:** the offline queue
  in `src/lib/offline.ts` is in localStorage, so a week away from a Safari tab can lose it. [WebKit
  blog](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), 2020, official,
  strong.
- A new service worker waits until every tab on the old one closes; `skipWaiting` (used in
  `public/sw.js`) lets old pages be served by the new worker mid-session. **Deadeye:** a crash just
  after a deploy that a reload fixes is an old page meeting a new worker; ask "did a reload fix it?"
  [web.dev service worker lifecycle](https://web.dev/articles/service-worker-lifecycle), current,
  official, strong.

### Push and background

- iOS web push (16.4+) works only from a home screen app whose manifest is standalone, and the
  permission prompt must follow a tap. **Deadeye:** "no reminders" on an iPhone: ask if it is
  installed and on iOS 16.4+, then check the VAPID keys and `/admin/cron-runs`. [WebKit
  blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), 2023, official,
  strong.
- Hidden pages get frozen or discarded; timers and fetches stop, unsaved state is lost, and
  `document.wasDiscarded` says so after reload. Chrome also slows chained timers in hidden tabs to
  once a minute after 5 minutes. **Deadeye:** "I switched apps and my session was gone" is a
  discard; the fix is saving on `visibilitychange` to hidden. [Chrome Page
  Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), 2023, updated 2026,
  official, strong; [Chrome timer
  throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/), 2021, official,
  strong.

### Next.js, Vercel and Supabase in production

- Hydration errors come from bad HTML nesting, `window`, `localStorage`, `typeof window` or `Date`
  in render, browser extensions, and iOS turning numbers into phone links. **Deadeye:** an
  iPhone-only #418 near numbers: check the `format-detection` meta tag. [Next.js
  docs](https://nextjs.org/docs/messages/react-hydration-error), current, official, strong.
- With RLS on, a query no policy allows returns an empty list, not an error; a missing sign-in token
  does the same, and the SQL editor bypasses RLS so it looks fine there. **Deadeye:** "my sessions
  disappeared" or an empty board is RLS or a lost session until shown otherwise. [Supabase
  troubleshooting](https://supabase.com/docs/guides/troubleshooting/why-is-my-select-returning-an-empty-data-array-and-i-have-data-in-the-table-xvOPgx),
  current, official, strong.
- Sessions must be refreshed in the proxy with `getClaims()`; never trust `getSession()` on the
  server. Refresh tokens are single use, so refreshing in two places revokes the session and looks
  like random sign-outs. **Deadeye:** "it keeps logging me out" points at `src/proxy.ts` first.
  [Supabase Next.js auth](https://supabase.com/docs/guides/auth/server-side/nextjs), current,
  official, strong.
- A function past its time limit returns 504 `FUNCTION_INVOCATION_TIMEOUT` (Hobby default 300s).
  **Deadeye:** a stuck save or cron with a 504 is a slow query or a missing response. [Vercel
  limits](https://vercel.com/docs/functions/limitations), 2026, official, strong.

## Open questions

- Does Deadeye ask for persistent storage, and how many offline sessions are lost on iPhone? No
  count exists; a queue-age count would tell.
- How much memory do the body tracker and hoop finder use on a low-end Android? Needs a real cheap
  phone, not desktop Chrome.
- Is WebKit bug 215884 (camera re-prompt in home screen apps) still live on current iOS? Needs a
  test on an iPhone.
- Does Safari still cap canvas memory on current iOS, and at what size? Sources are 2019 to 2022.
- Should crash reports carry phone model, browser version and "installed or tab"? It would make
  grouping far easier; check the privacy rules first.
