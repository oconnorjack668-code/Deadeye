-- 00061_play_editor.sql
--
-- Plays, phase F2 of docs/plans/film-and-plays.md: coaches draw their own
-- plays, keep a playbook for each team, set a play as a team assignment, and
-- players take a three-question quiz on their role.
--
--   1. plays: a coach writes their own rows. Free coaches keep 5 plays (Pro:
--      no limit), checked here as well as in the pages. A team member reads a
--      coach play that is in their team playbook or set for their team.
--   2. team_playbook: the plays a team works on. Staff (head and assistant
--      coaches) add and remove, every member reads. A free coach keeps a
--      playbook for 1 team, Pro up to 10.
--   3. team_assignments gains play_id, film_clip_id and film_pack_id, at most
--      one set. The film columns have no foreign key yet: their tables arrive
--      in F3, which adds the keys. A play assignment always links to the play.
--   4. play_quiz_attempts: a player keeps their own attempts. Head coaches
--      only (is_team_coach, never assistants, who can be under 18) read the
--      attempts of players on their team, for plays set for that team, made
--      since it was set, until 90 days after the due date. They read whether
--      a player did it and their score, never which answers they picked: the
--      answers column is not granted to players or coaches, and the team split
--      per question comes from play_assignment_split as totals only. No
--      teammate reads anything.
--
-- The limits match src/lib/plays/limits.ts and the wording in src/lib/plans.ts
-- (a test reads this file to check). Everything goes with the account: every
-- user column cascades from auth.users.
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments or messages of this file, for
-- the reason given at the top of 00035. Keep it apostrophe-free.

-- =============================================================================
-- 1. COACH PLAYS
-- =============================================================================
DROP POLICY IF EXISTS "Coaches add own plays" ON public.plays;
CREATE POLICY "Coaches add own plays" ON public.plays
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Coaches change own plays" ON public.plays;
CREATE POLICY "Coaches change own plays" ON public.plays
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Coaches delete own plays" ON public.plays;
CREATE POLICY "Coaches delete own plays" ON public.plays
  FOR DELETE TO authenticated USING ((select auth.uid()) = owner_id);

-- Only these columns: a coach cannot mark a play free, give it a library
-- slug, or hand it to someone else
GRANT INSERT (owner_id, title, category, min_age, tags, description, coaching_points, diagram, copied_from) ON public.plays TO authenticated;
GRANT UPDATE (title, category, min_age, tags, description, coaching_points, diagram, updated_at) ON public.plays TO authenticated;
GRANT DELETE ON public.plays TO authenticated;

-- Only coaches draw plays, and a free coach keeps 5. The lock stops two saves
-- at once both slipping under the limit.
CREATE OR REPLACE FUNCTION public.enforce_coach_play_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  made integer;
BEGIN
  -- Library plays come from the server, with no owner
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  IF NOT public.is_coach_account(NEW.owner_id) THEN
    RAISE EXCEPTION 'Only coaches can draw plays. Finish coach setup first'
      USING ERRCODE = 'insufficient_privilege', HINT = 'not_coach';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('coach_plays'), hashtext(NEW.owner_id::text));
  IF public.user_has_pro(NEW.owner_id) THEN RETURN NEW; END IF;
  SELECT count(*) INTO made FROM public.plays WHERE owner_id = NEW.owner_id;
  IF made >= 5 THEN
    RAISE EXCEPTION 'Free coaches keep 5 plays. Delete one, or see what Pro includes'
      USING ERRCODE = 'check_violation', HINT = 'play_limit';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plays_coach_limit ON public.plays;
CREATE TRIGGER plays_coach_limit
  BEFORE INSERT ON public.plays
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_play_limit();

REVOKE EXECUTE ON FUNCTION public.enforce_coach_play_limit() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 2. TEAM PLAYBOOK
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.team_playbook (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  play_id uuid NOT NULL REFERENCES public.plays(id) ON DELETE CASCADE,
  -- the coach who added it; the row goes with their account
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, play_id)
);

-- The read rule on plays looks rows up by play, and the limit by coach
CREATE INDEX IF NOT EXISTS team_playbook_play_id_idx ON public.team_playbook (play_id);
CREATE INDEX IF NOT EXISTS team_playbook_added_by_idx ON public.team_playbook (added_by);

