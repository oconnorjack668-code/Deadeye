<!-- Tools research for the video editor, 2026-11-10. Recommendations only: nothing installed or signed up for. -->
# Tools for Deadeye's video-editor agent: research, 2026-11-10

**Update 2026-11-11.** The founder doesn't like the Kokoro voice: the "Kokoro British voices until then" stopgap below is replaced by the playbook skill's order (a real voice; else a synthetic voice the founder picks from samples; Kokoro only if chosen). `npx hyperframes` is now v0.9.33 and adds `audio` (onsets and loudness in film time), `measure` (cuts, events, look, faces) and `normalize-audio`; `doctor` on the laptop shows whisper.cpp and Kokoro not installed (Parakeet installs with `npx hyperframes models install parakeet`). Canva, Adobe and Figma are now in the agent's tools but work only once the founder signs in to each. Details: `docs/agent-os/knowledge/findings/video-editor.md` ("Tools the editor has").

Research only: nothing was installed, enabled, signed up for or run. Limits referred to below: (1) can't watch video, (2) American/robotic voice, (3) no licensed music, (4) no performance feedback, (5) far, low-resolution amateur footage.
Context checked in the repo: `docs/legal/dpia.md` R9 says app videos are "never sent to the AI provider". The tracker already logs the ball on each scored frame, the rim and each call (`src/lib/video/overlayTimeline.ts`). Python 3.14 is installed (checked 2026-11-10; the 2026-10-20 handoff said none). Remote (HTTP) MCPs avoid all ARM64 problems; uvx/Python ones need an ARM64 Python + uv first.

## Ranked shortlist

| # | Candidate | Limit | Official? | Cost | Win ARM64 | Setup | Child-data risk | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **Local "eyes"**: the app's tracker log exported as JSON, plus ffmpeg filmstrips, scene, brightness, loudness and onset data | 1, 5 | in-house, nothing to install | free | yes | agent writes the script | none: stays on the laptop | **ADOPT** |
| 2 | **Real adult Irish voice** (founder or coach) recorded on a phone and cleaned in ffmpeg; Kokoro British `bf_*`/`bm_*` voices until then | 2 | n/a | free | yes | founder records lines | none (adult voice) | **ADOPT** |
| 3 | **ElevenLabs**: API key through HyperFrames media-use; hosted MCP for voice design | 2, SFX | official | $6/mo Starter (commercial use), $22 Creator | remote, OK | founder account, key or OAuth | low: sends script text only; never send court audio | **ADOPT** if synthetic |
| 4 | **Instagram Graph API insights**, through a small read-only script | 4 | official | free | Node, OK | IG professional account + Meta dev app token | low (aggregate numbers) | **ADOPT** |
| 5 | **Claude in Chrome** reading TikTok Studio, IG Insights and TikTok Creative Center | 4 | installed | free | yes | founder's signed-in Chrome, read-only | low; automation is a ToS grey area | **TRY** now |
| 6 | **Supermetrics MCP** (installed, 14-day trial) or **Metricool MCP** | 4 | vendor | trial, then ~$37+/mo; Metricool Advanced ~€43-67/mo | remote / uvx | founder OAuth | low | **TRY** |
| 7 | **Amazon Polly "Niamh"** (en-IE) / **Azure en-IE Emily, Connor** | 2 | official | free tier, then per character | Node SDK, OK | AWS or Azure account | low: text only, EU regions | **TRY** |
| 8 | **DaVinci Resolve Studio** + `samuelgursky/davinci-resolve-mcp` | 5 | Resolve official; MCP community (~4k★) | ~$295 one-off | Resolve native ARM64; MCP needs Python | founder installs and buys a licence | none (local) | **TRY** |
| 9 | **Gemini video understanding** through your own script (paid key), or Vertex AI EU with zero data retention | 1 | official | cents per clip | Node, OK | Google billing | **HIGH: uploads video of minors** | **TRY after a DPIA update** |
| 10 | **Epidemic Sound MCP** | 3 | official (beta) | ~$17-30/mo for a tier that covers ads | remote | subscription + API key | none | **SKIP** under the current music rule |

## 1. Video understanding ("watching")
- **In-house eyes (ADOPT).** Claude has no native video input, so make the stills smarter, at no cost and with no upload. Per clip:
  - export the tracker's event log (`overlayTimeline`: ball on each scored frame, rim box, each make or miss and its time) as JSON. This gives exact event times and real counts, and a ball/rim path that can drive the 9:16 crop.
  - ffmpeg `tile` filmstrips at 10-15 fps around each event, so motion reads in a single image.
  - ffmpeg `select='gt(scene,0.3)'`/`scdet` for cuts, `signalstats` for exposure, `ebur128` and `silencedetect` for audio.
  - then HyperFrames `snapshot`/`compare` on the output.
