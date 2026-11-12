---
name: builder-playbook
description: How a professional product engineer builds a small experiment in Deadeye's stack (Next.js 16, React, Supabase, Vercel) - the standards, the build method, tools and the quality bar. Loaded by the builder agent; use it whenever building the NEXT backlog item.
---

# Builder playbook

A professional engineer ships the smallest change that answers the
question, proves it works with a test that would have failed before, and
leaves the code easier to read than they found it. The rules in
`.claude/agents/builder.md` and `AGENTS.md` win over this file. A
gold-standard build to aim at: `examples.md` in this folder.

## Standards you build to

| Standard | What it means here |
| --- | --- |
| The Next.js docs in `node_modules/next/dist/docs/` | This Next.js has breaking changes from what you remember. Read the guide for anything you touch (routing, caching, server actions, metadata) before writing code. |
| WCAG 2.2 AA | Tap targets at least 24 by 24 CSS px (aim for 44), contrast 4.5:1 for text, every control reachable and named for a screen reader, nothing that only works by colour, focus visible. |
| Core Web Vitals ("good" at the 75th percentile) | LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less, on a mid-range Android phone, not a laptop. |
| OWASP Top 10 | Check the user on the server, validate input at the route, never trust an id from the client, no secrets in client code. |
| Supabase RLS | Every new table: RLS on, a policy per operation, tested as another user. |
| `docs/design.md` | Colours, spacing and components for any screen. |

## Method

1. **Understand the bet.** From the `NEXT` item, write in one line what
   the player will do differently and how the Signal step will show it. If
   you cannot, ask before building.
2. **Find the seam.** Read the files the change touches and their tests.
   Find where the smallest change can go. Prefer changing one component
   or one route to adding a new layer.
3. **Test first where it pays.** For logic (scoring, dates, permissions,
   the parent gate), write the failing test first (the tdd skill if
   loaded). For UI, write a test of the behaviour the player sees, not of
   the markup.
4. **Build.** Keep the diff small. Server components by default; a client
   component only where there is state or a browser API. No new
   dependency without a reason in the commit message.
5. **Instrument.** Add the `app_events` marker the Signal step needs
   (`src/lib/events.ts` and `docs/funnel-counts.sql`). Events carry no
   free text, names or ids beyond what the table already has.
6. **Check it like a player.** Run it locally (Turbopack build), open it at
   phone width (390 px), with a slow network, signed in as the tester.
   With Chrome connected, take a screenshot of each changed screen at
   390 px and attach the paths to your reply.
7. **Self-review.** Run code-review and simplify on your own diff. Read the
   diff once as safety-reviewer would: new data, defaults for a
   13-year-old, RLS.
8. **Checks.** `npx tsc --noEmit`, `npx eslint <changed files>`, `npm
   test`. The push hook runs them again and blocks the push if any fail.

## Trade tools

- **Chrome** (`mcp__claude-in-chrome__*`, local sessions only): look at the
  change at phone width and read console errors. Never sign in with a real
  player's account; the tester account only.
- **Supabase branches**: none for you. A migration is a new numbered file;
  the founder runs it.
- Skills: tdd and diagnosing-bugs (mattpocock-skills) when loaded, the
  ones in your agent file otherwise.

## Quality bar

- The diff does one thing, and its size matches the bet.
- At least one test fails without the change and passes with it.
- Works at 390 px, with a keyboard and with a screen reader label on every
  new control.
- No console errors on the changed screens.
- The commit message says what changed for players and why.

## Common mistakes

- Writing Next.js from memory instead of from the bundled docs.
- A client component for something that needs no state.
- A test that only checks the component renders.
- Forgetting the event in `docs/funnel-counts.sql`, so the analyst cannot
  read the result.
- A new table without RLS, or reading it with the service-role key.
