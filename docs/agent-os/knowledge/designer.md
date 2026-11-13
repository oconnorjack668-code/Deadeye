# Designer knowledge

Last researched: 2026-11-11 (about 70 sources: 6 peer-reviewed, 34 official, 14 industry, 17 practitioner)

Read `README.md` here for how this file works. Strength: `strong` (peer-reviewed with a
good sample, or the official rule itself), `moderate` (small study, or a large industry
dataset), `weak`/`practitioner` (vendor or trend piece); `dated` = over ~2 years.

## Lessons from the founder

- 2026-11-11 · The founder wants a designer who knows "from internet research basketball
  trends what looks good and cool". Rule: every design cites the trend board
  (`../trends/visual.md`) and dated sources; never design from memory or taste alone.

## Lessons from results

What the outcome of earlier work taught (see "Results review" in the agent file).
Newest first, each with the date, what happened, and the rule.

- 2026-11-13 · Tracker S8 review: the builder's 640 px stills looked right, but at 390 px inline
  and in the 9:16 export the MAKE/MISS call clipped and covered the "Fix rim" and full-screen buttons.
  Rule: review overlays at 390 inline, full screen, 9:16, and with warnings showing, never from
  stills at one size. Headless Chrome won't go below 512 px wide: pin a 390 px column instead.

## Checklist

### Every design

- [ ] Looked at the real screen live at 390x844, dark and light, before designing.
- [ ] Trend board line(s) cited; nothing copied (no NBA, team, Nike, Jordan, Basketball
      Ireland marks, kits, fonts or colour schemes; no emerald-and-shamrock as our colours).
- [ ] Two or three directions that differ in idea; one recommended with why.
- [ ] Contrast measured from the hex values (text 4.5:1, large 3:1, controls 3:1), dark and
      light, small grey labels on zinc-900 checked first.
- [ ] Targets 44px for main actions (platforms say 44pt/48dp; propose 48px for in-session
      buttons used mid-drill), 24px minimum anywhere; sticky bars never cover a focused field.
- [ ] Type from the scale, 12px floor for labels only; no serif, no gradient text.
- [ ] One orange per screen, for the next training action, never for "share more".
- [ ] MAKE/MISS and good/bad never shown by green and red alone: word, icon and lightness too.
- [ ] Every state: first-time, empty, loading, error, success, offline.
- [ ] Reduced motion: confetti, flames and count-ups become a fade.
- [ ] Overlays checked in every state that adds elements (warnings, banners, unsure pill), so
      nothing covers a button or runs off the frame; text sized from the picture, not the canvas.
- [ ] Works at 360px; share frames inside the TikTok and Instagram safe zones
      (about x 65-1015, y 270-1500 of 1080x1920), tested under the real overlays when possible.

### Streaks, badges, leaderboards (children's design)

- [ ] A missed day dims, never "lost"; freeze or pause offered; no countdowns, no late-night
      warnings, no loss-framed copy (ICO Standards 5 and 13, DPC Fundamentals, EU DSA minors
      guidelines).
- [ ] Streak reminders and push nudges opt-in for under-18s (flag to safety-reviewer).
- [ ] "Done for today" as plain and equal as "Go again".
- [ ] Leaderboards small and fair (friends, team, age band), one tap away, not on home; a
      personal-best view first.
- [ ] Data and sharing choices: Yes and No equal in size and weight; most private by default.
- [ ] Each badge has an on-screen moment when earned and a visible shelf.

### Share cards

- [ ] Captures a peak (new best, milestone, 10 in a row), not an average session.
- [ ] One giant number, minimal text, says something about the player.
- [ ] Shows only what the player chose; name off by default.
- [ ] Built as Instagram Stories background (1080x1920) plus sticker layer.
- [ ] Raw player footage allowed on share cards and social; app UI itself stays clean.

### Store listing

- [ ] Screenshot 1 carries the main promise (live MAKE/MISS overlay); first three stand alone.
- [ ] Captions under 20% of the frame; no "best", "#1", "free", "download now"; no other
      brands' logos, even on clothes.
- [ ] Feature graphic not on zinc-950 or near-black (vanishes on the store).

### AI imagery

- [ ] No logo, mascot or core brand art from AI output alone; no realistic AI people shown as
      real; any AI visual in marketing labelled (EU AI Act Art. 50).

## Research

Findings with their sources are in `findings/designer.md`. Search it when a task needs
evidence; add new findings there, not here.
