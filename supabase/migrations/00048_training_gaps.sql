-- 00048_training_gaps.sql
--
-- Phase 5 training gaps from the October review: warm-ups and cool-downs,
-- easier versions of exercises, team and off-ball drills, sprint tests in
-- metres, and advice on growing pains. Drills without a hoop need no data:
-- 64 already exist, and the drill library gets a filter for them. Safe to
-- re-run.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file, for the reason
-- given at the top of 00035. Keep it apostrophe-free. Apostrophes inside the
-- seed strings are doubled, as SQL needs.

-- =============================================================================
-- 1. NEW DRILL SKILLS
-- =============================================================================
-- warm_up and cool_down sit in the drill library so a player can find them,
-- time them and add them to a session like any drill. off_ball is cutting,
-- screening and spacing: everything a player does without the ball, which
-- the library had nothing on.
ALTER TABLE public.drills DROP CONSTRAINT IF EXISTS drills_skill_check;
ALTER TABLE public.drills ADD CONSTRAINT drills_skill_check CHECK (skill IN (
  'shooting', 'ball_handling', 'finishing', 'footwork', 'passing',
  'defense', 'rebounding', 'post_play', 'conditioning', 'iq',
  'off_ball', 'warm_up', 'cool_down'
));

-- The drill library now filters on drills that need no hoop, by equipment.
-- This one is layups at both ends but listed only the full court.
UPDATE public.drills SET equipment = array_append(equipment, 'hoop')
WHERE slug = 'full-court-layup-challenge' AND NOT ('hoop' = ANY(equipment));

