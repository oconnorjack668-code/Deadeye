-- 00065_attempts_server_written.sql
--
-- Players cannot write, change or remove their own quiz or film score. Until
-- now a signed-in player could add a row to play_quiz_attempts or
-- film_attempts straight through the Supabase API, with any score they liked
-- (00061 and 00062 gave them INSERT, and a rule that let them add rows for
-- themselves), and could delete a bad first attempt so their coach only saw a
-- later one. The app always marked the answers on the server, but nothing
-- stopped a player going round it, and head coaches read these scores.
--
-- From here only the server (service_role) adds attempts: submitQuizAttempt
-- and submitFilmAttempt check the player, read the play or clip with the
-- player own client (so row-level security still decides what they can
-- open), mark the answers there, and write the row for that player. The app
-- never deletes an attempt; they go with the account (ON DELETE CASCADE), and
-- the player data download still includes them.
--
-- What players keep: reading their own attempts (not the answers column).
-- Head coaches keep reading attempts on plays and film they set, as before.
--
-- Run this AFTER the code that writes attempts on the server is live: the
-- older code wrote attempts as the player, so it would fail once this runs.
--
-- To check it ran, both of these should return false for each table:
--   SELECT has_any_column_privilege(
--     (SELECT oid FROM pg_roles WHERE rolname = $$authenticated$$),
--     $$public.play_quiz_attempts$$::regclass, $$INSERT$$);
--   SELECT has_table_privilege(
--     (SELECT oid FROM pg_roles WHERE rolname = $$authenticated$$),
--     $$public.play_quiz_attempts$$::regclass, $$DELETE$$);
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in these comments (see 00035).

-- =============================================================================
-- 1. ROLE QUIZ ATTEMPTS (00061)
-- =============================================================================
-- The old rule was FOR ALL (read, add, change, delete). Replace it with one
-- rule to read the player own rows.
DROP POLICY IF EXISTS "Players keep own quiz attempts" ON public.play_quiz_attempts;
DROP POLICY IF EXISTS "Players delete own quiz attempts" ON public.play_quiz_attempts;

DROP POLICY IF EXISTS "Players read own quiz attempts" ON public.play_quiz_attempts;
CREATE POLICY "Players read own quiz attempts" ON public.play_quiz_attempts
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- Revoking at table level also takes away the column INSERT grant from 00061
REVOKE INSERT, UPDATE, DELETE ON public.play_quiz_attempts FROM anon, authenticated;
GRANT SELECT (id, user_id, play_id, score, completed_at) ON public.play_quiz_attempts TO authenticated;
GRANT ALL ON public.play_quiz_attempts TO service_role;

-- =============================================================================
-- 2. FILM ATTEMPTS (00062)
-- =============================================================================
-- The read rules stay as 00062 made them; the add and delete rules go.
DROP POLICY IF EXISTS "Players add film attempts on clips they can see" ON public.film_attempts;
DROP POLICY IF EXISTS "Players delete own film attempts" ON public.film_attempts;

REVOKE INSERT, UPDATE, DELETE ON public.film_attempts FROM anon, authenticated;
GRANT SELECT (id, user_id, clip_id, score, total, completed_at) ON public.film_attempts TO authenticated;
GRANT ALL ON public.film_attempts TO service_role;
