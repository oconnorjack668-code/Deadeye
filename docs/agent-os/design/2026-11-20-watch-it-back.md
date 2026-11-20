Skills: all 8 loaded

# D1 "Watch it back" on the shot tracker review · 2026-11-20

**Problem.** Since #118 an uploaded clip is checked frame by frame without playing, so the player never sees the tracker work and cannot tell when it is wrong, or find a shot it missed. **For:** any player who uploads a clip. **Moves:** first session logged, and trust in the number, so they come back. Draft for the founder; nothing is built or shared.

What I looked at: the live tracker at phone width (the landing demo, tracking state) and the review step in `ShotTracker.tsx` lines 1829-2130. The sample's review screen is slow to reach, so I read that step from code. I rendered the mockups with the app's Tailwind v4 classes and `src/app/theme.css`: dark, light, 390 px and 844x390. They use a made-up empty court, no people. Rebuild with `node mockups/2026-11-20-watch-it-back-build.mjs`.

## Facts the design rests on

- `OverlayTimeline.calls` holds the tracker's calls as first made, before any correction (`overlayTimeline.ts`). A player that draws from it would keep showing a make the player had flipped to a miss. The player must draw from the corrected `shots`. `TrackerVideoExport` has the same gap today: a saved video ignores corrections.
- `drawHud`, `drawRim`, `drawBall` in `overlayArt.ts` already draw the live look without the buttons and warnings (as the export does). Reuse them on a canvas over the `<video>`. No new art.
- The review step has no picture today. Per-shot replay (`ShotReplay`) is a pop-up that plays 2.5 s before to 1.5 s after one shot, with no HUD.

## Directions (`mockups/2026-11-20-watch-it-back-directions.png`)

- **A. Player in the page (recommended).** A card under the verdict: picture with the live HUD, scrub rail with a pin per call, controls, and an edit strip that changes with what is paused. The shot list stays below and its ▶ plays in the player. Why: the job on this screen is checking calls, so picture and list should be visible together; no new navigation; the back gesture works; it reuses the HUD and `Button` sizes.
- **B. Full screen first, list in a bottom sheet.** Most immersive, biggest picture. Drops the verdict and the list out of sight, adds a drag sheet that fights the scrub drag, and is a new pattern for the builder. Rejected.
- **C. Extend the pop-up.** Smallest change: a "Watch the whole clip" button opens a bigger `ShotReplay`. Covers the page, so flipping a call means closing it to see the list, and nothing is drawn on the page itself. Fallback only if A cannot be built this week.

## Recommended: A

Mockups (PNG beside each HTML, all in `mockups/`, prefix `2026-11-20-watch-it-back-`): `review-first-look-390`, `review-playing-390`, `review-paused-on-shot-390`, `review-unclear-390`, `review-add-here-390`, `review-light-390`, `strip-states` (all nine states), `rail-states`, `fullscreen-844x390`, `decode-390`, `review-order`.

**Where it sits.** Verdict, then the personal-best card, then the player, then the shot list ("Every call · 9"). Tracking quality, "Check again", the breakdown and "Tracker got this wrong? Tell us" move below the list (`review-order`). Save stays last. The player card appears only when `replayFile` exists. The sample and a live run without "keep the video" see no change.

**Per-shot replay merges.** A row's ▶ now scrolls the player into view and runs a *shot review*: play from 2.5 s before the call, pause 0.8 s after it, so the MAKE/MISS flash is on screen and the strip offers Make/Miss. This is what `ShotReplay` did, with the HUD added. Remove the pop-up from `ShotTracker`. Prev/next buttons and a tap on a pin do the same.

**Interaction.**
- Tap the picture: play or pause. Space or K on a keyboard. The picture is the target; the 48 px play button is the labelled one.
- Paused within -0.5 s to +1.5 s of a call (the HUD flash is up): the strip shows that shot, Make and Miss side by side, the current one filled. One tap on the other flips it. The count on the picture and the verdict card update at once.
- Paused anywhere else: "Add a make here" / "Add a miss here". It adds a shot at that time. The strip then shows the new shot (with "Added by you") so it can be flipped.
- Nearest call wins when two are inside the window; prev/next step through them.
- "Not a shot" removes a false call, and the strip offers Undo until the next play or seek.
- Scrub: drag the rail or tap it. Dragging pauses and resumes on release if it was playing. Tapping within 16 px of a pin runs a shot review.
- Speed button toggles 1x and 0.5x. Muted, as `ShotReplay` is; no sound control in v1.

**The rail** (`rail-states`). A 44 px tall slider. Pins sit above the track so they never hide the thumb. Make is a filled emerald-400 dot, Miss a hollow red-400 ring, Unclear an amber-400 diamond, so it reads without telling green from red. The current shot's pin gets a white ring. Played part `bg-white`, unplayed `bg-zinc-500`. If neighbouring pins are under 8 px apart, each becomes a 3 px bar (Make 14 px tall, Miss 8 px, Unclear amber) and the current one turns white; the buttons carry the navigation. A legend ("Make, Miss, Unclear") sits in the card header at `text-xs`.