ALTER TABLE public.team_playbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their team playbook" ON public.team_playbook;
CREATE POLICY "Members read their team playbook" ON public.team_playbook
  FOR SELECT TO authenticated USING (public.is_team_member(team_id, (select auth.uid())));

-- Staff add plays they can read themselves (the EXISTS runs under the plays
-- rules), so a playbook cannot pass round someone else private play
DROP POLICY IF EXISTS "Staff add to their team playbook" ON public.team_playbook;
CREATE POLICY "Staff add to their team playbook" ON public.team_playbook
  FOR INSERT TO authenticated WITH CHECK (
    added_by = (select auth.uid())
    AND public.is_team_staff(team_id, (select auth.uid()))
    AND EXISTS (SELECT 1 FROM public.plays p WHERE p.id = play_id)
  );

DROP POLICY IF EXISTS "Staff remove from their team playbook" ON public.team_playbook;
CREATE POLICY "Staff remove from their team playbook" ON public.team_playbook
  FOR DELETE TO authenticated USING (public.is_team_staff(team_id, (select auth.uid())));

GRANT SELECT, INSERT, DELETE ON public.team_playbook TO authenticated;
GRANT ALL ON public.team_playbook TO service_role;
REVOKE ALL ON public.team_playbook FROM anon;

-- A Pro library play needs Pro, and a free coach keeps a playbook for one
-- team (Pro: up to 10)
CREATE OR REPLACE FUNCTION public.enforce_team_playbook_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teams_used integer;
  pro boolean := public.user_has_pro(NEW.added_by);
BEGIN
  IF NOT pro AND EXISTS (SELECT 1 FROM public.plays WHERE id = NEW.play_id AND owner_id IS NULL AND NOT is_free) THEN
    RAISE EXCEPTION 'This play is part of Deadeye Pro'
      USING ERRCODE = 'insufficient_privilege', HINT = 'pro_play';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('team_playbook'), hashtext(NEW.added_by::text));
  IF EXISTS (SELECT 1 FROM public.team_playbook WHERE added_by = NEW.added_by AND team_id = NEW.team_id) THEN
    RETURN NEW;
  END IF;
  SELECT count(DISTINCT team_id) INTO teams_used FROM public.team_playbook WHERE added_by = NEW.added_by;
  IF teams_used >= 10 THEN
    RAISE EXCEPTION 'You can keep playbooks for up to 10 teams'
      USING ERRCODE = 'check_violation', HINT = 'playbook_limit';
  END IF;
  IF teams_used >= 1 AND NOT pro THEN
    RAISE EXCEPTION 'A playbook for one team is free. More teams come with Deadeye Pro'
      USING ERRCODE = 'check_violation', HINT = 'playbook_limit';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_playbook_rules ON public.team_playbook;
CREATE TRIGGER team_playbook_rules
  BEFORE INSERT ON public.team_playbook
  FOR EACH ROW EXECUTE FUNCTION public.enforce_team_playbook_rules();