-- =============================================================================
-- 2. DRILLS: WARM-UPS, COOL-DOWNS, OFF-BALL AND TEAM
-- =============================================================================
INSERT INTO public.drills (slug, name, skill, sub_skill, level, players, equipment, duration_minutes, reps, setup, instructions, coaching_cues, common_mistakes, tracks_makes) VALUES
  ('court-warm-up', 'Court Warm-Up', 'warm_up', 'dynamic', 'beginner', 'solo', ARRAY['none'], 8, 'Once through, easy to fast',
   'Use half the court, or any 15 metre stretch of floor. No ball needed.',
   ARRAY['Raise: jog down and back, side shuffle down and back, backpedal down and back.', 'Mobilise: walking knee hugs and walking quad pulls for 10 steps each.', 'Walking lunges with a twist, 8 each leg, then leg swings front to back and side to side, 10 each leg.', 'Activate: 10 glute bridges, 10 bodyweight squats, and 20 seconds of single-leg balance on each leg.', 'Prime: A-skips and carioca down and back, then 10 pogo hops in place.', 'Finish with 2 build-up sprints, the first at about 70 percent effort and the second at about 90.'],
   ARRAY['Start easy and finish fast', 'Warm, not tired: you should feel ready to play', 'Keep moving: save long held stretches for after'],
   ARRAY['Going straight into full sprints or max jumps', 'Long held stretches before playing', 'Rushing the lunges and squats with half range'],
   false),
  ('ball-warm-up', 'Ball Warm-Up', 'warm_up', 'ball', 'beginner', 'solo', ARRAY['ball'], 6, 'About 1 minute per block',
   'Any flat floor. Do the Court Warm-Up first if you have time.',
   ARRAY['Ball wraps: 10 around the head, 10 around the waist and 10 around the knees, then reverse.', 'Pound dribbles: 30 seconds with each hand, low and hard.', 'Crossovers in place for 30 seconds, eyes up.', 'Walking dribble down and back with your weaker hand, then with your stronger hand.', 'Two-hand chest passes against a wall, 20 reps.', 'With a hoop: finish with 10 one-hand form shots close to the rim.'],
   ARRAY['Eyes up from the first dribble', 'Fingertips, not palms', 'Weaker hand gets as many reps as the strong one'],
   ARRAY['Skipping the weaker hand', 'Jacking up long shots before the arm is warm', 'Dribbling high and soft'],
   false),
  ('jump-and-land-warm-up', 'Jump and Land Warm-Up', 'warm_up', 'landing', 'beginner', 'solo', ARRAY['none'], 6, '2 rounds',
   'Any flat floor with room to hop sideways. Do it after the Court Warm-Up, before shooting or games.',
   ARRAY['Single-leg balance, 20 seconds each leg.', 'Pogo hops in place, 15 reps.', 'Squat jump and stick the landing for 2 seconds, 5 reps.', 'Lateral hop and stick on one leg, 5 each side.', 'Skater hops, side to side, stick each landing, 5 each side.', 'Rest 30 seconds and repeat.'],
   ARRAY['Land soft and quiet', 'Knees stay over your toes, never caving in', 'Hold every landing still before the next jump'],
   ARRAY['Loud, stiff landings', 'Knees falling inward on the landing', 'Rushing the next jump before the landing is still'],
   false),
  ('pre-game-warm-up', 'Pre-Game Warm-Up', 'warm_up', 'game_day', 'beginner', 'solo', ARRAY['ball', 'hoop'], 15, 'Once through, finishing 5 to 10 minutes before tip-off',
   'A half court with a hoop. Works on your own or with the team.',
   ARRAY['Court Warm-Up, about 5 minutes.', 'Jump and Land Warm-Up, one round.', 'Layups from both sides, 5 with each hand.', 'Close shots from the blocks and the middle, then step out to your normal range.', 'Five free throws with your full routine.', 'Two short sprints, then stay warm with light movement until tip-off.'],
   ARRAY['Shots start close and move out', 'Finish warm, not tired', 'Same free throw routine you use in the game'],
   ARRAY['Starting with deep threes', 'Finishing 20 minutes early and going cold', 'Standing still while waiting to check in'],
   false),
  ('cool-down-stretch', 'Cool-Down', 'cool_down', 'stretching', 'beginner', 'solo', ARRAY['none'], 8, 'Hold each stretch for 30 seconds on each side',
   'Any quiet bit of floor, straight after training or a game.',
   ARRAY['Walk easily for 2 minutes and slow your breathing.', 'Calf stretch against a wall, back heel down.', 'Standing or lying hamstring stretch.', 'Half-kneeling hip flexor stretch, squeezing the back glute.', 'Standing quad stretch, holding a wall for balance.', 'Lying figure-4 glute stretch.', 'Child''s pose for the back and lats, then 1 minute of slow breathing.'],
   ARRAY['A mild stretch, never pain', 'Breathe out as you ease into it', 'Stay still: no bouncing'],
   ARRAY['Skipping it after a hard session', 'Bouncing in the stretch', 'Sitting straight down after sprinting'],
   false),
  ('after-game-recovery', 'After-Game Recovery', 'cool_down', 'recovery', 'beginner', 'solo', ARRAY['none'], 10, 'Once, after every game',
   'Straight after the final whistle, then at home that evening.',
   ARRAY['Walk or jog very easily for 3 minutes.', 'Go through the Cool-Down stretches.', 'Drink water, and more if you sweated a lot.', 'Eat a proper meal or snack with carbs and protein within about an hour.', 'Note anything that hurts in your notes so you can keep an eye on it.', 'Get to bed on time: sleep is when you recover.'],
   ARRAY['Easy movement first, then rest', 'Food and water soon after', 'Sleep does most of the work'],
   ARRAY['Nothing to eat until the next morning', 'A late night on screens after a game', 'Ignoring a pain that is still there the next day'],
   false),
  ('solo-cutting-footwork', 'Solo Cutting Footwork', 'off_ball', 'cutting', 'beginner', 'solo', ARRAY['cones'], 8, '5 of each cut, both sides',
   'Put a cone where a defender would stand, about 2 metres inside the wing. No hoop or ball needed.',
   ARRAY['V-cut: walk the cone 2 or 3 steps toward the lane, plant your inside foot and push hard back out to the wing.', 'L-cut: walk up the lane line to the elbow, plant and cut sharply out to the wing.', 'Backdoor: jog out toward the wing, plant your outside foot and cut hard behind the cone to the rim.', 'Show a target hand at the end of every cut, as if calling for the ball.', 'Do all three from the other side of the floor.'],
   ARRAY['Slow to fast: the change of speed gets you open', 'Plant and push off one foot', 'Target hand up at the end of every cut'],
   ARRAY['Rounding the cut instead of a sharp plant', 'Same speed the whole way', 'Cutting with your hands down'],
   false),
  ('v-cuts-to-get-open', 'V-Cuts to Get Open', 'off_ball', 'cutting', 'beginner', 'partner', ARRAY['ball'], 8, '10 cuts on each wing',
   'You start on the wing, your partner stands at the top of the key with the ball.',
   ARRAY['Walk your imaginary defender 2 or 3 steps toward the lane.', 'Plant your inside foot and push off hard back to the wing.', 'Show a target hand. Your partner passes as you come out.', 'Catch with both feet set, pivot to face the rim in triple threat.', 'Pass back and go again, then switch wings and roles.'],
   ARRAY['Slow in, fast out', 'Catch facing the rim', 'Passer throws to the target hand'],
   ARRAY['Drifting out instead of a sharp cut', 'Catching with your back to the rim', 'Passer throwing before the cut'],
   false),
  ('l-cuts-from-the-block', 'L-Cuts from the Block', 'off_ball', 'cutting', 'beginner', 'partner', ARRAY['ball', 'hoop'], 8, '10 cuts each side',
   'Start on the low block, your partner at the top of the key with the ball.',
   ARRAY['Walk up the lane line to the elbow.', 'Plant your inside foot and cut sharply out to the wing, making an L.', 'Catch, square up and shoot, or drive if your partner calls drive.', 'Rebound your own shot and pass back to the top.', 'Switch sides after 10 cuts, then switch roles.'],
   ARRAY['Sharp corner on the L', 'Step into the catch', 'Feet ready to shoot as the ball arrives'],
   ARRAY['Floating up the lane without changing speed', 'Catching flat-footed', 'Fading away on the shot'],
   true),
  ('give-and-go', 'Give and Go', 'off_ball', 'cutting', 'beginner', 'partner', ARRAY['ball', 'hoop'], 8, '10 makes from each side',
   'You start at the top of the key with the ball, your partner on the wing.',
   ARRAY['Pass to your partner on the wing.', 'Take one step away to sell it, then cut hard to the rim in front of where your defender would be.', 'Your partner hits you with a pass on the move.', 'Finish with a layup on the side of the pass.', 'Rebound, pass back out and go again. Switch roles after 10 makes.'],
   ARRAY['Pass, then cut straight away', 'Hand up early for the return pass', 'Finish strong on the move'],
   ARRAY['Standing and watching after the pass', 'Cutting behind the passer', 'Slowing down to catch'],
   true),
  ('backdoor-cut-reads', 'Backdoor Cut Reads', 'off_ball', 'cutting', 'intermediate', 'team', ARRAY['ball', 'hoop'], 10, '5 reps in each role',
   'Three players: a passer at the top, a cutter on the wing and a defender guarding the cutter.',
   ARRAY['The defender chooses: deny the wing hard, or sag off.', 'If the defender overplays the pass, the cutter plants the outside foot and cuts backdoor to the rim.', 'If the defender sags off, the cutter steps out to the wing for the catch.', 'The passer throws a bounce pass on the backdoor cut.', 'Play it out to a finish, then rotate: passer to cutter, cutter to defender, defender to passer.'],
   ARRAY['Read the defender, not the ball', 'Backdoor the moment they overplay', 'Bounce pass on the backdoor cut'],
   ARRAY['Deciding before seeing the defender', 'Floating cut that the defender recovers on', 'Lob pass over a backdoor cut'],
   true),
  ('pass-cut-and-replace', 'Pass, Cut and Replace', 'off_ball', 'spacing', 'beginner', 'team', ARRAY['ball', 'hoop'], 10, '3 minutes of continuous play',
   'Four or five players spread out on the arc: top, both wings and both corners.',
   ARRAY['The player at the top passes to a wing, then basket cuts through the lane.', 'If the cutter is not open, they keep going out to the empty corner.', 'Everyone shifts one spot toward the ball to fill the space the cutter left.', 'The new player at the top receives the ball and starts again.', 'Add defenders after a couple of minutes so the cuts have to be real.'],
   ARRAY['Pass and cut, never pass and stand', 'Fill the spot that just emptied', 'Stay wide: about 4 to 5 metres apart'],
   ARRAY['Two players in the same spot', 'Cutting and stopping in the lane', 'Everyone drifting toward the ball'],
   false),
  ('spacing-drive-and-drift', 'Spacing: Drive and Drift', 'off_ball', 'spacing', 'intermediate', 'team', ARRAY['ball', 'hoop'], 10, '10 drives from each side',
   'A driver at the top, with shooters in both corners and on one wing.',
   ARRAY['The driver attacks the rim from the top or a wing.', 'The corner shooter on the drive side stays in the corner, ready to catch.', 'The wing on the drive side drifts down toward the corner or up to the slot, wherever the driver can see them.', 'The far side players lift or slide to stay in the passing lane.', 'The driver finishes or kicks to whoever is open, and the shooter catches and shoots.'],
   ARRAY['Move when the ball moves', 'Stay in the driver''s line of sight', 'Feet ready before the pass arrives'],
   ARRAY['Standing still as the drive comes', 'Crowding toward the driver', 'Catching with feet not set'],
   true),
  ('setting-a-legal-screen', 'Setting a Legal Screen', 'off_ball', 'screening', 'beginner', 'partner', ARRAY['none'], 6, '10 screens each',
   'Two players and any flat floor. No ball or hoop needed.',
   ARRAY['Your partner walks toward a spot. Get there first and set your feet.', 'Wide base, knees bent, arms crossed or held in to protect your chest.', 'Stay still as your partner brushes past you: a moving screen is a foul.', 'As soon as they pass, open up and move: roll to the rim or pop out.', 'Switch roles after 10.'],
   ARRAY['Feet set before contact', 'Wide and low like a wall', 'Move straight after the screen'],
   ARRAY['Leaning or sticking a hip out', 'Still moving when contact comes', 'Standing still after the screen'],
   false),
  ('down-screen-reads', 'Down Screen Reads: Curl, Fade, Pop', 'off_ball', 'screening', 'intermediate', 'team', ARRAY['ball', 'hoop'], 12, '5 reps of each read, both sides',
   'Four players: a passer on the wing, a screener at the elbow, a cutter on the low block and a defender on the cutter.',
   ARRAY['The screener walks down and screens the defender guarding the cutter.', 'The cutter waits for the screen, then reads the defender.', 'Defender follows tight behind: curl around the screen toward the rim.', 'Defender cheats under the screen: fade out to the corner.', 'Defender stays level: pop straight up to the wing. The screener then rolls or slips to open space.', 'The passer hits the open player and they play to a finish.'],
   ARRAY['Wait for the screen to be set', 'Read the defender, then go', 'Screener moves after the cutter has gone'],
   ARRAY['Cutting before the screen is set', 'Always making the same cut', 'Screener standing still afterwards'],
   true),
  ('fill-the-lanes', 'Fill the Lanes in Transition', 'off_ball', 'transition', 'intermediate', 'team', ARRAY['ball', 'hoop'], 10, '6 trips up the floor',
   'Five players. A coach or player shoots so the team can rebound.',
   ARRAY['On the rebound, the rebounder outlets to the guard on that side.', 'The two wings sprint wide, right along the sidelines, ahead of the ball.', 'One big runs straight to the rim. The other trails behind the ball.', 'The guard pushes the ball up the middle and passes ahead if a wing is open.', 'Finish with a layup, a corner three or a trailer shot, then do it the other way.'],
   ARRAY['Sprint wide, not to the ball', 'Rim runner goes straight to the rim', 'Pass ahead: the ball is faster than the dribble'],
   ARRAY['Wings running down the middle', 'Waiting for the outlet before running', 'Dribbling the whole way when a pass was there'],
   true),
  ('two-on-one-fast-break', '2-on-1 Fast Break', 'iq', 'advantage', 'intermediate', 'team', ARRAY['ball', 'hoop'], 10, '10 trips',
   'Three players: two attackers at half court and one defender back at the rim.',
   ARRAY['The two attackers push up the floor, staying about a lane apart.', 'The ball handler attacks the rim hard to make the defender commit.', 'If the defender steps up, pass to the partner for a layup.', 'If the defender stays with the partner, the ball handler finishes.', 'The player who scores goes back on defence, and the next pair goes.'],
   ARRAY['Attack the rim to force a decision', 'Stay wide enough to make the pass', 'Finish before the help arrives'],
   ARRAY['Passing too early, so the defender guards both', 'Running side by side, too close together', 'Pulling up for a jump shot'],
   true),
  ('three-on-two-continuous', '3-on-2, 2-on-1 Continuous', 'iq', 'advantage', 'advanced', 'team', ARRAY['ball', 'hoop', 'full court'], 12, '8 minutes',
   'At least 7 players. Two defenders wait at each end of the court.',
   ARRAY['Three attackers play 3-on-2 against the two defenders at one end.', 'When the possession ends, the two defenders get the ball and attack the other way.', 'One of the three attackers sprints back to defend: that is a 2-on-1.', 'At the far end, two new defenders are waiting, and the game keeps going.', 'Keep it running, rotating players in from the sidelines.'],
   ARRAY['Fill the lanes fast', 'Make the extra pass to the open player', 'Talk on defence: who has the ball'],
   ARRAY['Slow to turn and run', 'Taking the first shot instead of the best one', 'Both defenders guarding the ball'],
   true)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 3. EASIER VERSIONS OF EXERCISES
