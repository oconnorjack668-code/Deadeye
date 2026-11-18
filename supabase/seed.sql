-- supabase/seed.sql
-- Default system seed data: Exercise Library, Basketball IQ Study Topics & Quizzes, Leaderboard Season
-- Safe to re-run: every insert skips rows that already exist.
-- Note: youtube_video_id values are placeholders; the app links each lesson to a YouTube search by title.

-- =============================================================================
-- 1. SYSTEM EXERCISE LIBRARY
-- =============================================================================
INSERT INTO public.exercise_library (name, category, muscle_groups, equipment, description, is_system)
SELECT v.name, v.category, v.muscle_groups, v.equipment, v.description, v.is_system
FROM (VALUES
-- Legs / Lower Body
('Trap Bar Deadlift', 'legs', ARRAY['hamstrings', 'glutes', 'quads', 'lower_back'], ARRAY['trap_bar', 'weight_plates'], 'Foundational posterior chain builder for explosive vertical power.', true),
('Barbell Back Squat', 'legs', ARRAY['quads', 'glutes', 'adductors'], ARRAY['barbell', 'squat_rack'], 'Deep squat to develop knee extension strength for cutting and jumping.', true),
('Bulgarian Split Squat', 'legs', ARRAY['quads', 'glutes', 'hip_flexors'], ARRAY['dumbbells', 'bench'], 'Single-leg strength and deceleration control for single-leg takeoffs.', true),
('Dumbbell Romanian Deadlift', 'legs', ARRAY['hamstrings', 'glutes'], ARRAY['dumbbells'], 'Eccentric hamstring loading to protect against knee/ACL injury.', true),
('Tibialis Raises', 'legs', ARRAY['tibialis_anterior'], ARRAY['wall', 'slant_board'], 'Anterior lower leg strengthening for landing deceleration and shin splint prevention.', true),
('Nordic Hamstring Curl', 'legs', ARRAY['hamstrings'], ARRAY['mat', 'anchor'], 'Gold standard eccentric hamstring exercise for sprint speed and injury resistance.', true),
('Single-Leg Calf Raises', 'legs', ARRAY['gastrocnemius', 'soleus', 'achilles'], ARRAY['step', 'dumbbell'], 'Achilles stiffness and ankle stiffness for reactive sprint and jump elasticity.', true),

-- Plyometrics / Power
('Depth Jumps', 'plyometrics', ARRAY['calves', 'quads', 'glutes'], ARRAY['plyo_box'], 'Short ground-contact-time reactive elasticity drill.', true),
('Box Jumps', 'plyometrics', ARRAY['glutes', 'quads', 'calves'], ARRAY['plyo_box'], 'Low-impact concentric explosive vertical jump power.', true),
('Lateral Bound & Stick', 'plyometrics', ARRAY['abductors', 'glutes', 'ankles'], ARRAY['none'], 'Lateral force absorption and single-leg deceleration for defensive slides.', true),
('Pogo Hops', 'plyometrics', ARRAY['achilles', 'calves'], ARRAY['none'], 'Ankle stiffness drill for quick continuous bouncy floor reaction.', true),
('Medicine Ball Rotational Scoop Toss', 'plyometrics', ARRAY['core', 'obliques', 'hips'], ARRAY['medicine_ball', 'wall'], 'Rotational power transfer through the kinetic chain for passing and shooting.', true),

-- Upper Body Push / Pull
('Dumbbell Floor Press', 'upper_body_push', ARRAY['chest', 'triceps', 'anterior_delts'], ARRAY['dumbbells', 'mat'], 'Shoulder-friendly pressing for driving through contact.', true),
('Push-Ups (Tempo)', 'upper_body_push', ARRAY['chest', 'core', 'triceps'], ARRAY['none'], 'Strict bodyweight control and serratus anterior activation for shoulder health.', true),
('Overhead Dumbbell Push Press', 'upper_body_push', ARRAY['deltoids', 'triceps', 'core'], ARRAY['dumbbells'], 'Triple-extension to overhead power translation.', true),
('Single-Arm Dumbbell Row', 'upper_body_pull', ARRAY['lats', 'rhomboids', 'biceps'], ARRAY['dumbbell', 'bench'], 'Upper back thickness and grip strength for rebounding battles.', true),
('Neutral Grip Pull-Ups', 'upper_body_pull', ARRAY['lats', 'biceps', 'forearms'], ARRAY['pull_up_bar'], 'Vertical pulling strength for posture and rim finishes.', true),
('Band Face Pulls', 'upper_body_pull', ARRAY['rear_delts', 'rotator_cuff', 'upper_back'], ARRAY['resistance_band'], 'Scapular stability and rotator cuff endurance for shooting mechanics.', true),

-- Core & Stability
('Pallof Press', 'core', ARRAY['transverse_abdominis', 'obliques'], ARRAY['cable_machine', 'resistance_band'], 'Anti-rotation core stability to resist defenders bumping your hips.', true),
('Hanging Leg Raises', 'core', ARRAY['hip_flexors', 'rectus_abdominis'], ARRAY['pull_up_bar'], 'Lower abdominal and hip flexor strength for elevation in the air.', true),
('Dead Bug (Contralateral)', 'core', ARRAY['deep_core', 'hip_stabilizers'], ARRAY['mat'], 'Motor control connecting opposing shoulder and hip for athletic movement.', true),

-- Mobility & Recovery
('90/90 Hip Switches', 'mobility', ARRAY['internal_rotators', 'external_rotators'], ARRAY['mat'], 'Hip capsule mobility for deep stance and change of direction.', true),
('Couch Stretch (Hip Flexor / Quad)', 'mobility', ARRAY['psoas', 'rectus_femoris'], ARRAY['wall', 'mat'], 'Unlocks tight anterior hips from repetitive sprint and jumping.', true),
('Thoracic Spine Rotations (Open Books)', 'mobility', ARRAY['thoracic_spine', 'chest'], ARRAY['mat'], 'Upper spine rotation for fluid shooting pocket mechanics and passing vision.', true),
('Ankle Dorsiflexion Knee-to-Wall', 'mobility', ARRAY['soleus', 'achilles'], ARRAY['wall'], 'Restores ankle range of motion essential for deep landing mechanics.', true)
) AS v(name, category, muscle_groups, equipment, description, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM public.exercise_library e WHERE e.is_system = true AND e.name = v.name
);

