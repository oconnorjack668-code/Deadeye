# E4 dashboard reminders card (2026-11-09)

Agent: Claude Code, Sonnet 5.5 · Commits: see branch `exp/E4-dashboard-reminder` · Status: in progress (review)

## Outcome
A player with no saved session sees the existing reminders card on the dashboard, under the starting steps, asking "When do you next train? Pick your days." Saving training days or turning reminders on records `reminder_set`. No migration.

## Decisions
- `RemindersCard` gets an optional `description` prop and tracks in `savePrefs` on success: one change covers the dashboard, welcome and profile cards. The marker therefore counts any card, not only the dashboard's.
- Shown when `metrics.totalSessions === 0` (the backlog's "no saved session"), not `firstRun`.
- New "Reminders" group on `/admin/funnel`, the name in `docs/funnel-counts.sql`, one clause added to the privacy policy's list of steps (E3's reviewer blocked on that).

## Where things are
- `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/profile/RemindersCard.tsx`, `src/lib/events.ts`, `src/lib/funnel.ts`
- `__tests__/reminders-card-event.test.tsx`: new; `__tests__/funnel.test.ts`: group list

## Open
- Safety review (wording to under-18s; privacy text change). Founder: merge, live check on a zero-session tester account (no web push on iPhone outside the Home Screen).
- Not checked live: signed-in card needs Supabase.

## Gotchas
- jsdom has no push APIs: the test defines `serviceWorker`, `PushManager` and `Notification` or the card hides its day buttons.
