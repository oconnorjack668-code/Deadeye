-- 00062_film.sql
--
-- Film, phase F3 of docs/plans/film-and-plays.md: short clips from official
-- YouTube channels that stop at the key moment and ask the right read, packs
-- of clips, saves, private notes, attempts, and setting film for a team.
--
--   1. film_clips: the library. Written only by the server (the owner tool in
--      admin/demo-videos), read by anyone signed in once published. A clip is
--      a YouTube video id with a start and end, never a downloaded file.
--   2. film_packs and film_pack_clips: library packs (no owner, server
--      written) and packs a coach builds from clips (owner only). A team
--      member reads a coach pack once it is set for their team.
--   3. film_saves and film_notes: the player saves a clip, and keeps a private
--      note on it (500 characters). Only they read either.
--   4. film_attempts: the player answers the questions on a clip. Head coaches
--      only (is_team_coach, never assistants, who can be under 18) read the
--      attempts of players on their team, for clips set for that team
--      (directly or in a pack), made since it was set, until 90 days after
--      the due date. They read done and score, never the answers: the answers
--      column is not granted to anyone signed in, and the team split per
--      question comes from film_assignment_split as totals only.
--   5. team_assignments: film_clip_id and film_pack_id (added in 00061) get
--      their foreign keys; a film assignment always links to the clip or
--      pack, and Pro film can only be set by a coach with Pro, because a
--      player can always open what their coach set.
--   6. Two library packs, empty and unpublished, for the owner to fill.
--
-- Everything goes with the account: every user column cascades from
-- auth.users. The theme and level lists match src/lib/film/catalog.ts (a test
-- reads this file to check).
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments or messages of this file, for
-- the reason given at the top of 00035. Keep it apostrophe-free.

-- =============================================================================
-- 1. FILM CLIPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.film_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id text NOT NULL CHECK (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  start_s integer NOT NULL DEFAULT 0 CHECK (start_s >= 0),
  -- a clip, not a whole game: ten minutes at most
  end_s integer NOT NULL CHECK (end_s > start_s AND end_s - start_s <= 600),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  -- attribution: the channel the video comes from
  channel_name text NOT NULL CHECK (char_length(channel_name) BETWEEN 1 AND 100),
  theme text NOT NULL CHECK (theme IN (
    'spacing', 'help_defence', 'closeouts', 'pick_and_roll', 'transition', 'out_of_bounds', 'press', 'shot_selection'
  )),
  level text NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  -- [{ key, question, options, correct_index, explanation, moment_s }], the
  -- study_items quiz shape plus a key and the moment the clip stops; checked
  -- in full by parseFilmQuestions (src/lib/film/questions.ts)
  questions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(questions) = 'array' AND jsonb_array_length(questions) <= 10 AND octet_length(questions::text) <= 20000
  ),
  is_free boolean NOT NULL DEFAULT true, -- film is never part of Pro (YouTube Developer Policies III.F.3.a)
  -- null while the owner is still working on it; players never see a draft
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS film_clips_published_idx ON public.film_clips (theme, published_at) WHERE published_at IS NOT NULL;

ALTER TABLE public.film_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed in players read published clips" ON public.film_clips;
CREATE POLICY "Signed in players read published clips" ON public.film_clips
  FOR SELECT TO authenticated USING (published_at IS NOT NULL AND published_at <= now());

-- This project does not auto-grant new tables to the API roles (see 00008).
GRANT SELECT ON public.film_clips TO authenticated;
GRANT ALL ON public.film_clips TO service_role;
REVOKE ALL ON public.film_clips FROM anon;

