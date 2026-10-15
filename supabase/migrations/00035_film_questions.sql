-- 00035_film_questions.sql
--
-- "Was that the right read?" - a player marks one moment in their own film and
-- asks a coach on one of their teams about it.
--
-- WHY THIS SHAPE. Every tool that teaches basketball decision-making is either
-- coach-mediated (Basketball Immersion's courses, PGC's camps at ~$2,500) or
-- lab-bound (the Tubingen first-person decision test, validated to separate
-- elite from non-elite U16 players and never shipped as a product). Nothing
-- lets a 15 year old ask about a decision in their OWN game. Products that do
-- touch a player's own film - Hooper, HomeCourt - produce stats and highlights
-- and say nothing about whether a read was right.
--
-- The alternative designs were considered and rejected:
--   - Self-review alone. A 2024 study of 14-17 year olds found self-confidence
--     and actual decision competence are frequently mismatched, so a teenager
--     grading their own reads mostly reinforces whichever bias they arrived
--     with. It is kept as a fallback below for players with no coach, because
--     some signal beats none, but it is not the main path.
--   - AI judging the read. Deciding whether a pass was correct from a
--     bleacher-angle phone clip is far beyond anything this app can stand over
--     today, and a confident wrong verdict from a coach-shaped voice is worse
--     than no verdict.
--
-- PRIVACY. This is a child's video going in front of another adult, so the
-- sharing is per-moment and player-initiated: asking a question is what grants
-- access, to that one clip, for that one team's coaches. There is no browse.
-- Basketball Ireland's own policy for coaches of minors prohibits sharing a
-- minor's images or video without explicit written parental consent, and the
-- DPC's Fundamentals put the child's interests above the service's - so no row
-- here is created by a coach, and a player can delete their question (and with
-- it the access) at any time.
CREATE TABLE IF NOT EXISTS public.film_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Null means the player is reviewing it themselves (the fallback path).
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  video_asset_id uuid NOT NULL REFERENCES public.video_assets(id) ON DELETE CASCADE,
  -- Where in the clip, in milliseconds
  moment_ms integer NOT NULL CHECK (moment_ms >= 0),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 500),
  -- What the player thought at the time, captured BEFORE any answer arrives.
  -- The point of the exercise is comparing their read with the coach's, and a
  -- player who answers after seeing the verdict learns nothing.
  player_read text CHECK (player_read IS NULL OR char_length(player_read) <= 500),
  verdict text CHECK (verdict IN ('good_read', 'wrong_read', 'depends')),
  coach_note text CHECK (coach_note IS NULL OR char_length(coach_note) <= 1000),
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_film_questions_player ON public.film_questions (player_id, created_at DESC);
-- The coach's queue: unanswered questions for their teams, oldest first
CREATE INDEX IF NOT EXISTS idx_film_questions_open ON public.film_questions (team_id, created_at)
  WHERE answered_at IS NULL;

ALTER TABLE public.film_questions ENABLE ROW LEVEL SECURITY;

-- A player sees and manages their own questions, always.
DROP POLICY IF EXISTS film_questions_own ON public.film_questions;
CREATE POLICY film_questions_own ON public.film_questions
  FOR ALL USING (player_id = auth.uid()) WITH CHECK (player_id = auth.uid());

-- A coach sees questions asked of a team they coach. Read only: the update
-- policy below is what lets them answer, and it cannot touch anything else.
DROP POLICY IF EXISTS film_questions_coach_read ON public.film_questions;
CREATE POLICY film_questions_coach_read ON public.film_questions
  FOR SELECT USING (team_id IS NOT NULL AND public.is_team_coach(team_id, auth.uid()));

DROP POLICY IF EXISTS film_questions_coach_answer ON public.film_questions;
CREATE POLICY film_questions_coach_answer ON public.film_questions
  FOR UPDATE USING (team_id IS NOT NULL AND public.is_team_coach(team_id, auth.uid()))
  WITH CHECK (team_id IS NOT NULL AND public.is_team_coach(team_id, auth.uid()));

-- A coach can only ever write the answer. Without this a coach could rewrite
-- the question, move it to another team, or edit what the player said they
-- were thinking - which would quietly destroy the only thing this feature
-- measures.
REVOKE UPDATE ON public.film_questions FROM authenticated;
GRANT UPDATE (verdict, coach_note, answered_by, answered_at) ON public.film_questions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.film_questions TO authenticated;

-- Note on the column grant above: it also limits what a PLAYER can update,
-- which is intended. A question and the read behind it are a record of what
-- they thought at the time; editing it after an answer arrives would make the
-- comparison meaningless. Players delete and re-ask instead.

COMMENT ON TABLE public.film_questions IS
  'A player asking a coach whether a decision in their own game film was the right read. Access to the clip follows the question: per-moment and player-initiated, never a browse.';

-- Check after running:
--   SELECT count(*) FROM public.film_questions;
--   SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.film_questions'::regclass;
