-- 00038_player_reports.sql
--
-- Problems players report themselves, from Settings or the crash screen.
-- Crash reports (00020) only catch code that throws. Most of what goes wrong
-- for a player does not: the tracker calls a make a miss, a button seems to do
-- nothing, a screen is confusing. Only the player can say so. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- Written only by the server (/api/reports, service_role) and read only by the
-- owner at /admin/errors. Players have no access, so one cannot read another
-- player report through the Supabase API.
--
-- Unlike a crash report, a report is something the player wrote, so it goes
-- with their account (ON DELETE CASCADE) instead of outliving it. Rows older
-- than 90 days are removed by the daily cron job, as crash reports are.

CREATE TABLE IF NOT EXISTS public.player_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  -- Where it was sent from, for example the crash it followed
  context text CHECK (char_length(context) <= 300),
  url text CHECK (char_length(url) <= 500),
  user_agent text CHECK (char_length(user_agent) <= 300),
  resolved boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS player_reports_created_idx ON public.player_reports (created_at DESC);
-- The per-player daily limit counts by these
CREATE INDEX IF NOT EXISTS player_reports_user_created_idx ON public.player_reports (user_id, created_at DESC);

ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can touch this table.

REVOKE ALL ON public.player_reports FROM anon, authenticated;
GRANT ALL ON public.player_reports TO service_role;