-- =============================================================================
-- 2. FILM PACKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.film_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- null for a library pack; a coach pack goes with the coach account
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 400),
  is_free boolean NOT NULL DEFAULT true, -- film is never part of Pro (YouTube Developer Policies III.F.3.a)
  -- library packs only: null until the owner publishes it
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT film_packs_library_slug_check CHECK (owner_id IS NOT NULL OR slug IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS film_packs_library_slug_key ON public.film_packs (slug) WHERE owner_id IS NULL;
CREATE INDEX IF NOT EXISTS film_packs_owner_id_idx ON public.film_packs (owner_id) WHERE owner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.film_pack_clips (
  pack_id uuid NOT NULL REFERENCES public.film_packs(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.film_clips(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pack_id, clip_id)
);

-- The attempt rule and the clip page look packs up by clip
CREATE INDEX IF NOT EXISTS film_pack_clips_clip_id_idx ON public.film_pack_clips (clip_id);

-- team_assignments.film_pack_id gets its key in section 5; the pack read
-- rule below needs the column, which 00061 added
ALTER TABLE public.film_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_pack_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed in players read published library packs" ON public.film_packs;
CREATE POLICY "Signed in players read published library packs" ON public.film_packs
  FOR SELECT TO authenticated USING (owner_id IS NULL AND published_at IS NOT NULL AND published_at <= now());

DROP POLICY IF EXISTS "Owners read own packs" ON public.film_packs;
CREATE POLICY "Owners read own packs" ON public.film_packs
  FOR SELECT TO authenticated USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Team members read packs set for their team" ON public.film_packs;
CREATE POLICY "Team members read packs set for their team" ON public.film_packs
  FOR SELECT TO authenticated USING (
    owner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.team_assignments ta
      WHERE ta.film_pack_id = film_packs.id AND public.is_team_member(ta.team_id, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Coaches add own packs" ON public.film_packs;
CREATE POLICY "Coaches add own packs" ON public.film_packs
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Coaches change own packs" ON public.film_packs;
CREATE POLICY "Coaches change own packs" ON public.film_packs
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Coaches delete own packs" ON public.film_packs;
CREATE POLICY "Coaches delete own packs" ON public.film_packs
  FOR DELETE TO authenticated USING ((select auth.uid()) = owner_id);

-- Only these columns: a coach cannot mark a pack free, publish it into the
-- library, give it a slug, or hand it to someone else
GRANT SELECT ON public.film_packs TO authenticated;
GRANT INSERT (owner_id, title, description) ON public.film_packs TO authenticated;
GRANT UPDATE (title, description, updated_at) ON public.film_packs TO authenticated;
GRANT DELETE ON public.film_packs TO authenticated;
GRANT ALL ON public.film_packs TO service_role;
REVOKE ALL ON public.film_packs FROM anon;

-- The clips in a pack are read whenever the pack is (the EXISTS runs under
-- the pack rules above)
DROP POLICY IF EXISTS "Read the clips of packs you can read" ON public.film_pack_clips;
CREATE POLICY "Read the clips of packs you can read" ON public.film_pack_clips
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.film_packs p WHERE p.id = pack_id));

-- A coach puts published clips in their own packs
DROP POLICY IF EXISTS "Coaches add clips to own packs" ON public.film_pack_clips;
CREATE POLICY "Coaches add clips to own packs" ON public.film_pack_clips
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.film_packs p WHERE p.id = pack_id AND p.owner_id = (select auth.uid()))
    AND EXISTS (SELECT 1 FROM public.film_clips c WHERE c.id = clip_id)
  );

DROP POLICY IF EXISTS "Coaches order clips in own packs" ON public.film_pack_clips;
CREATE POLICY "Coaches order clips in own packs" ON public.film_pack_clips
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.film_packs p WHERE p.id = pack_id AND p.owner_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.film_packs p WHERE p.id = pack_id AND p.owner_id = (select auth.uid())));

DROP POLICY IF EXISTS "Coaches remove clips from own packs" ON public.film_pack_clips;
CREATE POLICY "Coaches remove clips from own packs" ON public.film_pack_clips
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.film_packs p WHERE p.id = pack_id AND p.owner_id = (select auth.uid()))
  );

