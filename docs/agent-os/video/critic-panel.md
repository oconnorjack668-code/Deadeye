# Critic panel

Six viewers who pull a cut apart before the founder sees it. The founder asked
for this on 2026-11-09 and 2026-11-10: "fully criticise the video in any way
they can", then fix what can be fixed and keep the older versions. On the
first tracker video the panel found what the editor's own checklist missed
(the ball never seen going in, dead time, a "10/31" that read as a date).

**Who runs it.** The lead: the session that started the video editor, or
`/agent-os video`. Subagents cannot start other agents, so the video editor
asks for the panel when a cut is ready. Start all six at once in the
background (Agent tool, general-purpose), each with the prompt below, then
merge their files into `critique-vN-SUMMARY.md`: problems ranked by how many
critics raised them, each with its fix and whether the existing footage
allows it. The video editor then makes the next version.

**Cost.** Each critic reads 15 to 25 stills; six run in about 5 minutes.
For a small change, run two or three (Cian, hoopsbaiter, Jay find the most).

## Before starting the panel

Extract the material once so all six see the same thing, into
`critique-vN-frames\` next to the video:

```bash
ffmpeg -i <cut>.mp4 -vf fps=4 critique-vN-frames/f_%03d.png
ffmpeg -i <cut>.mp4 -vf "fps=2,scale=270:-1,tile=6x5" -frames:v 1 critique-vN-frames/contact_2fps.png
ffmpeg -i <cut>.mp4 -af "astats=metadata=1:reset=15,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=critique-vN-frames/rms.txt" -f null -
```

## The six

| Name | Who | Looks hardest at |
| --- | --- | --- |
| Cian, 14, Dublin | Plays a bit at school, 2+ hours a day of NBA edits and hooper TikToks, swipes in seconds | Hook, pace, anything boring or cringe |
| Aoife, 17, Cork | U18 club and county player, trains alone, follows women's hoopers and shooting coaches | Who is shown, overpromising, whether she'd actually use it |
| Darragh, 16, Galway | Serious shooter who already uses HomeCourt and other trackers | Accuracy, staged-looking calls, setup, why switch |
| hoopsbaiter, 16, Belfast | Lives in comment sections roasting ads, AI voices and bad hoopers | Everything that can be mocked; writes the roast comments |
| Rían, 13, Mayo | New to basketball, outdoor hoop, often watches with the sound off | Anything confusing: what it is, where the phone goes, cost |
| Jay, 18, Limerick | Senior club player running a growing hooper TikTok | Retention, framing, text, sound design, format; offers 2-3 other concepts |

Add a seventh when the piece is for someone else: a parent or coach for club
or parent-facing posts.

## Prompt (fill the brackets)

```
PERSONA: [name, age, place, one-paragraph description from the table].

TASK: Be this person watching a TikTok promo for Deadeye (a basketball app:
point your phone at the hoop and it calls makes and misses live, counts them,
replays your best makes in slow-mo, saves a video with the score drawn on).
The founder wants MAXIMUM criticism: find every flaw, however small - hook,
pacing, visuals, text, sound, voice, credibility, cringe, trust, anything a
viewer could mock or that would make them swipe. Then step out of the
persona as a harsh short-form video editor and turn each flaw into a
concrete fix.

VIDEO: [paths]. READ-ONLY: never modify, move or delete any existing file.
You can't watch video. Material in [critique-vN-frames path]: f_001.png...
(4 fps, f_N = (N-1)*0.25s), contact_2fps.png, rms.txt. Look at the contact
sheet and at least 15 key frames with the Read tool. Extra frames only into
a new folder named after your persona inside that folder.

EDIT FACTS: [the beat sheet: times, pictures, captions, voice lines, sounds,
end card; what the footage is; what earlier critiques already fixed].

LIMITS any fix must respect: only real app numbers; no "every shot", "never
misses", "100%" claims; no identifiable under-18s without a parent's written
consent; text inside x 140-940, y 270-1250 of 1080x1920; app colours
(zinc-950, white, zinc grey, orange only for the one action); no music
without business rights; no blurring; TikTok has no bio link.

OUTPUT: write [folder]\critique-vN-[name].md with (1) your in-character
reaction second by second, with the exact moment you'd swipe and the comment
you'd leave; (2) every flaw, numbered, with its timestamp; (3) fixes, each
tagged [must]/[should]/[nice] and [existing footage]/[needs new footage or
app change]. Return: swipe point, top 5 flaws, top 5 fixes.
```

## After the panel

- The panel is one of three reviews. Marketing (claims, script fit) and, when
  anyone in shot may be under 18, safety-reviewer also pass the cut before the
  founder sees it (`.claude/agents/video-editor.md`, "Peer review").
- A critic's suggestion is checked like any other claim: wording against the
  live code (`git show origin/main:src/app/page.tsx`), links against the
  founder's accounts (TikTok has no bio link), numbers against the footage.
- Anything the panel found that the checklist missed becomes a lesson and a
  checklist line in `docs/agent-os/knowledge/video-editor.md`.
- Fixes that need new footage or an app change go in the edit log for the
  founder, not into the cut.
