-- 00049_photos_on_lists.sql
--
-- Profile photos on the leaderboard and on the avatar in the top bar. Until
-- now a photo showed only on the player card and the own profile, because the
-- one check that knows who may see a photo, player_card (00043), looks at one
-- player at a time. visible_photo_paths answers the same question for a list
-- of players at once, with the same rule:
--
--   the player themselves: always, approved or not
--   anyone else: only once approved (by a parent, for a player under 16),
--   and only as far as its visibility allows: everyone, or friends and
--   teammates. A photo set to only me is never shown to anyone else.
--
-- As on player_card, nothing comes back for a player the viewer may not see
-- at all: not themselves, a friend, a teammate, or on the public leaderboard.
-- Only storage paths come back; the app turns them into short lived signed
-- links, as it does for player_card.
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.

CREATE OR REPLACE FUNCTION public.visible_photo_paths(p_users uuid[])
RETURNS TABLE (user_id uuid, path text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth.uid() AS id
  ),
  -- A leaderboard page asks for up to about 100 players; more is cut off
  asked AS (
    SELECT DISTINCT u.id FROM unnest(p_users[1:200]) AS u(id)
  )
  SELECT ph.user_id, ph.path
  FROM asked a
  CROSS JOIN me
  JOIN public.profiles p ON p.id = a.id
  JOIN public.profile_photos ph ON ph.user_id = a.id
  CROSS JOIN LATERAL (
    SELECT
      a.id = me.id AS self,
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND LEAST(f.requester_id, f.addressee_id) = LEAST(me.id, a.id)
          AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(me.id, a.id)
      ) AS is_friend,
      EXISTS (
        SELECT 1 FROM public.team_members x JOIN public.team_members y ON y.team_id = x.team_id
        WHERE x.user_id = me.id AND y.user_id = a.id
      ) AS teammate
  ) rel
  WHERE me.id IS NOT NULL
    AND (rel.self OR rel.is_friend OR rel.teammate OR p.is_public)
    AND (
      rel.self
      OR (
        ph.status = 'approved'
        AND (ph.visibility = 'everyone' OR (ph.visibility = 'friends' AND (rel.is_friend OR rel.teammate)))
      )
    );
$$;
REVOKE EXECUTE ON FUNCTION public.visible_photo_paths(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visible_photo_paths(uuid[]) TO authenticated;