GRANT SELECT, INSERT, DELETE ON public.film_pack_clips TO authenticated;
GRANT UPDATE (position) ON public.film_pack_clips TO authenticated;
GRANT ALL ON public.film_pack_clips TO service_role;
REVOKE ALL ON public.film_pack_clips FROM anon;

-- Only coaches build packs, 30 each at most. The lock stops two saves at once
-- both slipping under the limit.
CREATE OR REPLACE FUNCTION public.enforce_coach_pack_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  made integer;
BEGIN
  -- Library packs come from the server, with no owner
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  IF NOT public.is_coach_account(NEW.owner_id) THEN
    RAISE EXCEPTION 'Only coaches can build packs. Finish coach setup first'
      USING ERRCODE = 'insufficient_privilege', HINT = 'not_coach';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('film_packs'), hashtext(NEW.owner_id::text));
  SELECT count(*) INTO made FROM public.film_packs WHERE owner_id = NEW.owner_id;
  IF made >= 30 THEN
    RAISE EXCEPTION 'You can keep up to 30 packs. Delete one first'
      USING ERRCODE = 'check_violation', HINT = 'pack_limit';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS film_packs_coach_rules ON public.film_packs;
CREATE TRIGGER film_packs_coach_rules
  BEFORE INSERT ON public.film_packs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_pack_rules();

REVOKE EXECUTE ON FUNCTION public.enforce_coach_pack_rules() FROM PUBLIC, anon, authenticated;

-- A coach pack holds up to 20 clips, and a Pro clip needs a coach with Pro:
-- players can always open a pack set for them, so a free coach cannot use a
-- pack to hand out Pro clips.
CREATE OR REPLACE FUNCTION public.enforce_film_pack_clip_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pack_owner uuid;
  held integer;
BEGIN
  SELECT owner_id INTO pack_owner FROM public.film_packs WHERE id = NEW.pack_id;
  IF pack_owner IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('film_pack_clips'), hashtext(NEW.pack_id::text));
  SELECT count(*) INTO held FROM public.film_pack_clips WHERE pack_id = NEW.pack_id;
  IF held >= 20 THEN
    RAISE EXCEPTION 'A pack holds up to 20 clips'
      USING ERRCODE = 'check_violation', HINT = 'pack_full';
  END IF;
  IF NOT public.user_has_pro(pack_owner)
     AND EXISTS (SELECT 1 FROM public.film_clips WHERE id = NEW.clip_id AND NOT is_free) THEN
    RAISE EXCEPTION 'This clip is part of Deadeye Pro'
      USING ERRCODE = 'insufficient_privilege', HINT = 'pro_clip';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS film_pack_clips_rules ON public.film_pack_clips;
CREATE TRIGGER film_pack_clips_rules
  BEFORE INSERT ON public.film_pack_clips
  FOR EACH ROW EXECUTE FUNCTION public.enforce_film_pack_clip_rules();

REVOKE EXECUTE ON FUNCTION public.enforce_film_pack_clip_rules() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 3. SAVED CLIPS AND PRIVATE NOTES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.film_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.film_clips(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, clip_id)
);

CREATE INDEX IF NOT EXISTS film_saves_clip_id_idx ON public.film_saves (clip_id);

ALTER TABLE public.film_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own saved clips" ON public.film_saves;
CREATE POLICY "Users read own saved clips" ON public.film_saves
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users save clips they can see" ON public.film_saves;
CREATE POLICY "Users save clips they can see" ON public.film_saves
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.film_clips c WHERE c.id = clip_id)
  );

DROP POLICY IF EXISTS "Users remove own saved clips" ON public.film_saves;
CREATE POLICY "Users remove own saved clips" ON public.film_saves
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON public.film_saves TO authenticated;
GRANT ALL ON public.film_saves TO service_role;
REVOKE ALL ON public.film_saves FROM anon;

CREATE TABLE IF NOT EXISTS public.film_notes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.film_clips(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, clip_id)
);

CREATE INDEX IF NOT EXISTS film_notes_clip_id_idx ON public.film_notes (clip_id);

ALTER TABLE public.film_notes ENABLE ROW LEVEL SECURITY;

