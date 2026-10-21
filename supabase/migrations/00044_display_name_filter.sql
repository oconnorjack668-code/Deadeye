-- 00044_display_name_filter.sql
--
-- Keeps rude display names off Deadeye. Names show on the leaderboard, friend
-- lists and team rosters to players as young as 13, and on 21 Oct 2026 one on
-- the public leaderboard was sexual.
--
-- 1. display_name_blocked(name): the same check as src/lib/nameFilter.ts, with
--    the same two lists (__tests__/nameFilter.test.ts fails if they drift).
-- 2. A trigger on profiles that turns a blocked name into 'Player' on every
--    insert and update, whatever wrote it: the signup trigger, onboarding,
--    Settings, or a player calling the API directly. Replaced rather than
--    refused, so a signup can never fail on it - the app has already asked
--    the player to pick another name before it gets here.
-- 3. Existing blocked names are reset to 'Player' now.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.display_name_blocked(p_name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  -- Matched anywhere, after leetspeak is undone, everything but letters is
  -- removed and repeated letters are squeezed to one (so written squeezed)
  v_parts text[] := ARRAY[
    'niple', 'penis', 'vagina', 'pusy', 'fuck', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'dildo', 'porn',
    'niga', 'fagot', 'retard', 'wank', 'boloks', 'twat', 'jiz', 'horny', 'testicle', 'scrotum', 'orgasm',
    'masturbat', 'blowjob', 'handjob', 'spunk', 'motherf', 'hitler', 'rapist', 'toser', 'bastard'
  ];
  -- Matched only as whole words: each sits inside ordinary names
  v_words text[] := ARRAY[
    'ass', 'arse', 'cock', 'dick', 'sex', 'anal', 'cum', 'rape', 'nazi', 'prick', 'tit', 'tits', 'fag', 'pedo',
    'paedo', 'kys', 'piss', 'boobs', 'boob', 'nigger', 'niggers'
  ];
  v_plain text;
  v_squeezed text;
  v_part text;
BEGIN
  IF p_name IS NULL THEN
    RETURN false;
  END IF;
  v_plain := translate(lower(p_name), '013457@$', 'oieastas');
  v_squeezed := regexp_replace(regexp_replace(v_plain, '[^a-z]', '', 'g'), '(.)\1+', '\1', 'g');
  FOREACH v_part IN ARRAY v_parts LOOP
    IF position(v_part IN v_squeezed) > 0 THEN
      RETURN true;
    END IF;
  END LOOP;
  RETURN EXISTS (
    SELECT 1
    FROM regexp_split_to_table(v_plain, '[^a-z]+') AS w(word)
    WHERE w.word = ANY (v_words)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clean_display_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.display_name_blocked(NEW.display_name) THEN
    NEW.display_name := 'Player';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_clean_display_name ON public.profiles;
CREATE TRIGGER profiles_clean_display_name
  BEFORE INSERT OR UPDATE OF display_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.clean_display_name();

-- Names already saved. The trigger above does the replacing.
UPDATE public.profiles
SET display_name = display_name
WHERE public.display_name_blocked(display_name);
