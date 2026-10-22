-- 00053_club_board.sql
--
-- The club board: one page per club, for the players and coaches of that
-- club teams only. Coaches post notices to the whole club and can set a club
-- challenge; everyone sees how each team trained this week. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- Most players on a club board are children, so:
--
--   1. A team joins a club board only when the founder approves it. A head
--      coach asks (request_club_link) and the link stays pending until the
--      owner approves it in Owner tools, after checking with the club. So no
--      one can make a team, name any club and read its board.
--   2. The board never shows a single player. No names, no player stats:
--      teams show totals only, and only with CLUB_TEAM_MIN (3) players or
--      more, so no one child can be picked out. The challenge is one club
--      total.
--   3. Notices are written by head coaches only (adults who declared Garda
--      vetting, 00047), to the whole club. Nobody can reply, and there is no
--      private message of any kind. A notice may not hold an email address,
--      a phone number or a link, so a notice cannot open a private channel.
--      At most 5 notices a day per coach. A coach deletes their own, the
--      owner deletes any.
--   4. Only members of an approved team of the club (and the owner, to
--      moderate) can read the board. Every read goes through the functions
--      below; the tables themselves are closed to players.
--
-- Rows go with the team (ON DELETE CASCADE). A notice goes with its author,
-- and is in their data export.

