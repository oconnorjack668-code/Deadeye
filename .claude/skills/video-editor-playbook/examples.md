# Worked examples

**These are examples, not real cuts.** They show the standard a finished
plan and a finished self-check report should reach. The footage, times and
counts are invented to show the format: in a real cut every number on screen
is the app's own output from that footage, and every time comes from a
still. The claims about the app are real and each names its source (checked
2026-11-11 against the code on origin/main).

---

## Example 1: shot-by-shot edit plan (24 s, 9:16)

**Brief in four lines.** Hook: a real make, called live by the app, in the
first 2 s. Beats: make, miss, setup, the work, the slow-mo payoff. Action at
the end: "Watch it call real shots." (the landing page's demo heading) plus
the address. Length 24 s; TikTok first, the same file as a Reel.

**Footage (example).** `clipA.mp4`: the app's "Video with the tracker" export,
1080x1920, 120 fps capture, an adult club player filmed from behind, written
consent on file. `phone-setup.mp4`: the founder's phone on a kit bag in shot,
filmed by a second phone. `screen-rim.mp4`: a screen recording of the tester
account marking the rim. Nobody else in the hall.

**Look.** Unchanged from the last approved cut (same style file), so the
side-by-side sample (step 4) is skipped, and the hand-off says so.

**Voice.** The founder's own recording (with a parent's OK, per marketing's
rule), two takes per line, cleaned locally. Captions from its transcript.

### Beat sheet

| # | Film time | Source in-out | Picture | Caption (from the transcript) | Voice | Sound | Why it is cut here |
|---|---|---|---|---|---|---|---|
| 1 | 0.00-2.20 | clipA 41.10-43.30 | Ball already in the air on frame 0; through the net at 0.95; the app's MAKE call follows | DEADEYE COUNTS / YOUR MAKES AND MISSES | "Deadeye counts your makes and misses." | Swish on the net frame (0.95); tick on the count change | Frame one moves; the proposition and the name by 2 s; the ball is seen in the net before the banner |
| 2 | 2.20-4.30 | clipA 58.40-60.50 | Rim hit at 2.60; the app's MISS call at real time, about 0.7 s later | (rail continues) | (none) | Rim clank on the contact frame; tick | Shows it is honest about misses; the MISS call is never sped up |
| 3 | 4.30-8.10 | phone-setup 3.0-5.2, then screen-rim 1.0-2.6 | Phone on the bag 3 to 6 m back, off to one side; a thumb taps the ring's two edges | PHONE 3 TO 6 METRES BACK, / OFF TO ONE SIDE | "Phone three to six metres back, off to one side." | Room tone; a soft tap per touch | The setup line every viewer needs (ASAI: say what else is needed). The voice J-cuts in 6 frames before the picture |
| 4 | 8.10-14.20 | clipA four makes, about 1.5 s each | Cut on each release; the app's count rises | YOU JUST / KEEP SHOOTING | "You just keep shooting." | Swish on each net frame; the bed runs across the cuts | Cuts on action hide the joins; the shots shorten towards the payoff |
| 5 | 14.20-18.40 | clipA 168.0-172.2 (the app's own slow-mo replay) | The best make, held longest | [8] OF [14] MADE (read-alone; the app's numbers) | (none) | Slow swish; the net sound L-cuts 5 frames into beat 6 | The payoff gets the longest hold; real speed came first (beat 4) |
| 6 | 18.40-20.80 | clipA 175.0-177.4 | The saved video's own end card with the session's numbers | (none) | "Try it on your own shots." | Tick as the card lands | One proof of what you keep after a session |
| 7 | 20.80-24.00 | end card (HyperFrames) | Red logo on zinc-950; "Watch it call real shots." in white; deadeyeapp.vercel.app in orange | as on the card | (none) | Small logo hit at 20.80, room tone out | One action, the landing page's own words; the address is on screen because TikTok has no bio link |

Annotations:

- **Captions.** Beats 1, 3 and 4 come from the voice track's word timestamps
  (`npx hyperframes transcribe voice.wav --engine parakeet`). Each phrase is
  2 lines at most and clears every cut by 2 frames. Beat 5 is read alone: 15
  characters needs at least 0.9 s at 17 a second, and it is held 4.2 s.
- **Effects.** One registry item: `caption-highlight`, recoloured so the word
  being spoken turns `#ff3b3b`. The tracking drawing is the app's own from
  the export. Nothing is hand-drawn on the rim.
- **Music.** None baked in. The hand-off asks the founder to add a steady
  90 to 100 bpm instrumental from TikTok's Commercial Music Library (and Meta's
  Sound Collection on Instagram) at low volume under the voice.
- **Three openings.** Hook A is beat 1 (a make). Hook B opens on the app's
  count ticking up, caption "[8] OF [14]. COUNTED LIVE.". Hook C opens on the
  miss (beat 2 first) with "IT COUNTS THE MISSES TOO". The body from 2.2 s on
  is shared. Files `ex-v1-hookA.mp4`, `-hookB.mp4`, `-hookC.mp4`.
