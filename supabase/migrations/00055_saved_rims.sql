-- 00055_saved_rims.sql
--
-- Hoops a player has measured with the shot tracker, kept with their account
-- as well as on the phone. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.
--
--   1. Until now a measured rim lived only in the browser that measured it
--      (src/lib/video/rimMemory.ts). Clearing site data, a new phone, or the
--      app installed to the home screen (which has its own storage) lost it.
--   2. A rim only fits the camera position it was measured from, so a hoop
--      that came from the account rather than this device is never used
--      straight away: the tracker shows it in the magnified view to check
--      first (src/lib/video/rimSync.ts).
--   3. Owner-only. The name is what the player typed, such as Home driveway,
--      at most 40 characters; the rim is four numbers. Both go in the data
--      download and are deleted with the account (ON DELETE CASCADE).
--   4. One hoop per name per player, matching the phone, where saving under
--      a name already used replaces it.

CREATE TABLE IF NOT EXISTS public.saved_rims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  rim jsonb NOT NULL CHECK (jsonb_typeof(rim) = 'object'),
  used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_rims_user_name_idx ON public.saved_rims (user_id, lower(name));

ALTER TABLE public.saved_rims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved rims" ON public.saved_rims;
CREATE POLICY "Users manage own saved rims" ON public.saved_rims
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_rims TO authenticated;
GRANT ALL ON public.saved_rims TO service_role;
REVOKE ALL ON public.saved_rims FROM anon;