REVOKE EXECUTE ON FUNCTION public.enforce_team_playbook_rules() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 3. ASSIGNING A PLAY (OR, FROM F3, FILM)
-- =============================================================================
-- A play that is deleted leaves the assignment in place without it, so the
-- ticks players made are kept. film_clip_id and film_pack_id get their
-- foreign keys in F3, with the tables they point at.
ALTER TABLE public.team_assignments
  ADD COLUMN IF NOT EXISTS play_id uuid REFERENCES public.plays(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS film_clip_id uuid,
  ADD COLUMN IF NOT EXISTS film_pack_id uuid;

ALTER TABLE public.team_assignments DROP CONSTRAINT IF EXISTS team_assignments_one_item;
ALTER TABLE public.team_assignments ADD CONSTRAINT team_assignments_one_item
  CHECK (num_nonnulls(play_id, film_clip_id, film_pack_id) <= 1);

CREATE INDEX IF NOT EXISTS team_assignments_play_id_idx ON public.team_assignments (play_id) WHERE play_id IS NOT NULL;

-- When the play, clip or pack on an assignment was set. A head coach sees
-- results only from this moment, so changing the item on an old assignment
-- never shows attempts a player made on their own before it was set.
ALTER TABLE public.team_assignments
  ADD COLUMN IF NOT EXISTS item_set_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.stamp_assignment_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.play_id IS DISTINCT FROM OLD.play_id
     OR NEW.film_clip_id IS DISTINCT FROM OLD.film_clip_id
     OR NEW.film_pack_id IS DISTINCT FROM OLD.film_pack_id THEN
    NEW.item_set_at := now();
  ELSE
    NEW.item_set_at := OLD.item_set_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_assignments_item_set_at ON public.team_assignments;
CREATE TRIGGER team_assignments_item_set_at
  BEFORE INSERT OR UPDATE ON public.team_assignments
  FOR EACH ROW EXECUTE FUNCTION public.stamp_assignment_item();

REVOKE EXECUTE ON FUNCTION public.stamp_assignment_item() FROM PUBLIC, anon, authenticated;

-- Same as 00047, and a play can only be set if the coach can read it
DROP POLICY IF EXISTS "Coaches add assignments" ON public.team_assignments;
CREATE POLICY "Coaches add assignments" ON public.team_assignments
  FOR INSERT WITH CHECK (
    public.is_team_staff(team_id, (select auth.uid()))
    AND created_by = (select auth.uid())
    AND (play_id IS NULL OR EXISTS (SELECT 1 FROM public.plays p WHERE p.id = play_id))
  );
DROP POLICY IF EXISTS "Coaches edit assignments" ON public.team_assignments;
CREATE POLICY "Coaches edit assignments" ON public.team_assignments
  FOR UPDATE
  USING (public.is_team_staff(team_id, (select auth.uid())))
  WITH CHECK (
    public.is_team_staff(team_id, (select auth.uid()))
    AND (play_id IS NULL OR EXISTS (SELECT 1 FROM public.plays p WHERE p.id = play_id))
  );

-- A play assignment links to the play, whatever link was sent. Players can
-- always open what was set for them, so a Pro library play can only be set
-- by a coach with Pro.
CREATE OR REPLACE FUNCTION public.enforce_assignment_play()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.play_id IS NULL THEN RETURN NEW; END IF;
  NEW.link := '/plays/' || NEW.play_id::text;
  IF TG_OP = 'UPDATE' AND NEW.play_id IS NOT DISTINCT FROM OLD.play_id THEN RETURN NEW; END IF;
  -- The server (no signed-in user) is trusted
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NOT public.user_has_pro(auth.uid())
     AND EXISTS (SELECT 1 FROM public.plays WHERE id = NEW.play_id AND owner_id IS NULL AND NOT is_free) THEN
    RAISE EXCEPTION 'This play is part of Deadeye Pro'
      USING ERRCODE = 'insufficient_privilege', HINT = 'pro_play';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_assignments_play ON public.team_assignments;
CREATE TRIGGER team_assignments_play
  BEFORE INSERT OR UPDATE ON public.team_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_play();

REVOKE EXECUTE ON FUNCTION public.enforce_assignment_play() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 4. TEAM MEMBERS READ THEIR COACH PLAYS
-- =============================================================================
-- Library plays and a coach own plays are read under 00060. A coach play is
-- read by a team member only when it is in their team playbook or set for
-- their team.
DROP POLICY IF EXISTS "Team members read their coach plays" ON public.plays;
CREATE POLICY "Team members read their coach plays" ON public.plays
  FOR SELECT TO authenticated USING (
    owner_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.team_playbook tp
        WHERE tp.play_id = plays.id AND public.is_team_member(tp.team_id, (select auth.uid()))
      )
      OR EXISTS (
        SELECT 1 FROM public.team_assignments ta
        WHERE ta.play_id = plays.id AND public.is_team_member(ta.team_id, (select auth.uid()))
      )
    )
  );

-- =============================================================================
-- 5. ROLE QUIZ ATTEMPTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.play_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  play_id uuid NOT NULL REFERENCES public.plays(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 10),
  -- [{ key, pick, right }] per question; see src/lib/plays/quiz.ts
  answers jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) <= 10 AND octet_length(answers::text) <= 2000
  ),
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS play_quiz_attempts_user_play_idx ON public.play_quiz_attempts (user_id, play_id, completed_at);
CREATE INDEX IF NOT EXISTS play_quiz_attempts_play_idx ON public.play_quiz_attempts (play_id, completed_at);

