-- 00045_app_events.sql
--
-- Steps a player reaches that leave nothing else behind: seeing the welcome
-- screen, playing the sample clip, opening the tracker, starting a run,
-- reaching the results. Saved sessions are already in training_sessions; a
-- tracker run that was given up on was invisible, so nobody could say where
-- new players stop. The owner reads the counts at /admin/funnel. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- Deliberately small. One row per player, per step, per day (the unique index
-- below), so a player who opens the tracker ten times in a day is one row, and
-- the table cannot grow with how much someone uses the app. That is all a
-- funnel needs: whether a player reached a step, and roughly when. No page
-- views, no device details, no third-party analytics: many players are under
-- 18, and this stays in our own database.
--
-- Written only by the server (/api/events, service_role) and read only by the
-- owner. Players have no access. Rows go with the account (ON DELETE CASCADE)
-- and rows older than 90 days are removed by the daily cron job.

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (name ~ '^[a-z_]{1,40}$'),
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per player, step and day. Its leading user_id column also serves
-- the foreign key and the per-player lookups of the funnel page.
CREATE UNIQUE INDEX IF NOT EXISTS app_events_user_name_day_idx ON public.app_events (user_id, name, day);
-- The 90-day clean-up deletes by age
CREATE INDEX IF NOT EXISTS app_events_created_idx ON public.app_events (created_at);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can touch this table.

REVOKE ALL ON public.app_events FROM anon, authenticated;
GRANT ALL ON public.app_events TO service_role;
