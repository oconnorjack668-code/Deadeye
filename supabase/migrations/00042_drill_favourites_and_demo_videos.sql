-- 00042_drill_favourites_and_demo_videos.sql
--
-- 1. Favourite drills, the way exercises already have favourites (00011).
-- 2. A demo video for any drill or exercise, chosen by the owner in Owner
--    tools and played inside the app. Until one is chosen, the YouTube search
--    link stays.
--
-- Only the 11 character YouTube video id is stored, never a link, so nothing
-- but a YouTube video can ever be embedded from here. The player loads from
-- youtube-nocookie.com, which sets no cookies until the video is played.
--
-- Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.

CREATE TABLE IF NOT EXISTS public.drill_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id uuid NOT NULL REFERENCES public.drills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, drill_id)
);

ALTER TABLE public.drill_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorite drills" ON public.drill_favorites;
-- (select auth.uid()) is worked out once per query rather than once per row
CREATE POLICY "Users manage own favorite drills" ON public.drill_favorites
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- The primary key leads with user_id, so deleting a drill would otherwise scan
-- every favourite to find its rows
CREATE INDEX IF NOT EXISTS drill_favorites_drill_id_idx ON public.drill_favorites (drill_id);

-- This project does not auto-grant new tables to the API roles (see 00008)
GRANT SELECT, INSERT, DELETE ON public.drill_favorites TO authenticated;
GRANT ALL ON public.drill_favorites TO service_role;
REVOKE ALL ON public.drill_favorites FROM anon;

-- Demo videos. Written only by the owner, through the service role.
ALTER TABLE public.drills ADD COLUMN IF NOT EXISTS demo_video_id text;
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS demo_video_id text;

ALTER TABLE public.drills DROP CONSTRAINT IF EXISTS drills_demo_video_id_check;
ALTER TABLE public.drills ADD CONSTRAINT drills_demo_video_id_check
  CHECK (demo_video_id IS NULL OR demo_video_id ~ '^[A-Za-z0-9_-]{11}$');

ALTER TABLE public.exercise_library DROP CONSTRAINT IF EXISTS exercise_library_demo_video_id_check;
ALTER TABLE public.exercise_library ADD CONSTRAINT exercise_library_demo_video_id_check
  CHECK (demo_video_id IS NULL OR demo_video_id ~ '^[A-Za-z0-9_-]{11}$');
