-- 00041_streak_freezes.sql
--
-- Streak freezes, and one streak rule everywhere.
--
-- Every 7 training days in a streak earns a freeze, and a player holds 2 at
-- most. When a gap runs past the rest day, a freeze covers each extra missed
-- day by itself. Nothing is stored: like the rest day, freezes are worked out
-- from the training history, so there is no table to fall out of step with it.
-- The app walks the same rule in streakState() in src/lib/achievements.ts, and
-- the two must agree. Change both together.
--
-- This also fixes the streak shown on the leaderboard, the friends list, team
-- pages and player cards. Those used strictly consecutive days, so a player on
-- a 20 day streak by the dashboard could show 1 to their friends after a rest
-- day the app itself told them to take.
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.

-- The walk itself: longest and current streak, freezes in hand, and whether
-- the streak ends unless the player trains today. Days after p_today are
-- ignored.
CREATE OR REPLACE FUNCTION public.streak_walk(p_days date[], p_today date)
RETURNS TABLE (longest_streak integer, current_streak integer, freezes integer, at_risk boolean)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  rest_days CONSTANT integer := 1;
  freeze_every CONSTANT integer := 7;
  max_freezes CONSTANT integer := 2;
  d date;
  prev date := NULL;
  run integer := 0;
  held integer := 0;
  best integer := 0;
  extra integer;
  since_last integer;
