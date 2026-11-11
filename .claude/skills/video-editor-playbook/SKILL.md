---
name: video-editor-playbook
description: Deadeye's professional method for cutting a short promo or social video (TikTok, Reels, Shorts) from the founder's footage and marketing's script - brief, references, shot list, look sample, voice, word-timed captions, edit, registry effects, sound mix, grade, hook and platform variants, self-check, peer review and hand-off - with the HyperFrames or other tool for each step. Use whenever the video-editor agent (or anyone) makes, re-cuts or fixes a Deadeye video.
---

# Video editor playbook

The method a professional editor follows, step by step, for Deadeye. The
rules it serves are in `docs/agent-os/knowledge/video-editor.md` (lessons and
checklist); the research behind them in
`docs/agent-os/knowledge/findings/video-editor.md`; craft techniques and the
ffmpeg recipe in `docs/agent-os/video/playbook.md`; the house look in
`docs/brand/video-style.md`. Worked examples: `examples.md` in this folder.

Do the steps in order. Each ends with **Done when**. A step you skip is named
in the hand-off with the reason. Every number on screen and every claim comes
from the app or its code, never from memory.

**Where files go.** Footage and every render stay out of git, in the founder's
recordings folder (`Documents\deadeye-recordings\YYYY-MM-DD-<slug>\`, with
`work\` for the HyperFrames project, build scripts, voice and sound, and
`check-vN\` for check stills). In the repo, only the edit log
(`docs/agent-os/video/YYYY-MM-DD-<slug>.md`) and knowledge files. Never modify,
move or delete a source file.

**Privacy.** Footage, stills and voices of under-18s never go to an outside
service (HeyGen, Adobe, Canva, Gemini, ElevenLabs speech-to-text) without a
DPIA update and a parent's consent naming it. Use the local paths below:
`--quality local`, Parakeet or whisper on the laptop, ffmpeg.

## 1. Brief

Write `work\BRIEF.md` (HyperFrames reads it): the goal (a new player logs a
first session), who watches (13 to 17, Irish, on TikTok first), the one
action at the end in the live landing page's words (`git fetch` then
`git show origin/main:src/app/page.tsx`), platforms, target length, the
script from marketing beat by beat, every claim with its code source, and
every person in the footage with their consent status.

- Tools: `hyperframes` (the entry skill: it reads `BRIEF.md` and routes a
  footage cut to `general-video`); marketing's script file in
  `docs/agent-os/marketing/`.
- **Done when** you can say the hook, the beats, the action and the length in
  four lines, and no claim is without a source.

## 2. Results and reference board

Read `docs/agent-os/marketing/results.md` and the last edit logs (what was
posted, how it did) and apply the knowledge file's "Lessons from results".
Then pick 3 to 5 references from `docs/agent-os/video/references.md` (add new
ones only with a working link) and write, for each, the one thing to borrow:
the hook, the cut rate, the caption style, the sound.

- Tools: WebSearch and WebFetch; Claude in Chrome read-only in the founder's
  signed-in browser when they allow it; TikTok Creative Center. Never download
  someone else's video into the project.
- **Done when** the brief has a "Borrow" list with a link per line.

## 3. Footage log and shot list

`ffprobe` every source (size, fps, duration, audio, colour range, HDR). Find
every moment on stills of the file you are cutting (a saved tracker video with
slow-mo replays does not share the source clip's timestamps). Export the
tracker's event log when you can: it gives exact make and miss times and the
ball and rim positions. List every face and who it might be.

Write the shot list as a beat sheet: cut time, source in and out, picture,
caption, voice line, sound, and why the cut lands where it does (on the
release, on the swish).

- Tools: `npx hyperframes measure probe|cuts|events|frames` (contact sheets,
  strips around events), `measure face` for the consent list, ffmpeg `tile`
  filmstrips at 10 to 15 fps around each event; `src/lib/video/overlayTimeline.ts`
  for the tracker's events.
- **Done when** each beat has a source time checked on a still, and each face
  has a consent status (consented adult, consented minor, or cut it).

## 4. Sample of the look, side by side

The founder's rule (2026-10-20): before building a whole video in a new look,
build 3 to 5 seconds of it (the opening beat with its caption style, grade
and sound) and show it next to the last approved look at the same moment.

- Tools: a short HyperFrames project; `npx hyperframes compare <old> <new>
  --at <s> --labels current,new --out compare.png`; `grade-compare` if the
  grade changes. Send the sample clip and the sheet, then wait.
- Skip only when the look is unchanged from an approved video (same style file,
  same caption design). Say so.
- **Done when** the founder has picked a look.

## 5. Voice

In this order:

1. A real voice: an adult's, or the founder's with a parent's OK (marketing's
   rule). Ask for a phone recording of the exact lines in a quiet room, 20 cm
   from the mouth, two takes each. Clean it locally (ffmpeg `afftdn` or
   `arnndn`, a high-pass around 80 Hz, gentle compression).
2. Else a synthetic voice the founder picks: 2 or 3 short samples of the same
   line from the best available route (ranked in `docs/agent-os/video/tools.md`:
   ElevenLabs with the founder's key, then Polly or Azure Irish voices, HeyGen
   or Gemini through media-use). Run `npx hyperframes auth status` first and
   say what each needs. Child-like voices are out; so is cloning anyone.
3. The old Kokoro voice only if the founder chooses it again.

Voice rules: plain, about 145 to 160 words a minute, never says "my" if
synthetic, never names an event before it is on screen, AI label noted.

- Tools: `media-use` (`audio/references/tts.md`; `heygen-tts.mjs --words`
  returns word timestamps), ffmpeg.
- **Done when** a final voice file exists that the founder chose or recorded.

## 6. Captions from the transcript

Captions come from the final voice track, never typed in by hand against a
guess. Transcribe it, compare the words with the script, fix spellings only,
then group words into phrases (at most 2 lines, each line fitting the 800 px
safe width at the style file's size; `check` flags overflow) that change with
the voice. Each caption clears a cut
by 2 frames. Read-alone text (numbers, the end card) is timed at 17 characters
a second, at least 1 s on screen.

- Tools: `npx hyperframes transcribe voice.wav --engine parakeet` (install once
  with `npx hyperframes models install parakeet`; or `--engine whisper --model
  small.en`); never `--engine heygen` for founder or player voices. Caption
  look from the registry (`caption-highlight`, `caption-pill-karaoke`) restyled
  to `docs/brand/video-style.md`; `media-use/audio/references/captions/` for
  grouping.
- **Done when** every caption's in and out times come from word timestamps,
  and the caption text matches the voice word for word.

## 7. Edit

Build the cut as a HyperFrames composition: one sub-composition per beat, one
caption track, the hook as its own sub-composition so three openings can share
the body. Cut on action; J-cut the next voice line or swish 4 to 8 frames
early; L-cut the net sound over a cut to an app screen. Hook in the first 2 s:
frame one moves, Deadeye named by 3 s. Real speed before slow motion. Vary shot
lengths and hold the payoff longest.

- Tools: `hyperframes-core` (clips, tracks, timing, sub-compositions),
  `hyperframes-keyframes` (punch-ins and reframes within the pixel budget),
  `hyperframes-animation` (text in and out), `hyperframes-studio` (timeline
  layout, safe zones), `npx hyperframes timeline --json`, `lint` after each
  structural change. ffmpeg for trims, colour-range conversion and the final
  encode.
- **Done when** the cut matches the beat sheet and `npx hyperframes check`
  passes.

## 8. Effects from the registry

Search before building: `npx hyperframes catalog --query "<the effect in plain
English>"`, then `npx hyperframes add <name>` (`hyperframes-registry`). Use
two effects per video at most. Anything that looks like tracking (a line on
the rim, a ring on the ball, a trail) is either the app's own drawing from the
export or placed from the tracker's data, frame by frame; never a hand-placed
guess. A registry effect settles how something moves, not where it lands.

- Never: darken, blur or patch an area to hide something; full-frame dark
  washes or vignettes to make text readable.
- **Done when** every effect is a registry item or named in the hand-off with
  why none fitted, and each is checked on stills (step 12).

## 9. Sound mix

Layers, bottom up: room tone under everything; effects on their contact frames
(swish on the net frame, rim on a miss, tick on each count change, a small hit
on the logo), 0 to 1 frame late, never early; the voice on top; then music.

Music only from a source licensed for both TikTok and Instagram, with the
licence recorded in the edit log; the bed is carved under the voice (about 15
to 18 dB below it). Without such a track, bake no music in: deliver the mix
with room for it and write in the hand-off which kind of track to add in the
app (tempo, mood) and to set its volume low under the voice.

Master: -14 LUFS integrated, true peak -1.5 dBTP or lower, loudest 3 s within
about 5 LU of integrated.

- Tools: `hyperframes-audio` (voice-over carve, fades, limiter, `truepeak`);
  `media-use` (`resolve --type sfx`, Openverse CC0 or CC BY, credited);
  `npx hyperframes audio <file> --quality local` (onsets and loudness in film
  time); ffmpeg two-pass `loudnorm` with `linear=true` checked, `ebur128`.
- **Done when** measured onsets match the event frames and the loudness numbers
  are in the hand-off.

## 10. Grade

Match shots to each other first, then fix exposure, white balance and casts.
Keep the phone-camera look; no stylised looks unless the founder picked one in
step 4. Convert every segment to BT.709 limited range; tone-map HDR first.

- Tools: `media-use` (`references/grading.md`, `hyperframes media-treatment
  --analyze`), `npx hyperframes measure look --compare` between neighbouring
  shots, `grade-compare` for the founder.
- **Done when** no shot reads darker, warmer or flatter than its neighbours on
  the contact sheet.

## 11. Hook and platform variants

Make three openings (first 3 s) on the same body, each a different hook (a
make, a question in text, a number), named `<slug>-vN-hookA|B|C.mp4`. The 9:16
1080x1920 cut is the master. Square or 4:5 only when asked, each rechecked
caption by caption; Meta paid Reels at 1440x2560 only when the source has the
pixels.

- Tools: HyperFrames variables and `npx hyperframes render --batch rows.json`;
  Adobe `adobe-resize-photos-and-videos` or `adobe-create-social-variations`
  only for same-ratio resizes or covers with no minors (they have no video
  reframe and upload to Creative Cloud).
- **Done when** each variant is its own file and passed step 12.

## 12. Self-check

After every overlay or caption change, not just at the end:

1. `npx hyperframes check --snapshots --at-transitions`.
2. `npx hyperframes snapshot --at <every caption and overlay change, every
   flash, shake, zoom and whip>`; `--zoom "<selector or x,y,w,h>"` at full size
   where an overlay meets an object. It must stop where the object stops.
3. `npx hyperframes compare <last version> <this version> --at <the changed
   moments>` so nothing else moved.
4. On the render: `measure cuts` and ffmpeg `scdet`, `blackdetect`,
   `freezedetect`, `silencedetect`; `ebur128`; `hyperframes audio` onsets;
   `ffprobe` against the delivery spec.
5. A 4 fps strip of the whole cut at phone size (270 px wide tiles) and every
   frame around each event, read in order. The editor can't watch video: this
   strip plus the measured audio is its stand-in, and the hand-off asks a
   person to watch at real speed on a phone, with sound and without.
6. Run the knowledge file's checklist. Save the stills in `check-vN\`.

- **Done when** every checklist box is ticked or named as failed.

## 13. Peer review

You can't start other agents: ask the lead (the session that started you, or
`/agent-os video`) for:

