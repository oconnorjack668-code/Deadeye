-- 00036_parent_approval.sql
--
-- A parent or guardian approves the account of any player under 16.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- WHY. Deadeye is for players aged 13 and over, but the digital age of consent
-- in Ireland is 16 (Data Protection Act 2018 section 31), and it is 14 to 16 in
-- most of the rest of the EU. Below that age, processing that rests on consent
-- needs a parent to give or authorise it, and the service has to make
-- reasonable efforts to check that they did. The DPC Fundamentals also expect
-- a service used by children to put their interests first by default. Asking a
-- parent before an under-16 can use the app at all satisfies both, and it
-- covers the cases that are harder to argue about one by one: fitness data,
-- the AI coach, coaches seeing training, and clips shared with a coach (which
-- Basketball Ireland policy already says needs written parental consent).
--
-- HOW. One row per player, written once:
--   is_16_plus      what the player said. Written at sign-up by the trigger
--                   below, or on the age check page for older accounts. A
--                   player cannot change it later, because the obvious way
--                   round a parent saying no would be to answer again.
--   consent_status  not_needed for 16 and over. pending until a parent
--                   approves, approved after, withdrawn if a parent takes it
--                   back. Only the server writes it.
--   request_token   in the link the player sends to a parent. Anyone with it
--                   can see the first name of the player and the approval form.
--   confirm_token   emailed to the parent when email is set up, so an
--                   approval is only final once the parent has shown they
--                   receive mail at the address they gave.
--
-- Players can read their own row. Nobody but the server can write it.

CREATE TABLE IF NOT EXISTS public.age_checks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_16_plus boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  consent_status text NOT NULL DEFAULT 'not_needed'
    CHECK (consent_status IN ('not_needed', 'pending', 'approved', 'withdrawn')),
  request_token uuid UNIQUE,
  parent_name text CHECK (parent_name IS NULL OR char_length(parent_name) BETWEEN 2 AND 100),
  parent_email text CHECK (parent_email IS NULL OR char_length(parent_email) BETWEEN 3 AND 254),
  confirm_token uuid UNIQUE,
  confirm_sent_at timestamptz,
  approved_at timestamptz,
  approval_method text CHECK (approval_method IS NULL OR approval_method IN ('email', 'link')),
  withdrawn_at timestamptz,
  -- A 16 or over answer never needs a parent, and an under-16 one always does
  CONSTRAINT age_checks_status_matches_age CHECK (
    (is_16_plus AND consent_status = 'not_needed')
    OR (NOT is_16_plus AND consent_status IN ('pending', 'approved', 'withdrawn'))
  )
);

-- The daily clean-up looks for accounts no parent approved
CREATE INDEX IF NOT EXISTS age_checks_waiting_idx
  ON public.age_checks (consent_status)
  WHERE consent_status IN ('pending', 'withdrawn');

ALTER TABLE public.age_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS age_checks_read_own ON public.age_checks;
CREATE POLICY age_checks_read_own ON public.age_checks
  FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON public.age_checks FROM anon, authenticated;
GRANT SELECT ON public.age_checks TO authenticated;

-- =============================================================================
-- SIGN-UP: record the age answer the sign-up form sends as user metadata
-- =============================================================================
-- Same as 00001 plus the age_checks insert. The answer arrives as the text
-- true or false. Anything else is ignored rather than cast, because an error
-- here would stop the account being created at all, and a player with no row
-- is simply asked again on the age check page.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_age_answer text;
BEGIN
  v_display_name := COALESCE(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'Player'
  );

  INSERT INTO public.profiles (id, display_name, created_at, updated_at)
  VALUES (new.id, v_display_name, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan_type, status, ai_credits_remaining, video_credits_remaining)
  VALUES (new.id, 'free', 'active', 3, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  v_age_answer := lower(COALESCE(new.raw_user_meta_data->>'age_16_plus', ''));
  IF v_age_answer = 'true' THEN
    INSERT INTO public.age_checks (user_id, is_16_plus, consent_status)
    VALUES (new.id, true, 'not_needed')
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_age_answer = 'false' THEN
    INSERT INTO public.age_checks (user_id, is_16_plus, consent_status, request_token)
    VALUES (new.id, false, 'pending', gen_random_uuid())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- =============================================================================
-- EXISTING ACCOUNTS
-- =============================================================================
-- An age bracket of 18 or over already answers the question, so those players
-- are not asked again. A bracket of 13 already answers it the other way, so
-- those accounts wait for a parent like a new one would. Everyone else, 14-17
-- or no bracket, is asked once on their next visit.
INSERT INTO public.age_checks (user_id, is_16_plus, consent_status)
SELECT p.id, true, 'not_needed'
FROM public.profiles p
WHERE p.age_bracket IN ('18-22', '23-30', '30+')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.age_checks (user_id, is_16_plus, consent_status, request_token)
SELECT p.id, false, 'pending', gen_random_uuid()
FROM public.profiles p
WHERE p.age_bracket = '13'
ON CONFLICT (user_id) DO NOTHING;