BEGIN
  FOR d IN
    SELECT DISTINCT x FROM unnest(p_days) AS x WHERE x IS NOT NULL AND x <= p_today ORDER BY x
  LOOP
    IF prev IS NULL THEN
      run := 1;
    ELSE
      -- Missed days beyond the rest day. A gap of 1 is back to back.
      extra := (d - prev) - 1 - rest_days;
      IF extra <= 0 THEN
        run := run + 1;
      ELSIF extra <= held THEN
        held := held - extra;
        run := run + 1;
      ELSE
        run := 1;
      END IF;
    END IF;
    IF run % freeze_every = 0 AND held < max_freezes THEN
      held := held + 1;
    END IF;
    best := GREATEST(best, run);
    prev := d;
  END LOOP;

  longest_streak := best;
  current_streak := 0;
  freezes := held;
  at_risk := false;
  IF prev IS NOT NULL THEN
    since_last := p_today - prev;
    -- Missed days before today beyond the rest day. Today is still open.
    extra := since_last - 1 - rest_days;
    IF extra <= held THEN
      current_streak := run;
      freezes := held - GREATEST(extra, 0);
      -- Missing today too would need one more freeze than the player had
      at_risk := since_last >= 1 AND since_last - rest_days > held;
    END IF;
  END IF;
  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.streak_walk(date[], date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.streak_walk(date[], date) TO authenticated, service_role;

-- A player streak over their whole history, for the dashboard and badges.
-- Same columns as before (00031), so nothing that reads it changes.
CREATE OR REPLACE FUNCTION public.my_training_streaks(p_today date)
RETURNS TABLE (longest_streak integer, current_streak integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT w.longest_streak, w.current_streak
  FROM public.streak_walk(ARRAY(
    SELECT s.session_date FROM public.training_sessions s WHERE s.user_id = auth.uid() AND s.session_date <= p_today
    UNION
    SELECT k.workout_date FROM public.workouts k WHERE k.user_id = auth.uid() AND k.workout_date <= p_today
  ), p_today) w
$$;
REVOKE EXECUTE ON FUNCTION public.my_training_streaks(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_training_streaks(date) TO authenticated, service_role;

-- The streak other players see: friends list, team pages, player cards.
-- Counted on the player own calendar, as before.
CREATE OR REPLACE FUNCTION public.training_streak(p_user uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT w.current_streak
    FROM (SELECT public.player_today(p_user) AS d) t,
    LATERAL public.streak_walk(ARRAY(
      SELECT s.session_date FROM public.training_sessions s WHERE s.user_id = p_user AND s.session_date <= t.d
      UNION
      SELECT k.workout_date FROM public.workouts k WHERE k.user_id = p_user AND k.workout_date <= t.d
    ), t.d) w
  ), 0);
$$;
REVOKE EXECUTE ON FUNCTION public.training_streak(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.training_streak(uuid) TO service_role;

-- The leaderboard standings, as in 00024 except for the streak, which now
-- comes from the same walk.
CREATE OR REPLACE FUNCTION public.refresh_leaderboard(p_force boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT p_force AND EXISTS (SELECT 1 FROM public.leaderboard_refresh WHERE id = 1 AND refreshed_at > now() - interval '10 minutes') THEN
    RETURN;
  END IF;
  -- Only one refresh at a time; others just read the current standings
  IF NOT pg_try_advisory_xact_lock(hashtext('hoopiq_leaderboard_refresh')) THEN
    RETURN;
  END IF;

  DELETE FROM public.leaderboard_snapshot WHERE season_id IN (SELECT id FROM public.leaderboard_seasons WHERE is_active);

  INSERT INTO public.leaderboard_snapshot
    (season_id, user_id, points, sessions_completed, training_days, quizzes_passed, challenge_points, current_streak, computed_at)
  WITH seasons AS (
    SELECT id, starts_at, ends_at FROM public.leaderboard_seasons WHERE is_active
  ),
  zones AS (
    SELECT p.id AS user_id, COALESCE(tz.name, 'Europe/Dublin') AS tz
    FROM public.profiles p LEFT JOIN pg_timezone_names tz ON tz.name = p.timezone
  ),
  local AS (
    SELECT user_id, (now() AT TIME ZONE tz)::date AS today FROM zones
  ),
  activity AS (
    SELECT t.user_id, t.session_date AS day FROM public.training_sessions t
    UNION
    SELECT w.user_id, w.workout_date FROM public.workouts w
  ),
  players AS (
    SELECT DISTINCT s.id AS season_id, x.user_id
    FROM seasons s
    JOIN (
      SELECT user_id, day::timestamptz AS at FROM activity
      UNION ALL SELECT user_id, created_at FROM public.quiz_completions WHERE percentage >= 80
      UNION ALL SELECT user_id, completed_at FROM public.challenge_completions WHERE verified
    ) x ON x.at >= s.starts_at - interval '1 day' AND x.at < s.ends_at + interval '1 day'
  ),
  stats AS (
    SELECT
      pl.season_id,
      pl.user_id,
      (SELECT count(*) FROM public.training_sessions t
        WHERE t.user_id = pl.user_id AND t.session_date BETWEEN s.starts_at::date AND LEAST(s.ends_at::date, l.today))::int AS sessions_completed,
      (SELECT count(*) FROM activity a
        WHERE a.user_id = pl.user_id AND a.day BETWEEN s.starts_at::date AND LEAST(s.ends_at::date, l.today))::int AS training_days,
      (SELECT count(DISTINCT q.topic_id) FROM public.quiz_completions q
        WHERE q.user_id = pl.user_id AND q.percentage >= 80 AND q.created_at >= s.starts_at AND q.created_at < s.ends_at)::int AS quizzes_passed,
      (SELECT COALESCE(sum(c.points_earned), 0) FROM public.challenge_completions c
        WHERE c.user_id = pl.user_id AND c.verified AND c.season_id = s.id)::int AS challenge_points,
      l.today
    FROM players pl
    JOIN seasons s ON s.id = pl.season_id
    JOIN local l ON l.user_id = pl.user_id
  )
  SELECT st.season_id, st.user_id,
    st.training_days * 10 + st.quizzes_passed * 10 + st.challenge_points,
    st.sessions_completed, st.training_days, st.quizzes_passed, st.challenge_points,
    COALESCE(sk.current_streak, 0),
    now()
  FROM stats st
  LEFT JOIN LATERAL public.streak_walk(ARRAY(
    SELECT t.session_date FROM public.training_sessions t WHERE t.user_id = st.user_id AND t.session_date <= st.today
    UNION
    SELECT w.workout_date FROM public.workouts w WHERE w.user_id = st.user_id AND w.workout_date <= st.today
  ), st.today) sk ON true;

  INSERT INTO public.leaderboard_refresh (id, refreshed_at) VALUES (1, now())
  ON CONFLICT (id) DO UPDATE SET refreshed_at = EXCLUDED.refreshed_at;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_leaderboard(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard(boolean) TO service_role;

-- Show the new streaks on the leaderboard straight away
SELECT public.refresh_leaderboard(true);

-- Check after running. Seven days in a row, then the 8th missed (rest day) and
-- the 9th missed (freeze): expect 8, 8, 0, false.
--   SELECT * FROM public.streak_walk(ARRAY(
--     SELECT generate_series(date '2026-09-01', date '2026-09-07', interval '1 day')::date
--   ) || date '2026-09-10', date '2026-09-10');