- **Gemini API** (official; returns timestamped descriptions and answers about a clip; samples 1 fps by default with a custom `fps` option; ~300 tokens/s, so a 25s clip costs cents) [docs](https://aistudio.google.com/docs/video-understanding).
  - Terms ([terms](https://aistudio.google.com/docs/terms), effective 2026-03-23): users must be 18+. The API must not be part of a service "directed towards or likely to be accessed by" under-18s; a back-office editing pipeline is arguably outside that, but get a legal read. Users in the EEA get the paid-service data terms (no training on prompts) even on free quota. Prompts are logged "for a limited period" for abuse detection. Files API uploads expire after about 48h (they can be deleted sooner).
  - Better for GDPR: **Vertex AI** with an EU regional endpoint, the Cloud data processing terms, and zero data retention (turn off caching and ask for the abuse-logging exception) [ZDR](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/data-governance).
  - **Needs a DPIA update and parental consent before any footage with under-18s.** Use your own ~40-line `@google/genai` script rather than a community MCP.
- **Community Gemini MCPs**: `ugarchance/mcp-gemini-video-understanding` (~0★) and `Galbaz1/video-research-mcp` (uvx, 30+ tools). **SKIP**: unvetted code holding the API key and the footage.
- **TwelveLabs MCP** (official, remote OAuth "Jockey"; Pegasus/Marengo models) [docs](https://docs.twelvelabs.io/docs/advanced/model-context-protocol). Media must sit at *publicly accessible URLs*, the service is hosted in the US, its policy says it is "not directed to children under 18", and it gives no retention period [privacy](https://www.twelvelabs.io/privacy-policy). **SKIP.**
- **Local VLM**: Ollama runs natively on ARM64 (CPU, not the NPU) with Qwen3-VL 4B/8B on frames. Private but slow and weaker. **TRY** only as a second opinion.
- **Flag:** the stills the agent reads today already go to Anthropic inside the Claude Code session. The DPIA's Anthropic line ("never ... photo or video") covers the app's AI coach only. Add the marketing pipeline to the DPIA.

## 2. Editing, reframe, upscale, stabilise
- HyperFrames already covers reframing (clip-path, keyframes, punch-ins), transcript cuts, `beats`, `snapshot`/`compare` and local `remove-background`. Gaps: smart reframing and upscaling.
- **Tracker-driven reframe (ADOPT).** Feed the ball/rim path from step 1 into HyperFrames keyframes. It is exact, honest, needs no new tool and is better than generic subject trackers for a small ball.
- **DaVinci Resolve Studio + davinci-resolve-mcp (TRY).** Local Smart Reframe, Super Scale upscaling, UltraNR denoise and a stabiliser. Resolve has run natively on Windows-on-Arm since v19; the v20 notes list Snapdragon X *Elite* + 16 GB as the minimum, so check this laptop's chip.
  - The MCP is MIT-licensed, ~4k★, v5.0.3, active, with loopback-only auth and a safe mode [repo](https://github.com/samuelgursky/davinci-resolve-mcp).
  - The free Resolve only works through a bridge that is unconfirmed past 21.0.x (21.1 moved Python scripting to Studio).
- **ffmpeg MCPs** (`video-creator/ffmpeg-mcp` ~134★, `egoist/ffmpeg-media-tools` ~93★, `kyanitelabs/mcp-video` ~19★). **SKIP**: the agent already runs ffmpeg through Bash, and each one adds unaudited code with file access.
- **Remotion skills** (official `remotion-dev/skills`; free for companies of 3 people or fewer [license](https://remotion.dev/license)). **SKIP**: duplicates HyperFrames.
- **Premiere / After Effects / CapCut MCPs**: none are official. They are community bridges (UXP/CEP; CapCut draft-file hacks under ByteDance's terms). **SKIP.**
- **Descript hosted MCP** (`api.descript.com/v2/mcp`; cloud captions and reframe). **SKIP**: a US cloud upload of minors that duplicates HyperFrames.
- **Adobe for creativity (installed).**
  - `adobe-edit-quick-cut`: AI picks the moments, the footage is uploaded to Creative Cloud and results are not deterministic, which clashes with "never re-time a count". **SKIP.**
  - `adobe-resize-photos-and-videos` / `adobe-create-social-variations`: only resize video; the skill itself says "auto-reframe for video is not available in Claude yet", and image "generative expand" invents pixels. **SKIP** for footage.
  - `adobe-design-from-template`: covers only, and only with no child imagery. Low value.
- **Auto-reframers.** Google AutoFlip dates from 2020 and is MediaPipe-era. YOLO-based `autocrop-vertical` needs Python + OpenCV, which has no official win_arm64 wheel. **SKIP.**
- **Upscaling and denoise.**
  - Topaz Video needs AVX and has no Snapdragon support. **SKIP.**
  - Real-ESRGAN-ncnn-vulkan (the HyperFrames recipe) has had no release since 2022 and no ARM64 build. **SKIP** on this laptop.
  - **ADOPT** ffmpeg `scale=...:flags=lanczos` + `cas` sharpening + `hqdn3d`/`nlmeans`.
  - Better capture is the real fix: 4K landscape gives a ~1215 px wide 9:16 crop; or film closer, or run a second phone filming vertically.
- **Stabilisation.** ffmpeg `vidstabdetect`/`vidstabtransform` (if this build has libvidstab), `deshake`, or Resolve. Propped-phone footage rarely needs it.
- **Removing bystanders. SKIP.** Generative fill changes what happened, falls under Meta and TikTok's labels for realistic AI-altered video, and blurring is banned. Re-crop, re-cut or get consent.

## 3. Voice
- **Real voice first (ADOPT).** The AI label cut credibility and clicks in a 2025 study (already in `marketing.md`). Record an adult Irish voice and clean it locally (ffmpeg `afftdn`/`arnndn`, `loudnorm`). Until then, switch Kokoro to its British voices (`bf_emma`, `bm_george`), which cost nothing.
- **ElevenLabs (ADOPT if synthetic).**
  - The hosted official MCP is at `https://api.elevenlabs.io/v1/mcp` (OAuth). The old local `elevenlabs-mcp` repo (1.5k★) is archived [docs](https://elevenlabs.io/docs/eleven-api/resources/mcp-server). HyperFrames media-use already calls ElevenLabs once `ELEVENLABS_API_KEY` is set.
  - Irish-accent voices are in the library, and voice design can make a "young adult from Dublin" voice.
  - The free plan allows no commercial use; Starter at $6/mo adds the commercial licence [pricing](https://elevenlabs.io/pricing). Library voices can carry extra terms from their creators.
  - Child or child-like voices are banned [help](https://elevenlabs.io/docs/help-center/product/voices/voice-library/can-childrens-or-child-like-voices-be-added-to-the-voice-library), and uploading children's voice data is barred. **Never send court audio** (for speech-to-text, isolation or voice changing).
- **Gemini TTS** (already wired into media-use as `provider: gemini`; accent is steered by a style prompt; I found no Irish test). **TRY**: one key covers TTS and video.
- **Amazon Polly Niamh** (en-IE, neural and generative; the generative engine is offered in Frankfurt) [docs](https://docs.aws.amazon.com/polly/latest/dg/generative-voices.html). **Azure** en-IE Emily and Connor are the alternative. Real Irish English, text only. **TRY** as a cheap fallback.
- **HeyGen** (media-use's default route): **SKIP** avatars (an invented person). TTS is fine but has no Irish advantage.
- **Labels:** any realistic synthetic voice means the AI label on TikTok and Meta, which is already your rule.

## 4. Music and SFX
- **Keep the rule:** TikTok Commercial Music Library or Meta Sound Collection, added by the founder in the app. The agent can't hear those tracks, so ask for the track and its tempo, cut to a beat grid (`npx hyperframes beats` on a reference or click track), and leave a music-friendly tail.
- **SFX: ADOPT what is already there.** media-use pulls only CC0 or CC BY sounds from Openverse (no account) and writes CREDITS.md for them. The Freesound API itself needs a negotiated licence for commercial use, so **SKIP** using it directly.
- **ElevenLabs sound effects** (commercial on a paid plan; your rule allows synthesised SFX). **TRY** alongside Starter.
- **Epidemic Sound MCP** (official beta; search, download, cut to length, SFX, voiceovers; downloads need a paid plan, and ads need Pro/Business tiers, where sources conflict) [docs](https://developers.epidemicsound.com/docs/mcp/). **SKIP** now. It is the best option if the founder ever allows agent-placed music: the same track works on both platforms and the agent can hear it. Artlist, Soundstripe and Uppbeat have no MCP. ElevenLabs Music: **SKIP** under the rule.

## 5. Analytics: what works
- **Instagram (ADOPT).** `GET /<media-id>/insights` on Reels returns `ig_reels_avg_watch_time`, `reels_skip_rate` (skipped within 3s; "in development"), `views`, `reach`, `shares`, `saved`, `reposts` and `total_interactions` [ref](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights). There is no retention curve and no link taps for Reels.
  - Needs a professional (Business or Creator) account and a Meta app with `instagram_business_basic` + `instagram_business_manage_insights`. A development-mode app is enough for the founder's own account.
  - Prefer a small script the agent writes over the many community Instagram MCPs.
- **TikTok.**
  - Display API: only public counts (views, likes, comments, shares).
  - Business "Accounts" API: connectors report average time watched and full-video-watched rate. Since 2026-03-20 it needs an access application form plus app review (privacy policy, demo video) [docs](https://business-api.tiktok.com/portal/docs/create-a-developer-app/v1.3), which is heavy for a solo founder.
  - Research API: academic use only. **SKIP** building on any of these yourself.
- **Supermetrics MCP** (installed through the marketing plugin; remote OAuth; included with Data API plans; 14-day trial, no card [page](https://supermetrics.com/products/supermetrics-mcp)). It lists Instagram Insights, TikTok Organic and YouTube connectors, but I could not confirm they work over the MCP. **TRY** the trial; keep it only if it returns the skip rate and TikTok's full-watch rate.
- **Metricool** (official TikTok and Meta partner app; `mcp-metricool` on PyPI, Apache-2.0, uvx; the API/MCP needs Advanced at ~€43-67/mo; shows average watch time and % watched to the end). **TRY** if Supermetrics falls short.
- **Claude in Chrome (TRY now, free):** read each post's retention graph in TikTok Studio and IG Insights in the founder's own signed-in Chrome, read-only, and log the 2s/3s hold, average watch time, shares and link taps in the edit log.
- **YouTube Analytics** (`audienceWatchRatio`; community MCPs only): **SKIP** unless you post Shorts. **Composio** (connected): a third-party token broker; keep social tokens out of it.

## 6. Captions, covers, brand kit
- **Captions: ADOPT what is already there.** `npx hyperframes transcribe` (Parakeet by default, whisper.cpp as fallback, word timestamps); run `npx hyperframes doctor` to confirm it works on ARM64. ffmpeg 8+ also has a built-in `whisper` filter if this build was compiled with it. No new MCP needed.
- **Covers:** the agent picks the frame from the filmstrips and renders a still in HyperFrames with the `docs/design.md` colours. **ADOPT.**
- **Canva** (installed; official remote connector `mcp.canva.com`): templates for covers and end cards. Brand templates and autofill need Pro, Teams or Enterprise (Canva's own docs conflict). Uploading stills of minors needs a DPIA entry. **TRY** for text-only covers. **Figma: SKIP. Google Drive:** a possible phone-to-laptop footage inbox in a private folder; add it to the DPIA.

## 7. To edit like a master
- **Capture guide for the founder:** 4K at 30/60 fps, phone 3-6 m back and to one side, rim and ball large in frame, no window behind the hoop. This fixes most of limit 5 at the source.
- **A feedback loop:** a CSV per post (hook variant, length, skip rate, average watch, shares). The agent reads it before every cut and tests three openings.
- **Research:** TikTok Creative Center (Top Ads for Ireland/UK, trending commercial sounds) through Chrome.
- **Security:**
  - Community MCPs run with the founder's rights and can read the footage and the keys; their output can also carry prompt injection. Prefer official remote MCPs or small scripts in the repo the founder can read, and pin versions.
  - Keys go in Windows user environment variables, never in `.env.local` or the repo.

## What to set up first
1. **Free, no sign-in.** Let the agent build its local eyes (tracker log to JSON, filmstrips, scene and onset data, tracker-driven crop) and switch Kokoro to `bf_*`/`bm_*`. Send the founder the capture guide.
2. **Voice (founder; free, or $6/mo).** Record the lines yourself or with an adult coach. If synthetic: an ElevenLabs Starter account, `ELEVENLABS_API_KEY` as a user environment variable, then pick or design a young-adult Irish voice. An AWS account to test Polly Niamh is optional.
3. **Instagram insights (founder sign-in, free).** Make sure IG is a professional account, create a Meta developer app (Instagram Login, insights permission) and put the long-lived token in a user environment variable; the agent writes the read-only script. Meanwhile, use Claude in Chrome on TikTok Studio.
4. **TikTok numbers (founder sign-in; free trial, then ~$37-67/mo).** Run the Supermetrics MCP trial; if TikTok's full-watch rate doesn't come through, try Metricool Advanced. Decide after 14 days.
5. **Before any footage leaves the laptop (founder + mam; cents to €295).** Update `docs/legal/dpia.md` (processors, R9), add an AI-processing line to the parental consent form, and prefer Vertex AI EU with zero data retention. Start with adult-only clips. Buy Resolve Studio only if tracker crops plus ffmpeg still look soft after better capture.
