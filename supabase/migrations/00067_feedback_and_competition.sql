-- 00067_feedback_and_competition.sql
--
-- 1. Feedback and ideas, not only problems. Settings now says "Send feedback or
--    report a problem" and lets the player pick Feedback, Idea or Problem.
--    player_reports.kind records the pick. The default is problem, so every
--    older row, and the crash screen (which sends no kind), stay correct.
--
-- 2. The founding competition (docs/sales/founding-competition-rules.md,
--    closing 23:59 Irish time on 31 December 2026). One row per entry:
--      kind player  one per person, with their feedback.
--      kind club    one per club and one per team, entered by an adult coach
--                   who confirms the club knows about it.
--    status
--      valid           counts. An adult entry, or one a parent approved.
--      pending_parent  under 18: waits for a parent or guardian, who gets an
--                      email with a link holding parent_token.
--      declined        the parent said no. They may change their mind until
--                      the closing time, from the same link.
--    parent_token_sent_at is null until the email has gone. Before the email
--    domain is verified nothing can be sent, so the owner page lists these and
--    sends them later. The link stops working CONFIRM_LINK_DAYS (7) after it
--    was sent if the parent has not answered, and the player can ask for a new
--    one then.
--
-- WHO CAN DO WHAT. Every write goes through the server (service_role), which
-- checks the age rules and the closing time. A player only reads their own
-- entry, and never parent_token: with it a player under 18 could open the
-- parent link and approve their own entry. Nor the winner mark, which is the
-- judges note until winners are told. There is no INSERT or UPDATE for players
-- at all, because status is decided by the parent, not the player.
--
-- Entries go with the account (ON DELETE CASCADE).
--
-- RETENTION, done by the daily housekeeping in api/cron/reminders
-- (retentionStep in src/lib/competition.ts): parent_token is cleared from the
-- closing time, parent_name and parent_email after the 25 percent offer ends
-- on 31 March 2027, and every entry is deleted after 30 September 2027.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free. Safe to re-run.

-- =============================================================================
-- 1. FEEDBACK KIND ON PLAYER REPORTS
-- =============================================================================
ALTER TABLE public.player_reports ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'problem';
ALTER TABLE public.player_reports DROP CONSTRAINT IF EXISTS player_reports_kind_check;
ALTER TABLE public.player_reports ADD CONSTRAINT player_reports_kind_check CHECK (kind IN ('feedback', 'idea', 'problem'));

-- =============================================================================
-- 2. COMPETITION ENTRIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('player', 'club')),
  -- Club entries: the team the coach picked, the club name as typed, and the
  -- same name folded to lower case without punctuation so one club cannot
  -- enter twice under two spellings
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  club_name text CHECK (club_name IS NULL OR char_length(club_name) BETWEEN 2 AND 80),
  club_key text CHECK (club_key IS NULL OR char_length(club_key) BETWEEN 1 AND 80),
  club_knows boolean,
  feedback text NOT NULL CHECK (char_length(feedback) BETWEEN 30 AND 2000),
  status text NOT NULL CHECK (status IN ('valid', 'pending_parent', 'declined')),
  parent_name text CHECK (parent_name IS NULL OR char_length(parent_name) BETWEEN 2 AND 100),
  parent_email text CHECK (parent_email IS NULL OR char_length(parent_email) BETWEEN 3 AND 254),
  parent_token uuid UNIQUE,
  parent_token_sent_at timestamptz,
  parent_decided_at timestamptz,
  winner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One player entry per person, and one club entry per coach
  CONSTRAINT competition_entries_one_per_kind UNIQUE (user_id, kind),
  -- No check that a waiting entry has a parent email and link: the server
  -- always writes both, and the daily housekeeping clears the links at
  -- closing and the parent details after the offer ends (RETENTION, above)
  -- A club entry names the club, says the club knows, and needs no parent
  -- (the coach is an adult)
  CONSTRAINT competition_entries_club_complete CHECK (
    kind = 'player' OR (club_name IS NOT NULL AND club_key IS NOT NULL AND club_knows AND status = 'valid')
  ),
  CONSTRAINT competition_entries_player_no_club CHECK (
    kind = 'club' OR (team_id IS NULL AND club_name IS NULL AND club_key IS NULL)
  )
);

-- One entry per club, and per team
CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_club_key_idx
  ON public.competition_entries (club_key) WHERE kind = 'club';
CREATE UNIQUE INDEX IF NOT EXISTS competition_entries_team_idx
  ON public.competition_entries (team_id) WHERE kind = 'club' AND team_id IS NOT NULL;
-- The owner page, newest first
CREATE INDEX IF NOT EXISTS competition_entries_created_idx
  ON public.competition_entries (created_at DESC);
-- Parent emails still to send
CREATE INDEX IF NOT EXISTS competition_entries_unsent_idx
  ON public.competition_entries (created_at)
  WHERE status = 'pending_parent' AND parent_token_sent_at IS NULL;

ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competition_entries_read_own ON public.competition_entries;
CREATE POLICY competition_entries_read_own ON public.competition_entries
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- This project does not auto-grant new tables to the API roles (see 00008).
-- Players read their own entry, without parent_token or the winner mark.
REVOKE ALL ON public.competition_entries FROM anon, authenticated;
GRANT SELECT (id, user_id, kind, team_id, club_name, club_knows, feedback, status, parent_name, parent_email,
  parent_token_sent_at, parent_decided_at, created_at, updated_at)
  ON public.competition_entries TO authenticated;
GRANT ALL ON public.competition_entries TO service_role;
