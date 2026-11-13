# Focus Finder (2026-11-13)

Agent: Claude Code, Opus 5.5 · Commits: c9ba87a · PR: #103 (draft) · Status: in progress (awaiting safety review and merge)

## Outcome
New `/focus` page. A player or coach names a weakness in their own words or from a list of 29, and gets
the app's own IQ lesson clips with their quizzes, drills and guides for it, instantly and with no AI.
Suggestions come from the player's log (make rates by area, daily IQ misses, coach film verdicts, setup).
An optional AI week plan costs 1 AI report. A coach can send the plan to a team as an assignment.

## Decisions
- The free plan is deterministic (`src/lib/focus/weaknesses.ts`, `plan.ts`): the founder asked for AI, but
  AI_API_KEY may be unset and players punish made-up advice, so the core works without it.
- The AI only picks from the library by ref (D12, L3, G2); unknown refs are dropped, an empty plan is
  refused and refunded (`src/lib/focus/ai.ts`). It cannot invent a drill or a video.
- Saved as `ai_reports.report_type = 'development_plan'` (allowed since 00004): no migration needed.
- Lessons are referenced by topic slug + title word, not id, so the catalogue is the same in every database.
  `__tests__/focus.test.ts` checks every reference against the live titles of 13 Nov.
- No names to the AI provider: a player is position + level, a team is age group + level + player count.
- Solo players never get team drills unless nothing else fits; coaches get team drills first.
- Privacy policy gets a Focus Finder line (what an AI plan sends).

## Where things are
- `src/lib/focus/`: catalogue, plan builder, data signals, AI prompt/parse, content loader, service
- `src/app/(app)/focus/`: page, `FocusFinder.tsx`, `AiPlanView.tsx`
- `src/app/api/focus/plan/route.ts`: AI plan endpoint
- Entry points: Train hub (Learn), search, Coach home ("Fix a team weakness"), team assignment label, AI Coach card
- `src/app/(app)/study/[id]/page.tsx`: lesson cards have `#lesson-<id>` anchors

## Status changes
- Closed: none
- Opened: S28 (S1 note added)

## Gotchas
- New worktrees have no `.next/types`, so `tsc` reports `LayoutProps` missing: run `npx next typegen` first.
- Python heredoc string replacement mangled `\\w` escapes in TS regex strings; use Edit for regex-heavy text.
- `press\w*` matched "pressure"; matcher phrases need whole-word stems, and vague words go in `broad`.
