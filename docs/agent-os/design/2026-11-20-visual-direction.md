Skills: all 8 loaded

# A new visual direction for Deadeye: three options · 2026-11-20

**Problem.** The founder (20 Nov): the screen-review mockups made pages "simpler and less professional"; the app should be "professional, futuristic, vibrant, high quality icons, nice looking text font", so a player thinks "wow this app looks cool". The review designed down to the quiet rules in `docs/design.md` (one orange, no glow, no gradient, no icon tiles, lucide only, Geist). **For:** 13 to 19 year old players, first on the screens that decide activation: Today for a new player, the result after the first session (D2), and Watch it back (D1). Draft; nothing is built, shared or in `docs/design.md`.

The real fixes in the review still stand (contrast, plain words, the SMTP text, the NBA placeholder, touch targets, the sideways scroll). This doc changes how the same screens look and what they hold, never what they fix. Every mockup below keeps the content of the earlier D2/D6/D1 proposals and adds colour, depth, icons and motion.

## What I looked at

The saved review (`2026-11-20-screen-review.md`, before shots `mockups/2026-11-20-review-before-*`, proposals `review-home`, `review-first-session`), the D1 doc and its mockups (not the live site again, as asked), `docs/design.md`, and the trend board refreshed today (`../trends/visual.md`, 9 new dated lines: Liquid Glass, NBC and Prime NBA graphics, Strava, WHOOP, Valorant, FC 26, 2K26, Ypulse). Facts from the app used in the mockups: badge names and tiers from `achievements.ts` (First Session, bronze, +50 XP), level 2 at 60 XP and level 3 at 140 XP, first session +20 XP, the Deadeye mark in `public/logo.png`.

## The three directions (`mockups/2026-11-20-direction-overview.png`, all nine screens)

Same three screens in each: `2026-11-20-direction-{a,b,c}-{today,result,watch}.html` and `.png` in `mockups/`. Made-up data; the name "Sam" is invented.

| | **A. Arena** | **B. HUD** | **C. Glass** |
| --- | --- | --- | --- |
| One line | A broadcast scoreboard for your own practice | The Deadeye viewfinder (the brackets and reticle in the logo) becomes the interface | Ember light behind frosted glass, soft depth, the "expensive" look |
| Trend lines | NBC NBA graphics 2026, Valorant menus | NBA on Prime LED court, Valorant contrast, WHOOP heavy main action | Liquid Glass 2025-26, Strava premium motion, Ypulse dark and sleek |
| Display font | Barlow Condensed 900 italic, uppercase | Chakra Petch 700 (squared, techy) | Bricolage Grotesque 800 (warm, tight) |
| Body, labels | Barlow 500 | Geist (already in the app), Geist Mono 12px caps labels | Plus Jakarta Sans 500/600 |
| Colour | Black base, red `#FF2D4A` (logo), orange `#FF6B1A` to `#FF9A1F` (action), amber `#FFC933` (XP), make `#35E08A`, miss `#FF5468` | Blue-black `#05070D`, cyan `#5CE1FF` (chrome), orange `#FF6A1F` to `#FFA21F` (action), make `#3DF5A0`, miss `#FF6377`, amber XP | Ink `#08080C` with ember, crimson and violet light, orange `#FFB35C` to `#FF5A2E` (action), make `#34D399`, miss `#FB7185` |
| Icons | Phosphor **fill** in chamfered orange tiles | Phosphor **bold** in cyan-glow tiles, duotone for the ball and badge | Phosphor **duotone** in glowing glass tiles, glossy medal for badges |
| Depth | Hard shadows, speed stripes, flat colour blocks, chamfered corners (`clip-path`) | Glow, corner brackets, dot grid, court lines at 9%, gauge rings | Backdrop blur, specular edges, blurred light blobs, grain |
| Stat numbers | 178px italic condensed, black on an orange wedge | 82px squared digits inside a 60% gauge ring, cyan slash | 170px tight, soft ember glow, 60% in amber |
| Overlay on the clip | Skewed scorebug plate, orange rim ring, green "MAKE" arrow tag | Bracketed reticle on the rim, dotted trail, leader line to a mono "CALL" plate | Glass pills, glowing rim rings, mint check "Make" pill |
| Motion (not drawn) | Plates wipe in (clip-path, 180 ms), numbers slam from 1.15 to 1, MAKE flashes | Gauge sweeps once (700 ms), a scan line crosses the rim, reticle locks on at a make | Light drifts, numbers fade-scale in, medal settles with a spring |
| Reduced motion | No wipe, no slam: plates and numbers appear at once | Gauge and reticle drawn full, no sweep or scan | Blobs still, numbers appear at once |
| Risk | `clip-path` clips focus rings; two new fonts; loudest, least "premium" | Glow on cheap screens is cheap (box-shadow); a second chrome colour (cyan) joins orange | `backdrop-filter` is heavy on low-end Android and the Liquid Glass look is divisive; most text sits on a vivid blur |

