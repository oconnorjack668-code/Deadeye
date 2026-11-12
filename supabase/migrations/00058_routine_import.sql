-- 00058_routine_import.sql
-- Importing routines from other gym apps (pasted text, a screenshot or a CSV
-- export). Adds:
--   1. reps targets and notes on routine exercises, so an imported "3 x 8-10"
--      keeps its reps
--   2. user_programs: several routines kept together as one program (Day 1,
--      Day 2 ...), with routines ordered inside it
--   3. routine_imports: one row per AI read of a pasted routine or screenshot,
--      to count the free monthly allowance. Only the server writes it, so a
--      player cannot reset their own count. It holds no routine content.
--   4. tighter write rules: a routine can only go in the player's own program,
--      and a routine exercise only in the player's own routine
-- Safe to re-run.

-- =============================================================================
-- 1. REPS TARGET AND NOTES ON ROUTINE EXERCISES
-- =============================================================================
ALTER TABLE public.routine_exercises ADD COLUMN IF NOT EXISTS target_reps text;
ALTER TABLE public.routine_exercises ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.routine_exercises DROP CONSTRAINT IF EXISTS routine_exercises_target_reps_check;
ALTER TABLE public.routine_exercises ADD CONSTRAINT routine_exercises_target_reps_check
  CHECK (target_reps IS NULL OR char_length(target_reps) BETWEEN 1 AND 20);
ALTER TABLE public.routine_exercises DROP CONSTRAINT IF EXISTS routine_exercises_notes_check;
ALTER TABLE public.routine_exercises ADD CONSTRAINT routine_exercises_notes_check
  CHECK (notes IS NULL OR char_length(notes) <= 200);

-- =============================================================================
-- 2. PROGRAMS (several routines kept together)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  -- Where it came from: 'text', 'image' or 'csv'. Shown nowhere yet; kept so a
  -- bad import can be found and so the export says how a program got here.
  source text CHECK (source IS NULL OR source IN ('text', 'image', 'csv')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_programs_user ON public.user_programs(user_id, created_at DESC);

-- Deleting a program deletes its routines; deleting a routine leaves the program
ALTER TABLE public.workout_routines ADD COLUMN IF NOT EXISTS program_id uuid
  REFERENCES public.user_programs(id) ON DELETE CASCADE;
ALTER TABLE public.workout_routines ADD COLUMN IF NOT EXISTS day_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_workout_routines_program ON public.workout_routines(program_id, day_order);

-- =============================================================================
-- 3. IMPORT ALLOWANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.routine_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('text', 'image')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routine_imports_user ON public.routine_imports(user_id, created_at DESC);

-- =============================================================================
-- 4. ROW LEVEL SECURITY + API ACCESS
-- =============================================================================
ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own programs" ON public.user_programs;
CREATE POLICY "Users manage own programs" ON public.user_programs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- A routine may only be put in the player's own program
DROP POLICY IF EXISTS "Users manage own routines" ON public.workout_routines;
CREATE POLICY "Users manage own routines" ON public.workout_routines
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      program_id IS NULL
      OR EXISTS (SELECT 1 FROM public.user_programs p WHERE p.id = program_id AND p.user_id = auth.uid())
    )
  );

-- An exercise may only be added to the player's own routine. 00011 checked
-- only user_id, so a row could name another player's routine_id (it could not
-- be read across accounts, but it should not be writable either).
DROP POLICY IF EXISTS "Users manage own routine exercises" ON public.routine_exercises;
CREATE POLICY "Users manage own routine exercises" ON public.routine_exercises
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.workout_routines r WHERE r.id = routine_id AND r.user_id = auth.uid())
  );

-- Players can see their own count; only the server (service role) adds to it
DROP POLICY IF EXISTS "Users read own routine imports" ON public.routine_imports;
CREATE POLICY "Users read own routine imports" ON public.routine_imports
  FOR SELECT USING (auth.uid() = user_id);

-- This project does not auto-grant new tables to the API roles (see 00008)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_programs TO authenticated;
GRANT SELECT ON public.routine_imports TO authenticated;
GRANT ALL ON public.user_programs, public.routine_imports TO service_role;
REVOKE ALL ON public.user_programs, public.routine_imports FROM anon;
