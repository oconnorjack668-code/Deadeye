-- 00051_home_club.sql
--
-- A player home club, picked in Settings from the club directory
-- (src/data/clubs.json, built from docs/agent-os/clubs/directory.csv), and
-- "my club is not listed" suggestions for the founder. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- A club and its town come close to saying where a child trains, so:
--
--   1. The club lives in its own table that only the player can read, not on
--      profiles, so no change to who sees a profile can ever expose it.
--   2. It shows on the player card only when the player turns that on, and
--      only to who player_card already shows the card to. For a player under
--      16 it shows to friends and teammates only, never to strangers on the
--      public leaderboard, whatever they choose (player_club_badge).
--   3. Suggestions are written by the server (api/clubs/suggest), at most 5
--      open at a time per player, and read only by the player and the owner.
--   4. The founder and the agents see counts only (api/cron/agent-counts),
--      and only for clubs with 5 or more players.
--
-- Both tables go with the account (ON DELETE CASCADE) and are in the export.

-- =============================================================================
-- 1. HOME CLUB
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.player_clubs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id text NOT NULL CHECK (club_id ~ '^[a-z0-9-]{2,90}$'),
  show_on_card boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_player_clubs_club ON public.player_clubs(club_id);

ALTER TABLE public.player_clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players see their own club" ON public.player_clubs;
CREATE POLICY "Players see their own club" ON public.player_clubs
  FOR SELECT USING (auth.uid() = user_id);

-- Every write goes through api/profile/club, which checks the club is in the list
REVOKE ALL ON public.player_clubs FROM anon, authenticated;
GRANT SELECT ON public.player_clubs TO authenticated;
GRANT ALL ON public.player_clubs TO service_role;

-- The club to show on a player card, or null. Same audience as player_card
-- (00043), and only when the player chose to show it. Under 16: friends and
-- teammates only.
CREATE OR REPLACE FUNCTION public.player_club_badge(p_user uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  pc public.player_clubs%ROWTYPE;
  is_friend boolean;
  teammate boolean;
  public_card boolean;
  over_16 boolean;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO pc FROM public.player_clubs WHERE user_id = p_user;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF p_user = me THEN RETURN pc.club_id; END IF;
  IF NOT pc.show_on_card THEN RETURN NULL; END IF;

  is_friend := EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted' AND LEAST(requester_id, addressee_id) = LEAST(me, p_user) AND GREATEST(requester_id, addressee_id) = GREATEST(me, p_user)
  );
  teammate := EXISTS (
    SELECT 1 FROM public.team_members a JOIN public.team_members b ON b.team_id = a.team_id
    WHERE a.user_id = me AND b.user_id = p_user
  );
  IF is_friend OR teammate THEN RETURN pc.club_id; END IF;

  SELECT p.is_public INTO public_card FROM public.profiles p WHERE p.id = p_user;
  SELECT a.is_16_plus INTO over_16 FROM public.age_checks a WHERE a.user_id = p_user;
  IF COALESCE(public_card, false) AND COALESCE(over_16, false) THEN RETURN pc.club_id; END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.player_club_badge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_club_badge(uuid) TO authenticated;

-- =============================================================================
-- 2. CLUB NOT LISTED
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.club_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_name text NOT NULL CHECK (char_length(btrim(club_name)) BETWEEN 2 AND 80),
  town text CHECK (town IS NULL OR char_length(town) <= 60),
  county text CHECK (county IS NULL OR char_length(county) <= 40),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_suggestions_open ON public.club_suggestions(resolved, created_at DESC);

ALTER TABLE public.club_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players see their own club suggestions" ON public.club_suggestions;
CREATE POLICY "Players see their own club suggestions" ON public.club_suggestions
  FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON public.club_suggestions FROM anon, authenticated;
GRANT SELECT ON public.club_suggestions TO authenticated;
GRANT ALL ON public.club_suggestions TO service_role;
