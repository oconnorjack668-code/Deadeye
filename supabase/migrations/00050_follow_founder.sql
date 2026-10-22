-- 00050_follow_founder.sql
--
-- Follow the founder. Instead of Add friend, the founder card has Follow, and
-- a player who follows gets the founder posts (a challenge, a tip, an app
-- update) on their dashboard. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- Why follow rather than friends: a friendship works both ways, and a friend
-- sees friends-only photos and streaks. Following works one way only. The
-- follower gets posts; the founder gets nothing about them but a count, never
-- a name, which keeps an adult account away from the details of players
-- under 18 (see the Safeguarding section of the plan).
--
--   1. Only an account with the owner role can be followed, and only through
--      set_follow. Players read their own follows and nothing else.
--   2. follower_count tells the caller how many players follow them. Nobody,
--      the founder included, can list who.
--   3. Posts are plain text, at most 500 characters, written only by the
--      server for the owner (api/founder/posts). Every signed-in player can
--      read them: they are announcements, not personal data. Nothing here
--      lets a player reply.
--
-- Rows go with the account (ON DELETE CASCADE), and follows are in the data
-- export.

-- =============================================================================
-- 1. FOLLOWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows(followed_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players see who they follow" ON public.follows;
CREATE POLICY "Players see who they follow" ON public.follows
  FOR SELECT USING (auth.uid() = follower_id);

REVOKE ALL ON public.follows FROM anon, authenticated;
GRANT SELECT ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

-- Returns: following, not_following, not_followable
CREATE OR REPLACE FUNCTION public.set_follow(p_user uuid, p_follow boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF p_user IS NULL OR p_user = me THEN RETURN 'not_followable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'owner') THEN
    RETURN 'not_followable';
  END IF;

  IF p_follow THEN
    INSERT INTO public.follows (follower_id, followed_id) VALUES (me, p_user)
    ON CONFLICT (follower_id, followed_id) DO NOTHING;
    RETURN 'following';
  END IF;
  DELETE FROM public.follows WHERE follower_id = me AND followed_id = p_user;
  RETURN 'not_following';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_follow(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_follow(uuid, boolean) TO authenticated;

-- How many players follow the caller. A count only, never who.
CREATE OR REPLACE FUNCTION public.follower_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.follows WHERE followed_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.follower_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.follower_count() TO authenticated;

-- =============================================================================
-- 2. FOUNDER POSTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.founder_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('challenge', 'tip', 'update')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_founder_posts_author_created ON public.founder_posts(author_id, created_at DESC);

ALTER TABLE public.founder_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in players read founder posts" ON public.founder_posts;
CREATE POLICY "Signed-in players read founder posts" ON public.founder_posts
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.founder_posts FROM anon, authenticated;
GRANT SELECT ON public.founder_posts TO authenticated;
GRANT ALL ON public.founder_posts TO service_role;
