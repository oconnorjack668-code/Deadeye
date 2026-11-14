-- 00059_drill_and_exercise_demo_videos.sql
--
-- Demo videos for the drills and gym exercises.
--
-- 00042 added demo_video_id to drills and exercise_library and an Owner tools
-- page to fill it in by hand, and every row was still empty. This fills in
-- 165 of the 168 drills and 167 of the 167 exercises, the way 00030 did for the
-- 36 IQ lessons.
--
-- PROVENANCE. Every id was found by searching YouTube for the drill or
-- exercise, chosen for being a clear demonstration of that exact drill from a
-- coaching or training channel, and then confirmed against the YouTube oEmbed
-- data (through noembed.com) before being written here: a real, embeddable
-- video returns its title and channel, an invented or private one returns an
-- error. The channel after each row is the author name that check returned.
-- Rows with no good match are left out, so those keep the YouTube search link.
--
-- Only rows still empty are touched, which makes this SAFE TO RE-RUN and means
-- it never overwrites a video the owner has chosen in Owner tools. A video
-- that turns out wrong is changed there, not here.
--
-- NOTE ON STYLE: no apostrophes in the comments of this file (see 00035).

WITH picked(slug, vid) AS (
  VALUES
    ('ball-wraps', 'IC9WsV0vkTo'), -- Jr. NBA Jr. WNBA
    ('behind-the-back-series', 'cGQ7dXW0jCA'), -- Jr. NBA Jr. WNBA
    ('chair-attack-combos', 'i3RxkU_myAY'), -- Revenge Basketball
    ('combo-move-chain', 'i1bQI_esIIw'), -- Get Handles Basketball
    ('cone-crossover-series', 'ZDYOiKPspNc'), -- TR Elite Basketball
    ('cone-weave-dribble', 'vnngDOCy9C8'), -- Kreider Academy
    ('dribble-knockout', 'Y7Bnc3T-S8o'), -- Jr. NBA Jr. WNBA
    ('figure-eight-dribble', '-vafClV92A4'), -- Atlanta Hawks
    ('full-court-speed-dribble', 'FJCpKRjNjNI'), -- STACK Basketball Training
    ('hesitation-series', 'j4opotx5ZQI'), -- HoopStudy
    ('in-and-out-attack', 'iEouBL5515Y'), -- Atlanta Hawks
    ('partner-point-reaction', '7eOI5_utr9s'), -- Basketball Coach Allen
    ('pound-dribble-series', 'o_V-SkoxG4Q'), -- Waikato Basketball
    ('pressure-dribble', 'xaHf5F6M2ic'), -- Be Like David | Basketball
    ('retreat-dribble-crossover', 'dULzc0gf9WQ'), -- Jr. NBA Jr. WNBA
    ('snatch-back-series', '5IZx8i2h4jk'), -- Basketball Coach Allen
    ('spider-dribble', 'QWmmIuBgdEI'), -- Jr. NBA Jr. WNBA
    ('between-legs-stationary', 'KIBJzEn_QG8'), -- Jr. NBA Jr. WNBA
    ('stationary-crossover', 'fuCNf4nmDpM'), -- Jr. NBA Jr. WNBA
    ('tennis-ball-toss-dribble', 'iMqpqRwpRSY'), -- Ryan Bennett
    ('tennis-ball-wall-reaction', '9SAgWbGVdGI'), -- HoopsKing.com Basketball & Vertical Jump Training
    ('two-ball-alternating', 'AH8jtkNA5KU'), -- Jr. NBA Jr. WNBA
    ('two-ball-cone-series', 'UE3lzWXAHRo'), -- Hooper Hands Basketball
    ('two-ball-crossover', 'DOh7y6Bb43I'), -- AvcssBasketball
    ('two-ball-full-court', 'vDf1_hYaL5Q'), -- Teach Hoops
    ('two-ball-pound', '6nfnBHvDkRk'), -- Jr. NBA Jr. WNBA
    ('v-dribble', '2ZJjNwDRCSc'), -- ATTACKBball
    ('weak-hand-full-court', '1f2MHEmVq8g'), -- Teach Hoops
    ('weak-hand-stationary', '9WnMuyeynmw'), -- Teach Hoops
    ('zig-zag-change-of-direction', '0EdjJWsDrgs'), -- STACK Basketball Training
    ('seventeens', 'frGPRBNfML4'), -- ExpertVillage Leaf Group
    ('box-drill', 'sz45B4GpEXw'), -- Jr. NBA Jr. WNBA
    ('defensive-slide-intervals', 'UCiW3MgP3qc'), -- FITLIGHT®
    ('ball-line-drills', 'NZx5yNqbFVU'), -- Kyle Knapp
    ('full-court-dribble-sprints', 'MJ4sCMcN59k'), -- Basketball Coach Allen
    ('full-court-layup-challenge', 'FMr6okonZWA'), -- Teach Hoops
    ('line-drills', 'yC7PGKj_Z0U'), -- Teach Hoops
    ('sprint-and-shoot-intervals', 'GKNrhUQqRaA'), -- Teach Hoops
    ('sprint-backpedal-transitions', 'maLCYwjVz8U'), -- Brandon Smitley
    ('after-game-recovery', 'Ee1reoBypmY'), -- SIKANA English
    ('cool-down-stretch', 'RMTV4LO3A-I'), -- Pro Training Basketball
    ('closeout-one-on-one', 'FWWi46rqCec'), -- Jr. NBA Jr. WNBA
    ('closeout-contest-reads', '2TpUQ_ByjTo'), -- Matt Hackenberg
    ('closeout-fundamentals', '4RuYhzwnzDE'), -- FIBA Basketball
    ('closeout-sprint-series', 'Bg1ZlDzvF3g'), -- Coach Ashworth
    ('defensive-stance-holds', '4A6KqSJX8Ek'), -- Jr. NBA Jr. WNBA
    ('deny-help-recover', '1IIXPKl3ORw'), -- ATTACKBball
    ('full-court-contain', 'OJA552n_S6I'), -- FastModel Sports
    ('help-and-recover', 'BOxdd58MGUg'), -- STACK Basketball Training
    ('lane-slides', 'NbHmxPEfjPw'), -- ATTACKBball
    ('mirror-drill', 'iZRP7KegKf4'), -- NBA India
    ('shell-drill', 'KR0MGDd3ivM'), -- Championship Productions
    ('slide-turn-sprint', 'jSjLoE-iBXU'), -- SportsEdTV Basketball Training
    ('wing-deny', 'ChtoyPTZQ9E'), -- TeamSnap
    ('zig-zag-live', 'CZs62MXYN9U'), -- Teach Hoops
    ('zig-zag-slides', 'ZNLUAwzs8R8'), -- FastModel Sports
    ('and-one-contact-finishes', 'RZNRsrpNGdk'), -- Basketball Coach Allen
    ('baseline-reverse-layups', 'IGcalXmWUwA'), -- iSportdotcom
    ('chair-euro-finishes', 'KBhaNvU0xb8'), -- Teach Hoops
    ('euro-step', 'YlLibwaQJF0'), -- Jr. NBA Jr. WNBA
    ('floater-series', 'm2XrJ2aUnSw'), -- Grizzlies Youth Basketball
    ('gallop-finish', 'p88Tll8I_Tk'), -- Teach Hoops
    ('hesi-runner', 'kqrPfyk_c1Y'), -- DeepGame
    ('inside-hand-finishes', 'tVshPYhQkVw'), -- Teach Hoops
    ('jump-stop-finishes', 'hBRJF-fMZVo'), -- Matt Hackenberg
    ('long-gather-finishes', 'qhHC-_5JOFs'), -- BBALLBREAKDOWN
    ('mikan-drill', '1KHd0e2gzaE'), -- Ultimate Fieldhouse
    ('off-foot-layups', '52bAFA_xX0M'), -- Jr. NBA Jr. WNBA
    ('pad-contact-finishes', 'XdI4JZiXYPs'), -- Daily Training Advisor
    ('power-layup-series', 'PEbbtIm7m8c'), -- Better Basketball Training (Ozswoosh)
    ('pro-hop-finish', 'OYrgDbnsCMs'), -- CoachUp
    ('reverse-mikan', 'k5mZE2STy0w'), -- Teach Hoops
    ('scoop-layup', 'xWFBva-6N54'), -- Better Basketball Training (Ozswoosh)
    ('speed-layups', 'FMr6okonZWA'), -- Teach Hoops
    ('spin-move-finish', '_5eXYcdjJk4'), -- ATTACKBball
    ('two-ball-mikan', 'PXS6CEI8KPk'), -- Don Kelbick
    ('weak-hand-layups', '0zxH0i60AXM'), -- AvcssBasketball
    ('one-two-step-vs-hop', 'uxkg9NJfBFo'), -- HoopsKing.com Basketball & Vertical Jump Training
    ('catch-and-face-up', 'Z7lGBD0NO5M'), -- HoopStudy
    ('closeout-attack', 'uV5cx3uc1Gk'), -- Basketball Coach Allen
    ('jab-series', '1-rR3Ju1wFU'), -- Dr. Dish Basketball
    ('jump-stop-landings', '94nJmvt-6qo'), -- Atlanta Hawks
    ('ladder-into-attack', 'LA-rlTRNTm0'), -- ATTACKBball
    ('partner-closeout-reads', 'vc1ykUu1vYo'), -- Catalyst Basketball by Reid Ouse
    ('pivot-series', 'sscAu51rULA'), -- Basketball Coach Allen
    ('pressure-pivots', 'HHsLPiaKCys'), -- Tuggeranong Vikings Basketball Club
    ('rip-through-attack', 'IzMWYUO9tVw'), -- Teach Hoops
    ('shot-fake-sweep', 'Uv323KLwytA'), -- Jr. NBA Jr. WNBA
    ('triple-threat-stance', 'WT_5ICbp8Vs'), -- Dr. Dish Basketball
    ('two-on-one-fast-break', 'M9Acu3IlURQ'), -- Jr. NBA Jr. WNBA
    ('three-on-two-continuous', 'eECuJUbSV4M'), -- AvcssBasketball
    ('backdoor-cut-reads', 'y1lZHcZAooM'), -- Basketball Coach Allen
    ('down-screen-reads', 'M2O9ikIFRYc'), -- Patryk Janiszewski
    ('fill-the-lanes', 'm96bPUywETQ'), -- Coach Keiths Basketball Plays and Drills
    ('give-and-go', 'LOL5ZNuP7vk'), -- SIKANA English
    ('l-cuts-from-the-block', 'cnFw7hjmqJY'), -- TeamSnap
    ('pass-cut-and-replace', 'OghnErJAEgc'), -- IBSA Basketball
    ('setting-a-legal-screen', 'Ruce8Fb7zTY'), -- Jr. NBA Jr. WNBA
    ('solo-cutting-footwork', 'N_HapxN41rE'), -- ATTACKBball
    ('v-cuts-to-get-open', '5GieoIHIxp4'), -- DICKS
    ('three-man-weave', 'glc6aHFYHNk'), -- IMG Academy
    ('bounce-pass-targets', 'I51V7lR28S4'), -- City of Issaquah
    ('drive-and-kick-reads', 'DkuG1yg7mm8'), -- Teach Hoops
    ('one-hand-push-pass', 'iOg01XzP3cU'), -- ATTACKBball
    ('partner-passing-series', 'Z9vsaj_9ZIU'), -- Coach Ashworth
    ('pass-under-pressure', 'hF6XdlhEX44'), -- Matt Hackenberg
    ('pocket-pass', 'gKjA49hyCqY'), -- magichefff
    ('rapid-fire-wall-passes', 'LKlxJyKflsI'), -- Teach Hoops
    ('rebound-and-outlet', 'yWcTmFoc5Hw'), -- Basketball Coach Allen
    ('skip-pass-reads', 'hijb6RY-dfM'), -- Teach Hoops
    ('two-ball-partner-passing', 'OPvpJ25psO8'), -- Motion Reads
    ('wall-chest-passes', 'MEfbnNR6pOk'), -- Teach PE
    ('counter-move-series', 'PyOljquBt3E'), -- BTII Basketball
    ('drop-step-series', 'wCVz66ML7bY'), -- MentalMinded Basketball
    ('jump-hook', '3CPAs-nstng'), -- ATTACKBball
    ('post-entry-feed', '2hJI6oXB7Y4'), -- Jr. NBA Jr. WNBA
    ('post-face-up-series', 'sFz5lCkf1zw'), -- Dr. Dish Basketball
    ('post-seal-and-target', 'dTzfpwqW8Yo'), -- DICKS
    ('post-through-contact', 'A6Oiwr3Zrpc'), -- Matt Hackenberg
    ('up-and-under', 'h-FP8ieKi7U'), -- Jr. NBA Jr. WNBA
    ('rebound-war', 'RLtg2hzqD3Y'), -- Jon Pippert
    ('backboard-tips', 'nX1yyi66DlA'), -- AvcssBasketball
    ('circle-box-out', 'LNtzyGzt-Hs'), -- Teach Hoops
    ('offensive-rebound-pursuit', 'lBtOk7pzAf0'), -- TeamSnap
    ('partner-box-out', 'bhTAm_1UflA'), -- Jr. NBA Jr. WNBA
    ('putback-series', 'lRHw0-U2nO0'), -- Coach Koran Godwin
    ('superman-rebounding', 'aX7NJTOYVPM'), -- IMG Academy
    ('toss-rebound-chin', 'gQNmBiAvJHI'), -- Jr. NBA Jr. WNBA
    ('ten-in-a-row-free-throws', 'B73cjR_leT0'), -- TeacherRobScotlan
    ('hundred-makes-challenge', 'y9aeCO2nuzU'), -- Trae Ball
    ('thirty-one', 'pFRjsJXz_5Q'), -- HoopsKing.com Basketball & Vertical Jump Training
    ('five-spot-threes', 'qwhx3s8LVnA'), -- Tyler Relphs Hoop Dynamic
    ('five-spot-midrange', 'Ae_yfNeo12c'), -- DICKS
    ('around-the-world', 'aK8_HwbWlfs'), -- Teach Hoops
    ('bank-shot-series', 'dr0zUcQ4Mwg'), -- The Basketball Shooting Coach
    ('beat-the-pro', 'LlPdpW6l1SQ'), -- PGC Basketball - Point Guard College
    ('chair-curl-jumpers', '-7d982EXhsE'), -- Teach Hoops
    ('contested-partner-shooting', 'U6d-IhBpfgw'), -- Brian McCormick
    ('corner-three-series', 'uKFm34Gcny4'), -- By Any Means Basketball
    ('drift-and-relocate', 'CeeWW7Vmcpc'), -- Detailed Game
    ('elbow-to-elbow-shooting', 'qSo8owvIRwU'), -- AvcssBasketball
    ('form-shooting-ladder', 'ObQ1jfxiJ3I'), -- Atlanta Hawks
    ('free-throw-pressure-ladder', 'LTyUlgdAp8c'), -- Teach Hoops
    ('free-throw-routine-builder', 'PPIPlRPBdtA'), -- Atlanta Hawks
    ('hesi-pull-up', '0QlyTcwA-Ys'), -- ATTACKBball
    ('hop-vs-one-two-shooting', 'ow16151mQDE'), -- ILoveBasketballTV
    ('knockout', 'C_0ccXOz2QI'), -- Jr. NBA Jr. WNBA
    ('lie-down-form-shots', 'v7Y_RK8lLpI'), -- The Basketball Shooting Coach
    ('one-dribble-pull-up', 'fhWSIpUnePY'), -- The Basketball Shooting Coach
    ('form-shooting-one-hand', 'wzY4SVCzF7Y'), -- Dr. Dish Basketball
    ('partner-minute-shooting', 'H0zZf38UIqA'), -- PGC Coaching
    ('shot-fake-one-dribble', 'hUhC8TAim3E'), -- CoachTube
    ('side-step-three', 'ElZ3crrkKI4'), -- MrMike Production
    ('spin-out-catch-and-shoot', 'zUCr5K8ijFY'), -- BreakthroughBBall
    ('sprint-back-threes', '5YjGYzd-D9w'), -- 5T Hoops
    ('star-shooting-drill', 'jeDYzYfbgMQ'), -- DICKS
    ('step-back-jumper', 'mnN-DPBPMrQ'), -- BBALLBREAKDOWN
    ('tired-legs-free-throws', 'UN_gadc5aTk'), -- Teach Hoops
    ('transition-pull-ups', 'RFkVJx53q90'), -- Coach Reese
    ('two-dribble-pull-up', 'i0vvo180atk'), -- ILoveBasketballTV
    ('wall-target-shooting', 'ZmoZndyWXxE'), -- HoopClinics
    ('ball-warm-up', 'W1abDeKo7RU'), -- HoopStudy
    ('court-warm-up', 'kI72juFRuEI'), -- SIKANA English
    ('jump-and-land-warm-up', 'glnA5hh4EXs'), -- RC Performance Training
    ('pre-game-warm-up', 'X2TQ9HwiqOw') -- Justin Cooper
)
UPDATE public.drills d
SET demo_video_id = p.vid
FROM picked p
WHERE d.slug = p.slug
  AND d.demo_video_id IS NULL;

