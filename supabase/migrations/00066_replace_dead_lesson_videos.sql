-- 00066_replace_dead_lesson_videos.sql
--
-- S35: five IQ lesson videos were removed from YouTube (oEmbed 404 on
-- 2026-11-13, still 404 on 2026-11-17), so players saw "Video unavailable".
-- Four of them sit in free sections and Focus Finder links straight to them.
--
-- PROVENANCE. Each replacement was found on YouTube search on 2026-11-17 and
-- checked before being written here:
--   * oEmbed returns 200, and the channel below is the author_name it gave;
--   * the watch page reports status OK, playableInEmbed true, isFamilySafe true;
--   * the English transcript was read to confirm the clip teaches what the
--     lesson's title and takeaways say (notes per row below).
-- The other 31 lesson ids were rechecked the same day and all return 200.
--
-- duration_minutes is set to the new clip's length (rounded up), because the
-- lesson card and Focus Finder show it next to the video.
--
-- Rows are matched by the dead video id, so this touches only those five rows,
-- is SAFE TO RE-RUN, and never overwrites a video an admin has since chosen on
-- /admin/demo-videos.

WITH replacement(old_vid, new_vid, channel, minutes) AS (
  VALUES
    -- Shooting: "The One-Motion Shooting Dip & Kinetic Chain"
    -- "Why Every Great NBA Shooter Dips the Ball" (9:54). Shows the best
    -- shooters dipping, why the dip does not slow the shot, and the rhythm and
    -- power it adds.
    ('rCwr_b4sVQE', 'mrTpz7xzHB4', 'Scot Shot Basketball', 10),
    -- Shooting: "Shot Pocket Alignment & Guide Hand Discipline"
    -- "How To Eliminate Thumb Flicking" (5:39), NBA shooting coach. Hand
    -- centred under the ball, elbows kept together, a quiet guide hand, and why
    -- an off-centre hold makes the thumb push the ball sideways.
    ('b7r-YJ6kLz8', 'u-pcfLpZc3A', 'Rob Fodor - The Shooting Guy', 6),
    -- Finishing: "The Veer Finish: Contact Absorption and Rim Protection"
    -- "Play Through Contact with the Veer Finish" (6:53), DJ Sackmann. Hit the
    -- defender first to keep your line, then extend away; footwork broken down.
    ('W5b7fN_zRkk', 'FaDYYqmKtxM', 'HoopStudy', 7),
    -- Pick & roll: "Reading Drop Coverage: Snaking & Mid-Range Floaters"
    -- "Attacking Drop Coverage | Ball Screen Offense" (3:12). Reject, pull-up
    -- in space, turn the corner, the hostage dribble into a floater, and
    -- snaking the screen to play 2-on-1 against the big.
    ('k9F7pX2_1sQ', 'GDzn96-jqm8', 'Hooper University', 4),
    -- Transition: "Running the Floor: Lanes, Rim Runs & Early Offense"
    -- "Best Way to Teach Transition Offense (Numbered Fast Break)" (2:33).
    -- Look up the floor at once, wings fill the lanes wide and run all the way
    -- through, the 5 sprints to the block, outnumber the defence before it sets.
    ('JBSAIy6npKY', 'pyqtqAvpOIw', 'Tyler Daniel', 3)
)
UPDATE public.study_items si
SET youtube_video_id = r.new_vid,
    youtube_channel = r.channel,
    duration_minutes = r.minutes
FROM replacement r
WHERE si.youtube_video_id = r.old_vid;
