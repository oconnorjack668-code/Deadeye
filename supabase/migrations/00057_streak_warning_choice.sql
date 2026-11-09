-- 00057_streak_warning_choice.sql
--
-- The "your streak ends tonight" push becomes opt-in for under-18s.
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- WHY. A warning built on the fear of losing a streak is engagement pressure.
-- The Data Protection Commission Fundamentals for children and the European
-- Commission 2025 guidelines on protecting minors (DSA Article 28) both point
-- to such features being off by default for children.
--
--   1. streak_warning is the player choice. NULL means no choice made yet.
--   2. With NULL, the app decides by age (src/lib/reminders.ts,
--      streakWarningAllowed): on for an age bracket of 18 or over, off for
--      13, 14-17 and an unknown bracket. So nothing changes for adults, and
--      under-18s stop getting the warning until they turn it on themselves
--      in Profile, Training reminders.
--   3. Players can already update their own notification_preferences row
--      (00001), so no new policy is needed.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS streak_warning boolean;

COMMENT ON COLUMN public.notification_preferences.streak_warning IS
  'Player choice for the streak-ending push. NULL: on for 18 and over, off for under-18s.';