- **Left out on purpose.** The streak flame and the MAKE/MISS banners as the
  hero (founder, 2026-11-09); the HUD is cropped out, not covered. No darkened
  areas anywhere.

### Claims and sources

| On screen or said | Source |
|---|---|
| "counts your makes and misses" | Landing page description, `src/app/page.tsx` line 45; `docs/design.md` (not "every") |
| "3 to 6 metres back, off to one side" | Setup tip, `src/app/(app)/welcome/WelcomeClient.tsx` line 19 ("3 to 6 metres from the hoop, off to one side, at head height or higher") |
| Tapping the ring's two edges | `src/components/video/ShotTracker.tsx` line 407 (the app can also find the hoop itself) |
| The slow-mo replay | `replayPicks` in `src/lib/video/overlayTimeline.ts`; the app's own export |
| "Watch it call real shots." | The demo heading, `src/app/page.tsx` line 273 |
| If a features beat is added: "168 drills", "4 programs free, 18 with Pro" | `DRILL_COUNT` in `src/lib/plans.ts` (150 in migration 00013 plus 18 in 00048); `src/app/page.tsx` line 74. `docs/brand/promo-video/PLAN.md` still says 150 drills: out of date |

---

## Example 2: self-check report for that cut (v1)

```
Skills: all 15 loaded

Self-check, ex-v1 (hookA, hookB, hookC), 24.0 s, 1080x1920
Folder: Documents\deadeye-recordings\2026-11-20-example\ (outside git)

Story and claims
[x] Frame 0 moves (still check-v1\t000.png); "Deadeye" spoken at 0.15 s
[x] Ball in the net at 0.95 before the MAKE call (t0950.png, 100% crop)
[x] Every number is the app's: [8] of [14] matches the export's own end card
[x] Claims: 5 checked against origin/main (table in the edit log); marketing to confirm
[x] Three openings built; shared body identical (compare at 2.5, 9.0, 16.0 s: no change)

Picture
[x] Cuts on releases: measure cuts found 9 cuts, the beat sheet has 9; times match within 1 frame
[x] Colour: measure look per shot; beat 3's phone-setup clip was 0.6 stops brighter and warmer
    than clipA; matched with a measured correction; graded/ungraded still sent with the sample
[x] No darkened, blurred or patched areas
[x] Overlays: snapshot at 31 moments (every caption in/out, every banner, both whips);
    the app's ring stays on the rim in all of them; zoom crops in check-v1\zoom\
[x] Effects: catalog searched ("highlight the spoken word in a caption");
    caption-highlight used; nothing hand-built
[x] Flashes: at most 1 a second (the MAKE tint)

Text
[x] All text inside x 140-940, y 270-1250 (check --snapshots, no caption-zone findings)
[x] Spoken captions from word timestamps; each clears its cut by 2+ frames
[ ] FAIL, fixed in v2: "PHONE 3 TO 6 METRES BACK," ran 38 px past x 940 at 104 px
    (check: caption-zone finding at 5.1 s; zoom crop check-v1\zoom\cap3.png).
    v2 breaks it as "PHONE 3 TO 6 / METRES BACK," then "OFF TO ONE SIDE",
    still timed from the same word timestamps
[x] Contrast: white on #0b0b0d 19:1; red #ff3b3b on #0b0b0d 5.6:1

Sound
[x] Voice: the founder's recording; no "my"; never ahead of its event
[x] Onsets (hyperframes audio, local): swish 0.95 vs net frame 0.95 (0 frames);
    clank 2.63 vs rim 2.60 (+1 frame, late, allowed); every hit 0-1 frame late
[x] Room tone throughout; silencedetect: none
[x] Music: none baked in; in-app track noted for the founder
[x] Loudness: -14.1 LUFS integrated, true peak -1.7 dBTP, short-term max -10.2 (3.9 LU above)

Delivery and review
[x] ffprobe: h264 High, yuv420p, bt709, tv range, 30 fps constant, AAC 48 kHz stereo, faststart
[x] blackdetect, freezedetect: nothing unplanned
[x] End card: red logo, the action, the address in orange, 3 lines, held 3.2 s
[x] Faces: one adult player, consent on file; nobody else in shot
[x] 4 fps strip at phone size read end to end (check-v1\strip.png)
[ ] Not done (can't be by the editor): a real-speed watch on a phone, sound on and off.
    Asked of the founder in the hand-off.
[ ] Waiting: marketing review (claims, script fit). safety-reviewer not needed:
    no one in shot may be under 18.

Founder decisions: which hook (A, B or C) leads; the in-app music track; whether
the voice version or a silent version goes first.
```

What makes this report good: every tick names its evidence (a still, a
measurement, a file), the failed box says what failed, by how much and what
was done, and the boxes the editor can't tick are named as such instead of
ticked.
