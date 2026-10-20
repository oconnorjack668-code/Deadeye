-- 00040_fix_library_tags.sql
--
-- Fixes tags in the exercise and drill libraries that sent things to the wrong
-- place. The original seeds use ON CONFLICT DO NOTHING, so correcting them there
-- would never reach a database that already has the rows. Safe to re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free.

-- Rear delt and upper back work is pulling, not pushing. Tagged as shoulders
-- and push, the workout builder used them to fill the chest and shoulders slot
-- and the library listed them under push.
UPDATE public.exercise_library
SET category = 'upper_body_pull', primary_muscle = 'back'
WHERE is_system AND name IN ('Reverse Dumbbell Fly', 'Prone Y-T-W Raises');

-- A push-up on the fingertips is a push, though it is there for grip and hands.
UPDATE public.exercise_library
SET category = 'upper_body_push'
WHERE is_system AND name = 'Fingertip Push-Ups';

-- The Mikan drill is a finishing drill around the rim, not shooting. As a
-- shooting drill it filled shooting slots in the workout builder.
UPDATE public.drills
SET skill = 'finishing'
WHERE slug = 'mikan-drill';

-- Ends in layups at both baskets. Without a hoop listed, the builder offered it
-- to players training somewhere with no hoop.
UPDATE public.drills
SET equipment = array_append(equipment, 'hoop')
WHERE slug = 'full-court-layup-challenge' AND NOT ('hoop' = ANY(equipment));
