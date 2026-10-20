-- 00043_avatars_photos_levels.sql
--
-- 1. An emoji avatar on a colour, which every player can pick.
-- 2. An optional profile photo, with a choice of who sees it: everyone, friends
--    and teammates, or only the player. A player 16 or over consents for
--    themselves. Under 16, a parent approves the photo and who can see it
--    before anyone else does, and widening who sees it later needs a parent
--    again. Narrowing it never does.
-- 3. Each player level and XP, stored when they open the app, so the player
--    card can show friends a level without working it out from their whole
--    history.
--
-- Photo rows and levels are written only by the server (service role): a
-- player could otherwise approve their own photo or give themselves level 50.
-- Photos sit in a private bucket and are only ever shown through short lived
-- signed links, after the player_card check below has said the viewer may see
-- them.
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.

-- =============================================================================
-- 1. EMOJI AVATARS
-- =============================================================================
-- A fixed list, so the avatar can never be used to put words on a player card
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_emoji text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_emoji_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_emoji_check CHECK (
  avatar_emoji IS NULL OR avatar_emoji IN (
    '🏀', '🔥', '⚡', '🎯', '👑', '🦅', '🐐', '🚀', '💪', '🌟', '🐺', '🦁', '🐉', '☄️', '🏆', '🧊'
  )
);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_color_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_color_check CHECK (
  avatar_color IS NULL OR avatar_color IN ('orange', 'red', 'amber', 'emerald', 'sky', 'blue', 'violet', 'pink', 'zinc')
);

-- =============================================================================
-- 2. PROFILE PHOTOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profile_photos (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- In the avatars bucket: <user_id>/<random>.jpg
  path text NOT NULL,
  -- Who may see it: everyone, friends (and teammates), or me
  visibility text NOT NULL DEFAULT 'friends' CHECK (visibility IN ('everyone', 'friends', 'me')),
  -- pending until a parent approves, for a player under 16
  status text NOT NULL CHECK (status IN ('pending', 'approved')),
  consent_by text NOT NULL CHECK (consent_by IN ('player', 'parent')),
  -- In the link a parent opens to approve, for a player under 16
  approval_token uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players see their own photo row" ON public.profile_photos;
CREATE POLICY "Players see their own photo row" ON public.profile_photos
  FOR SELECT USING (auth.uid() = user_id);

-- This project does not auto-grant new tables to the API roles (see 00008).
-- Players may only read their own row, and not its approval token: with the
-- token a player under 16 could open the parent link and approve their own
-- photo. Every write goes through the server.
REVOKE ALL ON public.profile_photos FROM anon, authenticated;
GRANT SELECT (user_id, path, visibility, status, consent_by, created_at, approved_at) ON public.profile_photos TO authenticated;
GRANT ALL ON public.profile_photos TO service_role;

-- Private: no public links, and no access for players through the storage API
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 524288, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- 3. STORED LEVELS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.player_levels (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 50),
  xp integer NOT NULL CHECK (xp >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players see their own level row" ON public.player_levels;
CREATE POLICY "Players see their own level row" ON public.player_levels
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.player_levels TO authenticated;
GRANT ALL ON public.player_levels TO service_role;
REVOKE ALL ON public.player_levels FROM anon;

-- =============================================================================
-- 4. THE PLAYER CARD, WITH LEVEL, AVATAR AND PHOTO
-- =============================================================================
-- As in 00024, plus is_teammate, level, xp, the emoji avatar, and photo_path
-- when the viewer may see the photo: always for the player themselves, and
-- for others only once approved and only as far as its visibility allows.
CREATE OR REPLACE FUNCTION public.player_card(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  p public.profiles%ROWTYPE;
  ph public.profile_photos%ROWTYPE;
  lv public.player_levels%ROWTYPE;
  is_friend boolean;
  teammate boolean;
  self boolean;
  photo text;
BEGIN
  IF me IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = p_user;
  IF NOT FOUND THEN RETURN NULL; END IF;
  self := p_user = me;
  is_friend := EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted' AND LEAST(requester_id, addressee_id) = LEAST(me, p_user) AND GREATEST(requester_id, addressee_id) = GREATEST(me, p_user)
  );
  teammate := EXISTS (
    SELECT 1 FROM public.team_members a JOIN public.team_members b ON b.team_id = a.team_id
    WHERE a.user_id = me AND b.user_id = p_user
  );
  -- Visible to: themselves, friends, teammates, or anyone if they are on the public leaderboard
  IF NOT (self OR is_friend OR teammate OR p.is_public) THEN RETURN NULL; END IF;

  SELECT * INTO ph FROM public.profile_photos WHERE user_id = p_user;
  IF FOUND THEN
    IF self THEN
      photo := ph.path;
    ELSIF ph.status = 'approved'
      AND (ph.visibility = 'everyone' OR (ph.visibility = 'friends' AND (is_friend OR teammate))) THEN
      photo := ph.path;
    END IF;
  END IF;
  SELECT * INTO lv FROM public.player_levels WHERE user_id = p_user;

  RETURN jsonb_build_object(
    'user_id', p.id,
    'display_name', p.display_name,
    'is_me', self,
    'is_friend', is_friend,
    'is_teammate', teammate,
    'position', CASE WHEN self OR p.show_position THEN p.position END,
    'height_cm', CASE WHEN self OR p.show_height THEN p.height_cm END,
    'country', CASE WHEN self OR p.show_location THEN p.country END,
    'region', CASE WHEN self OR p.show_location THEN p.region END,
    'badges', (SELECT count(*)::int FROM public.reward_events r WHERE r.user_id = p.id AND r.event_type = 'badge_earned'),
    'badge_titles', COALESCE((SELECT jsonb_agg(r.badge_title ORDER BY r.created_at DESC) FROM (
      SELECT badge_title, created_at FROM public.reward_events WHERE user_id = p.id AND event_type = 'badge_earned' ORDER BY created_at DESC LIMIT 8
    ) r), '[]'::jsonb),
    'season_points', (SELECT s.points FROM public.leaderboard_snapshot s JOIN public.leaderboard_seasons ls ON ls.id = s.season_id AND ls.is_active WHERE s.user_id = p.id LIMIT 1),
    'streak', CASE WHEN self OR is_friend OR teammate THEN public.training_streak(p.id) END,
    'level', lv.level,
    'xp', lv.xp,
    'avatar_emoji', p.avatar_emoji,
    'avatar_color', p.avatar_color,
    'photo_path', photo
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.player_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.player_card(uuid) TO authenticated;
