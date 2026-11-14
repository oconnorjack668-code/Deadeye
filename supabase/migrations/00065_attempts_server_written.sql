-- 00065_attempts_server_written.sql
--
-- Players cannot write their own quiz or film score. Until now a signed-in
-- player could add a row to play_quiz_attempts or film_attempts straight
-- through the Supabase API, with any score they liked (00061 and 00062 gave
-- them INSERT, and a rule that let them add rows for themselves). The app
-- always marked the answers on the server, but nothing stopped a player going
-- round it, and head coaches read these scores.
--
-- From here only the server (service_role) adds attempts: submitQuizAttempt
-- and submitFilmAttempt check the player, read the play or clip with the
-- player own client (so row-level security still decides what they can
-- open), mark the answers there, and write the row for that player.
--
-- What players keep: reading their own attempts (not the answers column) and
-- deleting their own. Head coaches keep reading attempts on plays and film
-- they set, as before. Nothing else changes.
--
-- To check it ran, this should return false for both tables:
--   SELECT has_any_column_privilege(
--     (SELECT oid FROM pg_roles WHERE rolname = $$authenticated$$),
--     $$public.play_quiz_attempts$$::regclass, $$INSERT$$);
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in these comments (see 00035).

-- =============================================================================
-- 1. ROLE QUIZ ATTEMPTS (00061)
-- =============================================================================
-- The old rule was FOR ALL (read, add, change, delete). Replace it with one
-- rule to read and one to delete, both only for the player own rows.
DROP POLICY IF EXISTS "Players keep own quiz attempts" ON public.play_quiz_attempts;

DROP POLICY IF EXISTS "Players read own quiz attempts" ON public.play_quiz_attempts;
CREATE POLICY "Players read own quiz attempts" ON public.play_quiz_attempts
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players delete own quiz attempts" ON public.play_quiz_attempts;
CREATE POLICY "Players delete own quiz attempts" ON public.play_quiz_attempts
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Revoking at table level also takes away the column INSERT grant from 00061
REVOKE INSERT, UPDATE ON public.play_quiz_attempts FROM anon, authenticated;
GRANT SELECT (id, user_id, play_id, score, completed_at) ON public.play_quiz_attempts TO authenticated;
GRANT DELETE ON public.play_quiz_attempts TO authenticated;
GRANT ALL ON public.play_quiz_attempts TO service_role;

-- =============================================================================
-- 2. FILM ATTEMPTS (00062)
-- =============================================================================
-- Read and delete rules stay as 00062 made them; only the add rule goes.
DROP POLICY IF EXISTS "Players add film attempts on clips they can see" ON public.film_attempts;

REVOKE INSERT, UPDATE ON public.film_attempts FROM anon, authenticated;
GRANT SELECT (id, user_id, clip_id, score, total, completed_at) ON public.film_attempts TO authenticated;
GRANT DELETE ON public.film_attempts TO authenticated;
GRANT ALL ON public.film_attempts TO service_role;
