-- 00033_video_verified_sessions.sql
--
-- Marks the sessions whose shot count came from video rather than being typed
-- in. Deliberately a statement about PROVENANCE, not about accuracy.
--
-- The distinction matters and was chosen on purpose. "A camera watched this"
-- is true whatever the tracker's error rate turns out to be, and stays true on
-- a bad clip. "These counts are correct" would be a claim that quietly becomes
-- a lie the first time the tracker undercounts an honest player - and the
-- tracker's accuracy is currently measured on one clip in one hall. Strava
-- draws the same line: device-recorded versus manually entered, a fact rather
-- than a judgement.
--
-- Player-set rather than inferred, but only ever by the tracker's own save
-- path; nothing in the manual logging UI writes it. A player editing a session
-- by hand cannot promote it, because profiles-style RLS already limits writes
-- to the owner and the column is simply never offered in those forms.
--
-- Safe to re-run.
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS verified_by_video boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.training_sessions.verified_by_video IS
  'True when the shot count came from on-device video tracking rather than manual entry. Provenance, not an accuracy guarantee.';

-- Leaderboards and profile pages will want "verified only" without scanning
-- every session a player has ever logged.
CREATE INDEX IF NOT EXISTS idx_training_sessions_verified
  ON public.training_sessions (user_id, session_date DESC)
  WHERE verified_by_video;

-- Check after running:
--   SELECT id, session_date, verified_by_video FROM public.training_sessions ORDER BY session_date DESC LIMIT 5;
