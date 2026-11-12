# Deadeye video style

How a Deadeye video looks and sounds, so every cut matches without the founder
having to say it again. For TikTok, Reels and Shorts at 1080x1920. It follows
the app's own rules (`docs/design.md`) and the founder's corrections (the video
editor's knowledge file, `docs/agent-os/knowledge/video-editor.md`). Where this
file and a founder lesson disagree, the lesson wins: fix this file.

Written 2026-11-11 from `docs/design.md`, `public/logo.png`, the app's tracker
export (`src/lib/video/overlayArt.ts`) and the first promo the founder chose
(`docs/brand/promo-classic/`).

## The feel

A real player's session, filmed on a phone, made easy to watch. Not a TV ad.
Polish goes into the sound, the framing, the timing and the legibility; the
footage keeps its phone-camera look. One idea per video, one device (a single
take, a count going up, a before and after), not a pile of effects.

## Colours

The app's palette only. No new colours, no gradients on text, no glow.

| Use | Colour | Hex |
| --- | --- | --- |
| Background (end card, title card) | zinc-950 | `#09090b` |
| Caption plate | near-black | `#0b0b0d` |
| Main text, big numbers | white | `#ffffff` |
| Secondary text | zinc-300 | `#d4d4d8` |
| The one action (the address, "Try it on your shots") | orange-500 | `#f97316` |
| Brand mark and the one emphasised word | red (the first promo's) | `#ff3b3b` |
| A make (only where the app shows it) | emerald-400 | `#34d399` |
| A miss (only where the app shows it) | red-400 | `#f87171` |

- **The logo is red**: `public/logo.png`, a red ball (about `#f93544` to
  `#db1926`) with black lines and a dark red rim (`#7d0d18`). Use the file
  as it is. Never recolour it, redraw it, make it orange, or put an underline
  under the DEADEYE wordmark.
- **Orange means "do this"**: one element per video, the action at the end.
  If orange appears anywhere else, it has lost its job.
- Red `#ff3b3b` on the `#0b0b0d` plate is about 5.6:1, white about 19:1; both
  pass the 4.5:1 caption rule.

## Type

- **Captions and titles**: Anton (SIL Open Font License, already in
  `docs/brand/promo-classic/assets/fonts/`), upper case, the condensed heavy
  look the founder chose in the first promo. Spoken captions about 96 to 108 px;
  a one-word title up to 132 px.
- **Numbers and the end card**: Geist, weight 900 (the app's font), so numbers
  look like the app's numbers. Secondary lines Geist 600 to 700.
- Two families at most in one video. No serif, no script, no outline-only
  text.

## Captions

- White Anton on a tight `#0b0b0d` plate (padding about 0 32 px, radius
  about 6 px), as in the first promo. The plate sits behind the words only.
  A full-width bar, a darkened band or a blurred strip over footage is not a
  caption plate and is not allowed.
- Spoken captions are timed from the voice track's word timestamps
  (`npx hyperframes transcribe`), one phrase at a time, at most 2 lines, each
  line fitting the 800 px safe width (x 140-940) at this size. The word being said can turn red
  (registry: `caption-highlight` or `caption-pill-karaoke`, recoloured to
  these colours). No bouncing, spinning or emoji captions.
- Read-alone text (a number, the end card) follows 17 characters a second and
  stays up at least 1 second.
- Placement: inside x 140-940, y 270-1250. Captions sit in the upper middle
  band, clear of the hoop and the ball's path, and never over the app's own
  count or MAKE/MISS words.
- Motion: in about 200 to 250 ms easing to a stop, out about 150 to 200 ms; one
  moving text element at a time. The app's own curve is
  `cubic-bezier(0.2, 0, 0, 1)`.

## Pacing

- Frame one is the shot going up, never a logo or a black card. Deadeye is
  named by 3 s.
- Most finished videos are 9 to 25 s. Cut every 1.5 to 3 s on average, but vary
  it: short cuts in the build, the payoff held longest.
- Real speed first, then the app's slow-mo replay. No speed-ups that make the
  app look faster than it is (the MISS call stays at real time).
- Cuts on action (the release, the ball in flight); the sound carries across
  them.

## Sound

- **Voice**: a real voice first: an adult's, or the founder's with a parent's
  OK (marketing's rule). Plain, Irish, unhurried, about 145 to 160 words a
  minute. A synthetic voice only if the founder picked it from samples, with
  the AI label on. The old Kokoro voice is not used unless the founder chooses
  it again.
- **Music**: a steady, warm beat with drive, the feel of training on your own
  (hip-hop or electronic, no lyrics under a voice, nothing sad or epic). Only
  from TikTok's Commercial Music Library or Meta's Sound Collection, added by
  the founder in the app, unless the founder approves a licensed track that
  covers both platforms and its licence is recorded. Under a voice, the bed
  sits about 15 to 18 dB below it.
- **Effects**: the swish on the net frame, the rim on a miss, a soft tick when
  the count changes, a small hit on the logo. Room tone under everything; no
  digital silence. No whooshes on every cut, no air horns, no crowd noise that
  suggests a game that didn't happen.
- **Loudness**: -14 LUFS integrated, true peak -1.5 dBTP or lower.

## End card

zinc-950 background, the red logo, the action in white Anton or Geist 900
("Try it on your shots."), the address in orange, at most three lines, held at
least 1.5 s. The numbers, if any, are small and come before the card.

## Avoid

- Darkened, blurred or patched areas over footage, full-frame dark washes and
  vignettes added to make text readable (the plate does that).
- Overlays the app didn't draw that look like tracking (lines, rings, trails),
  unless placed from the tracker's own data and checked on stills.
- The streak flame and the MAKE/MISS banners as the hero, until the tracker
  redesign ships.
- Stock footage, other people's clips, celebrities, AI-generated people or
  courts.
- Orange anywhere but the one action; an orange logo; an underline under
  DEADEYE.
- Glow, glassmorphism, gradient text, 3D titles, emoji in titles.
- Words that promise too much: "every shot", "never misses", "100%", "go pro".
