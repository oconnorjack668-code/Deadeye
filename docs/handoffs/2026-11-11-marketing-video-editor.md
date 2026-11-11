# Marketing week, Tuesday video v1-v4, video-editor agent (2026-11-11)

Agent: Claude Code (Opus 5.5), with marketing and research subagents · Commits: b810150, 3ed190e (PR #82, merged be39d53), fd0a0d2, 623e6fb (this PR) · Status: shipped (agent); video waiting on the founder

## Outcome
- New **video-editor** agent (PR #82): HyperFrames skills, knowledge file, playbook (~55 sources), six-critic panel, tools list, `/agent-os video`. Marketing now writes scripts and hands cutting to it.
- Marketing week of 9 Nov: plan, scripts, results log (first promo: TikTok 1,070 views / 51 likes; IG 1.9K / 24), research on its open questions.
- Tuesday's "It caught fire" video cut four times from clip 16761's tracker export; v4 (9.2s, silent main + voice) is ready, not posted.

## Decisions
- Founder: a separate video editor; marketing keeps the "what" and the research. Codex file made too, though there's no Codex subscription yet.
- Founder: AI voice allowed, but the silent cut is main (every critic disliked the voice). Logo on end cards, app colours, no orange underline; avoid the streak flame and MAKE/MISS close-ups until the tracker redesign.
- Founder: "150+ drills" (168 in the app). TikTok has no bio link: captions and end cards show the address.
- Two 9 Nov plans existed (scheduled run and the founder's session): both kept; `2026-11-09-plan.md` is the founder's, `-weekly-run.md` the scheduled one.

## Where things are
- `Documents\deadeye-recordings\2026-11-10-caught-fire\`: v1-v4 videos, check stills, critiques (`critique-v3-SUMMARY.md`), build scripts in `work\` (outside git).
- `docs/agent-os/video/2026-11-10-caught-fire.md`: edit log with the v4 beat sheet and checks.
- `docs/agent-os/video/` (playbook, critic panel, tools) and `knowledge/video-editor.md`.
- `docs/agent-os/marketing/2026-11-09-plan.md`, `-scripts.md`, `results.md`.

## Open
- Founder: consent for the shooter and the crouching bystander in 16761 (still visible in the v4 miss beat), then post v4 with a sound from TikTok's/Meta's library; voice version needs the AI label.
- Founder: send the promo's profile visits, link taps and post dates per platform.
- DPIA (`docs/legal/dpia.md`): add the marketing footage pipeline (stills go to Anthropic in Claude Code sessions); no Gemini video tools on minors' footage without a DPIA update and consent.
- HyperFrames plugin in `.claude/settings.json` was blocked by the safety check; enabled at user level only. Cloud setup script would need `heygen-com/hyperframes` too.
- Tracker redesign (builder): flame beside the count not over it; MAKE/MISS banner beside the rim; no underline on the export end card.
- New filming: phone on a bag in shot, head height or higher, not facing windows, nobody else in the hall, a girl player for some posts.
- Site-wide meta description still says "Track every shot" (`src/app/layout.tsx`); the landing page itself is clean (PR #80).

## Gotchas
- Entering a worktree isolates the whole session: a subagent's shell starting in the shared checkout is refused, so v4 couldn't render until the lead ran it.
- The tracker export's slow-mo replays shift timestamps; full-range colour turns end cards grey; slowed/held segments run long; loudnorm fell back to dynamic on the effects mix (gain + limiter instead). All in the video-editor knowledge file.
- The worktree was 27 commits behind main: agents quoted old landing wording. Check `git show origin/main:...`.
