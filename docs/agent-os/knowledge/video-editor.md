# Video editor knowledge

Last researched: 2026-11-10 (about 55 sources; full findings, craft playbook and
ffmpeg recipe in `docs/agent-os/video/playbook.md`)

Read `README.md` in this folder for how this file works. What a video should
say, and the marketing research, live in `marketing.md`; read its lessons too.

## Lessons from the founder and the critic panel

Newest first. Seeded from the first tracker video (v1 to v4, 9-10 Nov 2026;
edit log `docs/agent-os/video/2026-11-10-caught-fire.md`).

- 2026-11-10 · The founder: the marketing agent "doesn't make the best videos"; a
  separate editor with the video skills should cut them. **Rule:** use
  HyperFrames for captions, motion, punch-ins, end cards and mixing; plain ffmpeg
  trims alone are not a finished video.
- 2026-11-10 · Six critics: five swiped before the payoff at 8.5s. **Rule:** cold
  open on the best real moment; every clip starts at the action; no beat repeats
  another; target 9 to 15s unless the script needs more.
- 2026-11-10 · Six of six: the ball was never seen going in (the app's MAKE banner
  sits over the rim). **Rule:** hold or slow 0.2 to 0.4s so the ball is seen in
  the net before the banner covers it; end a make on the ball in the net, before
  the tracking ring wanders.
- 2026-11-10 · The footage filled 41% of the screen. **Rule:** crop the footage
  band so the action fills y 270 to 1250 or more; leave out the HUD clock, dot
  row, wordmark and status chip by not cropping them in, never by covering them.
- 2026-11-10 · Swishes landed 0.4 to 0.5s before the net; ticks were lost under
  the hum; the silent cut was -21 LUFS. **Rule:** every hit on its contact frame
  (0 to 1 frame late, never early), measured on the built picture, not the plan;
  master both versions to about -14 LUFS, true peak -1.5 dBTP.
- 2026-11-10 · "10/31" read as a date, "32%" invited mockery, the end card had
  ~50 characters a second. **Rule:** write "10 of 31 made"; lead the end card
  with the viewer's action; at most three short lines at 17 characters a second.
- 2026-11-10 · "Calls my shots" is hoops slang for announcing a shot; "Put the
  phone down" read as anti-phone. A voice saying "my" didn't sound like the
  shooter. **Rule:** check every line as a teen player would hear it; a synthetic
  voice never says "my".
- 2026-11-09 · The founder dislikes the streak flame (it covers the count) and the
  MAKE/MISS look. **Rule:** never make the flame or the banners the hero; the
  flame is drawn only in the HUD, so a crop without the HUD avoids it.
- 2026-11-09 · End card: the logo, the app's colours, no orange underline under
  DEADEYE. **Rule:** `public/logo.png` on zinc-950, white, zinc grey, orange only
  for the one action.
- 2026-11-09 · The founder chooses between versions. **Rule:** every version is a
  new file; never overwrite one; list them side by side in the edit log.
- 2026-11-09 · TikTok has no bio link. **Rule:** end cards and TikTok captions
  show the address; "link in bio" is for Instagram only.
- 2026-11-09 · Founder: an AI voice is allowed, "whatever is best". **Rule:** make
  the silent cut the main version (every critic disliked the voice); a voice
  version is an option with the AI label on.
- 2026-11-09 · Landing wording had changed on main while the worktree was 27
  commits behind. **Rule:** check on-screen wording with
  `git show origin/main:src/app/page.tsx`.
- 2026-10-21 · The rim line ran onto the bracket. **Rule:** check every overlay at
  full size on stills, including fast frames.
- 2026-10-20 · Captions drifted from the voice; darkened patches hid footage.
  **Rule:** one voice clip per phrase; never darken or blur a block.

## Technical lessons

- A saved tracker video with slow-mo replays does not share the source clip's
  timestamps: find every moment on stills of the file you are cutting.
- The app's export is full colour range; convert every segment to limited (tv)
  range before joining, or blacks turn grey.
- Slowed and held pieces come out up to 0.2s longer than planned (frame
  rounding): measure the built segments and re-time sounds and voice to them.
- Two-pass loudnorm falls back to dynamic mode on a peaky effects mix and misses
  -14 LUFS: check `normalization_type`; if not `linear`, set the gain by hand
  and limit (v4 silent: +16.4 dB, alimiter 0.66).
- `grep -c` exits 1 when it counts zero; guard it (`|| true`) under `set -e`.
- The app's MISS call comes about 0.7s after the rim hit: keep it at real time
  rather than speeding it up, so the video doesn't misstate how fast it calls.