-- =============================================================================
-- 2. CURATED BASKETBALL IQ STUDY TOPICS & LESSONS
-- =============================================================================

-- Topic 1: Shooting Mechanics
INSERT INTO public.study_topics (title, slug, description, category, icon_name, display_order) VALUES
('Shooting Mechanics & Fluidity', 'shooting-mechanics', 'Master the repeatable physics of one-motion shooting, dip, set point, and energy transfer from the floor.', 'shooting_mechanics', 'Target', 1)
ON CONFLICT (slug) DO NOTHING;

-- Topic 2: Finishing Around the Rim
INSERT INTO public.study_topics (title, slug, description, category, icon_name, display_order) VALUES
('Finishing Footwork & Angle Control', 'finishing-footwork', 'Deconstruct floater range, veer finishes, euro-steps, and using the rim to protect against shot blockers.', 'finishing', 'Zap', 2)
ON CONFLICT (slug) DO NOTHING;

-- Topic 3: Pick & Roll Decision Making
INSERT INTO public.study_topics (title, slug, description, category, icon_name, display_order) VALUES
('Pick & Roll Reads & Manipulations', 'pnr-reads', 'Learn how to read drop coverage, blitzes, hedges, and switch defenses with poise.', 'pick_and_roll', 'GitMerge', 3)
ON CONFLICT (slug) DO NOTHING;

-- Topic 4: Lockdown Defensive Positioning
INSERT INTO public.study_topics (title, slug, description, category, icon_name, display_order) VALUES
('Defensive Stance & Help-Side Rotations', 'defense-rotations', 'Elite on-ball closeouts, walling up at the rim, stunting, and recovering without fouling.', 'defense', 'Shield', 4)
ON CONFLICT (slug) DO NOTHING;

-- Study Items for Topic 1 (Shooting)
DO $$
DECLARE
  v_shooting_topic_id uuid;
  v_finishing_topic_id uuid;
  v_pnr_topic_id uuid;
  v_defense_topic_id uuid;
