-- docs/funnel-counts.sql
--
-- The player funnel as plain counts, for the Supabase SQL editor. The same
-- numbers are at /admin/funnel in the app; this is for when you want them
-- without opening it. It returns counts only, never names or emails.
--
-- Change the 30 below to the number of days to look back. Owner and test
-- accounts are counted here, unlike the app page: subtract them by hand.
-- Needs 00045_app_events.sql for the welcome and tracker rows.
--
-- NOTE ON STYLE: no apostrophes in these comments (see 00035).

WITH cohort AS (
  SELECT u.id, coalesce(p.onboarding_completed, false) AS setup_done
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.created_at >= now() - interval '30 days'
),
sessions AS (
  SELECT s.user_id, count(*) AS n, bool_or(s.verified_by_video) AS tracked
  FROM public.training_sessions s
  JOIN cohort c ON c.id = s.user_id
  GROUP BY s.user_id
),
steps AS (
  SELECT e.name, count(DISTINCT e.user_id) AS players
  FROM public.app_events e
  JOIN cohort c ON c.id = e.user_id
  GROUP BY e.name
)
SELECT 1 AS step_order, 'joined' AS step, count(*) AS players FROM cohort
UNION ALL SELECT 2, 'finished setup', count(*) FILTER (WHERE setup_done) FROM cohort
UNION ALL SELECT 3, 'logged 1st hoops session', count(*) FROM sessions
UNION ALL SELECT 4, 'logged 2nd', count(*) FILTER (WHERE n >= 2) FROM sessions
UNION ALL SELECT 5, 'logged 3rd', count(*) FILTER (WHERE n >= 3) FROM sessions
UNION ALL SELECT 6, 'saved a tracked session', count(*) FILTER (WHERE tracked) FROM sessions
UNION ALL SELECT 10 + array_position(
    ARRAY['signup_from_demo', 'welcome_seen','sample_played', 'sample_finished', 'tracker_opened', 'tracker_setup', 'tracker_started', 'tracker_finished', 'tracker_saved'],
    name
  ), name, players FROM steps
ORDER BY step_order;