**Full screen** (`fullscreen-844x390`). Copy `toggleTheatre`: Fullscreen API on the player stage, landscape lock for a landscape clip, a `fixed inset-0 z-50` fallback on iPhone, the `fullscreenchange` listener for the back gesture. The picture keeps its own shape, so the HUD stays on the hoop. Playing: controls hide and a 4 px line along the bottom shows position, with a 44 px exit button top right. Paused: the same rail and buttons in a bottom bar on a black scrim (that scrim is on footage, like the HUD's own), with the Make/Miss/Not a shot or Add pills floating 112 px above it, clear of the hoop. A portrait clip stays portrait, the bar sits over the bottom 210 px.

**Decode screen** (`decode-390`, decode itself unchanged). Same stage and bar. New copy below, and the rail fills with pins as the tracker calls shots (read-only, orange fill as today). The pins are optional (needs `shots` read during decode); the copy is not.

## Copy

| Where | Text |
| --- | --- |
| Card header | WATCH IT BACK (`text-xs font-semibold uppercase tracking-wider text-zinc-400`) |
| Verdict line | "56% · watch it back to check the calls" (replaces "tap a shot to switch make/miss" when there is a video) |
| First look hint | "Press play. Tap the picture to pause, then fix a call or add a shot the tracker missed." |
| Playing hint | "Tap the picture to pause. Then fix a call, or add a shot the tracker missed." |
| On a call | "Shot 7 · 0:31", "Tracker said Make. Tap to change." / "…You changed it." / "Added by you. Tap to change." |
| Unclear | "Unclear. The tracker was not sure." (`text-amber-400`), both buttons unselected |
| No call | "No call here", "Paused at 0:34. Missed one? Add it." |
| Buttons | Make · Miss · Not a shot · Add a make here · Add a miss here · Undo · Watch again |
| After remove | "Shot 7 removed", "It no longer counts." |
| Live recording hold | "The tracker was paused here while the hoop was re-set." |
| End of clip | "End of clip · 5 of 9 made" |
| List heading | "Every call · 9", hint "Tap a time to watch that shot" |
| Decode | Title "Checking every frame of your clip". Body "It does not play the clip, so it is usually quicker than watching it. When it finishes you can watch the clip back with every make and miss marked, and fix any call that looks wrong." Under the rail "Checked 0:28 of 0:48" and "6 calls so far". |

Drop "no shot is missed between frames" from today's decode line: `docs/design.md` says not to claim what the tracker cannot back.

## Build spec

- **New** `src/components/video/WatchItBack.tsx`, with `ScrubRail` and `CallStrip` inside. Props: `file`, `offsetMs`, `timeline`, `shots` (`TrackedShot[]`), `gaps`, `watchRequest {id, nonce}` (from a list ▶), `onSet(id, made)`, `onAdd(made, clockMs)`, `onDelete(id)`, `onRestore(shot)`. It owns playback, the object URL (create and revoke in one effect, as `ShotReplay` does), and the fullscreen state.
- **New helpers** in `overlayTimeline.ts`: `shotsToTimeline(base, shots)` (same frames, rims, gaps; `calls` from the corrected shots, sorted) and `nearestCall(calls, clockMs)` (window above). `clockAtMedia`/`mediaAtClock` map the video time to and from the tracking clock; add uses `clockAtMedia(gaps, video.currentTime*1000 + offsetMs).clockMs`. Pass the same `shotsToTimeline` result to `TrackerVideoExport` so the saved video matches what was watched (founder to OK).
- **Draw loop.** A canvas over the video, sized to its box times the pixel ratio. Draw with `requestVideoFrameCallback` while playing, and on `seeked`, a resize and every edit while paused. Order as `TrackerVideoExport`: `drawRim` (tone from `overlayAt`), `drawBall`, `drawHud` with `replay` false and no corner mark. Use `overlayAt(tl, clockMs, held)`; when `held`, show the hold copy.
- **Duration.** Use `resolveDuration` (a live recording's webm has no length until read). Pins and ▶ for shots beyond the video's length are left out or disabled, with "The recording stopped at 4:10, so shots after that cannot be watched" under the rail.
- **ShotTracker.tsx.** Render `WatchItBack` after the verdict and personal-best cards; move the four blocks below the list; delete the `ShotReplay` render and `replayId`; with a video, hide "Add a make/miss it missed" (it adds a shot with no time, which cannot be replayed, charted or exported); the row ▶ calls `setWatchRequest`; highlight the row whose shot is current (`bg-zinc-800 ring-1 ring-zinc-500`). Row ▶ target `h-9` becomes `h-11`.
- **States.** First look (poster, 64 px play), playing, paused on call, paused on unclear, paused elsewhere, just added, just removed (Undo), held, ended, no calls (header "No shots found. Watch the clip and add any the tracker missed."), video failed ("This browser could not play the video back." as `ShotReplay`), loading (poster and a spinner in the play button until `loadeddata`).
- **Motion and reduced motion.** The HUD flash scales and fades via `flashCurve`; under `prefers-reduced-motion` draw it at scale 1 with the fade only, no smooth scroll to the player, no control fade in full screen (hide and show at once). Playing video is user-started and stays.
- **Edge cases.** Live recordings: gaps, offset and the webm length above. Very long clip: pins collapse to bars, `m:ss` runs to 99:59, `overlayAt` is linear in calls so only profile it past a few hundred. No calls: still shows the picture and the add buttons. Two calls under 1 s apart: nearest wins. A clip above `MAX_FRAMES` (about 80 min) has no ball trail past that point; score and calls still draw.
- **Access.** Rail: `role="slider"`, `aria-valuenow` in seconds, `aria-valuetext` "0:31, shot 7"; arrows ±1 s, Shift+arrows prev/next shot, Home/End. Pins are `aria-hidden`; the list is their text version. Strip has `aria-live="polite"` ("Shot 7 is now a miss. 4 of 9 made."). Make/Miss use `aria-pressed`. Focus ring is the app's orange. Real buttons exist for everything a drag does (WCAG 2.2 Dragging Movements).
- **Tests.** `nearestCall` window, `shotsToTimeline` after a flip, delete and add, time mapping across a gap, the crowding rule.

## Checks

| Check | Result |
| --- | --- |
| Contrast, text on card (dark / light) | Pass. zinc-300 12.5 / 10.2, zinc-400 7.0 / 7.5, zinc-500 5.5 / 6.1, emerald-300 12.2 / 5.2, red-300 9.6 / 6.2, amber-400 10.8 / 4.9. White on `bg-emerald-600` 5.4, on `bg-red-600` 4.8 |
| Contrast, non-text | Pass. Pins emerald-400 9.6 / 5.2, red-400 6.4 / 6.2, amber-400 10.8 / 4.9; unplayed track zinc-500 5.5 / 6.1; thumb white 18.5. (`bg-zinc-600` tested at 2.4 and rejected.) Unselected Make/Miss borders are a 50% tint, so the word and icon identify them, as on today's `ShotReplay` |
| HUD word on footage | Unchanged from the S8 check: large-text 3:1 with the wash and shadow |
| Touch targets | Pass. Play 48, Make/Miss/Add 48, prev/next/speed/Not a shot/Undo/full screen 44, rail 44 tall, pins snap within 16 px. Existing list buttons stay 28-36 px (24 minimum) |
| Type scale, 12 px floor | Pass. New text is `text-xs` labels and `text-sm`; HUD sizes are the live ones. No serif, no gradient text (the scrims sit on footage) |
| One orange | Pass for the player (none). The verdict number and the Save button are already two oranges today, unchanged |
| 360 px | Pass by arithmetic: controls row 224 px of 296 px inner, time label shrinks; legend wraps to the next line below 340 px |
| Not by colour alone | Pass. Make is a filled dot and the word, Miss a ring and the word, Unclear a diamond and "Unclear" |
| Reduced motion | Pass, still version above |
| Dark and light | Pass. `review-light-390`; the stage stays dark through the `bg-black` scope in `theme.css` |
| Children's design | Pass. No streak, timer, guilt or reward; every edit is reversible and local until Save; Unclear is explained, not scolded |
| Data | Pass. The clip stays on the phone; mockups hold made-up data and no person |
| Share safe zones | Not applicable (not a share frame). The saved video is `TrackerVideoExport`'s |

Not tested: the real canvas HUD on a portrait clip in full screen and at 360 px. My scene is a drawing. The builder or I should look at the preview at 390 inline, sideways, and 9:16 as the S8 lesson asks (knowledge file, 2026-11-13).

## Trend board lines used (`../trends/visual.md`, 2026-11-11, within 14 days)

- Nike 2025 youth work "showed the miss before the make": a Miss pin is a full pin, a ring, never hidden or dimmed.
- Teens meet the game through clips, so every result screen should survive a screen recording: the paused frame with MAKE beside the rim has no app UI over the picture except the existing full-screen button.
- WHOOP "at most three dials, tap for the breakdown": the strip shows one shot's call, with the list one level down.
- Findings added today (`../knowledge/findings/designer.md`): W3C APG media seek slider (spoken time, buttons beside drag) and Apple HIG playing video (custom player only when the system one cannot do the job; keep the usual gestures).

## Hand-over and founder decisions

D1 stays `idea` (the lead owns the backlog). Build note for it: new `WatchItBack.tsx`, helpers in `overlayTimeline.ts`, edit `ShotTracker.tsx` (review step, decode copy at line 1813); reuse `overlayArt.ts` and `Button` sizing; delete the `ShotReplay` use. Founder to decide:

1. Approve A, and retire the pop-up replay.
2. Hide the untimed "Add a make / miss it missed" buttons whenever a video exists.
3. Move quality, "Check again", breakdown and the report link below the shot list.
4. Make saved videos show the corrected calls (today they show the tracker's first calls).
5. Show pins filling in on the decode screen (optional).
6. Muted playback with no sound control in v1.

`docs/design.md` needs no change to build this; after it ships I would add one line under Motion naming the player as part of the tracker overlay space. Not proposed until the founder approves.
