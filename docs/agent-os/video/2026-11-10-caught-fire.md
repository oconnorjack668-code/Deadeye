# Edit log: "It caught fire" (Tue 10 Nov post)

Folder (outside git): `Documents\deadeye-recordings\2026-11-10-caught-fire\`
Source: the app's "Video with the tracker" export of bench clip 16761
(`56f1d82e-...mp4`, 1080x1920, 120 fps, 177.7s, no audio, full colour range),
saved by the founder 2026-11-09. Script: `docs/agent-os/marketing/2026-11-09-scripts.md` §1.
Made by the marketing agent (v1 to v4 scripts) before the video editor existed;
v4 rendered and mastered by the lead session.

## Versions

| Version | Files | Length | What changed |
| --- | --- | --- | --- |
| v1 | `caught-fire-MAIN-B-score-first.mp4`, `caught-fire-ALT-C-miss-first.mp4` | 20.5s, 19.0s | Six trims of the export plus text; flame avoided; silent |
| v2 | `caught-fire-C-v2-silent.mp4`, `-voice.mp4` | 16.0s | Founder picked C; 1.6x zoom; own end card (logo, app colours, no underline); Kokoro `am_adam` voice; synthesised effects |
| v3 | `caught-fire-C-v3-silent.mp4`, `-voice.mp4` | 12.4s | After one teen critique: ball moving on frame 1, room tone and ticks, banners kept whole, replay trimmed, action-led end card |
| v4 | `caught-fire-C-v4-silent.mp4` (main), `-voice.mp4` | 9.2s | After the six-critic panel: cold open on the live 4/9 make, 1.98x band crop (HUD, wordmark, chip out), 3/8 beat dropped, numbers line before the card, sounds on contact frames, -14 LUFS |

## v4 beat sheet (export times)

| Cut | Source | Picture | Caption (voice) |
| --- | --- | --- | --- |
| 0.00-1.37 | 53.60-54.10, 53.85-54.00 at half speed, 54.10 held | Live 4/9 make, ball seen in the net before the banner | "Deadeye / keeps score." |
| 1.37-3.00 | 38.45-40.05 | 1/6 miss: rim 38.82, MISS 39.50 (real time) | "It counts / the misses too." |
| 3.00-4.67 | 43.20-43.85, 43.55-43.70 at half speed, 43.85 held | 2/7 make | "Phone on a bag. / Just shoot." |
| 4.67-6.50 | 168.00-169.05, held | The app's slow-mo of 4/9 | "10 of 31 made · best run 3" (no voice) |
| 6.50-9.00 | — | End card: logo, "Try it on / your shots.", deadeyeapp.vercel.app | (voice) |
| 9.00-9.23 | 53.40-53.60 | Loop tail into the cold open | — |

Sounds: swish 0.41, clank 1.74, MISS tick 2.50, swish 3.51, slow swish 5.35, logo hit 6.50, chime 8.55; room tone under all.
Silent master: gain +16.4 dB then a limiter (two-pass loudnorm could not reach -14 on this peaky mix): -14.2 LUFS, -1.6 dBFS.
Voice master: two-pass loudnorm: -14.3 LUFS, -1.4 dBFS.

## Checks (v4)

- Pass: frame 1 moves; ball reaches the rim before each banner; banners whole; no flame (it is HUD-only and the HUD is cropped out); numbers are the app's; captions in the safe box; sounds within ~3 frames of their events (measured on the banner tint); no silence; length.
- Not verified: a real-speed watch on a phone (founder).
- Open: the crouching bystander is still in the miss beat; the shooter's face is larger at 2x.

## What went wrong on the way (now lessons)

- The export's slow-mo replays shift every timestamp from the source clip; find moments on stills.
- Full-range export joined to limited-range segments made the end card grey until every segment was converted to limited range.
- Segment lengths came out up to 0.2s longer than planned (frame rounding on slowed and held pieces), so sound times were re-measured from the built picture.
- A "silence count" check that finds no silence makes `grep -c` exit 1 and stops a `set -e` script.

## Founder decisions

- Consent for the shooter and the bystander (a parent's written OK if under 18), or drop the miss beat.
- Silent or voice version (voice needs the AI label on both apps).
- The domain (vercel.app read as a scam link to every critic).
- New footage: phone on a bag in shot, head height or higher, not facing the windows, nobody else in the hall, and a girl player for some posts.
