-- 00031_rest_day_streaks.sql
--
-- Lets a streak survive one rest day, matching STREAK_REST_DAYS in
-- src/lib/achievements.ts. The two must agree: the dashboard takes the streak
-- count from this function and works out "at risk" in TypeScript, so a strict
-- database rule beside a forgiving app rule shows a player a number and a
-- warning that contradict each other.
--
-- Why forgive at all. trainingLoad.ts tells a player to rest after six straight
-- days, and a streak that then punishes the rest it just advised is a mechanic
-- arguing with itself. The players here are teenagers with exams, and GAA or
-- soccer the same evening. Two missed days in a row still breaks it, so the
-- streak continues to mean something.
--
-- The count is days TRAINED, not days elapsed: Mon/Wed/Fri is 3, not 5. A
-- number inflated by the days off would be worse to show than a smaller honest
-- one.
--
-- Replaces the function created in 00025. Safe to re-run.
--
-- The gaps-and-islands trick in 00025 (date minus row number) only groups
-- strictly consecutive dates, so it cannot express this. Comparing each date to
-- the one before it can: a new run starts only where the gap exceeds the
-- allowance.
CREATE OR REPLACE FUNCTION public.my_training_streaks(p_today date)
RETURNS TABLE (longest_streak integer, current_streak integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH days AS (
    SELECT DISTINCT s.session_date AS d
    FROM public.training_sessions s
    WHERE s.user_id = auth.uid() AND s.session_date <= p_today
    UNION
    SELECT DISTINCT w.workout_date
    FROM public.workouts w
    WHERE w.user_id = auth.uid() AND w.workout_date <= p_today
  ),
  gaps AS (
    SELECT d, d - LAG(d) OVER (ORDER BY d) AS since_previous
    FROM days
  ),
  -- A gap of 1 is consecutive days and a gap of 2 is one rest day; both keep
  -- the run going. Anything larger starts a new one, and the running count of
  -- those breaks labels each run.
  islands AS (
    SELECT d, SUM(CASE WHEN since_previous IS NULL OR since_previous > 2 THEN 1 ELSE 0 END)
                OVER (ORDER BY d ROWS UNBOUNDED PRECEDING) AS grp
    FROM gaps
  ),
  runs AS (
    SELECT COUNT(*)::integer AS len, MAX(d) AS ended
    FROM islands
    GROUP BY grp
  )
  SELECT
    COALESCE(MAX(r.len), 0)::integer,
    -- Current while the last training day is within the allowance: today,
    -- yesterday, or the day before - at which point the rest day is spent and
    -- training today is the only thing that keeps it.
    COALESCE(MAX(r.len) FILTER (WHERE r.ended >= p_today - 2), 0)::integer
  FROM runs r
$$;

REVOKE EXECUTE ON FUNCTION public.my_training_streaks(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_training_streaks(date) TO authenticated, service_role;

-- Check it against a player's own data after running:
--   SELECT * FROM public.my_training_streaks(CURRENT_DATE);
