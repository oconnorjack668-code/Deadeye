-- 00037_free_and_pro.sql
--
-- What Free and Pro include, the founding member offer, and monthly AI
-- credits. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- THE SPLIT, in short (src/lib/plans.ts has the wording players see):
--   Free keeps everything that brings players in and everything that is their
--   own data: the shot tracker, logging, history, every drill, form check,
--   friends and the leaderboard. Pro is coaching: the full programme library,
--   all twelve IQ sections, unlimited AI, trends over time, and teams.
--   AI is the one thing that costs money every time it runs, so Free gets a
--   monthly allowance of it rather than none.
--
-- ENFORCED HERE as well as in the pages, for the two things a phone writes
-- straight to the database rather than through the server: starting a
-- programme, and creating a team. Hiding a button is not the same as declining
-- to act, and the Supabase API is reachable by anyone signed in.

-- =============================================================================
-- 1. SUBSCRIPTION COLUMNS
-- =============================================================================
-- founding_claimed_at   when the player claimed the founding offer (never cleared,
--                       so it also marks who is entitled to the founder price)
-- founding_pro_until    Pro without paying until this moment
-- founding_reminded_at  when the "your founding Pro ends soon" nudge went out
-- ai_credits_period     the month ai_credits_remaining belongs to. A different
--                       month means the allowance is due a refill
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS founding_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS founding_pro_until timestamptz,
  ADD COLUMN IF NOT EXISTS founding_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_credits_period date;

-- Counting claims against the cap reads this, and it should stay a small read
CREATE INDEX IF NOT EXISTS subscriptions_founding_idx
  ON public.subscriptions (founding_claimed_at)
  WHERE founding_claimed_at IS NOT NULL;

-- =============================================================================
-- 2. WHO HAS PRO
-- =============================================================================
-- One definition for the database, matching hasPro() in src/lib/entitlements.ts:
-- a paid or owner plan, the owner role, or a founding period that has not ended.
-- Not callable by players: it answers for any user id, and whether someone else
-- pays is not theirs to ask. SECURITY DEFINER functions below call it.
CREATE OR REPLACE FUNCTION public.user_has_pro(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = p_user
      AND (s.plan_type IN ('pro', 'owner') OR s.founding_pro_until > now())
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user AND r.role = 'owner'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.user_has_pro(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_pro(uuid) TO service_role;

-- =============================================================================
-- 3. FOUNDING MEMBERS
-- =============================================================================
-- The first p_limit players to claim get p_months of Pro free. The cap is the
-- whole point, so the count and the claim happen under one lock: two players
-- tapping at once for the last place must not both get it. The limit and the
-- length come from the server (FOUNDING_PLACES in src/lib/founding.ts) so the
-- page that shows "places left" and the rule that enforces it cannot disagree.
--
-- Returns claimed, already, has_pro or full. Service role only: the server
-- checks the owner and the parent approval gate before calling it.
CREATE OR REPLACE FUNCTION public.claim_founding_pro(p_user uuid, p_limit integer, p_months integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  taken integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('claim_founding_pro'));

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No subscription row for this player'; END IF;
  IF sub.founding_claimed_at IS NOT NULL THEN RETURN 'already'; END IF;
  IF sub.plan_type IN ('pro', 'owner') THEN RETURN 'has_pro'; END IF;

  SELECT count(*) INTO taken FROM public.subscriptions WHERE founding_claimed_at IS NOT NULL;
  IF taken >= p_limit THEN RETURN 'full'; END IF;

  UPDATE public.subscriptions
  SET founding_claimed_at = now(),
      founding_pro_until = now() + make_interval(months => p_months),
      updated_at = now()
  WHERE user_id = p_user;
  RETURN 'claimed';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_founding_pro(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founding_pro(uuid, integer, integer) TO service_role;

-- =============================================================================
-- 4. PROGRAMMES: THREE FREE, THE REST PRO
-- =============================================================================
-- The free three are the natural starting points, plus In-Season Maintenance
-- because it is short and it is the season. The rest are the structured,
-- multi-week coaching that people pay for.
ALTER TABLE public.training_programs ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
UPDATE public.training_programs
SET is_free = (slug IN ('beginner-complete', 'shooting-foundations', 'in-season-maintenance'));

-- Starting a Pro programme needs Pro. Anyone who had already started a
-- programme before this keeps it, and can restart it: nothing a tester began
-- is taken away mid-way.
CREATE OR REPLACE FUNCTION public.enforce_programme_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.training_programs WHERE id = NEW.program_id AND is_free) THEN
    RETURN NEW;
  END IF;
  IF public.user_has_pro(NEW.user_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_enrollments
    WHERE user_id = NEW.user_id AND program_id = NEW.program_id
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'This programme is part of Deadeye Pro' USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS program_enrollments_access ON public.program_enrollments;
CREATE TRIGGER program_enrollments_access
  BEFORE INSERT ON public.program_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_programme_access();

-- =============================================================================
-- 5. BASKETBALL IQ: THE FIRST THREE SECTIONS FREE
-- =============================================================================
-- The daily question stays free and draws from every section.
ALTER TABLE public.study_topics ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
UPDATE public.study_topics
SET is_free = id IN (
  SELECT id FROM public.study_topics WHERE is_active ORDER BY display_order, created_at LIMIT 3
);

-- =============================================================================
-- 6. CREATING A TEAM
-- =============================================================================
-- Same as 00022, but asking user_has_pro so a founding member counts, and with
-- the old app name gone from the message.
CREATE OR REPLACE FUNCTION public.create_team(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not logged in'; END IF;
  IF NOT public.user_has_pro(me) THEN
    RAISE EXCEPTION 'Creating a team needs Deadeye Pro';
  END IF;
  IF (SELECT count(*) FROM public.teams WHERE created_by = me) >= 10 THEN
    RAISE EXCEPTION 'You can create up to 10 teams';
  END IF;
  INSERT INTO public.teams (name, created_by) VALUES (trim(p_name), me) RETURNING id INTO new_id;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (new_id, me, 'coach');
  RETURN new_id;
END;
$$;
