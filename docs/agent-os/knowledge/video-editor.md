# Video editor knowledge

Last researched: 2026-11-11 (findings file; about 55 sources from 2026-11-10)

Rules only (how it works: `README.md`). Research: `findings/video-editor.md`.
Method: the `video-editor-playbook` skill. Craft and ffmpeg: `../video/playbook.md`.
Look: `docs/brand/video-style.md`. What a video says is marketing's.

## Lessons from the founder

Newest first; they win over research. Includes critic-panel findings the
founder told us to apply and the video lessons first kept in `marketing.md`.

- 2026-11-20 · Founder changed the 2026-10-20 no-blur rule. **Rule:** a small,
  tight blur (soft edge, tracked to the object) is allowed on sponsor banners
  and other third-party logos, and on the faces of people who are not the
  focus (a rebounder, people in the background). Never blur the main subject;
  still no darkened bands, blurred strips under captions or washes. A blur is
  extra privacy, not consent (see the Faces check). Footage
  `20261118_174626.mp4`: rebounder consent confirmed, "O CONNOR" shirt fine.
- 2026-11-11 · The founder doesn't like the videos so far: a small free voice
  (Kokoro), hand-timed captions that drifted, no music, a hand-built rim line
  past the hoop, darkened patches, many rounds of fixes. **Rule:** follow the
  playbook: a real voice first, or a synthetic one the founder picked (Kokoro
  only if chosen); captions from the voice track's transcript; registry effects
  before hand-built ones; a planned music bed; one finished, checked cut.
- 2026-11-10 · The founder: the marketing agent "doesn't make the best videos";
  a separate editor with the video skills should cut them. **Rule:** use
  HyperFrames for captions, motion, punch-ins, end cards and mixing; plain
  ffmpeg trims alone are not a finished video.
- 2026-11-10 · Six critics: five swiped before the payoff at 8.5s. **Rule:** cold
  open on the best real moment; every clip starts at the action; no beat
  repeats another; 9 to 15s unless the script needs more.
- 2026-11-10 · Six of six: the ball was never seen going in (the MAKE banner sits
  over the rim). **Rule:** hold or slow 0.2 to 0.4s so the ball is seen in the
  net before the banner covers it; end a make on the ball in the net.
- 2026-11-10 · The footage filled 41% of the screen. **Rule:** crop so the action
  fills y 270 to 1250 or more; leave out the HUD clock, dot row, wordmark and
  status chip by not cropping them in, never by covering them.
- 2026-11-10 · Swishes landed 0.4 to 0.5s early; ticks were lost under the hum;
  the silent cut was -21 LUFS. **Rule:** every hit on its contact frame (0 to 1
  frame late, never early), measured on the built picture; master every
  version to about -14 LUFS, true peak -1.5 dBTP.
- 2026-11-10 · "10/31" read as a date, "32%" invited mockery, the end card ran at
  ~50 characters a second. **Rule:** write "10 of 31 made"; lead the end card
  with the viewer's action; at most three short lines at 17 characters a second.
- 2026-11-10 · "Calls my shots" is hoops slang for announcing a shot; "Put the phone
  down" read as anti-phone; a voice saying "my" didn't sound like the shooter.
  **Rule:** check every line as a teen player would hear it; a synthetic voice
  never says "my".
- 2026-11-09 · On the first tracker cut, the founder wanted the logo on the end
  card, no orange underline under DEADEYE, and far, low footage bigger.
  **Rule:** end cards carry the red logo (`public/logo.png`) on zinc-950, white
  numbers, zinc grey, orange only for the one action, no underline; zoom far
  footage so the shot and hoop fill the frame, keeping the app's count readable.
- 2026-11-09 · A teen critique of the second cut (founder: apply all fixes).
  **Rules:** no digital silence (room tone, a tick on each count change); frame
  one moves; the voice never narrates an event before it happens; a crop keeps
  the app's MAKE/MISS words whole; end on the viewer's action, numbers small.
