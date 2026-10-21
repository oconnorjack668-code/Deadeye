-- 00046_friend_request_from_profile.sql
--
-- Add a friend from their player card, as other apps do, instead of only by
-- typing their 6-character friend code. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
-- Same rules as send_friend_request (00024): it respects "allow friend
-- requests", accepts a request that is already waiting the other way, and has
-- the same limits. Two more, because a card can be seen by far more people
-- than a friend code is ever given to:
--
--   1. Only a card you can already see: yourself, a friend, a teammate, or a
--      player on the public leaderboard (the player_card rule). Anyone else
--      reads as not_found, so this cannot be used to find private players.
--   2. Adults and under-18s are kept apart. An adult cannot send a request to
--      a player under 18 from their card, or the other way round - not even a
--      teammate, because a coach is a teammate of every player they coach,
--      and Basketball Ireland asks coaches not to befriend minors (see the
--      Safeguarding section of the plan). Players whose age is unknown cannot
--      use this at all. A friend code still works: it has to be handed over,
--      which means the two already know each other. This returns use_code,
--      and the app says so.
--
-- Returns: sent, accepted, already, self, not_found, limit, closed, use_code

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
      UPDATE public.friendships SET status = 'accepted', responded_at = now() WHERE id = existing.id;
      RETURN 'accepted';
    END IF;
    RETURN 'already';
  END IF;

  IF NOT target_open THEN RETURN 'closed'; END IF;

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
REVOKE EXECUTE ON FUNCTION public.send_friend_request_to(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request_to(uuid) TO authenticated;