-- Private: only the player who wrote it, never a coach or teammate
DROP POLICY IF EXISTS "Users read own notes" ON public.film_notes;
CREATE POLICY "Users read own notes" ON public.film_notes
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users write notes on clips they can see" ON public.film_notes;
CREATE POLICY "Users write notes on clips they can see" ON public.film_notes
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.film_clips c WHERE c.id = clip_id)
  );

DROP POLICY IF EXISTS "Users change own notes" ON public.film_notes;
CREATE POLICY "Users change own notes" ON public.film_notes
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own notes" ON public.film_notes;
CREATE POLICY "Users delete own notes" ON public.film_notes
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON public.film_notes TO authenticated;
GRANT UPDATE (body, updated_at) ON public.film_notes TO authenticated;
GRANT ALL ON public.film_notes TO service_role;
REVOKE ALL ON public.film_notes FROM anon;

-- =============================================================================
-- 4. ATTEMPTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.film_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id uuid NOT NULL REFERENCES public.film_clips(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  -- how many questions the clip had, so a later edit does not change the result
  total integer NOT NULL CHECK (total BETWEEN 1 AND 10 AND score <= total),
  -- [{ key, pick, right }] per question; see src/lib/film/questions.ts
  answers jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(answers) = 'array' AND jsonb_array_length(answers) <= 10 AND octet_length(answers::text) <= 2000
  ),
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS film_attempts_user_clip_idx ON public.film_attempts (user_id, clip_id, completed_at);
CREATE INDEX IF NOT EXISTS film_attempts_clip_idx ON public.film_attempts (clip_id, completed_at);

ALTER TABLE public.film_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players read own film attempts" ON public.film_attempts;
CREATE POLICY "Players read own film attempts" ON public.film_attempts
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Players add film attempts on clips they can see" ON public.film_attempts;
CREATE POLICY "Players add film attempts on clips they can see" ON public.film_attempts
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.film_clips c WHERE c.id = clip_id)
  );

DROP POLICY IF EXISTS "Players delete own film attempts" ON public.film_attempts;
CREATE POLICY "Players delete own film attempts" ON public.film_attempts
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Whether the signed-in user may see this attempt as a head coach: the clip
-- is set for a team they are head coach of, on its own or in a pack, the
-- player is a player on that team, the attempt came after the clip was set
-- (item_set_at from 00061, or later if the clip went into the pack after the
-- pack was set), and it is no more than 90 days past the due date (or the day
-- it was set, with no due date).
CREATE OR REPLACE FUNCTION public.coach_sees_film_attempt(p_clip uuid, p_player uuid, p_completed_at timestamptz)
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
    WHERE (
        (a.film_clip_id = p_clip AND p_completed_at >= a.item_set_at)
        OR EXISTS (
          SELECT 1 FROM public.film_pack_clips pc
          WHERE pc.pack_id = a.film_pack_id AND pc.clip_id = p_clip
            AND p_completed_at >= greatest(a.item_set_at, pc.created_at)
        )
      )
      AND public.is_team_coach(a.team_id, auth.uid())
      AND current_date <= COALESCE(a.due_date, a.created_at::date) + 90
  );
$$;

DROP POLICY IF EXISTS "Head coaches read attempts on film they set" ON public.film_attempts;
CREATE POLICY "Head coaches read attempts on film they set" ON public.film_attempts
  FOR SELECT TO authenticated USING (public.coach_sees_film_attempt(clip_id, user_id, completed_at));

-- Not the answers column, for anyone signed in: a coach sees done and score,
-- and the player sees each answer on screen as they go. The data download
-- (server) includes everything.
REVOKE ALL ON public.film_attempts FROM anon, authenticated;
GRANT SELECT (id, user_id, clip_id, score, total, completed_at) ON public.film_attempts TO authenticated;
GRANT INSERT (user_id, clip_id, score, total, answers) ON public.film_attempts TO authenticated;
GRANT DELETE ON public.film_attempts TO authenticated;
GRANT ALL ON public.film_attempts TO service_role;

