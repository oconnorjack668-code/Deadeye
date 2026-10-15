-- 00034_coach_sees_verified_training.sql
--
-- Adds verified_7d to team_roster: how many of a player's last seven days of
-- hoops sessions were counted from video rather than typed in.
--
-- This is the one thing a coach genuinely cannot get anywhere else. Every
-- training app shows a coach what players say they did; none can separate that
-- from what was actually watched. Now that training_sessions records provenance
-- (00033), the roster can carry it, and a coach can tell "twelve sessions
-- logged" from "twelve sessions logged, four of them on camera".
--
-- It stays a statement about provenance, not a loyalty test. Most honest
-- training is not filmed - nobody props a phone up for a 6am shooting session
-- alone - so a zero here means "not filmed", never "not trusted", and the app
-- must word it that way wherever it appears.
--
-- DROP then CREATE rather than CREATE OR REPLACE: Postgres will not replace a
-- function whose RETURNS TABLE gains a column, so a replace would fail with
-- "cannot change return type of existing function". The grants have to be
-- re-applied afterwards because the drop takes them with it.
--
-- The body below is 00024's, unchanged except for the new column, so that a
-- future reader can diff the two and see exactly what moved.
--
-- Safe to re-run.
DROP FUNCTION IF EXISTS public.team_roster(uuid);

CREATE FUNCTION public.team_roster(p_team uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  player_position text,
  role text,
  share_details boolean,
  sessions_7d integer,
  workouts_7d integer,
  minutes_7d integer,
  makes_7d integer,
  attempts_7d integer,
  verified_7d integer,
  sessions_28d integer,
  streak integer,
  last_active date,
  games integer,
  ppg numeric,
  rpg numeric,
  apg numeric,
  fg_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id,
    p.display_name,
    CASE WHEN p.show_position OR m.share_details OR m.user_id = auth.uid() THEN p.position END,
    m.role,
    m.share_details,
    (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6),
    (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= public.player_today(m.user_id) - 6),
    (SELECT COALESCE(sum(t.duration_minutes), 0)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6)
      + (SELECT COALESCE(sum(w.duration_minutes), 0)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= public.player_today(m.user_id) - 6),
    (SELECT COALESCE(sum(e.makes), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6),
    (SELECT COALESCE(sum(e.attempts), 0)::int FROM public.shooting_entries e
      JOIN public.session_drills d ON d.id = e.drill_id JOIN public.training_sessions t ON t.id = d.session_id
      WHERE e.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 6),
    -- The new one: sessions in the same seven days that a camera counted
    (SELECT count(*)::int FROM public.training_sessions t
      WHERE t.user_id = m.user_id AND t.verified_by_video
        AND t.session_date >= public.player_today(m.user_id) - 6),
    (SELECT count(*)::int FROM public.training_sessions t WHERE t.user_id = m.user_id AND t.session_date >= public.player_today(m.user_id) - 27)
      + (SELECT count(*)::int FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= public.player_today(m.user_id) - 27),
    public.training_streak(m.user_id),
    GREATEST(
      (SELECT max(t.session_date) FROM public.training_sessions t WHERE t.user_id = m.user_id),
      (SELECT max(w.workout_date) FROM public.workouts w WHERE w.user_id = m.user_id)
    ),
    g.n,
    g.ppg,
    g.rpg,
    g.apg,
    g.fg_pct
  FROM public.team_members m
  JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n,
      round(avg(points), 1) AS ppg,
      round(avg(oreb + dreb), 1) AS rpg,
      round(avg(ast), 1) AS apg,
      CASE WHEN sum(fga2 + fga3) > 0 THEN round(100.0 * sum(fgm2 + fgm3) / sum(fga2 + fga3), 1) END AS fg_pct
    FROM public.games gm
    WHERE gm.user_id = m.user_id AND gm.game_date >= public.player_today(m.user_id) - 365
  ) g ON true
  WHERE m.team_id = p_team AND public.is_team_member(p_team, auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.team_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_roster(uuid) TO authenticated;

-- Check after running, from a team you coach:
--   SELECT display_name, sessions_7d, verified_7d FROM public.team_roster('<team-uuid>');
