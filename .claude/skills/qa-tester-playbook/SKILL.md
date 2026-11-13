---
name: qa-tester-playbook
description: How a professional QA tester checks Deadeye - risk-based planning, session-based exploratory testing of the critical journeys on the live app and previews at phone size, accessibility and speed checks, and bug reports a builder can act on. Loaded by the qa-tester agent; use it for any test run.
---

# QA tester playbook

A professional tester does not click around at random. They decide what
matters most this week (what changed, what broke before, what costs a
player most if it breaks), test it in time-boxed sessions with a charter,
record exactly what they saw, and write bugs anyone can reproduce. The
rules in `.claude/agents/qa-tester.md` win over this file. Gold-standard
reports: `examples.md` in this folder.

## Standards you work to

| Standard | What it means here |
| --- | --- |
| Risk-based testing | Changed areas and past breakages first, then the critical journeys; more time where a failure costs a player most. |
| Session-based exploratory testing | Each block of testing has a charter ("Explore the logger with Enter totals to find save failures"), a time box, notes, and a debrief. |
| Test heuristics | SFDIPOT (structure, function, data, interfaces, platform, operations, time) to find what to try; boundary values for numbers (0, 1, the maximum, negative, empty). |
| Bug report quality | One bug per report; title says what and where; numbered steps from a known start; expected and actual; how often; environment; evidence. |
| Severity | P1, P2, P3 as in support-triage (the agent file). Rank by harm to the player, not by how hard the fix is. |
| WCAG 2.2 AA | Contrast, focus visible, target size, keyboard use, labels, reduced motion. |
| Core Web Vitals | LCP 2.5s or less, INP 200ms or less, CLS 0.1 or less, at the 75th percentile; Lighthouse mobile as a lab check. |
| Production safety | Tester account only, no messages, no cron, no data but your own. |

## Method

1. **Scope.** What deployed since the last run (Vercel, git log). Read the
   changed files' names to know which screens to hit.
2. **Plan.** Charters: one per changed area, then the critical journeys.
   Time box about 45 minutes. Write the plan at the top of the file.
3. **Set up.** Chrome, new tab in the Claude group, phone size (390x844),
   dark theme, tester signed in. Clear console. For a preview link, check
   it is the right commit.
4. **Test** each charter: happy path, then the edges (empty, zero, very
   long text, emoji, back button mid-flow, refresh mid-flow, two quick
   taps, rotate, offline, slow network). Read the console and failed
   requests after each step.
5. **Confirm** each failure twice more from a clean start. Note whether it
   repeats every time, sometimes, or once.
6. **Evidence.** A screenshot of the failure (tester data only, crop
   anything showing another player), the console error text, the failed
   request's path and status (never its body if it holds personal data).
7. **Accessibility pass** on changed screens: contrast of new text, focus
   order with Tab on desktop size, target sizes, labels on icon buttons,
   reduced motion.
8. **Speed** (once a week, or when a heavy screen changed): Lighthouse
   mobile on Today and the logger; note LCP, INP or TBT, CLS.
9. **Write and hand over** (agent file steps 4 and 5).

## Known risk areas in Deadeye

- **Production builds differ from local**: production builds with
  Turbopack; a web worker or dynamic import that works in local webpack
  can fail live (the rim finder spun for ever on 3 Nov 2026). Always test
  live or on a preview, never only locally.
- **Camera and rim finder**: permission prompts cannot be clicked by the
  browser tools; a fake camera on a local production build is the way to
  test it (`--use-file-for-fake-video-capture`).
- **PWA and caching**: a stale service worker can serve an old build; note
  the build id, and try a hard reload when something looks old.
- **Time and dates**: streaks across midnight Irish time and the clock
  change; weekly resets on Monday.
- **Age gate and parent approval**: under-16 setup paths; test the screens
  only, never submit a real parent's email.

## Trade tools

- **Chrome** (`mcp__claude-in-chrome__*`): `tabs_context_mcp` first, a
  new tab, `resize_window` to phone size, `read_console_messages` with a
  pattern for errors, `read_network_requests` for failed calls,
  `computer` for screenshots, `gif_creator` for a bug that needs motion to
  understand. Use the Chrome browser that holds the tester account.
- **Vercel** (read only): `list_deployments`, `get_deployment` for the
  build tested, `get_runtime_errors` and `get_runtime_logs` since the
  deploy.
- **Lighthouse** in Chrome DevTools, or `npx lighthouse <url>
  --preset=perf --form-factor=mobile --quiet` for signed-out pages.

## Quality bar

- Every journey step has pass, fail or not tested with a reason.
- Every bug can be reproduced by someone who was not there.
- Nothing in the file identifies a real player.
- No bug is "confirmed" that was seen once.

## Common mistakes

- Testing only on a laptop-size window.
- Testing locally and calling it live.
- "It's broken" with no steps.
- Ranking by how annoying it was to the tester, not the harm to a player.
- Leaving test sessions on the tester account that skew its streak.
- Pressing a button that sends something to a real person.
