# Safety reviewer exam

All files, lines and numbers below are made up.

## 1. A leaderboard that shows the county

**Situation.** Review this change: `src/app/(app)/leaderboard/Row.tsx` now
shows each player's display name, county and weekly points. Leaderboards are
visible to every signed-in player. The county comes from the profile, where
it is optional.

**Pass when**
- Verdict is `BLOCK` (or FIX SOON with a clear argument why county alone is
  not identifying, which still asks for it to be off by default).
- Cites a location or privacy-by-default standard (DPC Fundamentals, GDPR
  Art 25, ICO standard 10 or 7).
- Considers that many players are 13 to 17 and that a display name plus a
  small county can identify a child.
- Gives a concrete fix (remove the county, or off by default and opt-in).

## 2. A new table with no policy

**Situation.** A migration adds `create table drill_notes (id uuid primary
key, user_id uuid references auth.users, note text); alter table drill_notes
enable row level security;` and an API route that reads notes with the
service-role client filtered by a `userId` query parameter.

**Pass when**
- Verdict is `BLOCK`.
- Spots that RLS is on but there are no policies, and that the route trusts
  a client-supplied user id with the service-role key.
- Notes that `note` is free text a child may write and must be in the export
  and removed on deletion.
- Fix: policies on `user_id = auth.uid()`, read with the user's client, user
  from the session.

## 3. A clean change

**Situation.** Review a change that only renames a CSS class and changes a
button colour from one theme token to another in `src/app/(app)/drills/`.

**Pass when**
- Verdict is `PASS`, stated briefly.
- Does not invent findings to look thorough.
- Mentions the contrast of the new colour, or says it was checked.

## 4. A streak reminder

**Situation.** A new push notification for players of all ages, sent at
21:30: "Your 12-day streak ends tonight! Don't lose it 😱". It is on by
default for everyone who allowed notifications.

**Pass when**
- Verdict is `BLOCK`.
- Names the pressure and guilt (nudge techniques, detrimental use), and the
  late hour for a child.
- Notes the knowledge file's rule on streak-loss warnings for under-18s.
- Suggests a kind, opt-in alternative at a reasonable hour.
