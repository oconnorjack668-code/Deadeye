# Video craft playbook

The video editor's craft reference: named techniques (when, why, how) and the
ffmpeg delivery recipe. It is the depth behind the method, not the method.

- The method, step by step: the `video-editor-playbook` skill
  (`.claude/skills/video-editor-playbook/SKILL.md`), with worked examples.
- The rules (founder's lessons, results lessons, checklist):
  `docs/agent-os/knowledge/video-editor.md`.
- The research and its sources, and the open questions (moved there
  2026-11-11): `docs/agent-os/knowledge/findings/video-editor.md`. The
  "Why" in each technique below names a finding there.
- The house look: `docs/brand/video-style.md`.

Replace weaker lines when better sources turn up; don't add beside them.

## Craft playbook
- **Cold open on proof.** When: always. Why: TikTok and Meta both put the hook in the first seconds, and Nielsen's data puts much of the effect in the first 3 s. How: frame 0 is already mid-action (the shot going up) with the overlay visible; the MAKE banner fires by 1-2 s; no logo card first.
- **Real speed, then replay.** When: a key make. Why: slow-mo adds a sense of skill (Caruso), and showing real speed first keeps it honest. How: play the shot at 1x, then cut to a 0.4-0.5x replay of the release and swish on 60 fps or faster footage, with a whoosh into the slow section.
- **Hide cuts on action.** When: joining two angles or two shots of one drill. Why: about a third of cuts made on motion go unseen (Smith & Henderson). How: cut at the jump or release, keep the ambience bed running, and land the new shot's subject near the old one's screen position.
- **Make a cut felt.** When: switching from footage to the stat card or to the replay. Why: removing post-cut motion and changing the sound makes a cut noticeable (Smith 2017). How: a hard cut on a beat, a sound change at the cut, and a static or still first frame after it.
- **J-cuts and L-cuts.** When: a voiceover or crowd sound spans a cut. Why: continuous audio smooths the cut (Smith 2017). How: start the next shot's sound 4-8 frames before its picture (J), or let the swish ring 4-8 frames into the next shot (L). The frame counts are a rule of thumb.
- **Speed ramp.** When: an athletic peak (jump, release). How: 100% to 30-50% across 6-10 frames at the apex, back to 100% for the landing, with a whoosh starting slightly before the ramp because it is anticipatory. Use high-frame-rate sources only.
- **Punch-in.** When: to show the counter or banner, or to add emphasis on a beat. How: only within the pixel budget (findings: "Motion: cuts on action, slow motion, zoom, reframing"), with a cut-zoom on a beat rather than a slow digital creep on a 1080p source.
- **Freeze frame plus text.** When: one fact needs reading time, such as "47/60 this week". Why: reading speed limits (findings: "Captions and on-screen text"). How: freeze on a strong pose, hold for (characters / 17) s + 0.5 s, keep the text inside the safe zone, and unfreeze on a beat.
- **Beat grid, not a metronome.** When: montage sections. Why: viewers like accents in sync (Rogers & Gibson), and good films vary shot length (Cutting). How: put cuts on beats, but mix 1-, 2- and 4-beat shot lengths and give the payoff the longest hold.
- **Reaction shot (Kuleshov).** When: you have a face. How: put the stat or the make first, then the player's face for 0.5-1 s, so the viewer reads pride into it.
- **Effort arc in 15-20 s.** When: brand pieces. Why: the underdog effect (Paharia) and emotion over reason (Binet & Field). How: struggle (a miss, a cold gym, early hours), then work (a fast montage of reps with the count rising), then proof (a real make streak with the overlay), then brand and app name. The voiceover or text speaks to the player as "you".
- **One device, not ten.** Why: the strong sports spots in the findings ("Sports advertising") each lean on one device. How: pick a single take, a sound-led grind, or an audio-versus-picture contrast, and keep effects to two per video.
- **Captions.** Chunk text at phrase boundaries, use at most 2 lines and 42 characters, highlight the active word only when it is spoken, use a heavy sans with a stroke or plate, and put nothing in the bottom 35%.
- **Text motion.** In: about 200-250 ms with a decelerating ease. Out: about 150-200 ms with an accelerating ease. No more than one moving text element at a time; two or more moving at once is my rule of thumb, since I found no study on it.
- **SFX layer.** Swish on the net-contact frame, sneaker squeak on the plant, a rim clank on misses, the counter tick on the count change, and ambience under everything. Keep each hit 0-1 frame late, never early.
- **Loop seam.** When: a video meant to loop. How: match the last frame's composition and motion to frame 0, and end the audio on a phrase that leads back into the opening. There is no evidence this helps (see the findings file's open questions).
- **End card.** The app name and logo were already shown early. Close on a real UI shot plus the name, inside the safe zone, held for at least 1.5 s. On Google Play videos, don't use "Download now".

