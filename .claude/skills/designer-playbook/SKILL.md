---
name: designer-playbook
description: How a professional product designer and sports artist works for Deadeye - trend research in basketball culture, design directions, mockups, design critique, accessibility, share cards, badges, social templates and store screenshots. Loaded by the designer agent; use it for any new or changed screen, graphic, look or design review.
---

# Designer playbook

A professional designer at a sports brand knows the culture before they
open a design tool: what players wear, watch, play and share this season.
They take principles from it, never copies, and fit them to the product's
own identity. They show options, recommend one, check it against hard rules
(contrast, size, states), and hand the builder something that needs no
guessing. The rules in `.claude/agents/designer.md` win over this file. A
gold-standard trend line, proposal and review: `examples.md` in this
folder.

## Standards you work to

| Standard | What it means here |
| --- | --- |
| Deadeye identity | `docs/design.md`: dark zinc, one orange for the next action, Geist, heavy tabular numbers, lucide icons. Evolve it with the founder's yes; never drift screen by screen. |
| WCAG 2.2 AA | Text 4.5:1 (3:1 large), non-text 3:1, target size 24px minimum (44px for main actions here), focus visible, reduced motion respected. |
| Platform guidance | Material 3 and Apple HIG for dark mode, touch, motion; Google Play's store listing rules for screenshots and icons. |
| Age-appropriate design | Irish DPC Fundamentals and the UK Children's Code: no nudges that work against a child's interest, no dark patterns, celebrate effort not spending. |
| Nielsen's heuristics | The ten usability heuristics as the spine of every critique (visibility of status, match with the real world, user control, consistency, error prevention, recognition over recall, flexibility, minimal design, error recovery, help). |
| Original work | Principles, not copies. No marks, logos, kits, photos or fonts without a licence. Nothing that suggests an endorsement. |
| Safe zones | 1080x1920 share frames keep text inside the TikTok and Instagram safe zones (`docs/brand/video-style.md`). |

## Method

1. **See it as a player.** Open the screen live at 390x844, dark and
   light, as the tester. Note the first thing the eye goes to, what to do
   next, and anything that feels like a school form or a SaaS dashboard.
2. **Trend board.** Collect 8 to 15 references from this season:
   basketball brands and leagues (campaigns, City Edition-style design
   systems, broadcast graphics), games (2K-style menus and stat screens),
   creators and media (Overtime, House of Highlights, SLAM), sneaker and
   streetwear drops, and the best sports and fitness apps (Strava, Whoop,
   Nike Run Club, HomeCourt, Duolingo for streaks). For each: source, date,
   what makes it work (type weight, contrast, layout rhythm, motion, grain),
   and the one principle Deadeye can take. Write it in
   `docs/agent-os/trends/visual.md`.
3. **Brief.** One sentence: the problem, who it is for, the activation step
   it should move, and the constraint (existing components, one orange).
4. **Directions.** Two or three that differ in idea, not shade: for
   example "scoreboard" (broadcast numbers), "locker room" (gritty,
   textured), "clean pro" (Whoop-like calm). Sketch each fast at phone size.
5. **Mockup.** The recommended direction at full detail: a Figma draft
   frame, or a static HTML file in `docs/agent-os/design/mockups/` using
   the app's Tailwind classes so the builder can lift it. Real copy, made-up
   numbers, every state (empty, loading, error, success, first-time).
6. **Check.** Run the checks in the agent file: contrast (measure, do not
   eyeball: use the hex values in `globals.css` and `theme.css`), targets,
   type scale, one orange, 360px, safe zones, reduced motion, dark and
   light.
7. **Critique yourself** against the ten heuristics and the trend board:
   does it look like this season, or like 2019? Would a 15-year-old screenshot
   it? Would a parent be comfortable with it?
8. **Hand over** as a `D<n>` backlog item with the mockup, the build note
   (files, components, classes) and the states, or as a template for
   marketing with sizes and safe zones.

## What to design for Deadeye

- **Share moments**: the end-of-session card, a new personal best, a
  streak milestone, a badge. These are free marketing: a player posts them.
  Big number, the Deadeye mark small, the player's chosen name only if they
  choose, 1080x1920 and 1080x1080.
- **First-time screens**: the welcome, setup and first log, where most new
  players stop (the activation report says where).
- **Badges and levels**: a consistent set (shape, line weight, one accent
  per tier), earned for practice, never bought.
- **Social templates** for marketing: a cover, a stat overlay, a challenge
  card, in Canva or Figma, using the brand look.
- **Store listing**: screenshots that show the app doing one thing each,
  with a short caption, the first two carrying the main promise.
- **Tracker visuals**: the count, flame, MAKE/MISS and end card, legible
  in a gym on a phone at arm's length.

## Trade tools

- **Chrome** (`mcp__claude-in-chrome__*`): the live app and previews at
  phone size, screenshots for before-and-after. Tester account only;
  change nothing.
- **Figma** (`mcp__plugin_marketing_figma__*`): draft files for screens
  and components. Call `create_session` first; never share or publish.
- **Canva** (`mcp__plugin_marketing_canva__*`): social templates and
  flyers from the brand kit. Drafts only.
- **Adobe** (`mcp__plugin_adobe-for-creativity_Adobe__*`): image
  clean-up, resizing to every social size. Drafts only.
- **HTML mockups**: plain HTML with the Tailwind CDN at a pinned version
  and the app's class names, saved in `docs/agent-os/design/mockups/`.

Each needs the founder's one-time sign-in. If one is not connected, use
an HTML mockup and say so.

## Quality bar

- A builder can build it from the doc with no question.
- Every colour is an existing token or class, or a named proposal.
- Contrast and target checks written with the measured numbers.
- Every state designed, dark and light.
- The trend board line it draws on is cited, and nothing is copied.
- A 15-year-old would want to share it; a parent would be fine with it.

## Common mistakes

- Designing from code or from memory instead of looking at the screen.
- A trend chased so far that Deadeye stops looking like Deadeye.
- Three oranges on one screen.
- Grey text on grey that fails contrast because it "looks fine".
- Text under 12px to fit a stat in.
- A share card that shows more about the player than they chose.
- Using a team's colours, a league's font or a brand's swoosh-like mark.
- A streak or badge that punishes a missed day.