-- How a team answered each question of film set for it, as totals: each
-- player first attempt on each clip since it was set, counted by clip,
-- question and pick. Head coaches only, inside the same 90 days. Never who
-- picked what: a clip shows nothing until at least 3 players have answered
-- it, so a total of 1 or 2 cannot give away one player pick.
CREATE OR REPLACE FUNCTION public.film_assignment_split(p_assignment uuid)
RETURNS TABLE (clip_id uuid, question_key text, pick text, players integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH a AS (
    SELECT ta.team_id, ta.film_clip_id, ta.film_pack_id, ta.item_set_at
    FROM public.team_assignments ta
    WHERE ta.id = p_assignment
      AND (ta.film_clip_id IS NOT NULL OR ta.film_pack_id IS NOT NULL)
      AND public.is_team_coach(ta.team_id, auth.uid())
      AND current_date <= COALESCE(ta.due_date, ta.created_at::date) + 90
  ),
  -- each clip with the moment it was set for the team
  clips AS (
    SELECT a.film_clip_id AS clip, a.item_set_at AS set_at FROM a WHERE a.film_clip_id IS NOT NULL
    UNION
    SELECT pc.clip_id, greatest(a.item_set_at, pc.created_at) FROM a JOIN public.film_pack_clips pc ON pc.pack_id = a.film_pack_id
  ),
  firsts AS (
    SELECT DISTINCT ON (f.user_id, f.clip_id) f.user_id, f.clip_id, f.answers
    FROM public.film_attempts f
    JOIN clips ON clips.clip = f.clip_id AND f.completed_at >= clips.set_at
    JOIN a ON true
    JOIN public.team_members m ON m.team_id = a.team_id AND m.user_id = f.user_id AND m.role = 'player'
    ORDER BY f.user_id, f.clip_id, f.completed_at ASC
  ),
  enough AS (
    SELECT fi.clip_id FROM firsts fi GROUP BY fi.clip_id HAVING count(*) >= 3
  )
  SELECT fi.clip_id, e ->> 'key', e ->> 'pick', count(*)::int
  FROM firsts fi
  JOIN enough USING (clip_id),
  jsonb_array_elements(fi.answers) e
  GROUP BY 1, 2, 3;
$$;

-- Policies call coach_sees_film_attempt as the signed-in user; it answers only
-- about what that user may see
REVOKE EXECUTE ON FUNCTION public.coach_sees_film_attempt(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_sees_film_attempt(uuid, uuid, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.film_assignment_split(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.film_assignment_split(uuid) TO authenticated;

-- =============================================================================
-- 5. SETTING FILM FOR A TEAM
-- =============================================================================
-- A clip or pack that is removed leaves the assignment in place without it,
-- so the ticks players made are kept.
ALTER TABLE public.team_assignments DROP CONSTRAINT IF EXISTS team_assignments_film_clip_id_fkey;
ALTER TABLE public.team_assignments ADD CONSTRAINT team_assignments_film_clip_id_fkey
  FOREIGN KEY (film_clip_id) REFERENCES public.film_clips(id) ON DELETE SET NULL;
ALTER TABLE public.team_assignments DROP CONSTRAINT IF EXISTS team_assignments_film_pack_id_fkey;
ALTER TABLE public.team_assignments ADD CONSTRAINT team_assignments_film_pack_id_fkey
  FOREIGN KEY (film_pack_id) REFERENCES public.film_packs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS team_assignments_film_clip_id_idx ON public.team_assignments (film_clip_id) WHERE film_clip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS team_assignments_film_pack_id_idx ON public.team_assignments (film_pack_id) WHERE film_pack_id IS NOT NULL;

-- Same as 00061, and a clip or pack can only be set if the coach can read it
DROP POLICY IF EXISTS "Coaches add assignments" ON public.team_assignments;
CREATE POLICY "Coaches add assignments" ON public.team_assignments
  FOR INSERT WITH CHECK (
    public.is_team_staff(team_id, (select auth.uid()))
    AND created_by = (select auth.uid())
    AND (play_id IS NULL OR EXISTS (SELECT 1 FROM public.plays p WHERE p.id = play_id))
    AND (film_clip_id IS NULL OR EXISTS (SELECT 1 FROM public.film_clips c WHERE c.id = film_clip_id))
    AND (film_pack_id IS NULL OR EXISTS (SELECT 1 FROM public.film_packs fp WHERE fp.id = film_pack_id))
  );
DROP POLICY IF EXISTS "Coaches edit assignments" ON public.team_assignments;
CREATE POLICY "Coaches edit assignments" ON public.team_assignments
  FOR UPDATE
  USING (public.is_team_staff(team_id, (select auth.uid())))
  WITH CHECK (
    public.is_team_staff(team_id, (select auth.uid()))
    AND (play_id IS NULL OR EXISTS (SELECT 1 FROM public.plays p WHERE p.id = play_id))
    AND (film_clip_id IS NULL OR EXISTS (SELECT 1 FROM public.film_clips c WHERE c.id = film_clip_id))
    AND (film_pack_id IS NULL OR EXISTS (SELECT 1 FROM public.film_packs fp WHERE fp.id = film_pack_id))
  );

-- A film assignment links to the clip or pack, whatever link was sent.
-- Players can always open what was set for them, so Pro film (a Pro clip, a
-- Pro library pack, or a coach pack holding a Pro clip) can only be set by a
-- coach with Pro.
CREATE OR REPLACE FUNCTION public.enforce_assignment_film()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.film_clip_id IS NOT NULL THEN
    NEW.link := '/film/' || NEW.film_clip_id::text;
  ELSIF NEW.film_pack_id IS NOT NULL THEN
    NEW.link := '/film/packs/' || NEW.film_pack_id::text;
  ELSE
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.film_clip_id IS NOT DISTINCT FROM OLD.film_clip_id
     AND NEW.film_pack_id IS NOT DISTINCT FROM OLD.film_pack_id THEN
    RETURN NEW;
  END IF;
  -- The server (no signed-in user) is trusted
  IF auth.uid() IS NULL OR public.user_has_pro(auth.uid()) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.film_clips WHERE id = NEW.film_clip_id AND NOT is_free)
     OR EXISTS (SELECT 1 FROM public.film_packs WHERE id = NEW.film_pack_id AND owner_id IS NULL AND NOT is_free)
     OR EXISTS (
       SELECT 1 FROM public.film_pack_clips pc JOIN public.film_clips c ON c.id = pc.clip_id
       WHERE pc.pack_id = NEW.film_pack_id AND NOT c.is_free
     ) THEN
    RAISE EXCEPTION 'This film is part of Deadeye Pro'
      USING ERRCODE = 'insufficient_privilege', HINT = 'pro_film';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_assignments_film ON public.team_assignments;
CREATE TRIGGER team_assignments_film
  BEFORE INSERT OR UPDATE ON public.team_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_film();

REVOKE EXECUTE ON FUNCTION public.enforce_assignment_film() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 6. LIBRARY PACKS
-- =============================================================================
-- Empty and unpublished: the owner adds real clips in Owner tools, then
-- publishes each pack. No clip is seeded, because a made-up video id would be
-- a broken video (docs/plans/film-clips-to-pick.md lists what to look for).
INSERT INTO public.film_packs (slug, title, description, is_free) VALUES
  ('start-here-spacing-and-help', 'Start here: spacing and help defence', 'Where to stand when you do not have the ball, and when to help a teammate.', true),
  ('reading-the-pick-and-roll', 'Reading the pick-and-roll', 'The ball screen from both sides: what the handler, the screener and the defence see.', true)
ON CONFLICT (slug) WHERE owner_id IS NULL DO NOTHING;

-- Check after running: docs/check-migrations.sql lists the five tables, the
-- five functions and the indexes above.
