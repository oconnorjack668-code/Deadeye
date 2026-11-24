-- 00069_age_brackets_backfill.sql
--
-- D4, second half. Moves every stored age bracket to the new values
-- (13-15, 16-17, 18+) that 00068 allowed.
--
-- RUN ONLY AFTER 00068 HAS RUN AND THE D4 APP CODE IS LIVE. The old code
-- does not know 16-17 or 13-15 and would treat them as "not a minor" in coach
-- setup and club entries; the new code reads old and new values alike, so it
-- is safe on either side of this file.
--
-- The answer given at sign-up (age_checks.is_16_plus) decides first, and when
-- it and the old bracket disagree the younger reading wins, because an
-- under-18 treated as an adult is the mistake that matters:
--   said under 16 at sign-up                 -> 13-15 (whatever the bracket)
--   18-22, 23-30 or 30+                      -> 18+
--   14-17 and said 16 or older               -> 16-17
--   13, or 14-17 with no sign-up answer      -> 13-15
-- New values and NULL are left alone. Mirrors backfillBracket in
-- src/lib/ageBracket.ts (tested in __tests__/ageBracket.test.ts).
--
-- One UPDATE, so the rows move together. Re-running changes nothing: every
-- row it touches leaves with a new value, which the WHERE skips. The old
-- values stay in the CHECK; drop them in a later migration once nothing
-- writes them.

UPDATE public.profiles p
SET age_bracket = CASE
    WHEN s.is_16_plus IS FALSE THEN '13-15'
    WHEN p.age_bracket IN ('18-22', '23-30', '30+') THEN '18+'
    WHEN p.age_bracket = '14-17' AND s.is_16_plus IS TRUE THEN '16-17'
    ELSE '13-15'
  END
FROM (
  -- One row per old-value profile, with its sign-up answer or NULL
  SELECT o.id, a.is_16_plus
  FROM public.profiles o
  LEFT JOIN public.age_checks a ON a.user_id = o.id
  WHERE o.age_bracket IN ('13', '14-17', '18-22', '23-30', '30+')
) s
WHERE s.id = p.id;

-- Check after running (expect no rows):
--   SELECT age_bracket, count(*) FROM public.profiles
--   WHERE age_bracket NOT IN ('13-15', '16-17', '18+') GROUP BY 1;