WITH picked(name, vid) AS (
  VALUES
    ('Band Pull-Aparts', 'B5pg51YcXiU'), -- Horton Barbell
    ('Barbell Bent-Over Row', 'bm0_q9bR_HA'), -- National Academy of Sports Medicine (NASM)
    ('Chest-Supported Dumbbell Row', '2ByilQ4NaAs'), -- Andrew Kwong (DeltaBolic)
    ('Chin-Ups', 'nILkwSyrE3Y'), -- KILO Strength Society Education
    ('Inverted Row', 'sHeLHRd_nCs'), -- Athletic Insight
    ('Kettlebell Gorilla Row', 'DhxkHHRez7w'), -- OPEX Fitness
    ('Lat Pulldown', 'trZQjegcRx0'), -- Muscle & Motion
    ('Neutral Grip Pull-Ups', 'cd_38C6LuvY'), -- OPEX Fitness
    ('Prone Y-T-W Raises', 'DREKi2KYkOU'), -- CrossFit Invictus
    ('Pull-Ups', '9yVGh3XbJ34'), -- National Academy of Sports Medicine (NASM)
    ('Renegade Row', 'PJpTBj4ilZw'), -- Rogue Fitness
    ('Resistance Band Row', 'ysAjxPSFC7M'), -- Horton Barbell
    ('Reverse Dumbbell Fly', 'JoCRRZ3zRtI'), -- HybridFitness
    ('Seated Cable Row', 'EU7bOadUsNI'), -- Steev
    ('Single-Arm Dumbbell Row', 'ZRSGpBUVcNw'), -- PureGym
    ('Straight-Arm Cable Pulldown', 'duHQk2PxNos'), -- Steev
    ('Barbell Curl', 'hvB6g3sbWZg'), -- Revive Stronger
    ('Cable Curl', '5z4y7QRTx1w'), -- Physique Development
    ('Concentration Curl', 'dgvKbfP6lTU'), -- LIVESTRONG
    ('Dumbbell Hammer Curl', 'CFBZ4jN1CMI'), -- National Academy of Sports Medicine (NASM)
    ('EZ-Bar Preacher Curl', 'PIRJogU2-dw'), -- Live Lean TV Daily Exercises
    ('Incline Dumbbell Curl', 'ec3wC5szm90'), -- OriGym
    ('Resistance Band Curl', 'oXAMW-LNX_Q'), -- Fit2Go Personal Training
    ('Bent-Knee Soleus Raise', 'C3tLEvqrW4E'), -- Greg Lehman - Movement Optimism
    ('Eccentric Heel Drops', 'FGS9nn59jF8'), -- INSYNC PHYSIO Vancouver
    ('Farmer''s Walk on Toes', 'wVb-RsmNH0Y'), -- OriGym
    ('Leg Press Calf Press', 'dhRz1Ns60Zg'), -- PureGym
    ('Seated Calf Raise', '6O5hh1rBtx8'), -- Colossus Fitness
    ('Single-Leg Calf Raises', '_rKgZMP1X5o'), -- Horton Barbell
    ('Standing Machine Calf Raise', 'ndQc4mz4mBU'), -- Steev
    ('Barbell Bench Press', 'CayG6UYqL8g'), -- National Academy of Sports Medicine (NASM)
    ('Cable Chest Fly', 'J2h--eoHK_U'), -- Andrew Kwong (DeltaBolic)
    ('Chest Dips', 'CclRYasxxio'), -- Live Lean TV Daily Exercises
    ('Decline Push-Ups', 'aq2xZxfrQlM'), -- National Academy of Sports Medicine (NASM)
    ('Dumbbell Bench Press', 'Y_7aHqXeCfQ'), -- ScottHermanFitness
    ('Dumbbell Chest Fly', 'QENKPHhQVi4'), -- Mind Pump TV
    ('Dumbbell Floor Press', 'T0Y3OBF1bNI'), -- PureGym
    ('Incline Dumbbell Press', 'sh5ZsRpEZCw'), -- All Strength Training
    ('Machine Chest Press', 'B-zyH8OTlsg'), -- Hammer Fitness
    ('Medicine Ball Chest Pass', 'e-zHTwXA8mE'), -- Viking Strength Systems
    ('Plyometric Push-Ups', 'MH4gcTKQiEc'), -- National Academy of Sports Medicine (NASM)
    ('Push-Ups (Tempo)', '5L563R411HQ'), -- Breaking Muscle
    ('17s (Sideline-to-Sideline Sprints)', 'frGPRBNfML4'), -- ExpertVillage Leaf Group
    ('5-10-5 Pro Agility Shuttle', '9TiLF0n6n-M'), -- NCSA College Recruiting
    ('Air Bike Intervals', '7b6n9Xuc3CA'), -- HUMN
    ('Defensive Slide Intervals', 'g3VcA1cc0d8'), -- Coaching U
    ('Full-Court Sprints', 'ksbYY4ReC7Q'), -- Dre Baldwin - Work On Your Game
    ('Jump Rope', 'FJmRQ5iTXKE'), -- Jump Rope Dudes
    ('Mountain Climbers', 'gW-q50V6Z_0'), -- Born Fitness
    ('Suicides (Line Drills)', 'MPL487ToJt8'), -- LIVESTRONG
    ('Ab Wheel Rollout', 'nCh8VfWY5_g'), -- Redefining Strength
    ('Bicycle Crunch', 'VaL7XWK3MVE'), -- Medbridge
    ('Bird Dog', 'wGh2fZU20-M'), -- Mind Pump TV
    ('Cable Woodchopper', 'he4IhLc1d5k'), -- Live Lean TV Daily Exercises
    ('Dead Bug (Contralateral)', 'bxn9FBrt4-A'), -- National Academy of Sports Medicine (NASM)
    ('Front Plank', 'mwlp75MS6Rg'), -- National Academy of Sports Medicine (NASM)
    ('Half-Kneeling Cable Lift', 'JiIyEQbj0M0'), -- Mike Robertson
    ('Hanging Leg Raises', 'Nw0LOKe3_l8'), -- Bodybuilding.com
    ('Hollow Body Hold', 'EsnM8eBtazU'), -- OPEX Fitness
    ('Landmine Rotation', 'WnbP_2bWdKE'), -- Your House Fitness
    ('Medicine Ball Rotational Scoop Toss', 'CXu7YeWTptE'), -- Premier Fitness Systems
    ('Pallof Press', 'HXrLaqNIkTs'), -- PureGym
    ('Plank Shoulder Taps', 'cqjbfXLh_DE'), -- Your House Fitness
    ('Reverse Crunch', 'XY8KzdDcMFg'), -- PureGym
    ('Russian Twist', '99T1EfpMwPA'), -- PureGym
    ('Side Plank', '44ND4bOB-T0'), -- National Academy of Sports Medicine (NASM)
    ('Stir the Pot', 'nXxXaQU_An8'), -- Kyra Williams
    ('Suitcase Carry', 'cF_CrM2eC4U'), -- Third Space London
    ('Dead Hang', 'jBZCzK9zlxk'), -- Dr. Allan Bacon
    ('Dumbbell Reverse Wrist Curls', 'h6UxiMoPm5c'), -- Sarantos Fitness
    ('Dumbbell Wrist Curls', 'VGkF2NTtao0'), -- Catalyst Athletics
    ('Farmer''s Carry', '8OtwXwrJizk'), -- PureGym
    ('Fingertip Push-Ups', '9wxBsNhimAc'), -- HASfit
    ('Plate Pinch Hold', 'pdqQTrge21E'), -- Jedd Johnson
    ('Barbell Hang Power Clean', '5xVcZOPywNI'), -- OPEX Fitness
    ('Burpees', 'OO7-dWIy0W8'), -- National Academy of Sports Medicine (NASM)
    ('Kettlebell Swing', '6A0yJetx7hg'), -- PureGym
    ('Medicine Ball Overhead Slam', 'CkO1mfSBvv4'), -- Third Space London
    ('Sled Push', '1PmO6kzBEc8'), -- Simple Speed Coach
    ('Turkish Get-Up', 'UpRaW-1aKD4'), -- Dr. Meghan Sak-Ocbina PT, DPT, ATC, CSCS
    ('Banded Glute Bridge', 'GaxOodE1Irk'), -- OPEX Fitness
    ('Barbell Hip Thrust', '76t0z3Tdx6Q'), -- Rehab My Patient
    ('Cable Glute Kickback', 'VSgMyiOu0uE'), -- Your House Fitness
    ('Cable Pull-Through', 'A30YKvpWGu4'), -- OPEX Fitness
    ('Curtsy Lunge', '2EyH9MN7hYE'), -- PureGym
    ('Glute Bridge', 'vOvRFsGMMqo'), -- UCLA Health
    ('Single-Leg Hip Thrust', '8o0Qa1fLwjA'), -- Third Space London
    ('Sumo Deadlift', 'HBmLwb9IcaI'), -- Rogue Fitness
    ('Trap Bar Deadlift', 'Vu4oXIRzx7w'), -- Barbell Logic
    ('45-Degree Back Extension', 'a2UrKheEcIc'), -- ThriveTraining
    ('Barbell Good Morning', 'nWyx81AfTos'), -- PureGym
    ('Barbell Romanian Deadlift', 'qWb5Zr98B-M'), -- MuscleWiki
    ('Dumbbell Romanian Deadlift', 'IJdUtnxAmNo'), -- Dr. Jacob Goodin
    ('Lying Leg Curl', 'SbSNUXPRkc8'), -- PureGym
    ('Nordic Hamstring Curl', 'F-AaE8mw_pY'), -- [P]rehab
    ('Single-Leg Hamstring Bridge', 'vfFUqJ3sn88'), -- MalvernPhysio
    ('Single-Leg Romanian Deadlift', 'J1ojvq3ftqM'), -- FIT.nl
    ('Slider Hamstring Curl', 'AlTI3igOaLw'), -- Travis Tarrant
    ('Stability Ball Hamstring Curl', 'Lr-P-k_53o0'), -- True North Strength and Fitness
    ('Ankle Dorsiflexion Knee-to-Wall', 'kbzYML05Vac'), -- The Physio Channel
    ('Banded Ankle Eversion', 'K_iDi5roZSE'), -- Rehab My Patient
    ('Banded Ankle Inversion', '2p-JG2AEZ98'), -- SPARC Physiotherapy
    ('Banded Shoulder External Rotation', 'ybNV36DoRfY'), -- Rehab My Patient
    ('Copenhagen Plank', '5cTh21BfXzI'), -- Horton Barbell
    ('Lateral Band Walk', 'M5uxEQH5BUM'), -- National Academy of Sports Medicine (NASM)
    ('Peterson Step-Up', 'qar1OOaG1O8'), -- KILO Strength Society Education
    ('Reverse Nordic', 'zl1m3DoiAec'), -- Reload Physical Therapy and Fitness
    ('Single-Leg Balance Reach', 'Mo4P9Y_AQt8'), -- National Academy of Sports Medicine (NASM)
    ('Spanish Squat', '3igyh6eqGvc'), -- The Barbell Physio
    ('Terminal Knee Extension', 'Q6JjgU2aNj0'), -- Horton Barbell
    ('Tibialis Raises', '8uKkddYsIDU'), -- Nottingham Physio
    ('90/90 Hip Switches', 'HUZimFZJZWU'), -- Alejandro Matias
    ('Banded Shoulder Pass-Throughs', 'riVxa9By-pM'), -- 66 Days Fitness Coaching
    ('Cat-Cow', 'xyNwxiuERXc'), -- FIT.nl
    ('Couch Stretch (Hip Flexor / Quad)', 'kRSUZPsqBQg'), -- Physio Plus Fitness
    ('Deep Squat Hold', 'IHApHfNA2Ag'), -- Hinge Health
    ('Frog Stretch', 'iMgvBjMJPrI'), -- Dr. Christy Lee
    ('Pigeon Stretch', 'gIezbbRhGec'), -- Revival Performance Physical Therapy
    ('Thoracic Spine Rotations (Open Books)', '917w2gqZwZQ'), -- Petroski Physio
    ('Thread the Needle', '7C8-zj3nRro'), -- Elite Performance Institute
    ('Wall Slides', '9ZBOvVO9JFs'), -- Nottingham Physio
    ('World''s Greatest Stretch', '-CiWQ2IvY34'), -- Squat University
    ('Alternate-Leg Bounds', 'eIjuMzIFREs'), -- Simple Speed Coach
    ('Approach Vertical Jump', '9kj7THx1K_U'), -- Elevate Yourself
    ('Box Jumps', 'YLPQsdRDmB0'), -- Peak Strength
    ('Broad Jump', 'x9qlFXfQaZU'), -- Path Projects
    ('Depth Jumps', 'AzPJZHOmGEg'), -- Wil Fleming
    ('Hurdle Hops', 'dsWxXDJxYi8'), -- Brandon Smitley
    ('Lateral Bound & Stick', 'Biqvx8sMuvs'), -- Exercise Healthcare Australia
    ('Medicine Ball Overhead Backward Toss', 'oQYiazzYkXY'), -- Flow High Performance
    ('Pogo Hops', '9UaKEFD1cDg'), -- Scott Thom
    ('Rim Touches', 'PX7tlUWPCP8'), -- High Jump Help
    ('Single-Leg Box Jump', 'w5PUa6QYpe0'), -- OPEX Fitness
    ('Single-Leg Lateral Line Hops', 'wb5fquy0o5U'), -- VTS Performance
    ('Skater Hops', '9_jLW6VkU8A'), -- BuiltLean®
    ('Snap Downs', 'x1nBhDLUUi0'), -- PLT4M
    ('Split Squat Jumps', 'RtY9kyhuh5I'), -- Northeastern
    ('Tuck Jumps', 'r3D_1tDiBgI'), -- Rehab My Patient
    ('Barbell Back Squat', '-bJIpOq-LWk'), -- National Academy of Sports Medicine (NASM)
    ('Barbell Front Squat', 'yr_8VuSqhmM'), -- National Academy of Sports Medicine (NASM)
    ('Bulgarian Split Squat', 'YFLHDXeekVc'), -- Born Fitness
    ('Dumbbell Step-Ups', 'Zp7RG4jFScw'), -- OPEX Fitness
    ('Dumbbell Walking Lunges', '8fZxWTiIJWo'), -- OPEX Fitness
    ('Goblet Squat', '3O77G_yiFUw'), -- Hammer Fitness
    ('Lateral Lunge', '4NlJdSzHeUg'), -- Childrens Hospital Colorado
    ('Leg Extension', 'iW83kMs0OHw'), -- Jayd Harrison | Personal Trainer
    ('Leg Press', 'cDGOn-yfKJA'), -- National Academy of Sports Medicine (NASM)
    ('Reverse Lunge', '-HjB2x75haE'), -- Born Fitness
    ('Skater Squat', '1poLHq0Zfxo'), -- Horton Barbell
    ('Wall Sit', 'cWTZ8Am1Ee0'), -- Medbridge
    ('Arnold Press', 'TUHL8dXFvTg'), -- Well+Good
    ('Band Face Pulls', 'PYj77in44ms'), -- Horton Barbell
    ('Cable Lateral Raise', 'qghfvzcoS2I'), -- Horton Barbell
    ('Dumbbell Lateral Raise', 'nnH63icHYXY'), -- FIT.nl
    ('Half-Kneeling Single-Arm Kettlebell Press', 'UADDmT2rBCc'), -- OPEX Fitness
    ('Landmine Press', '7eb_ziZFduE'), -- FIT.nl
    ('Overhead Dumbbell Push Press', 'vuaYVK8xyqo'), -- National Academy of Sports Medicine (NASM)
    ('Pike Push-Ups', 'XckEEwa1BPI'), -- National Academy of Sports Medicine (NASM)
    ('Seated Dumbbell Shoulder Press', '8kwDkC8JhdY'), -- Live Lean TV Daily Exercises
    ('Standing Barbell Overhead Press', 'F3QY5vMz_6I'), -- Buff Dudes
    ('Bench Dips', 'WVeZDBhZwLA'), -- National Academy of Sports Medicine (NASM)
    ('Cable Triceps Pushdown', 'ylk5P1FqdLE'), -- Global Fitness Club
    ('Close-Grip Bench Press', 'CGqKy5wiY8o'), -- OPEX Fitness
    ('Diamond Push-Ups', 'K8bKxVcwjrk'), -- PureGym
    ('EZ-Bar Skull Crushers', 'eluOhtYkm-0'), -- OPEX Fitness
    ('Overhead Cable Triceps Extension', 'KvrP8c6eVBc'), -- OPEX Fitness
    ('Overhead Dumbbell Triceps Extension', 'xbNm9fRoUTw') -- Catalyst Athletics
)
UPDATE public.exercise_library e
SET demo_video_id = p.vid
FROM picked p
WHERE e.name = p.name
  AND e.is_system = true
  AND e.demo_video_id IS NULL;