-- =============================================================================
-- One line each: the easier exercise and how to do it. Shown in the exercise
-- library and on program days, where many players are 13 to 15 and some
-- exercises are not for beginners.
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS easier_version text;
ALTER TABLE public.exercise_library DROP CONSTRAINT IF EXISTS exercise_library_easier_version_check;
ALTER TABLE public.exercise_library ADD CONSTRAINT exercise_library_easier_version_check CHECK (easier_version IS NULL OR char_length(easier_version) BETWEEN 1 AND 300);

UPDATE public.exercise_library AS e SET easier_version = v.easier
FROM (VALUES
  ('Trap Bar Deadlift', 'Kettlebell deadlift: one kettlebell between your feet, same hinge, lighter load.'),
  ('Barbell Back Squat', 'Goblet squat: hold one dumbbell at your chest, or bodyweight squats to a bench.'),
  ('Bulgarian Split Squat', 'Split squat with the back foot on the floor, holding something for balance.'),
  ('Dumbbell Romanian Deadlift', 'Bodyweight hip hinge: hands on hips, push them back to a wall behind you.'),
  ('Nordic Hamstring Curl', 'Lower only partway, catch yourself with your hands early, or use a band to help.'),
  ('Single-Leg Calf Raises', 'Calf raises on both feet, holding a wall.'),
  ('Depth Jumps', 'Snap downs or a jump from the floor and stick the landing. Depth jumps come after months of landing work.'),
  ('Box Jumps', 'Use a low box or a step, and step down every rep.'),
  ('Lateral Bound & Stick', 'Lateral hop and stick: a smaller hop sideways, landing on both feet.'),
  ('Pogo Hops', 'Slower, smaller hops with a pause between each.'),
  ('Medicine Ball Rotational Scoop Toss', 'Standing band or cable rotations, or the toss with a lighter ball.'),
  ('Dumbbell Floor Press', 'Lighter dumbbells, or push-ups with your hands on a bench.'),
  ('Push-Ups (Tempo)', 'Push-ups with your hands on a bench or wall, keeping the slow lowering.'),
  ('Overhead Dumbbell Push Press', 'Seated dumbbell press with light dumbbells.'),
  ('Single-Arm Dumbbell Row', 'Resistance band row, or a lighter dumbbell.'),
  ('Neutral Grip Pull-Ups', 'Inverted rows under a table or bar, or band-assisted pull-ups.'),
  ('Pallof Press', 'Hold the band out in front for 10 seconds instead of pressing.'),
  ('Hanging Leg Raises', 'Hanging knee raises, or lying reverse crunches.'),
  ('Dead Bug (Contralateral)', 'Move only the legs, one at a time, with arms resting on the floor.'),
  ('90/90 Hip Switches', 'Use your hands on the floor behind you for support.'),
  ('Couch Stretch (Hip Flexor / Quad)', 'Half-kneeling hip flexor stretch, back foot flat on the floor.'),
  ('Ankle Dorsiflexion Knee-to-Wall', 'Start with your toes closer to the wall.'),
  ('Barbell Bench Press', 'Dumbbell bench press with light dumbbells, or push-ups.'),
  ('Dumbbell Bench Press', 'Push-ups with your hands on a bench.'),
  ('Incline Dumbbell Press', 'Incline push-ups with your hands on a bench.'),
  ('Decline Push-Ups', 'Standard push-ups on the floor.'),
  ('Plyometric Push-Ups', 'Fast push-ups with your hands on a bench, no hands leaving the surface.'),
  ('Chest Dips', 'Bench dips with feet on the floor and knees bent.'),
  ('Medicine Ball Chest Pass', 'Use a lighter ball, or a basketball against a wall.'),
  ('Pull-Ups', 'Inverted rows, band-assisted pull-ups, or slow 5-second lowers from the top.'),
  ('Chin-Ups', 'Band-assisted chin-ups, or slow lowers from the top.'),
  ('Lat Pulldown', 'Resistance band pulldown anchored overhead.'),
  ('Barbell Bent-Over Row', 'Chest-supported dumbbell row with light dumbbells.'),
  ('Inverted Row', 'Bend your knees and walk your feet in, so you lean back less.'),
  ('Renegade Row', 'Single-arm dumbbell row with a hand on a bench.'),
  ('Kettlebell Gorilla Row', 'Single-arm dumbbell row with a hand on a bench.'),
  ('Standing Barbell Overhead Press', 'Seated dumbbell shoulder press with light dumbbells.'),
  ('Landmine Press', 'Half-kneeling, with a lighter load.'),
  ('Arnold Press', 'Seated dumbbell shoulder press.'),
  ('Pike Push-Ups', 'Pike push-ups with your hands on a bench, or standard push-ups.'),
  ('Half-Kneeling Single-Arm Kettlebell Press', 'Lighter kettlebell, or press a dumbbell seated.'),
  ('Close-Grip Bench Press', 'Close-grip push-ups with hands on a bench.'),
  ('EZ-Bar Skull Crushers', 'Cable or band triceps pushdowns.'),
  ('Bench Dips', 'Keep your knees bent and feet close to the bench, and only go halfway down.'),
  ('Diamond Push-Ups', 'Close-grip push-ups with hands on a bench.'),
  ('Dead Hang', 'Hang with your feet touching the floor, taking some of your weight.'),
  ('Fingertip Push-Ups', 'Fingertip push-ups against a wall, or on your knees.'),
  ('Barbell Front Squat', 'Goblet squat with one dumbbell at your chest.'),
  ('Goblet Squat', 'Bodyweight squat down to a bench or chair.'),
  ('Dumbbell Walking Lunges', 'Stationary split squats, holding something for balance.'),
  ('Dumbbell Step-Ups', 'Bodyweight step-ups onto a lower step.'),
  ('Reverse Lunge', 'Split squat in place, holding something for balance.'),
  ('Lateral Lunge', 'A shorter step out, hands on a bench in front of you.'),
  ('Skater Squat', 'Single-leg squat down to a box or bench behind you, or a split squat.'),
  ('Wall Sit', 'Sit less deep, with your hips higher than your knees.'),
  ('Barbell Romanian Deadlift', 'Dumbbell Romanian deadlift with light dumbbells, or a bodyweight hip hinge.'),
  ('Single-Leg Romanian Deadlift', 'Kickstand Romanian deadlift: the back toe stays on the floor for balance.'),
  ('Stability Ball Hamstring Curl', 'Glute bridge with your feet on the ball, without curling.'),
  ('Slider Hamstring Curl', 'Lower only partway, or do glute bridges with your heels on a step.'),
  ('Barbell Good Morning', 'Bodyweight good morning, hands behind your head.'),
  ('45-Degree Back Extension', 'Bird dog, or a glute bridge.'),
  ('Single-Leg Hamstring Bridge', 'Glute bridge on two feet with heels on a step.'),
  ('Barbell Hip Thrust', 'Bodyweight glute bridge on the floor.'),
  ('Single-Leg Hip Thrust', 'Glute bridge on both feet, back on a bench.'),
  ('Sumo Deadlift', 'Kettlebell sumo deadlift with one kettlebell between your feet.'),
  ('Curtsy Lunge', 'Reverse lunge, holding something for balance.'),
  ('Eccentric Heel Drops', 'Lower on two feet instead of one, holding a wall.'),
  ('Ab Wheel Rollout', 'Kneeling rollout to a wall in front of you, or a front plank.'),
  ('Side Plank', 'Side plank from your knees instead of your feet.'),
  ('Front Plank', 'Plank from your knees, or with your hands on a bench.'),
  ('Hollow Body Hold', 'Tuck your knees in, or keep your arms by your sides.'),
  ('Stir the Pot', 'A front plank on your forearms, still.'),
  ('Plank Shoulder Taps', 'Do them from your knees, or with feet wider apart.'),
  ('Russian Twist', 'Keep your heels on the floor and use no weight.'),
  ('Kettlebell Swing', 'Kettlebell deadlift: learn the hip hinge without the swing.'),
  ('Barbell Hang Power Clean', 'Kettlebell swing or a jump with the hands on the hips. Learn the clean with a coach first.'),
  ('Turkish Get-Up', 'Do only the first part, up onto your elbow, with no weight.'),
  ('Medicine Ball Overhead Slam', 'Use a lighter ball.'),
  ('Burpees', 'Step back and forward instead of jumping, and skip the push-up.'),
  ('Broad Jump', 'Shorter jumps, sticking each landing for 2 seconds.'),
  ('Tuck Jumps', 'Squat jumps without the knee tuck, sticking each landing.'),
  ('Single-Leg Box Jump', 'Box jump on two feet onto a low box.'),
  ('Skater Hops', 'Smaller side-to-side steps, pausing on each leg.'),
  ('Approach Vertical Jump', 'Standing vertical jump, sticking the landing.'),
  ('Single-Leg Lateral Line Hops', 'Two-foot hops over the line.'),
  ('Split Squat Jumps', 'Split squats without the jump.'),
  ('Hurdle Hops', 'Hop over a line on the floor, or one low hurdle at a time with a pause.'),
  ('Medicine Ball Overhead Backward Toss', 'Use a lighter ball and a smaller throw.'),
  ('Rim Touches', 'Jump and touch the backboard or a high wall mark you can reach, then land soft.'),
  ('Alternate-Leg Bounds', 'Skips for height, landing softly.'),
  ('Deep Squat Hold', 'Hold the squat with your hands on a doorframe or post for support.'),
  ('Pigeon Stretch', 'Lying figure-4 glute stretch on your back.'),
  ('17s (Sideline-to-Sideline Sprints)', 'Run 10 widths instead of 17, or jog the last few.'),
  ('Suicides (Line Drills)', 'Run to the first two lines only, or walk back each time.'),
  ('Defensive Slide Intervals', 'Shorter work, such as 15 seconds on and 30 seconds off.'),
  ('Full-Court Sprints', 'Half-court sprints, or build-ups to about 80 percent effort.'),
  ('Jump Rope', 'Shorter rounds of 20 seconds, or skip in place without a rope.'),
  ('Mountain Climbers', 'Slower steps, with your hands on a bench.'),
  ('Copenhagen Plank', 'Short lever: rest your knee on the bench instead of your foot.'),
  ('Spanish Squat', 'Wall sit with your hips higher than your knees.'),
  ('Reverse Nordic', 'Lean back only a little, or hold a short lean for 5 seconds.'),
  ('Peterson Step-Up', 'Lower step, holding a wall for balance.'),
  ('Single-Leg Balance Reach', 'Single-leg balance, holding a wall with one hand, without the reach.'),
  ('Glute Bridge', 'A smaller lift, holding the top for 2 seconds.'),
  ('Banded Glute Bridge', 'Glute bridge without the band.'),
  ('Bird Dog', 'Move only an arm or only a leg at a time.'),
  ('Bicycle Crunch', 'Dead bug: lying on your back, lower one leg at a time.'),
  ('Reverse Crunch', 'Lying knee tucks with your feet on the floor, lifting one knee at a time.'),
  ('World''s Greatest Stretch', 'Do it with your back knee down on the floor.'),
  ('Snap Downs', 'Drop slowly into your athletic stance and hold it, then speed up.'),
  ('Farmer''s Carry', 'Lighter weights and a shorter walk.'),
  ('Suitcase Carry', 'Lighter weight and a shorter walk.'),
  ('Sled Push', 'Less weight on the sled and a shorter push.'),
  ('5-10-5 Pro Agility Shuttle', 'Walk through the pattern, then jog it, before going flat out.'),
  ('Lateral Band Walk', 'Side steps without the band.'),
  ('Wall Slides', 'Slide only as high as you can keep your arms on the wall.'),
  ('Prone Y-T-W Raises', 'Do them with no weight, or only the Y and T.')
) AS v(name, easier)
WHERE e.is_system AND e.name = v.name;