- 2026-11-09 · The founder thinks the streak flame (it covers the count) and the
  MAKE/MISS look are unpolished. **Rule:** until the tracker redesign ships,
  never make them the hero; lean on the real shot, the ball going in, the
  numbers and the slow-mo replay. The flame is HUD-only: crop the HUD out.
- 2026-11-09 · The founder chooses between versions. **Rule:** every version is a
  new file, listed side by side in the edit log. TikTok has no bio link: end
  cards and TikTok captions show the address; "link in bio" is Instagram only.
- 2026-11-09 · Founder: an AI voice is allowed, "whatever is best". **Rule:** decide
  on the evidence; the silent cut was main last time (every critic disliked
  the voice); any synthetic voice is short, word for word with the captions,
  AI label on.
- 2026-11-09 · Landing wording changed on main while a worktree was 27 commits
  behind. **Rule:** check wording with `git show origin/main:src/app/page.tsx`.
- 2026-11-07 · The first promo took too many rounds of small fixes. **Rule:** check
  the whole video frame by frame against the checklist; show a finished cut.
- 2026-10-21 · The rim line ran past the ring onto the bracket. **Rule:** every
  overlay is checked at full size on stills, flash, shake and zoom frames too.
- 2026-10-20 · Captions drifted from the voice; darkened patches hid footage.
  **Rules:** captions follow the voice word for word; never darken or blur a
  block of footage (narrowed 2026-11-20: banners, logos and background faces
  may be blurred).
- 2026-10-20 · Shown side by side, the founder preferred the first promo's look
  to a new 32s build. **Rule:** before rebuilding a whole video, show one short
  sample of the new look next to the current one.
- 2026-10-20 · "Can you not add X" meant "add X". **Rule:** when a request could be
  read two ways, say which reading you took.

## Lessons from results

How posted videos did, as rules. Before each video, read
`docs/agent-os/marketing/results.md` and add a dated line when a result says
something about the edit (hook, length, voice, captions, music). Under about
1,000 views it is a "hint", not a rule; compare within one platform only.

- 2026-11-18 · First promo on TikTok (1,117 views, 24s): average watch 6.06s,
  3.9% watched to the end, and TikTok says most viewers stopped at 0:01. A first
  read from one video, past 1,000 views. **Rule:** the first second decides the
  video. Frame 0 is a shot already in the air or dropping through the net with
  the count on screen, never a lead-in, logo or setup. Judge each of the three
  openings on "would I swipe at 0:01?" before anything else.
- 2026-11-18 · Same post: about half the searches that found it were
  "vercel.app", people typing the caption link. **Rule:** the end card says
  "link in bio", not a web address to type.
- 2026-11-18 · Browser research (`docs/agent-os/trends/ads.md`, 18 Nov lines):
  basketball training videos with a text promise on frame 0 and a make count
  get 100K+ likes; app promos get under 1.5K; the two rival clips that went
  viral (29K and 33K likes) showed the phone on its tripod in the shot with the
  count live, make sounds, and a 1-minute game against a clock. **Rules:**
  (1) cut it as a training video with the app inside it, never as an app ad;
  (2) frame 0 is a promise in big type over action, with the real count from
  the footage ("47 of 100"); (3) keep Deadeye's own make sound audible in the
  mix; (4) a timed challenge clip keeps the clock on screen; (5) "Free to
  start" and the name on the end card; no platform claim (Android, Play Store)
  unless marketing has checked it that day.
- 2026-11-18 · Founder: the tripod-in-shot look is one idea, not the format
  for every video, and there is no tripod yet (one is coming). **Rule:** never
  lock onto one format. Every brief gets several different ideas (at least
  three), ranked, with the best one or two marked "Recommended" and one line
  on why (the results and research behind it). All must fit the footage the
  founder actually has: phone propped on a bag or bottle
  with the count on screen, a screen recording of the session result, a friend
  filming, a "Day N" series, session 1 vs session 10, a reveal carousel. The
  tripod-in-shot version is an option once the founder says the tripod has
  arrived, never a requirement.

## Checklist before the founder sees a video

