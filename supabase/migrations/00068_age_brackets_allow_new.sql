-- 00068_age_brackets_allow_new.sql
--
-- D4 (setup for Irish players), founder decision 2026-11-23, option A.
-- Sign-up already asks "are you 16 or older" (age_checks.is_16_plus, 00036),
-- so setup stops asking for one of five brackets. It saves:
--   13-15  a "13 to 15" sign-up, without asking again
--   16-17  a "16 or older" sign-up who says "16 or 17"
--   18+    a "16 or older" sign-up who says "18 or older"
--
-- This file only ALLOWS the new values and teaches every database rule that
-- reads age_bracket to understand them. It changes no rows, so it is safe to
-- run while the old app code is still live (that code never writes the new
-- values). The rows move in 00069, which runs AFTER the new app code is
-- live, because the old code would read 16-17 as "not a minor".
--
-- ORDER: 1. this file  2. deploy the D4 code  3. 00069_age_brackets_backfill.sql
--
-- The old values (13, 14-17, 18-22, 23-30, 30+) stay allowed and readable
-- here; a later migration can drop them from the CHECK once 00069 has run and
-- nothing writes them. Safe to re-run.

-- =============================================================================
-- 1. THE CHECK: old and new values
-- =============================================================================
-- NOT VALID then VALIDATE: the scan runs under a lighter lock than ADD alone,
-- so profile saves are not blocked while it checks the existing rows.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_age_bracket_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_age_bracket_check
  CHECK (age_bracket IN ('13-15', '16-17', '18+', '13', '14-17', '18-22', '23-30', '30+'))
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_age_bracket_check;

-- =============================================================================
-- 2. ONE PLACE THAT SAYS WHICH BRACKETS ARE ADULT OR UNDER 18
-- =============================================================================
-- Mirrors isAdultBracket and isMinorBracket in src/lib/ageBracket.ts.
-- NULL (no answer) is neither.
CREATE OR REPLACE FUNCTION public.is_adult_bracket(p_bracket text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(p_bracket IN ('18+', '18-22', '23-30', '30+'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_minor_bracket(p_bracket text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(p_bracket IN ('13-15', '16-17', '13', '14-17'), false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_adult_bracket(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_minor_bracket(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_adult_bracket(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_minor_bracket(text) TO authenticated, service_role;

-- =============================================================================
-- 3. LEADERBOARD AGE BANDS (was 00024): u16, 16-17, 18+
-- =============================================================================
-- The app's filter is All ages, U16, 16-17, 18+. The old 14-17 straddles 16,
-- so it keeps its own band (only "All ages" shows it in the new app) until
-- 00069 moves it; the old app's 14-17 button keeps working in between.
CREATE OR REPLACE FUNCTION public.age_group(p_bracket text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_bracket IS NULL THEN NULL
    WHEN p_bracket IN ('13-15', '13') THEN 'u16'
    WHEN p_bracket = '16-17' THEN '16-17'
    WHEN p_bracket = '14-17' THEN '14-17'
    ELSE '18+'
  END;
$$;

-- =============================================================================
-- 4. UNDER 18 FOR THE COACH RULES (was 00047)
-- =============================================================================
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
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND public.is_minor_bracket(age_bracket))
    OR EXISTS (SELECT 1 FROM public.coach_profiles WHERE user_id = p_user AND NOT is_adult);
$$;

-- Coach setup: the bracket check now knows 13-15 and 16-17 (was 00047)
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
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = me AND public.is_minor_bracket(age_bracket))
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
-- 5. FRIEND REQUESTS FROM A PROFILE (was 00047): adults with adults, under-18s
--    with under-18s, now with the new values
-- =============================================================================
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
    (public.is_adult_bracket(my_age) AND public.is_adult_bracket(their_age))
    OR (public.is_minor_bracket(my_age) AND public.is_minor_bracket(their_age))
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

-- CREATE OR REPLACE keeps the grants 00047 set on these functions.
