-- 00047_coach_side.sql
--
-- The coach side (C1 and C2 of the plan): coach setup, assistant coaches, the
-- Playing / Coaching switch, free coaching for one team, a team join link, and
-- the safeguarding rules that have to hold before a club trials it. Safe to
-- re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- SAFEGUARDING, AND WHERE EACH RULE LIVES. Most players are teenagers, so the
-- coach side follows the Basketball Ireland Social Media Use Policy for Coaches
-- of Minors (2025) and its child protection rules:
--   1. Head coaches are 18 or over. A coach declares it at coach setup
--      (coach_profiles.is_adult). create_team_with_details and set_team_role
--      refuse a head coach who has not. Under-18s can only be assistants, and
--      every team keeps at least one head coach, so an under-18 assistant is
--      always on a team with an adult in charge.
--   2. Garda vetting is declared at setup (vetting_declared_at). The app
--      cannot check it, so it never shows a vetted badge anywhere.
--   3. No private messages between a coach and a player. There is no message
--      feature at all: coaches post assignments to the whole team.
--   4. Film questions stay with head coaches. is_team_coach is unchanged and
--      means head coach only, so an under-18 assistant never sees a clip of
--      another player, and every head coach of the team sees every question.
--   5. A coach and an under-18 cannot become friends, by code, from a player
--      card or by accepting an old request (send_friend_request,
--      send_friend_request_to, respond_friend_request). Players and adults who
--      do not coach keep friend codes as before: a code has to be handed
--      over, so the two already know each other. Friendships made before this
--      migration are left alone.
--   6. Coaches see only what players share. Unchanged from 00024.

-- =============================================================================
-- 1. COACH PROFILE
-- =============================================================================
-- One row per coach, written at coach setup. A row is what makes an account a
-- coach for the rules below; account_role on profiles only picks the menus.
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_name text CHECK (club_name IS NULL OR char_length(club_name) BETWEEN 1 AND 80),
  is_adult boolean NOT NULL,
  -- When the coach said their club has Garda vetted them. Null for under-18s.
  vetting_declared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coach_profiles_adults_declare_vetting CHECK (NOT is_adult OR vetting_declared_at IS NOT NULL)
);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coach_profiles_read_own ON public.coach_profiles;
CREATE POLICY coach_profiles_read_own ON public.coach_profiles
  FOR SELECT USING (user_id = auth.uid());
-- Written only through save_coach_profile, so the age rules cannot be skipped
REVOKE ALL ON public.coach_profiles FROM anon, authenticated;
GRANT SELECT ON public.coach_profiles TO authenticated;
GRANT ALL ON public.coach_profiles TO service_role;

-- Which side of the app opens: the last mode a player-coach used
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_mode text;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_app_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_app_mode_check CHECK (app_mode IS NULL OR app_mode IN ('playing', 'coaching'));

-- Under 18 as far as the app knows: the age answer at sign-up, the age
-- bracket, or what they said at coach setup. Unknown counts as not a minor,
-- because the rules that use this hold back adults, and a coach always has a
-- coach_profiles row saying which they are.
CREATE OR REPLACE FUNCTION public.is_minor(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.age_checks WHERE user_id = p_user AND NOT is_16_plus)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND age_bracket IN ('13', '14-17'))
    OR EXISTS (SELECT 1 FROM public.coach_profiles WHERE user_id = p_user AND NOT is_adult);
$$;

-- Coaches anyone: set up as a coach, or a head or assistant coach of a team
CREATE OR REPLACE FUNCTION public.is_coach_account(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.coach_profiles WHERE user_id = p_user)
    OR EXISTS (SELECT 1 FROM public.team_members WHERE user_id = p_user AND role IN ('coach', 'assistant'));
$$;

-- Rule 5: an adult who coaches and a player under 18 are kept apart
CREATE OR REPLACE FUNCTION public.coach_and_minor(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.is_coach_account(p_a) AND NOT public.is_minor(p_a) AND public.is_minor(p_b))
      OR (public.is_coach_account(p_b) AND NOT public.is_minor(p_b) AND public.is_minor(p_a));