Done means every box is ticked or a failed box is named in the hand-off.

Story and claims
- [ ] Frame 0 moves: the player mid-action with the overlay visible; Deadeye
      named in text or voice before 3s; the proposition clear by 3s.
- [ ] Payoff first; each clip starts at the action; no dead time or repeated
      beat; the ball seen in the net before each MAKE banner; no flame.
- [ ] Every number is the app's own from this footage; claims checked in the
      live code and by marketing; no "every shot", "never misses", "100%".
- [ ] Three openings (first 3s) on the same body, each a different hook.

Picture
- [ ] Cuts land on action (release, ball in flight); J or L cut wherever a voice
      line or a sound spans a cut.
- [ ] Colour matches from shot to shot (`measure look` against neighbours); any
      grade shown to the founder as a graded and ungraded still first.
- [ ] No darkened or patched areas; the only blurs are tight ones on sponsor
      banners, third-party logos or faces that are not the focus, checked on
      stills so they stay on the object as the camera or person moves.
- [ ] Every overlay, effect and caption checked on stills at full size at each
      change and at fast frames (flash, shake, zoom, whip): it lands on the real
      object and stops where the object stops.
- [ ] A registry effect was searched for before anything was hand-built; any
      hand-built overlay is named in the hand-off with the reason.
- [ ] At most 3 flashes (or 3 red flashes) a second; no slow motion from too
      few real frames; no punch-in past the pixel budget (100% still).

Text
- [ ] All text inside x 140-940, y 270-1250 of 1080x1920 and inside TikTok's
      zone for the caption length.
- [ ] Spoken captions: timed from the final voice track's word timestamps,
      changing with the words, clear of each cut by 2 frames.
- [ ] Read-alone text: at most 17 characters a second, at least 1s on screen,
      2 lines of 42 characters at most; 4.5:1 contrast on the worst frame.

Sound
- [ ] Voice: a real voice, or the synthetic voice the founder picked from
      samples (never Kokoro unless chosen); never ahead of its event or over a
      hit; no "my" in a synthetic voice; AI label noted.
- [ ] Every hit 0 to 1 frame after its event, never early (`hyperframes audio`
      onsets on the built file); room tone, no digital silence.
- [ ] Music: a bed with a recorded licence for both platforms, carved under the
      voice; otherwise none baked in, and the hand-off says which kind of track
      the founder adds in the app, its tempo and its volume.
- [ ] Loudness -14 LUFS (±1) integrated, true peak -1.5 dBTP or lower (never
      above -1), loudest 3s within about 5 LU of integrated.

Delivery and review
- [ ] h264 High, yuv420p, BT.709, tv range, constant 30 fps, AAC 48 kHz stereo,
      `+faststart`; HDR tone-mapped first; `scdet`, `blackdetect`,
      `freezedetect` and `silencedetect` find nothing unplanned.
- [ ] Square or 4:5 variants rechecked caption by caption, never assumed.
- [ ] End card: red logo, the action, the address in orange, three lines at
      most; the last frame leads back into the first if it loops.
- [ ] Faces: every recognisable person listed; consent on record for any
      possible under-18, or the shot is out. A face blur on someone who is
      not the focus is allowed but does not replace consent.
- [ ] Before a shot is dropped for a face, offer the same moment re-cropped
      so the person cannot be known (hands, ball and hoop, from behind; no
      face, name, school or kit crest in frame), within the pixel budget,
      and show it on 100% stills (`snapshot --at ... --zoom`) at the first,
      middle and last frame and at every fast frame. Dropping the shot or
      waiting for consent are the other options, not the only ones. Any
      re-crop that leaves someone out is checked on a 100% still before it
      is called done. (Exam, 2026-11-17: both missed.)
- [ ] After the last change: the whole cut read as a 4 fps strip at phone size
      with measured audio; a person asked to watch it at real speed on a
      phone, with sound and without (the editor can't watch video).
- [ ] Peer review done (marketing; safety-reviewer if anyone may be under 18;
      critic panel for a new piece); every version a new file in the edit log.
