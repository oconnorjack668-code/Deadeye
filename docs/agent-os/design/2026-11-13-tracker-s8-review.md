Skills: all 8 loaded (designer-playbook read from its file: the designer agent type is not registered in this session)

# Review: tracker redesign S8 (branch worktree-tracker-visuals-s8) · 2026-11-13

What I reviewed: commits 69a484e and aac9865 (`overlayArt.ts`, `TrackerHud.tsx`). The founder asked
for: flame beside the count, not over it; MAKE/MISS beside the rim; no underline on the end card.
I rendered the real components over the sample poster with `SAMPLE_RIM` on a temporary page (now
deleted): live inline at 390 px, full screen sideways 844x390, light theme, CHECK THIS ONE, a
milestone banner, camera-moved warnings, saved 16:9, saved 9:16 with safe-zone guides, 9:16 end card.

**Verdict: ship with changes.** All three of the founder's asks are met, and in full screen and in
16:9 saved video it looks good. At phone width inline and in the 9:16 export, the call does not
fit: it runs to the edge and sits over the full-screen button and the "Fix rim" button. Fixes 1 to 4
are must-fix. Mockup of the fix: `mockups/2026-11-13-tracker-call-proposed-390.png`.

## What I saw

- Full screen 844x390 and 16:9 saved: the word sits just right of the rim, the hoop is clear, the
  flame sits after the %. Clean. Good, keep it.
- Live inline at 390 px (stage 358 px wide, about 166 px tall): the stack is MAKE `text-5xl` +
  count + "4 IN A ROW" (about 110 px tall). The 5.5rem / 100%-4rem clamp leaves its middle only
  88 to 102 px, so the stack touches the "Ball tracked" pill, "4 IN A ROW" and "CHECK THIS ONE"
  run over the 44 px full-screen button, and MAKE ends 4 px from the frame edge.
- Camera moved + Too dark: MAKE covers the "Fix rim" button and hides "Too dark" completely. That is
  a control and a warning, both hidden when the player needs them.
- Saved 9:16: the call uses the HUD area's unit (u = 3), so MAKE is 144 px tall on a picture only
  608 px tall. It runs off the right edge (x 1080) and out of the safe zone (x 65 to 1015). My
  canvas fell back to a narrower font than Geist 900, so in the real export it is worse.
- A rim further right (right edge past about 0.70) leaves less room than the word needs at inline
  size, because `CALL_ROOM` (0.22) is a share of the width, not pixels.
- The end card: red logo beside DEADEYE, no underline, % line zinc-300. Matches the brand rules.
  The corner mark has no underline either. Light theme: the HUD looks the same as dark (the
  `bg-black` scope in theme.css works).

## Changes

1. **Must-fix. Beside the rim, show the word and the "check this one" pill only.** Drop the
   `{makes}/{attempts}` line and the "N in a row" line from the beside-rim stack, live
   (`TrackerHud`) and saved (`drawFlash` when `at` is set). The centred fallback can keep them.
   Why: the score top left changes at the same moment and the "Heating up · 4" pill already says
   the run. Each line repeats something already on screen (minimal design). The white 20 px count
   over the bright wall measured 2.5:1 (90th-percentile pixel), under 4.5:1. This also halves the
   stack so it fits. **Founder to OK:** `docs/design.md` lists "the shot call adds '3 in a row'" as
   part of his 2 Nov flame choice.
2. **Must-fix. Size the word to the view.** Live inline (`theatre` false): `text-3xl` (32 px).
   Theatre: keep `text-5xl sm:text-6xl`. Saved: `big = 48` times `hudUnit(pic.w, pic.h)`, so the
   picture's unit and not the area's (9:16 sample: 81 px instead of 144 px). Use the same unit for
   the pill.
3. **Must-fix. Check the room in pixels, not as a share of the width.** Change `callSpot(rim)` to
   `callSpot(rim, need)`, where `need = (word width + 12 px) / box width`. Canvas: get the word
   width from `ctx.measureText`. 9:16: also keep the word's right edge at or left of x 1015. Live:
   measure the HUD box with a ResizeObserver and the word `<span>` with a ref (or estimate 2.9 x the
   font size for MAKE/MISS). Try right, then left, then centre, as now.
4. **Must-fix. Clamp the live call against what is really there.** Put the word's middle at
   the rim's height (`transform: translateY(-wordHalf)` on the word, not the whole stack), with
   `top: clamp(minTop, rimY%, calc(100% - 3.5rem - (stack - wordHalf)))`.
   `minTop = statusBottom + 0.5rem + wordHalf`. `statusBottom` = 2.25rem with no warning, else
   `0.75rem + n * 2rem + (n - 1) * 0.375rem` for n warning pills (each is `min-h-8` with Fix rim).
   3.5rem keeps it clear of the full-screen button (`bottom-1.5`, `h-11`) and the dots. This
   replaces the 0.28 floor in the live HUD, so the word sits level with the rim when there is room.
   The mockup uses these exact numbers. It clears every element in all five cases at 390 px.
5. **Nice-to-have.** Inline, once the call rises to rim level, MAKE starts about 3 px after the
   flame. Keep a 12 px gap (`left >= flame right + 0.75rem`), or else push the call down to
   `minTop + 1rem`.
6. **Nice-to-have (was already there).** In 9:16 the "Ball tracked" pill ends at about x 1044, past
   the safe line at 1015. Inset it to x 1015 when `area` is a vertical one.
7. **Nice-to-have, founder approval.** In `docs/design.md`, change the streak paragraph to:
   "At 3 makes in a row a flame stands beside the score, after the % (`StreakFlame`), and a pill
   reads 'Heating up · 3'...". Leave out "the makes count burns" and "the shot call adds '3 in a
   row'" if 1 is approved.

## Checks

| Check | Result |
| --- | --- |
| Contrast | Word passes the large-text 3:1: emerald-300 3.5 to 5.5:1, red-300 3.1 to 5.4:1 on the washed footage, with the shadow on top. The small white count is 2.5:1 on the bright wall: **fail** (fixed by 1). End card: white 19:1, zinc-300 14:1, zinc-400 7:1: pass |
| Touch targets | The call covers "Fix rim" and the 44 px full-screen button: **fail** (fixed by 1 and 4) |
| Type scale, 12 px floor | Pass (`text-6xl` in theatre was already there) |
| One orange | Pass under the founder's streak exception. The orange "4 IN A ROW" line was a fourth orange item (fixed by 1) |
| 360 px and 9:16 safe zones | **Fail**: clipped at 390 inline, off the frame and out of the safe zone in 9:16 (fixed by 2 and 3) |
| Reduced motion | Pass: no new motion, the flame holds still |
| No player data or identity | Pass |
| MAKE/MISS not by colour alone | Pass: the word is always there |
| Dark and light | Pass: same as each other |
| Founder's three asks | Pass: flame beside, call beside the rim, no underline (end card and corner) |

## Screenshots (job tmp, not in the repo)

`C:\Users\Vivobook S16\.claude\jobs\5a5d342e\tmp\designer\`: `live-dark-390.png`,
`live-light-390.png`, `fullscreen-844x390.png`, `fullscreen-check-844x390.png`, `saved-16x9.png`,
`vertical-9x16.png`, `vertical-check-9x16.png`, `endcard-9x16.png`, `proposed-390.png`.
Note: headless Chrome would not go below a 512 px viewport, so the live panels were pinned to a
390 px column. That works because the HUD's only breakpoint is `sm:` (640 px).
