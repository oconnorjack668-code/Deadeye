# UI polish, light theme and desktop layout (2026-11-01)

Agent: Claude Code (Opus 5.5) · Commits: b9007b5 (#53, merged 6489e5e), 5c6ff3d (#54, merged 8ea54b1) · Status: shipped, checked live

## Outcome
- Contrast now passes WCAG 2.2 AA app-wide. Secondary grey went from 3.8 to 5.5:1, and white on the primary and green buttons from 3.6/3.8 to 5.2/5.5:1. Both are fixed at the palette in `globals.css`, not screen by screen.
- Text: nothing under 12px, and sentences in `<p>` are 14px (99 tiny sizes, 221 sentences). Red is back to misses and errors only, and the glows are gone.
- The Train page leads with "Next for you" and its groups are plain lists. On Home, the founder notice is one line and the founding offer is a plain card.
- Light theme: Settings > Appearance offers System (the default), Light and Dark, kept on the device and set before the first paint. Video areas stay dark.
- Motion: one easing curve, progress bars that fill once, and the session % counts up after saving. Both stay still with reduced motion.
- Desktop: from 1024px, Home, Hoops, Gym, IQ Study, Profile and Leaderboard use two columns (`HubGrid`), and Train shows its groups two across. Phones are unchanged.

## Decisions
- The light theme re-points Tailwind's colour variables instead of rewriting components: the zinc scale turns over, and the light accent shades become their 700 shade (`scripts/build-theme-css.mjs` writes `src/app/theme.css`). Components still use the dark classes.
- The theme follows the phone by default, because NN/g found users expect apps to follow the system setting. Light exists for outdoor courts. The choice lives in localStorage, like the shot sounds.
- Item 10 in the review left desktop alone; the user then asked for it, so it became `HubGrid`. Reading pages (a session, settings, a drill) stay narrow on purpose.
- Uppercase section labels stay 12px. The `<p>` size pass put 15 of them back.

## Where things are
- `src/app/globals.css` (palette fixes, `--ease-deadeye`, `.deadeye-fill`), `src/app/theme.css` (generated), `src/lib/theme.ts`, `src/components/ThemeWatcher.tsx`, `AppearancePicker.tsx`, `CountUp.tsx`, `layout/HubGrid.tsx`
- `docs/design.md`: type scale, contrast, "Light and dark", motion. Read it before adding a screen.

## Checks run
- tsc, eslint on all of `src`, and 926 tests pass (3 new, for the theme); `next build` passes.
- Light and dark at phone size on a temporary local page, since removed. Desktop on the live site in the user's Chrome, signed in as the tester: all seven hubs in light and dark. The theme was set back to System afterwards.

## Open
- Vercel previews cannot sign in: the Supabase variables are Production-only, so the browser gets no Supabase URL ("Failed to fetch"). If previews should work, tick Preview for them, but previews would then use the live database. The user's call.
- Some signed-in screens have not been looked at in light. If one reads poorly, Dark in Settings is the workaround, then fix it in the screen or the generator.
- Earlier today the tracker check left a test session and a "Claude test hoop" on the tester account. The user was asked to delete both (Claude may not delete data). Check they are gone.

## Gotchas
- Theme blocks must be `:root[data-theme=…]`: the plain `:root` in globals.css comes later and won a same-specificity tie, which kept the page background dark in light.
- `next dev` did not notice the regenerated `theme.css`. Touch `globals.css` to rebuild it.
- Chrome on Windows throttles a covered window to about 2 frames a second, which starves the tracker (1 fps analysed) and makes screenshots time out. Bring the window to the front.
- Signing in from this sandbox fails, so screens that need an account are checked on the live site in the user's Chrome; the user signs in.
