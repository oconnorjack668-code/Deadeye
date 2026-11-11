# Designer: gold-standard examples

Examples of the standard to aim at. Sources and numbers are illustrative;
check every source before you use a line like it.

## Example 1: a trend board line

```
- 2026-11 · Broadcast-style stat graphics on basketball TikTok: one huge
  condensed number, a thin label above it, a coloured bar under it, lots of
  black space. Seen across league and media accounts this season (links in
  findings). Take: Deadeye's end card leads with the makes number at
  text-5xl font-black tabular-nums, the label in text-xs uppercase
  tracking-wider zinc-400, one orange bar for the percentage. No league
  font, no league colours.
```

Why it is good: dated, sourced, says what makes it work, and turns it into
Deadeye's own classes without copying anyone.

## Example 2: a design proposal (short)

```
Skills: all 8 loaded

# End-of-session card · 2026-11-18

Problem: players finish a session and the summary looks like a receipt, so
nobody shares it. For: a new player after their first session. Step it
should move: second session within 7 days (sharing makes them come back
for the next card).

Directions
A. Scoreboard: big makes number, shot chart dots, orange percentage bar.
   (recommended: reads at arm's length, looks like the stat graphics
   players already share)
B. Locker room: grain texture, torn-tape label, big number. Strong but
   the texture fights small screens and light theme.
C. Clean pro: Whoop-like rings. Calm, but reads as fitness, not basketball.

Recommended: A. Mockup: design/mockups/end-card-a.html (390x844 and
1080x1920). Figma draft: <link>.

Spec: bg zinc-950; number text-5xl font-black tabular-nums text-white;
label text-xs font-semibold uppercase tracking-wider text-zinc-400; bar
bg-orange-600 h-2 rounded-full; mark 24px bottom-left inside safe zone.
States: first session ("Your first one"), personal best (orange label
"New best"), zero makes ("Every shot counts" - no shame).
Light theme: card white, number zinc-950, bar orange-700.

Checks: contrast number 19.8:1 pass, label 7.1:1 pass, bar non-text 4.6:1
pass; share button 44px pass; type from scale pass; one orange pass;
360px pass; safe zone pass (text inside x 140-940, y 270-1250); reduced
motion: count-up replaced by the final number pass. Shows the player's
name: only if they turn it on, off by default.

Hand-over: D3 in backlog (idea). Files likely: the session summary
component; reuse Card, Button.
```

## Example 3: a review of the builder's screen

```
Review of exp/E6 streak screen (preview, 390x844, dark and light)

1. Two oranges (flame and "Log now" button): make the flame orange-400
   outline-only so the button is the one action. Heuristic: minimal design.
2. "3 day streak" at text-[11px]: below the 12px floor; use text-xs.
3. Light theme: zinc-400 label on white is 2.6:1, fails; use zinc-500
   (mapped to the darker light shade in theme.css).
4. Missed-day state says "You lost your streak!" in red: loss-framed for a
   child. Use "Start a new streak today" in zinc-300 and keep the best
   streak visible.
5. Good: the big number and the week dots read well at arm's length.
```

Why it is good: seen on screen, each point names the rule and the exact
fix, it catches a children's-design problem, and it says what works.