-- =============================================================================
-- 4. SPRINT TESTS IN METRES
-- =============================================================================
-- 10 and 20 metre sprints, timed in seconds, the distances clubs in Ireland
-- and Europe test. The 40 yard dash and the 3/4 court sprint stay.
ALTER TABLE public.performance_tests DROP CONSTRAINT IF EXISTS performance_tests_test_type_check;
ALTER TABLE public.performance_tests ADD CONSTRAINT performance_tests_test_type_check CHECK (test_type IN (
  'standing_vertical',
  'approach_vertical',
  'sprint_three_quarter',
  'sprint_40yd',
  'sprint_10m',
  'sprint_20m',
  'lane_agility',
  'pro_agility_5_10_5',
  'standing_broad_jump',
  'custom'
));

-- =============================================================================
-- 5. GROWING PAINS
-- =============================================================================
INSERT INTO public.guides (slug, category, title, summary, reading_minutes, sections, display_order) VALUES
('growth-spurts-sore-knees-heels', 'injury_prevention', 'Growth Spurts, Sore Knees and Sore Heels', 'Sore knees or heels during a growth spurt are common in young players. Learn what is going on, how to keep playing sensibly, and when to get checked.', 6, '[{"heading":"Why growing can hurt","body":"During a growth spurt your bones grow faster than your muscles and tendons can keep up. The tendons pull hard on the spots where they attach to growing bone, and running and jumping pull on them hundreds of times a session.\n\nThat is why sore knees and heels are so common in players aged about 10 to 15. It is usually not serious, and it settles once your growth slows down. It can come and go for a year or more, though, so it is worth knowing how to manage it."},{"heading":"Sore just below the kneecap","body":"Pain and sometimes a bony bump just below the kneecap, where the tendon joins the shin bone, is often Osgood-Schlatter. It is common in jumping sports like basketball.\n- It is usually worse when jumping, running, kneeling or going up stairs\n- It often hurts more after training than during it\n- Pain right at the bottom tip of the kneecap is a similar problem called Sinding-Larsen-Johansson\n\nBoth usually settle as you finish growing."},{"heading":"Sore heels","body":"Pain at the back or bottom of the heel, often in both heels, is often Sever''s. It is common between about 8 and 14.\n- It is usually worse when running and jumping, and after games\n- You might limp first thing in the morning or after sitting\n- Squeezing the sides of the heel bone often hurts\n\nCushioned shoes and not playing in worn-out trainers can help a lot."},{"heading":"How to keep playing sensibly","body":"Most players can keep training. Use the pain as your guide on a scale of 0 to 10:\n- Up to about 3 out of 10 during training, and settled by the next morning: keep going\n- More than that, or still sore the next day: cut back on jumping and sprinting for a few days\n\nThings that help:\n- Fewer jumps and sprints in a week, and no big jumps in how much you train\n- A day off between hard sessions, and not two games in one day when you can avoid it\n- Ice wrapped in a towel for 10 to 15 minutes after training\n- Calf and thigh stretches after you play\n- Strength work a physio shows you, which often helps more than rest alone\n- Good sleep and proper meals: growing takes energy too"},{"heading":"Training during a growth spurt","body":"Your coordination can feel off for a few months while you grow. That is normal, and it comes back.\n- Keep working on technique, landing and balance\n- Keep strength work to bodyweight and light weights, and build up slowly\n- Watch out for a sudden jump in training, like a camp or a busy week of games\n- Measure your height every few months: fast growth is when soreness tends to show up"},{"heading":"When to see a doctor or physio","body":"See a doctor or physiotherapist if:\n- The pain is there at night or when you are resting\n- There is swelling, redness or heat, or you feel unwell or have a temperature\n- You are limping and it does not settle within a few days\n- It started with a fall, a twist or a pop\n- You have pain in the hip or groin, or knee pain with a limp. In teenagers knee pain can come from the hip, and that needs checking\n- It is getting worse over a few weeks, or one spot is very tender to touch\n\nThis guide is general information, not a diagnosis. If you are under 18, tell a parent, guardian or coach so they can help you get checked."}]'::jsonb, 15)
ON CONFLICT (slug) DO NOTHING;