- **marketing**: claims, brand words and fit with the script.
- **safety-reviewer**: anything showing a person who may be under 18, and the
  consent record for them.
- **The critic panel** (`docs/agent-os/video/critic-panel.md`) for a new piece
  or a big change.

Apply every fix the footage allows as a new version; list the ones you skipped
and why.

- **Done when** marketing and, where needed, safety-reviewer have passed it.
  Only then does the founder see it.

## 14. Hand-off

Write the edit log (`docs/agent-os/video/YYYY-MM-DD-<slug>.md`): versions and
paths, lengths, the beat sheet with source times, what changed and why, the
checklist results, loudness numbers, and what the founder must decide or do
(consent, music in the app, AI label, which hook). Return the same in under
40 lines. You make files; the founder posts.

## Traps we have hit

- A saved tracker video with slow-mo replays has its own timeline: find
  moments on stills of the file you cut.
- The app's export is full colour range: convert every segment to limited (tv)
  range before joining, or blacks turn grey.
- Slowed and held pieces run up to 0.2 s long (frame rounding): measure the
  built segments and re-time sound and voice to them.
- Two-pass loudnorm falls back to dynamic mode on a peaky effects mix: check
  `normalization_type`; if not `linear`, set the gain by hand and limit
  (v4 silent: +16.4 dB, then a limiter).
- `grep -c` exits 1 when it counts zero; guard it (`|| true`) under `set -e`.
- The app's MISS call comes about 0.7 s after the rim hit: keep real time.
- 1.98x on the 1080-wide export is the softness limit; past 2x it shows.
- ffmpeg `alimiter` auto-levels to 0 dB unless `level=0`.
- The laptop is Windows on ARM: quote paths (the user folder has a space);
  ffmpeg is on PATH from winget; whisper.cpp and Kokoro are not installed
  (`npx hyperframes doctor`, 2026-11-11).
- A subagent in a worktree can't run commands in the shared checkout: render
  from the worktree, or ask the lead.
