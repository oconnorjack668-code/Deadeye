-- 00056_cron_runs.sql
--
-- A permanent record of every scheduled job run: the daily reminders, the
-- weekly AI report and the Monday agent counts. Vercel keeps its own logs for
-- about an hour on the Hobby plan, so a run that went wrong on Sunday evening
-- could not be looked at on Monday. Each run now writes one row here when it
-- finishes, and the owner reads them at /admin/cron-runs. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
--   1. Written only by the server (src/lib/cronRuns.ts, service_role) and read
--      only by the owner through the admin page. Players have no access.
--   2. Only runs that passed the CRON_SECRET check are written. A refused call
--      is not, because anyone on the internet can call the job address and
--      would otherwise fill this table. So a scheduled day with no row means
--      the job did not run or was refused.
--   3. summary holds the numbers the job answers with, such as reports
--      written or reminders sent, and error messages. No player names, ids or
--      other personal data go in it.
--   4. Rows older than 365 days are removed by the daily reminders job.

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL CHECK (char_length(job) BETWEEN 1 AND 50),
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  -- The HTTP status the job answered with
  status integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('ok', 'skipped', 'failed')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS cron_runs_started_idx ON public.cron_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS cron_runs_job_started_idx ON public.cron_runs (job, started_at DESC);

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can touch this table.

REVOKE ALL ON public.cron_runs FROM anon, authenticated;
GRANT ALL ON public.cron_runs TO service_role;