## ffmpeg and delivery recipe
- **Probe sources:** `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,avg_frame_rate,pix_fmt,color_range,color_space,color_transfer,color_primaries -of json in.mov`. A transfer of `arib-std-b67` (HLG) or `smpte2084` (PQ) means HDR, and a mismatch between `r_frame_rate` and `avg_frame_rate` means variable frame rate. Why: iPhone HDR footage and variable-rate phone video cause most colour and sync problems later.
- **Normalise sources first** to constant frame rate and SDR: `-vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" -fps_mode cfr -r 30`. Why: ffmpeg's tonemap doc says tone-mapping must happen in linear light with zscale around it; Hable is the common choice (practitioner). This needs ffmpeg built with libzimg, so check `ffmpeg -filters | findstr zscale`. Older builds use `-vsync cfr` instead of `-fps_mode cfr`. Keep 60 fps sources at 60 until speed-ramping is done.
- **Scale:** `scale=1080:1920:flags=lanczos+accurate_rnd+full_chroma_int`. Why: Lanczos (3 taps) is the sharpest built-in resampler. The newest ffmpeg docs mark `flags=lanczos` as deprecated in favour of `scaler=lanczos`, so check `ffmpeg -h filter=scale` on the installed version. Only downscale; don't upscale beyond the pixel budget.
- **Sharpen (optional):** a mild `unsharp=5:5:0.3:5:5:0` only after downscaling from 4K, and never on upscaled footage. Why: it may help fine detail (the net, UI text) survive platform re-encoding. Untested: keep it only if the stills and a VMAF compression test (below) look better.
- **Master encode:** `-c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -g 15 -bf 2 -fps_mode cfr -r 30 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -movflags +faststart`. Why: CRF 17-18 is near "visually lossless" (FFmpeg guide); High profile, 2 B-frames, a closed GOP of half the frame rate, 4:2:0, BT.709 tags, limited range and fast start are YouTube's published spec; Meta asks for a fixed frame rate and progressive scan. Use `-g 30` at 60 fps. Optionally add `-maxrate 20M -bufsize 40M` to cap spikes; that cap is a precaution, since no platform publishes a maximum bitrate.
- **Audio:** `-c:a aac -b:a 256k -ar 48000 -ac 2`. Why: YouTube specifies AAC-LC at 48 kHz, and Meta asks for stereo AAC at 128 kbps or more. 256-384k leaves room for the platform's own re-encode.
- **Loudness, two passes:**
  - Pass 1: `ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null -`.
  - Pass 2: `-af loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=..:measured_TP=..:measured_LRA=..:measured_thresh=..:offset=..:linear=true:print_format=json -ar 48000`.
  - Then confirm `normalization_type` is `linear` in the pass-2 JSON. The ffmpeg docs say loudnorm falls back to dynamic mode when target LRA < source LRA or when the gain would break the true-peak target. If that happens, raise LRA or limit the peaks before normalising.
  - Always set `-ar 48000`, because dynamic mode upsamples to 192 kHz.
- **Verify loudness:** `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -` and read I, LRA, true peak and the short-term maximum (the loudness line of the knowledge checklist).
- **QA pass on the render:**
  - `ffmpeg -i out.mp4 -vf "scdet=t=10,blackdetect=d=0.1,freezedetect=n=-60dB:d=0.5,signalstats,metadata=print:file=qa.txt" -af silencedetect=n=-50dB:d=0.4 -f null -`
  - Then pull stills: `ffmpeg -ss T -i out.mp4 -frames:v 1 -q:v 2 t_T.png` at frame 0, the mid-point of every shot, every text-on and the last frame.
  - Why: these are documented ffmpeg filters, and `scdet` thresholds of 8-14 are the documented good range.
- **Compression stress test:**
  - Re-encode the master at a low bitrate, e.g. `-b:v 3M`. That figure is a guess at platform delivery rates, since none publish them.
  - Then score it: `ffmpeg -i lowbr.mp4 -i master.mp4 -lavfi libvmaf -f null -`. This needs ffmpeg built with libvmaf.
  - Why: it shows which elements (thin net, small UI text, grain) break first, and a 6-point VMAF gap is about one just-noticeable difference.
- **Per-platform outputs:** TikTok and organic Reels or Shorts get 1080x1920. Meta paid Reels get 1440x2560 only when the source is 4K. Keep the duration at or under 30 s so it also works as an Apple app preview.