All icons are Phosphor (MIT). All fonts are open-licence Google Fonts through `next/font/google`, as Geist is today (licence files not re-read: check at build).

## Recommendation: B, HUD

1. **It is ours.** The brackets and reticle are already in the logo, so the look reads as Deadeye and nobody else's, which A (a generic scoreboard) and C (an iOS look) do not. "Dead-eye" is aiming; the interface is the viewfinder.
2. **It is futuristic and professional at once.** Thin line work, mono data labels and gauge rings read as instruments, not toys; the orange button with glow is the one hot thing, so the next action is still obvious.
3. **It is the cheapest to build well.** Body font stays Geist, Geist Mono is already loaded, glow is `box-shadow`/`drop-shadow`, shapes are normal rounded rectangles so focus rings work, and it survives a low-end phone. Its text contrast measured best: no failing line and no thin line on all three screens.
4. **It carries the tracker.** The reticle is a better rim marker than a ring on real footage (see the three `watch` PNGs), and a make "locks on" in a way players already know from games.
5. Cyan is already in `docs/design.md` as "neutral information"; B widens that to "HUD chrome", which is a smaller change than introducing a new accent.

Second choice: **C** if the founder wants warmer and softer; the Today and result screens are the most striking there. **A** is the loudest and the most sports-broadcast; I would use pieces of it on share cards (the huge italic number on an orange wedge is a good 1080x1920 card) whichever direction wins.

## Checks (measured on the rendered pixels with `mockups/2026-11-20-direction-contrast.mjs`, text over the real footage included)

| Check | A | B | C |
| --- | --- | --- | --- |
| Text 4.5:1 (3:1 large) | pass: 77 runs, 0 fail; thinnest the decorative "/" in 6/10 at 4.2 | pass: 79 runs, 0 fail, none thin | pass: 73 runs, 0 fail; thinnest "60%" 48px at 4.2 (needs 3) |
| Over footage (overlay text) | pass: plates at 84% black | pass: plates at 84% black, mint about 9:1 worst case | pass: glass at 74% black plus blur |
| Primary button text (computed) | `#0B0B0E` on the orange ramp 5.8 to 9.3:1 | `#05070D` on the orange ramp 7.0 to 10.0:1 | `#160A04` on the ember ramp 6.3 to 11.1:1 |
| Control borders 3:1 | `#6F6F7C` on `#16161B` about 3.7 | cyan at 70% on card about 6.3 | white at 55% over glass over 4 |
| Touch targets | play 52x48, Make/Miss 52, rail 44, others 44 | same | same |
| Type scale, 12px floor | pass (labels 13px) | pass (labels 12px mono) | pass (12px low) |
| One orange per screen | pass (Log shots and the Log button are the same action) | pass (the ball in the Today art is decorative) | pass |
| MAKE/MISS not by colour alone | pass: dot, ring, diamond and the word | pass | pass |
| Not rendered | 360px (the stat trio at 104px cells is the tightest), the light theme, a real phone, a portrait clip in full screen | same | same |

