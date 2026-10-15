-- 00032_ai_coaching_opt_out.sql
--
-- Lets a player turn the AI coach off and keep the app.
--
-- The complaint that sinks AI coaching features elsewhere is not that the
-- advice is wrong, it is that there is no way to make it stop: reviewers of a
-- competitor's coach ask for a toggle and do not have one, while the feature
-- covers their own statistics unasked. A player who wants their numbers and
-- not the commentary should be able to say so once.
--
-- Defaults to true, so nothing changes for anyone who never touches it, and
-- NOT NULL so no surface has to decide what a null means.
--
-- Safe to re-run.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_coaching_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.ai_coaching_enabled IS
  'False when the player has opted out of AI coaching. Hides the AI surfaces and stops the weekly report being generated for them.';

-- No policy changes needed: profiles already restricts both SELECT and UPDATE
-- to the owning player, and this column rides along with the rest of their
-- settings.
--
-- Check after running:
--   SELECT id, ai_coaching_enabled FROM public.profiles LIMIT 5;