-- =============================================================================
-- 1. TEAM TO CLUB LINKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.club_team_links (
  team_id uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  club_id text NOT NULL CHECK (club_id ~ '^[a-z0-9-]{2,90}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_club_team_links_club ON public.club_team_links(club_id, status);

ALTER TABLE public.club_team_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members see their team club link" ON public.club_team_links;
CREATE POLICY "Team members see their team club link" ON public.club_team_links
  FOR SELECT USING (public.is_team_member(team_id, auth.uid()));
-- Coaches write through request_club_link and remove_club_link; the owner approves with the service role
REVOKE ALL ON public.club_team_links FROM anon, authenticated;
GRANT SELECT ON public.club_team_links TO authenticated;
GRANT ALL ON public.club_team_links TO service_role;

CREATE OR REPLACE FUNCTION public.is_club_member(p_club text, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_team_links l JOIN public.team_members m ON m.team_id = l.team_id
    WHERE l.club_id = p_club AND l.status = 'approved' AND m.user_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_club(p_club text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_club_member(p_club, auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );
$$;

-- A head coach asks for their team to join a club board. Asking again for
-- another club starts over as pending. The club id is checked against the
-- club list by api/teams/club before this is called.
CREATE OR REPLACE FUNCTION public.request_club_link(p_team uuid, p_club text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  existing public.club_team_links%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF NOT public.is_team_coach(p_team, me) THEN RAISE EXCEPTION 'Only a head coach of this team can do that'; END IF;
  IF p_club IS NULL OR p_club !~ '^[a-z0-9-]{2,90}$' THEN RAISE EXCEPTION 'Pick a club from the list'; END IF;
  SELECT * INTO existing FROM public.club_team_links WHERE team_id = p_team;
  IF FOUND AND existing.club_id = p_club THEN RETURN existing.status; END IF;
  INSERT INTO public.club_team_links (team_id, club_id, status, requested_by, created_at, approved_at)
  VALUES (p_team, p_club, 'pending', me, now(), NULL)
  ON CONFLICT (team_id) DO UPDATE SET club_id = EXCLUDED.club_id, status = 'pending', requested_by = me, created_at = now(), approved_at = NULL;
  RETURN 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_club_link(p_team uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_coach(p_team, auth.uid()) THEN
    RAISE EXCEPTION 'Only a head coach of this team can do that';
  END IF;
  DELETE FROM public.club_team_links WHERE team_id = p_team;
END;
$$;

-- =============================================================================
-- 2. NOTICES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.club_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id text NOT NULL CHECK (club_id ~ '^[a-z0-9-]{2,90}$'),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_notices_club ON public.club_notices(club_id, created_at DESC);

ALTER TABLE public.club_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authors see their own notices" ON public.club_notices;
CREATE POLICY "Authors see their own notices" ON public.club_notices
  FOR SELECT USING (author_id = auth.uid());
REVOKE ALL ON public.club_notices FROM anon, authenticated;
GRANT SELECT ON public.club_notices TO authenticated;
GRANT ALL ON public.club_notices TO service_role;

-- True when text holds an email address, a phone number (8 digits or more),
-- a link or a social account. src/lib/clubBoard.ts mirrors it for the form.
CREATE OR REPLACE FUNCTION public.has_contact_details(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
    OR EXISTS (
      SELECT 1 FROM regexp_matches(p_text, '\+?[0-9][0-9 ()-]{6,}[0-9]', 'g') AS m(hit)
      WHERE char_length(regexp_replace(m.hit[1], '[^0-9]', '', 'g')) >= 8
    )
    OR p_text ~* '(https?://|www\.|\m[a-z0-9-]+\.(com|ie|net|org|co|uk|ly|me|io|app)\M)'
    OR p_text ~* '(snapchat|whatsapp|insta(gram)?|tiktok|telegram|discord)\M';
$$;

CREATE OR REPLACE FUNCTION public.post_club_notice(p_team uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  link public.club_team_links%ROWTYPE;
  clean text := btrim(regexp_replace(COALESCE(p_body, ''), '[ \t]+', ' ', 'g'));
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF NOT public.is_team_coach(p_team, me) THEN RAISE EXCEPTION 'Only head coaches post to the club board'; END IF;
  SELECT * INTO link FROM public.club_team_links WHERE team_id = p_team AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'This team is not on a club board yet'; END IF;
  IF char_length(clean) < 2 OR char_length(clean) > 500 THEN RAISE EXCEPTION 'A notice is 2 to 500 characters'; END IF;
  IF public.has_contact_details(clean) THEN
    RAISE EXCEPTION 'Notices cannot include emails, phone numbers, links or social accounts';
  END IF;
  IF (SELECT count(*) FROM public.club_notices WHERE author_id = me AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'That is 5 notices today. Try again tomorrow';
  END IF;
  INSERT INTO public.club_notices (club_id, team_id, author_id, body) VALUES (link.club_id, p_team, me, clean) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_club_notice(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  DELETE FROM public.club_notices n
  WHERE n.id = p_id AND (
    n.author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );
END;
$$;

-- The newest 30 notices, with the coach display name and team. A coach is an
-- adult who chose to post, so their name shows; no player ever appears.
CREATE OR REPLACE FUNCTION public.club_notices_for(p_club text)
RETURNS TABLE (id uuid, body text, created_at timestamptz, author_name text, team_name text, mine boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.body, n.created_at, COALESCE(p.display_name, 'Coach'), t.name, n.author_id = auth.uid()
  FROM public.club_notices n
  LEFT JOIN public.profiles p ON p.id = n.author_id
  LEFT JOIN public.teams t ON t.id = n.team_id
  WHERE n.club_id = p_club AND public.can_read_club(p_club)
  ORDER BY n.created_at DESC
  LIMIT 30;
$$;

-- =============================================================================
-- 3. TEAMS ON THE BOARD
-- =============================================================================
-- Each approved team with its size and this week (the last 7 days in Irish
-- time). Totals only, and only for teams with 3 players or more.
CREATE OR REPLACE FUNCTION public.club_teams(p_club text)
RETURNS TABLE (
  team_id uuid,
  name text,
  age_group text,
  league_id text,
  players integer,
  sessions_7d integer,
  shots_7d integer,
  active_7d integer,
  mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH board AS (
    SELECT t.id, t.name, t.age_group, t.league_id
    FROM public.club_team_links l JOIN public.teams t ON t.id = l.team_id
    WHERE l.club_id = p_club AND l.status = 'approved' AND public.can_read_club(p_club)
  ),
  since AS (SELECT (now() AT TIME ZONE 'Europe/Dublin')::date - 6 AS d),
  per_player AS (
    SELECT b.id AS team_id, m.user_id,
      (SELECT count(*) FROM public.training_sessions s WHERE s.user_id = m.user_id AND s.session_date >= (SELECT d FROM since))
        + (SELECT count(*) FROM public.workouts w WHERE w.user_id = m.user_id AND w.workout_date >= (SELECT d FROM since)) AS sessions,
      (SELECT COALESCE(sum(e.attempts), 0) FROM public.shooting_entries e
        JOIN public.session_drills dr ON dr.id = e.drill_id JOIN public.training_sessions s ON s.id = dr.session_id
        WHERE e.user_id = m.user_id AND s.session_date >= (SELECT d FROM since)) AS shots
    FROM board b JOIN public.team_members m ON m.team_id = b.id AND m.role = 'player'
  ),
  totals AS (
    SELECT team_id, count(*)::int AS players, sum(sessions)::int AS sessions, sum(shots)::int AS shots,
      count(*) FILTER (WHERE sessions > 0)::int AS active
    FROM per_player GROUP BY team_id
  )
  SELECT b.id, b.name, b.age_group, b.league_id,
    COALESCE(x.players, 0),
    CASE WHEN COALESCE(x.players, 0) >= 3 THEN x.sessions END,
    CASE WHEN COALESCE(x.players, 0) >= 3 THEN x.shots END,
    CASE WHEN COALESCE(x.players, 0) >= 3 THEN x.active END,
    public.is_team_member(b.id, auth.uid())
  FROM board b LEFT JOIN totals x ON x.team_id = b.id
  ORDER BY b.name;
$$;

-- =============================================================================
-- 4. CLUB CHALLENGE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.club_challenges (
  club_id text PRIMARY KEY CHECK (club_id ~ '^[a-z0-9-]{2,90}$'),
  metric text NOT NULL CHECK (metric IN ('sessions', 'shots')),
  target integer NOT NULL CHECK (target BETWEEN 1 AND 1000000),
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on AND ends_on <= starts_on + 92),
  set_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.club_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_challenges FROM anon, authenticated;
GRANT ALL ON public.club_challenges TO service_role;

-- A head coach of an approved team sets the club challenge, replacing the last
CREATE OR REPLACE FUNCTION public.set_club_challenge(p_team uuid, p_metric text, p_target integer, p_days integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  link public.club_team_links%ROWTYPE;
  today date := (now() AT TIME ZONE 'Europe/Dublin')::date;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF NOT public.is_team_coach(p_team, me) THEN RAISE EXCEPTION 'Only head coaches set the club challenge'; END IF;
  SELECT * INTO link FROM public.club_team_links WHERE team_id = p_team AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'This team is not on a club board yet'; END IF;
  IF p_metric NOT IN ('sessions', 'shots') THEN RAISE EXCEPTION 'Pick sessions or shots'; END IF;
  IF p_target IS NULL OR p_target < 1 OR p_target > 1000000 THEN RAISE EXCEPTION 'Pick a target from 1 to 1,000,000'; END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 92 THEN RAISE EXCEPTION 'A challenge runs 1 to 92 days'; END IF;
  INSERT INTO public.club_challenges (club_id, metric, target, starts_on, ends_on, set_by)
  VALUES (link.club_id, p_metric, p_target, today, today + p_days - 1, me)
  ON CONFLICT (club_id) DO UPDATE SET metric = EXCLUDED.metric, target = EXCLUDED.target, starts_on = EXCLUDED.starts_on,
    ends_on = EXCLUDED.ends_on, set_by = me, created_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.end_club_challenge(p_team uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link public.club_team_links%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_team_coach(p_team, auth.uid()) THEN RAISE EXCEPTION 'Only head coaches end the club challenge'; END IF;
  SELECT * INTO link FROM public.club_team_links WHERE team_id = p_team AND status = 'approved';
  IF NOT FOUND THEN RAISE EXCEPTION 'This team is not on a club board yet'; END IF;
  DELETE FROM public.club_challenges WHERE club_id = link.club_id;
END;
$$;

-- The club challenge and its one club total: each player on an approved team
-- counted once, from the first day to the last.
CREATE OR REPLACE FUNCTION public.club_challenge_for(p_club text)
RETURNS TABLE (metric text, target integer, starts_on date, ends_on date, progress integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ch AS (SELECT * FROM public.club_challenges c WHERE c.club_id = p_club AND public.can_read_club(p_club)),
  players AS (
    SELECT DISTINCT m.user_id FROM public.club_team_links l JOIN public.team_members m ON m.team_id = l.team_id
    WHERE l.club_id = p_club AND l.status = 'approved' AND m.role = 'player'
  )
  SELECT ch.metric, ch.target, ch.starts_on, ch.ends_on,
    CASE WHEN ch.metric = 'sessions' THEN
      (SELECT count(*) FROM public.training_sessions s JOIN players p ON p.user_id = s.user_id WHERE s.session_date BETWEEN ch.starts_on AND ch.ends_on)::int
      + (SELECT count(*) FROM public.workouts w JOIN players p ON p.user_id = w.user_id WHERE w.workout_date BETWEEN ch.starts_on AND ch.ends_on)::int
    ELSE
      (SELECT COALESCE(sum(e.attempts), 0) FROM public.shooting_entries e
        JOIN public.session_drills dr ON dr.id = e.drill_id JOIN public.training_sessions s ON s.id = dr.session_id
        JOIN players p ON p.user_id = e.user_id
        WHERE s.session_date BETWEEN ch.starts_on AND ch.ends_on)::int
    END
  FROM ch;
$$;

-- =============================================================================
-- 5. GRANTS
-- =============================================================================
-- Internal only: called with any user id, it would tell whether that player is at a club
REVOKE EXECUTE ON FUNCTION public.is_club_member(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_read_club(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_club_link(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_club_link(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.post_club_notice(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_club_notice(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.club_notices_for(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.club_teams(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_club_challenge(uuid, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.end_club_challenge(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.club_challenge_for(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_club(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_club_link(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_club_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_club_notice(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_club_notice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_notices_for(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_teams(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_club_challenge(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_club_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_challenge_for(text) TO authenticated;
