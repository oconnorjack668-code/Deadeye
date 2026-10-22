-- 00052_team_league.sql
--
-- The league a team plays in, picked by its coach from the Irish
-- competitions list (src/data/leagues.json, built from
-- docs/agent-os/clubs/leagues.csv), and every Basketball Ireland underage
-- grade as a team age group. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
--   1. teams.league_id holds the id of a competition in the list, or other
--      when the coach says theirs is not listed. It says nothing about any
--      player, and only team members can read the team (00022).
--   2. Head coaches change it from Team details, like the other details
--      (the UPDATE policy in 00022 and the column grant below).
--   3. Basketball Ireland grades run U9 to U18 by year of birth, so U9, U11,
--      U13, U15 and U17 join the age groups 00024 allowed. Nothing is removed.

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS league_id text;
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_league_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_league_check CHECK (league_id IS NULL OR league_id ~ '^[a-z0-9-]{2,90}$');

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_details_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_details_check CHECK (
  (club_name IS NULL OR char_length(club_name) BETWEEN 1 AND 80)
  AND (country IS NULL OR country ~ '^[A-Z]{2}$')
  AND (region IS NULL OR char_length(region) BETWEEN 1 AND 60)
  AND (age_group IS NULL OR age_group IN ('U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U20', 'Senior', 'Masters', 'Mixed'))
  AND (level IS NULL OR level IN ('recreational', 'school', 'club', 'regional', 'national', 'elite'))
  AND (season IS NULL OR char_length(season) BETWEEN 1 AND 20)
);

-- Same columns as 00024, plus the league
REVOKE UPDATE ON public.teams FROM authenticated;
GRANT UPDATE (name, club_name, country, region, age_group, level, season, league_id) ON public.teams TO authenticated;