$$;

-- Coach setup. p_role is what the account is used for: coach, or both.
CREATE OR REPLACE FUNCTION public.save_coach_profile(p_club text, p_is_adult boolean, p_vetted boolean, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  club text := NULLIF(left(trim(COALESCE(p_club, '')), 80), '');
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF p_role NOT IN ('coach', 'both') THEN RAISE EXCEPTION 'Unknown role'; END IF;
  IF p_is_adult AND (
    EXISTS (SELECT 1 FROM public.age_checks WHERE user_id = me AND NOT is_16_plus)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = me AND age_bracket IN ('13', '14-17'))
  ) THEN
    RAISE EXCEPTION 'Your account says you are under 18, so you can coach as an assistant';
  END IF;
  IF p_is_adult AND NOT p_vetted THEN
    RAISE EXCEPTION 'Please confirm that your club has Garda vetted you';
  END IF;
  IF NOT p_is_adult AND EXISTS (SELECT 1 FROM public.team_members WHERE user_id = me AND role = 'coach') THEN
    RAISE EXCEPTION 'Hand your teams to another head coach first';
  END IF;

  INSERT INTO public.coach_profiles (user_id, club_name, is_adult, vetting_declared_at)
  VALUES (me, club, p_is_adult, CASE WHEN p_is_adult THEN now() END)
  ON CONFLICT (user_id) DO UPDATE SET
    club_name = EXCLUDED.club_name,
    is_adult = EXCLUDED.is_adult,
    -- Keep the first declaration date while it still holds
    vetting_declared_at = CASE WHEN EXCLUDED.is_adult THEN COALESCE(public.coach_profiles.vetting_declared_at, now()) END,
    updated_at = now();

  UPDATE public.profiles SET account_role = p_role, app_mode = 'coaching', updated_at = now() WHERE id = me;
END;
$$;

-- =============================================================================
-- 2. ASSISTANT COACHES
-- =============================================================================
-- coach is a head coach (18 or over); assistant can post assignments and
-- share the team code, and sees what any team member sees, nothing more.
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check CHECK (role IN ('coach', 'assistant', 'player'));

CREATE OR REPLACE FUNCTION public.is_team_staff(p_team uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team AND user_id = p_user AND role IN ('coach', 'assistant'));
$$;

DROP POLICY IF EXISTS "Coaches add assignments" ON public.team_assignments;
CREATE POLICY "Coaches add assignments" ON public.team_assignments
  FOR INSERT WITH CHECK (public.is_team_staff(team_id, auth.uid()) AND created_by = auth.uid());
DROP POLICY IF EXISTS "Coaches edit assignments" ON public.team_assignments;
CREATE POLICY "Coaches edit assignments" ON public.team_assignments
  FOR UPDATE USING (public.is_team_staff(team_id, auth.uid())) WITH CHECK (public.is_team_staff(team_id, auth.uid()));
DROP POLICY IF EXISTS "Coaches delete assignments" ON public.team_assignments;
CREATE POLICY "Coaches delete assignments" ON public.team_assignments
  FOR DELETE USING (public.is_team_staff(team_id, auth.uid()));