Measured by script, not by eye; the "thinnest" values are what to watch if a builder changes a colour. Light theme: none of the three is designed in light here. B and A would need a light variant of the chrome (cyan-700 text, white cards); C's glass would need a different recipe. This is a gap, not a pass.

Honesty notes: the shot chart and the badge and level card on the result screen are **proposals** (the badge, XP and level exist; showing them on the result does not). The "0 / 60 XP" chip on Today is new. The overlay restyle on the tracker is the founder's to approve (`docs/design.md` describes the overlay). The mockups contain no player's real name or face except the gym footage below.

## Proposed `docs/design.md` changes for B (not applied)

```diff
 ## The look
-Dark by default with a light theme (below), quiet zinc surfaces, one orange for what to do next, heavy type for the numbers that
-matter. A training tool, not a SaaS landing page.
+Dark by default with a light theme (below). A heads-up display for your own practice: blue-black surfaces, cyan line work and
+corner brackets taken from the Deadeye mark, one hot orange for what to do next, big numbers in a squared display face. Vibrant
+and premium, never plain. A training tool, not a SaaS landing page.

 | Font | Geist sans (body), Geist mono only for code-like values |
+| Font | Chakra Petch 700 for headings and big numbers (`font-display`), Geist body, Geist Mono 12px caps for data labels |
-| Icons | `lucide-react` only, `h-4 w-4` inline or `h-5 w-5` in buttons |
+| Icons | Phosphor (`@phosphor-icons/react`, MIT): bold for controls and tabs, duotone for badges and art, fill for small status. Lucide stays until a screen is redone |
+| HUD card | `rounded-md border border-cyan-300/35 bg-gradient-to-b from-[#121E34]/80 to-[#090F1C]/85` plus `.hud-brackets` (cyan corners) |
-| Primary button | `<Button>` (orange-600, `rounded-xl`, `h-11`, the 44px touch target) |
+| Primary button | `<Button>`: `bg-gradient-to-r from-[#FFA21F] to-[#FF6A1F] text-zinc-950 font-display font-bold rounded-[10px] h-12`, orange glow `shadow-[0_0_26px_rgba(255,106,31,.5)]`. Dark text on bright orange: 7.0 to 10.0:1 |

-One scale ... 12 · 14 · 16 · 20 · 24 · 32 · 48
+One scale ... 12 · 14 · 16 · 20 · 24 · 32 · 48, plus one display size for result numbers and share cards (`text-display`, 82 to 92px)

 | Cyan (`cyan-300/400`) | Neutral information | Workload note icon |
+| Cyan (`cyan-300/400`) | HUD chrome and information | Card brackets, active tab, scrub fill, ring |
+| Make / Miss | Mint `#3DF5A0` / coral `#FF6377` (or emerald-400 / red-400), always with a word, dot or ring | Tracker, rail pins |

-- **Icons in coloured rounded squares** as decoration ...
+- **Icons in tiles**: allowed, one style: a 38px `rounded-lg` cyan-tinted tile with a Phosphor bold icon. No new multi-colour tiles.
-- **Gradients everywhere.** One highlighted card per screen ...
+- **Gradients**: allowed on the hero card, the orange button, progress fills and rings. Never on text that has to be read.
-- **Glowing coloured shadows.** Buttons keep their faint ...
+- **Glow**: allowed on the orange button, active icons, brackets and the ring (blur at most 30px, at most 50% alpha); never on body text.
+- **Glass**: still no stacked blur; `backdrop-blur-sm` on the tab bar only.
```

Also needed with it: `src/app/theme.css` light variant of the chrome, a one-line Motion entry (gauge sweeps once, scan line once on the tracker, both still for reduced motion), and the tracker overlay paragraph (reticle brackets and plates, `overlayArt.ts`).

## How the earlier mockups are redone once the founder picks (B shown; A and C follow the same list)

| Item | Redo |
| --- | --- |
| D1 Watch it back | Done here (`direction-b-watch`): HUD card, bracketed reticle and leader line on the rim, mono "CALL" plate, glow rail pins, orange play, mint Make. Still to redraw: the five other D1 states (playing, unclear, add here, full screen, decode), light, 844x390. |
| D2 First-session result | Done (`direction-b-result`): gauge ring, chart, badge and level card. Redraw the 1080x1920 share card (D7) from the same ring. |
| D3 Check your email | A scanning reticle while it waits (still for reduced motion), two mono-labelled steps, orange "Send it again" with a 60 s ring, plain words as in the review. |
| D4 Setup | Segmented tick rail "Step 2 of 3", HUD-tag chips at 44px, full-width orange Next, no tab bar; words as in the review (13-15, club, school, "Defence"). Draw the mockup E the review never drew. |
| D5 Sign-up and sign-in | Inputs in HUD cards with cyan borders (6.3:1), sentence-case 14px labels, "e.g. Sam", orange "Create your account". |
| D6 Today for a new player | Done (`direction-b-today`): one hero, three stats, level card, no Pro offer before a log. |
| D7 Share cards | 1080x1920 gauge ring and giant number inside the safe zone, brackets, name off by default; a 1080x1350 version; from A, a loud orange-wedge variant for socials. |
| D8 Sideways scroll | Unchanged fix (`overflow-x-clip`); the HUD glow lives inside that wrapper. |
| Landing, Log menu | Landing hero with the tracker clip first and the bracketed reticle on the rim; Log menu rows as HUD cards with Phosphor bold icons, one orange. |

Build order if approved (builder): tokens, fonts, `Button`, `Card` and the bracket class first (M); then icons and the three screens above (M); then the rest of the app by area (L). Phosphor adds a dependency: import icons one by one so the bundle stays small.

## Founder decisions

1. **Pick a direction**: A, B (recommended) or C, or "B with pieces of A on share cards".
2. **Approve changing the quiet rules** in `docs/design.md` (glow, gradients, icon tiles, glass, Phosphor, a display font), as the diff above. Nothing changes until you say yes.
3. **Dark text on the orange button** instead of white (more contrast and more vibrant, but it changes the primary button everywhere).
4. **One display number size** outside the type scale (82 to 92px) for results and share cards.
5. **Restyling the tracker overlay** (reticle and plates instead of today's look): your call, since the overlay has its own rules.
6. **The footage.** The three `*-watch.png` mockups and `direction-footage-frame.jpg` and `direction-overview.png` show a frame from `20261118_174626.mp4` (a make at 0:11, two people in a gym, one with their back to the camera). You confirmed consent for them. They stayed local and were not sent to any outside service, but they are now files in the repo folder: decide whether they are committed, or kept out and rebuilt locally. The pages run from `mockups/` and fetch only Google Fonts.
7. **Light theme.** None of the three is drawn in light. Do you want a light theme to keep looking like this, or dark only?
8. Whether to test the three PNGs on a handful of players and parents before the rebuild (the research has no teen evidence on glow or glass).

## Files

- Trend board: `docs/agent-os/trends/visual.md` (refreshed). Findings: `docs/agent-os/knowledge/findings/designer.md` (new section). Knowledge file: lessons and two checklist lines.
- Mockups (`docs/agent-os/design/mockups/`): `2026-11-20-direction-{a,b,c}-{today,result,watch}.html/.png`, `2026-11-20-direction-overview.html/.png`, `2026-11-20-direction-footage-frame.jpg`.
- Tools: `2026-11-20-direction-build.mjs` (with `-common`, `-a`, `-b`, `-c` modules; needs `@phosphor-icons/core` via `PHOSPHOR_DIR`), `2026-11-20-direction-shot.mjs` (390px at 2x through Chrome's DevTools protocol), `2026-11-20-direction-contrast.mjs` (pixel contrast).