ALTER TABLE public.play_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- A player keeps their own attempts, for plays they can read
DROP POLICY IF EXISTS "Players keep own quiz attempts" ON public.play_quiz_attempts;
CREATE POLICY "Players keep own quiz attempts" ON public.play_quiz_attempts
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.plays p WHERE p.id = play_id)
  );

-- Whether the signed-in user may see this attempt as a head coach: the play is
-- set for a team they are head coach of, the player is a player on that team,
-- the attempt came after the play was set on it (item_set_at), and it is no
-- more than 90 days past the due date (or the day it was set, with no due
-- date).
CREATE OR REPLACE FUNCTION public.coach_sees_play_attempt(p_play uuid, p_player uuid, p_completed_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_assignments a
    JOIN public.team_members m ON m.team_id = a.team_id AND m.user_id = p_player AND m.role = 'player'
    WHERE a.play_id = p_play
      AND public.is_team_coach(a.team_id, auth.uid())
      AND p_completed_at >= a.item_set_at
      AND current_date <= COALESCE(a.due_date, a.created_at::date) + 90
  );
$$;

DROP POLICY IF EXISTS "Head coaches read attempts on plays they set" ON public.play_quiz_attempts;
CREATE POLICY "Head coaches read attempts on plays they set" ON public.play_quiz_attempts
  FOR SELECT TO authenticated USING (public.coach_sees_play_attempt(play_id, user_id, completed_at));

-- Not the answers column, for anyone signed in: a coach sees done and score,
-- and the player sees their result on screen when they finish. The data
-- download (server) includes everything.
REVOKE ALL ON public.play_quiz_attempts FROM anon, authenticated;
GRANT SELECT (id, user_id, play_id, score, completed_at) ON public.play_quiz_attempts TO authenticated;
GRANT INSERT (user_id, play_id, score, answers) ON public.play_quiz_attempts TO authenticated;
GRANT DELETE ON public.play_quiz_attempts TO authenticated;
GRANT ALL ON public.play_quiz_attempts TO service_role;

-- How a team answered each question of a play set for it, as totals: each
-- player first attempt since it was set, counted by question and pick. Head
-- coaches only, inside the same 90 days. Never who picked what: nothing comes
-- back until at least 3 players have answered, so a total of 1 or 2 cannot
-- give away one player pick.
CREATE OR REPLACE FUNCTION public.play_assignment_split(p_assignment uuid)
RETURNS TABLE (question_key text, pick text, players integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH a AS (
    SELECT ta.team_id, ta.play_id, ta.item_set_at AS created_at
    FROM public.team_assignments ta
    WHERE ta.id = p_assignment
      AND ta.play_id IS NOT NULL
      AND public.is_team_coach(ta.team_id, auth.uid())
      AND current_date <= COALESCE(ta.due_date, ta.created_at::date) + 90
  ),
  firsts AS (
    SELECT DISTINCT ON (q.user_id) q.user_id, q.answers
    FROM public.play_quiz_attempts q
    JOIN a ON q.play_id = a.play_id AND q.completed_at >= a.created_at
    JOIN public.team_members m ON m.team_id = a.team_id AND m.user_id = q.user_id AND m.role = 'player'
    ORDER BY q.user_id, q.completed_at ASC
  )
  SELECT e ->> 'key', e ->> 'pick', count(*)::int
  FROM firsts f, jsonb_array_elements(f.answers) e
  WHERE (SELECT count(*) FROM firsts) >= 3
  GROUP BY 1, 2;
$$;

-- Policies call coach_sees_play_attempt as the signed-in user; it answers only
-- about what that user may see
REVOKE EXECUTE ON FUNCTION public.coach_sees_play_attempt(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_sees_play_attempt(uuid, uuid, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.play_assignment_split(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.play_assignment_split(uuid) TO authenticated;

-- Check after running: docs/check-migrations.sql lists the two tables, the
-- three team_assignments columns and the five functions above.