-- Head coaches set roles. A head coach must have said at setup that they are
-- 18 or over, and a team always keeps at least one head coach.
CREATE OR REPLACE FUNCTION public.set_team_role(p_team uuid, p_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_team_coach(p_team, auth.uid()) THEN RAISE EXCEPTION 'Only head coaches can change roles'; END IF;
  IF p_role NOT IN ('coach', 'assistant', 'player') THEN RAISE EXCEPTION 'Unknown role'; END IF;
  IF NOT public.is_team_member(p_team, p_user) THEN RAISE EXCEPTION 'They are not on this team'; END IF;
  IF p_role = 'coach' AND NOT EXISTS (SELECT 1 FROM public.coach_profiles WHERE user_id = p_user AND is_adult) THEN
    RAISE EXCEPTION 'A head coach must be 18 or over and finish coach setup first. You can make them an assistant';
  END IF;
  IF p_role <> 'coach' AND public.is_team_coach(p_team, p_user)
     AND (SELECT count(*) FROM public.team_members WHERE team_id = p_team AND role = 'coach') <= 1 THEN
    RAISE EXCEPTION 'A team needs at least one head coach';
  END IF;
  UPDATE public.team_members SET role = p_role WHERE team_id = p_team AND user_id = p_user;
END;
$$;

-- =============================================================================
-- 3. CREATING A TEAM: FREE FOR ONE TEAM, ADULTS ONLY
-- =============================================================================
-- Coach Free is one team. Pro (and the owner) can run up to 10. The age group
-- and level must be values teams_details_check (00024) accepts.
CREATE OR REPLACE FUNCTION public.create_team_with_details(p_name text, p_club text, p_age_group text, p_level text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  is_owner boolean;
  new_id uuid;
  made integer;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  is_owner := EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = me AND role = 'owner');
  IF NOT is_owner AND NOT EXISTS (SELECT 1 FROM public.coach_profiles WHERE user_id = me AND is_adult) THEN
    RAISE EXCEPTION 'Finish coach setup first. Head coaches must be 18 or over';
  END IF;
  SELECT count(*) INTO made FROM public.teams WHERE created_by = me;
  IF made >= 10 THEN RAISE EXCEPTION 'You can create up to 10 teams'; END IF;
  IF made >= 1 AND NOT is_owner AND NOT public.user_has_pro(me) THEN
    RAISE EXCEPTION 'Coaching one team is free. More teams come with Deadeye Pro';
  END IF;

  INSERT INTO public.teams (name, club_name, age_group, level, country, region, created_by)
  SELECT trim(p_name),
    NULLIF(left(trim(COALESCE(p_club, '')), 80), ''),
    NULLIF(p_age_group, ''),
    NULLIF(p_level, ''),
    p.country,
    p.region,
    me
  FROM public.profiles p WHERE p.id = me
  RETURNING id INTO new_id;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (new_id, me, 'coach');
  RETURN new_id;
END;
$$;

-- The old one-argument form, kept for the app as deployed before this change
CREATE OR REPLACE FUNCTION public.create_team(p_name text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.create_team_with_details(p_name, NULL, NULL, NULL);
$$;

-- =============================================================================
-- 4. TEAM JOIN LINK
-- =============================================================================
-- What the join page shows before someone joins: the team, never its members.
-- The code is the secret, as it already is for join_team.
CREATE OR REPLACE FUNCTION public.team_preview(p_code text)
RETURNS TABLE (name text, club_name text, age_group text, members integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.name, t.club_name, t.age_group, (SELECT count(*)::int FROM public.team_members m WHERE m.team_id = t.id)
  FROM public.teams t
  WHERE t.join_code = upper(trim(p_code)) AND auth.uid() IS NOT NULL;
$$;

-- =============================================================================
-- 5. FRIENDS: A COACH AND AN UNDER-18 ARE KEPT APART
-- =============================================================================
-- Same as 00024, plus rule 5. Returns coach_minor for that case.
CREATE OR REPLACE FUNCTION public.send_friend_request(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  target uuid;
  target_open boolean;
  existing public.friendships%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  SELECT id, allow_friend_requests INTO target, target_open FROM public.profiles WHERE friend_code = upper(trim(p_code));
  IF target IS NULL THEN RETURN 'not_found'; END IF;
  IF target = me THEN RETURN 'self'; END IF;

  SELECT * INTO existing FROM public.friendships
  WHERE LEAST(requester_id, addressee_id) = LEAST(me, target)
    AND GREATEST(requester_id, addressee_id) = GREATEST(me, target);
  IF FOUND THEN
    IF existing.status = 'pending' AND existing.addressee_id = me THEN
      IF public.coach_and_minor(me, target) THEN RETURN 'coach_minor'; END IF;
      UPDATE public.friendships SET status = 'accepted', responded_at = now() WHERE id = existing.id;
      RETURN 'accepted';
    END IF;
    RETURN 'already';
  END IF;

  IF NOT target_open THEN RETURN 'closed'; END IF;
  IF public.coach_and_minor(me, target) THEN RETURN 'coach_minor'; END IF;

  IF (SELECT count(*) FROM public.friendships WHERE requester_id = me AND status = 'pending') >= 50
     OR (SELECT count(*) FROM public.friendships WHERE me IN (requester_id, addressee_id) AND status = 'accepted') >= 300 THEN
    RETURN 'limit';
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id) VALUES (me, target);
  RETURN 'sent';
END;
$$;

-- Same as 00046, plus rule 5 before its age rule, so a coach hears why
-- instead of being told to ask for a friend code that would not work either.
CREATE OR REPLACE FUNCTION public.send_friend_request_to(p_user uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  target_open boolean;
  my_age text;
  their_age text;
  existing public.friendships%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF p_user = me THEN RETURN 'self'; END IF;
  IF public.player_card(p_user) IS NULL THEN RETURN 'not_found'; END IF;

  SELECT allow_friend_requests, age_bracket INTO target_open, their_age FROM public.profiles WHERE id = p_user;
  SELECT age_bracket INTO my_age FROM public.profiles WHERE id = me;

  SELECT * INTO existing FROM public.friendships
  WHERE LEAST(requester_id, addressee_id) = LEAST(me, p_user)
    AND GREATEST(requester_id, addressee_id) = GREATEST(me, p_user);
  IF FOUND THEN
    IF existing.status = 'pending' AND existing.addressee_id = me THEN
      IF public.coach_and_minor(me, p_user) THEN RETURN 'coach_minor'; END IF;
      UPDATE public.friendships SET status = 'accepted', responded_at = now() WHERE id = existing.id;
      RETURN 'accepted';
    END IF;
    RETURN 'already';
  END IF;

  IF NOT target_open THEN RETURN 'closed'; END IF;
  IF public.coach_and_minor(me, p_user) THEN RETURN 'coach_minor'; END IF;

  IF NOT (
    (my_age IN ('18-22', '23-30', '30+') AND their_age IN ('18-22', '23-30', '30+'))
    OR (my_age IN ('13', '14-17') AND their_age IN ('13', '14-17'))
  ) THEN
    RETURN 'use_code';
  END IF;

  IF (SELECT count(*) FROM public.friendships WHERE requester_id = me AND status = 'pending') >= 50
     OR (SELECT count(*) FROM public.friendships WHERE me IN (requester_id, addressee_id) AND status = 'accepted') >= 300 THEN
    RETURN 'limit';
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id) VALUES (me, p_user);
  RETURN 'sent';
END;
$$;

-- A request sent before one of the two started coaching cannot be accepted
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other uuid;
BEGIN
  IF p_accept THEN
    SELECT requester_id INTO other FROM public.friendships
    WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
    IF other IS NOT NULL AND public.coach_and_minor(auth.uid(), other) THEN
      RAISE EXCEPTION 'Coaches and players under 18 cannot be friends on Deadeye';
    END IF;
    UPDATE public.friendships SET status = 'accepted', responded_at = now()
    WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
  ELSE
    DELETE FROM public.friendships
    WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
  END IF;
END;
$$;

-- =============================================================================
-- 6. GRANTS
-- =============================================================================
REVOKE EXECUTE ON FUNCTION public.is_minor(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_coach_account(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.coach_and_minor(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_minor(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_coach_account(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.coach_and_minor(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.save_coach_profile(text, boolean, boolean, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_staff(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_team_role(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_team_with_details(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_team(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_preview(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_friend_request(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_friend_request_to(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_coach_profile(text, boolean, boolean, text) TO authenticated;
-- Policies call it as the signed-in player
GRANT EXECUTE ON FUNCTION public.is_team_staff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team_with_details(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_preview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_friend_request_to(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