- 1.98x on the 1080-wide export band is the softness limit; past 2x it shows.
- The founder's laptop is Windows on ARM (Snapdragon); kokoro-js prints a cpuinfo
  warning but works.

## Checklist before the founder sees a cut

- [ ] Frame 0 moves: the player mid-action with the overlay visible; Deadeye is
      named in text before 3s.
- [ ] Payoff first (the best real make), each clip starts at the release, no
      dead time, no repeated beat.
- [ ] The ball is seen in or through the net before each MAKE banner; banners
      whole; no flame; the tracking ring isn't wandering under a MAKE.
- [ ] Every number is the app's own from this footage; claims checked in the
      live code; no "every shot", "never misses", "100%".
- [ ] Text inside x 140-940, y 270-1250 (stricter than Meta's x 65-1015,
      y 269-1248) and inside TikTok's zone for the caption length.
- [ ] Captions: 2 lines at most, 42 characters a line, 17 characters a second
      for text read on its own; stroke or plate keeps 4.5:1 contrast on the
      worst frame.
- [ ] No more than 3 flashes or 3 saturated-red flashes in any second (a red
      MISS tint must not strobe).
- [ ] Every sound 0 to 1 frame after its event, never early (measured on the
      built picture); the swish is the loudest hit; room tone, no silence.
- [ ] Voice never runs ahead of its event or over a hit; no "my" in a
      synthetic voice; AI label noted.
- [ ] Loudness about -14 LUFS (±1), true peak -1.5 dBTP or lower, short-term
      max within about 5 LU of integrated.
- [ ] `scdet` cuts match the beat sheet; `blackdetect`, `freezedetect` and
      `silencedetect` find nothing unplanned.
- [ ] No slow motion from too few real frames; no punch-in past the pixel
      budget (check a 100% still).
- [ ] Delivery: h264 High, yuv420p, BT.709, tv range, constant 30 fps, AAC 48 kHz
      stereo, `+faststart`; any HDR source tone-mapped to SDR first.
- [ ] End card: logo, the action, the address in orange, at most three lines;
      the last frame leads back into the first if it loops.
- [ ] Faces: every recognisable person listed for consent; nothing blurred.
- [ ] Every version is a new file; the edit log lists them with paths.
- [ ] The founder still watches once at full speed with sound on and once with
      sound off: emotion and story can't be measured.

## What the research says (short; sources in the playbook)

- Hook: TikTok wants the proposition in 3s and the hook in 6s; much of an ad's
  brand effect lands in the first 3s. Cold open on proof, name the app early.
- Pace: high-performing talking TikToks cut about every 2 to 3s; the fastest
  pace lowered intent to finish. Vary shot lengths and hold the payoff longest.
- Cuts: a third of cuts made on motion go unseen, mostly thanks to continuous
  sound. Cut on action with one sound bed to hide a cut; change the sound to
  make one felt.
- Slow motion makes a shot look more skilled; show real speed first, then the
  replay, to stay honest.
- Sync: early audio is noticed at about 45 ms, late at about 125 ms (EBU R37:
  40 early, 60 late). Never early.
- Captions: 17 characters a second (Netflix children's limit), 42 a line, two
  lines; TikTok's "5 to 10 words a second" only for words also spoken.
- Authentic beats half-polished: user-made videos beat agency videos at low
  production quality; UGC-style TikToks out-scored brand ones on attention.
  Polish the sound, framing and legibility, keep the phone-camera look.
- Sports ads: emotion wins long term (IPA); underdog-and-effort stories raise
  intent (Paharia 2011); the great spots each rely on one device.
- Sports social: Gen Z watches highlights as much as live sport; House of
  Highlights and Overtime won with raw clips of young athletes.
- Show the app working early with real output (Apple, Google Play rules);
  a phone on a tripod plus the live overlay is a proven way to show a tracker.
- Delivery: upload a near-lossless master (CRF 16 to 18, YouTube's spec as the
  house spec); platforms publish no loudness target, -14 LUFS is consensus.

## Open questions

- Cut rate for sports montages: the only benchmark covers talking heads.
- Word-by-word against phrase captions; teen reading speed in fast video.
- Real TikTok and Instagram loudness normalisation and re-encode bitrates.
- Whether seamless loops raise rewatches; whether grading gym footage helps.
- Same-age amateur players against pros for teen audiences.
- AI label for a generic TTS narrator: platform rules unclear; labelling cut
  trust by about 27% in one industry test. Founder decision.
- Read only in summaries so far: ITU-R BT.1359, EBU R37, Murch's percentages,
  AES TD1008, the current ASAI children's section.
