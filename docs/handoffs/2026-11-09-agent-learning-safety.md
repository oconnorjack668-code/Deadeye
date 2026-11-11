# Agents learn, founder setup guide, child-safety follow-ups (2026-11-07 to 09)

Agent: Claude Code, Opus 5.5 · Commits: 7193a7a, d6e08e6, c1296be (PR #69), b1ae1eb (PR #70), 9af156e (PR #71); merged #66, #67, #49, #68 · Status: shipped

## Outcome
- Each Agent OS agent has a knowledge file (`docs/agent-os/knowledge/`): the founder's corrections as rules, a checklist run on its own work, and 16 to 33 sourced findings. Agents read it first, add a lesson on every correction, research again after 30 days. All have WebSearch/WebFetch; the 9 knowledge-work plugins they list are enabled in `.claude/settings.json`.
- Under-18s no longer get "your streak ends tonight" unless they turn it on (migration 00057, run and checked live 2026-11-09). The AI coach gets no display name; AI chat has rules for distress, abuse and grooming, plus Irish support lines added in code. A test now guards the database access rules.
- `docs/founder-setup-guide.md`: deadeye.ie, Resend, Stripe Pro, club billing, step by step with deadlines. `docs/legal/dpia.md`: draft risk assessment.

## Decisions
- Knowledge lives in `docs/agent-os/knowledge/`, inside the agents' free write area; lessons beat research (founder asked for agents that learn after a promo needed many fixes).
- Streak warning: player choice wins; with none, on for 18+, off for under-18s and unknown ages (`streakWarningAllowed`, `src/lib/reminders.ts`). Followed the DPC Fundamentals and the EU DSA Art. 28 guidelines (founder).
- Support lines are added by `src/lib/ai/safety.ts`, not left to the model, and still sent when the AI is down.
- `iceberg:edit` exists in no marketplace: marketing uses `humanizer`. `.gitignore` now lets `.claude/settings.json` through so cloud runs get the plugins.
- Deadlines (founder asked for reminders): Stripe Pro live by 2027-01-08 (founding Pro ends from about 20 Jan), club billing by 2027-02-01. Google Calendar events on 14 Dec, 8 Jan, 11 Jan, 1 Feb; memory `billing-deadlines`.

## Where things are
- `docs/agent-os/knowledge/README.md` and one file per agent; `AGENTS.md` sends any promo work to `knowledge/marketing.md`.
- `supabase/migrations/00057_streak_warning_choice.sql`, `src/app/(app)/profile/RemindersCard.tsx` (the switch), `src/app/api/cron/reminders/route.ts`.
- `src/lib/ai/persona.ts`, `src/lib/ai/safety.ts`, `src/lib/ai/context.ts`; tests `__tests__/ai-safety.test.ts`, `ai-persona.test.ts`, `rls-rules.test.ts`.
- `docs/legal/dpia.md`, `docs/founder-setup-guide.md`.

## Open
- **DPIA unsigned:** founder and their mam read, correct and sign `docs/legal/dpia.md` at home (memory `dpia-signoff`). Then its 6 open actions.
- deadeye.ie, then Resend, then Stripe Pro (guide parts 1 to 5); ask Claude to start club billing by mid-December.
- Getting players in: no signups since 2026-10-24; Blazers trial details in `docs/agent-os/clubs/pipeline.md`; first social posts with the marketing agent; E0 (message 5 players).
- Optional: delete the unused `OPENAI_API_KEY` in Vercel. From the research, unchecked: whether `src/proxy.ts` refreshes sessions the way current Supabase docs say.

## Gotchas
- Inside an EnterWorktree session, `!` commands and `git -C` into the main checkout are refused (shown only as "shell command failed"); `!` also rejects loops. Exit the worktree, or run one command at a time.
- `gh pr merge --match-head-commit` needs the exact sha from `git rev-parse HEAD`; a guessed one fails as "Head branch was modified".
- `docs/handoffs/INDEX.md` is CRLF: a regex conflict fix that assumes `\n` silently leaves markers. Check `grep -c '^<<<<<<<'` before pushing.
- Branch protection wants the PR branch up to date: `gh pr update-branch <n>`.
- Auto mode blocks plugin installs: the founder runs `claude plugin install <p>@knowledge-work-plugins --scope project` one at a time.
