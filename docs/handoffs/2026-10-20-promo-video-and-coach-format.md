# Promo v2 and AI coach reply formatting (2026-10-20)

Agent: Claude Code (Opus 5.5, Sonnet 5.5 for one build round) · Commits: 0511ed6, c1a6752, plus this handoff · Status: shipped, pushed, deployed (Vercel production Ready on c1a6752)

## Outcome
- New promo in `docs/brand/`: `deadeye-promo-voice.mp4`, `deadeye-promo-silent.mp4` (effects only), `-square` 1080x1080 cuts, old one renamed `deadeye-promo-v1.mp4`. It is the first promo with a voice, new captions, real programmes screen, watermark, grade and sound effects.
- AI coach replies now render headings, nested lists, bold and italics instead of raw `### ` and `- `.
- Session handoffs (this folder and `.claude/skills/handoff/`) set up to cut context use.

## Decisions
- Shipped the first promo + voice, not the new 32s build: the user preferred its look side by side.
- Voice: Kokoro `am_adam` at 1.04x, one clip per phrase, each caption timed to its words: the user wanted them in sync and a smoother read.
- Old captions are blurred in place and new ones cover them exactly: the old video's source script was gone.
- No darkened patches anywhere: the user disliked them. Title pop-ins are covered by a clean patch from a moment later.
- Sound effects synthesised from scratch (`make-sfx.mjs`): no licence questions. No music baked in; add from TikTok/Instagram's commercial library when posting.
- Drills stay "150": only `00013` seeds drills. "160+" is gym exercises.
- "Any angle" dropped: the tracker needs the phone off to one side (`ShotTracker.tsx:699`).

## Where things are
- `docs/brand/promo-classic/`: the shipped HyperFrames project, README has rebuild steps.
- `docs/brand/promo-video/`: the alternative 32s build, all scripts (`build-classic`, `make-voice-phrases`, `make-sfx`, `mux-voice`, `make-squares`), `PLAN.md` with every on-screen number and its source.
- `src/lib/ai/coachText.ts` (parser), `src/app/(app)/ai-coach/chat/CoachChat.tsx` (render), `src/lib/ai/chat.ts` (prompt line on formatting), tests `__tests__/coachText.test.ts`, `__tests__/coachChat-format.test.tsx`.

## Open
- Coach formatting not yet looked at in the live app (needs a signed-in account): ask the coach for a plan and check it.

## Gotchas
- No Python here: Kokoro runs through kokoro-js installed in a temp folder; HyperFrames needs ffmpeg and ffprobe on PATH (ffmpeg in `%LOCALAPPDATA%\Temp\deadeye-bench\ffmpeg-bin`, ffprobe from the `ffprobe-static` npm package).
- The shell splits on the space in "Vivobook S16": quote paths or use node scripts.
- HyperFrames allows one root composition per project, hence two project folders.
- ffmpeg `alimiter` auto-levels to 0 dB unless `level=0`.
- "Can you not add X" from this user meant "add X": confirm a reading when it could go both ways.