BEGIN
  SELECT id INTO v_shooting_topic_id FROM public.study_topics WHERE slug = 'shooting-mechanics' LIMIT 1;
  SELECT id INTO v_finishing_topic_id FROM public.study_topics WHERE slug = 'finishing-footwork' LIMIT 1;
  SELECT id INTO v_pnr_topic_id FROM public.study_topics WHERE slug = 'pnr-reads' LIMIT 1;
  SELECT id INTO v_defense_topic_id FROM public.study_topics WHERE slug = 'defense-rotations' LIMIT 1;

  -- Each topic's lessons are only inserted if that topic has none yet
  IF v_shooting_topic_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.study_items WHERE topic_id = v_shooting_topic_id) THEN
    INSERT INTO public.study_items (
      topic_id, title, description, youtube_video_id, youtube_channel, duration_minutes,
      key_takeaways, reflection_prompt, quiz_questions, display_order
    ) VALUES (
      v_shooting_topic_id,
      'The One-Motion Shooting Dip & Kinetic Chain',
      'Understand why great shooters dip the basketball below their waist to synchronise their leg drive with their release.',
      'mrTpz7xzHB4',
      'Scot Shot Basketball',
      10,
      ARRAY['The dip provides rhythm and momentum without changing wrist angle', 'Energy transfers from hips to wrist in a continuous upward wave', 'Pausing at the forehead leaks power and causes flat trajectory'],
      'In your last shooting session, did you feel like your legs and release were firing together, or did you pause at the top? What cue will you use next session?',
      '[
        {
          "question": "What is the primary mechanical purpose of dipping the basketball upon catch?",
          "options": ["To hide the ball from defenders", "To synchronize lower body dip with upward shot rhythm", "To add backspin", "To slow down the shot speed"],
          "correct_index": 1,
          "explanation": "Dipping the ball syncs the ball with hip flexion, allowing energy to travel upward without a power leak."
        },
        {
          "question": "What happens when a player pauses the ball at their forehead before jumping?",
          "options": ["The shot gains arc", "The shot loses lower-body kinetic energy, requiring excessive arm push", "The shot is less contestable", "Accuracy automatically increases"],
          "correct_index": 1,
          "explanation": "A hitch or pause breaks the kinetic chain, turning a fluid shot into an arm-dominant push."
        }
      ]'::jsonb,
      1
    ),
    (
      v_shooting_topic_id,
      'Shot Pocket Alignment & Guide Hand Discipline',
      'Study how elbow tuck, shoulder turn, and a relaxed non-thumb guide hand create straight-line accuracy.',
      'u-pcfLpZc3A',
      'Rob Fodor - The Shooting Guy',
      6,
      ARRAY['Slight 10-20 degree shoulder tilt aligns the shooting hip and elbow with the rim', 'The guide hand should drop off naturally at the release point', 'Thumb flicking the guide hand introduces side-to-side variance'],
      'Look at your misses from your recent session. Were they mostly long/short (depth control) or left/right (alignment/guide hand)?',
      '[
        {
          "question": "If a right-handed shooter misses consistently left or right, what is the most common mechanical defect?",
          "options": ["Not enough knee bend", "Guide hand interference (thumb flick) or improper shoulder alignment", "Jumping too high", "Shooting too fast"],
          "correct_index": 1,
          "explanation": "Left/right misses are almost always caused by guide-hand pushing or misalignment of the shooting elbow/shoulder with the target."
        }
      ]'::jsonb,
      2
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF v_finishing_topic_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.study_items WHERE topic_id = v_finishing_topic_id) THEN
    INSERT INTO public.study_items (
      topic_id, title, description, youtube_video_id, youtube_channel, duration_minutes,
      key_takeaways, reflection_prompt, quiz_questions, display_order
    ) VALUES (
      v_finishing_topic_id,
      'The Veer Finish: Contact Absorption and Rim Protection',
      'How to angle your jump into the recovery defender to eliminate their vertical contest and create a clean layup window.',
      'FaDYYqmKtxM',
      'HoopStudy',
      7,
      ARRAY['Angle into the defender line before take-off', 'Initiate contact with your chest/shoulder to take away their jump', 'Extend high and away from the recovery hand'],
      'Describe a situation in recent pickup or scrimmage where you avoided contact and got blocked. How would a veer step have changed the angle?',
      '[
        {
          "question": "What is the primary goal of taking a veer step toward a trailing shot blocker?",
          "options": ["To draw an offensive foul", "To initiate contact on your terms and nullify their vertical jump", "To pass out to the corner", "To slow down the play"],
          "correct_index": 1,
          "explanation": "Veering into the defender takes away their runway and jumping space, leaving you with an uncontested touch finish."
        }
      ]'::jsonb,
      1
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF v_pnr_topic_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.study_items WHERE topic_id = v_pnr_topic_id) THEN
    INSERT INTO public.study_items (
      topic_id, title, description, youtube_video_id, youtube_channel, duration_minutes,
      key_takeaways, reflection_prompt, quiz_questions, display_order
    ) VALUES (
      v_pnr_topic_id,
      'Reading Drop Coverage: Snaking & Mid-Range Floaters',
      'How to punish drop coverage centers by putting the on-ball defender on your back ("hostage dribble") and rising in the short mid-range.',
      'GDzn96-jqm8',
      'Hooper University',
      4,
      ARRAY['Put the recovering guard on your hip to play 2-on-1 against the big', 'Do not speed up into the rim protector', 'Floater and push-shot at 8-10 feet creates an unstoppable dilemma'],
      'When you run pick-and-roll and the center stays in the paint, what is your default read? Are you rushing to the rim or finding the short mid-range touch shot?',
      '[
        {
          "question": "When the opposing center is in deep drop coverage, what spacing advantage does the snake dribble provide?",
          "options": ["It forces an automatic foul", "It seals the trailing guard behind you and leaves the drop big in no-mans land", "It speeds up the possession", "It lets you reset to halfcourt"],
          "correct_index": 1,
          "explanation": "Snaking across the screen traps the recovering defender on your back, giving you a completely unimpeded floater or pocket pass."
        }
      ]'::jsonb,
      1
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF v_defense_topic_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.study_items WHERE topic_id = v_defense_topic_id) THEN
    INSERT INTO public.study_items (
      topic_id, title, description, youtube_video_id, youtube_channel, duration_minutes,
      key_takeaways, reflection_prompt, quiz_questions, display_order
    ) VALUES (
      v_defense_topic_id,
      'Closeouts and Help-Side Positioning',
      'How to close out under control, stay in a stance that lets you recover, and sit in the gap on the weak side.',
      'placeholder',
      'HoopIQ',
      8,
      ARRAY['Sprint the first two-thirds of a closeout, then chop your feet with high hands', 'On the weak side, see both your player and the ball (pistols position)', 'Help early in the gap so you are not late at the rim'],
      'Think about the last time your player scored after a closeout. Were you out of control, or did you give up a straight-line drive?',
      '[
        {
          "question": "What is the main goal of chopping your feet at the end of a closeout?",
          "options": ["To draw a charge", "To stay balanced so the shooter cannot drive straight past you", "To block every shot", "To get back on offense faster"],
          "correct_index": 1,
          "explanation": "Short, choppy steps keep you balanced, so you can contest the shot and still slide if the shooter drives."
        },
        {
          "question": "Where should a weak-side defender be when the ball is on the opposite wing?",
          "options": ["Face-guarding their player at the three-point line", "In the gap near the paint, seeing both their player and the ball", "At half court", "Behind the backboard"],
          "correct_index": 1,
          "explanation": "Sitting in the gap lets you stop penetration early and still recover to your player on a kick-out."
        }
      ]'::jsonb,
      1
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =============================================================================
-- 3. INITIAL LEADERBOARD SEASON (Active)
-- =============================================================================
-- Only created if there is no active season (the leaderboard expects exactly one).
-- Points are calculated by the leaderboard_standings view (migration 00007).
INSERT INTO public.leaderboard_seasons (name, starts_at, ends_at, is_active)
SELECT
  'Season 1: Foundation & Consistency',
  now() - interval '7 days',
  now() + interval '83 days',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.leaderboard_seasons WHERE is_active = true);

-- =============================================================================
-- 4. OWNER PROVISIONING HELPER
-- =============================================================================
-- Call this with the owner email (e.g., SELECT public.provision_owner('owner@hoopiq.app'))
CREATE OR REPLACE FUNCTION public.provision_owner(p_email text)
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(TRIM(p_email)) LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users. They must sign up first.', p_email;
    RETURN false;
  END IF;

  -- Grant owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Upgrade subscription to owner plan with unlimited credits
  UPDATE public.subscriptions
  SET plan_type = 'owner',
      status = 'active',
      ai_credits_remaining = 9999,
      video_credits_remaining = 9999,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only callable from the SQL editor, never by players through the API
REVOKE EXECUTE ON FUNCTION public.provision_owner(text) FROM PUBLIC, anon, authenticated;
