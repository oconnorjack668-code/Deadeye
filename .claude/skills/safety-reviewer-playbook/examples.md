# Safety reviewer: gold-standard examples

These are examples of the standard to aim at. The branch, files and lines
are made up to show the shape; never copy their findings into a real review.

## Example 1: a BLOCK on a "share your streak" card

```
Skills: all 5 loaded

Safety: BLOCK (exp/E9-streak-share, reviewed 2026-11-12)

Scope: 6 files. data: src/lib/shareCard.ts, supabase/migrations/0042_share_cards.sql.
surface: src/app/(app)/streak/ShareButton.tsx. message: none. access:
src/app/api/share/route.ts. copy: src/app/(app)/streak/page.tsx. none: 1 test file.

BLOCK
1. supabase/migrations/0042_share_cards.sql:8 - table share_cards has RLS
   enabled but no SELECT policy, and the API reads it with the service-role
   key, so any card id returns any player's card - GDPR Art 32, ASVS V8.2 -
   add a SELECT policy on owner_id = auth.uid() and read with the user's
   client in src/app/api/share/route.ts:21.
2. src/lib/shareCard.ts:40 - the card prints the player's county under their
   display name - DPC Fundamental 7 (privacy by default), ICO standard 10
   (geolocation) - drop the county from the card.

FIX SOON
3. src/app/(app)/streak/ShareButton.tsx:15 - "Share" is a large filled button,
   "Keep private" a small grey link - ICO standard 13 (nudges) - give both
   the same weight.

NOTE
4. The card has no expiry. Suggest 30 days.

Data map
| Data | About | Why | Stored | Who reads | Sent to | Export | Delete | Kept |
| streak length, display name | player | the card | share_cards | owner, anyone with link | none | NO (finding 5) | yes, cascade | forever (note 4) |

5. src/app/api/account/export/route.ts - share_cards missing from the export -
   GDPR Art 20 - add it. (BLOCK)

Not checked: the migration was not run; RLS was read from the SQL only.
Supabase advisors not run (connection not available in this session).
```

Why it is good: every block names a line, a standard and a fix; the data
map found a gap (export) the rules alone would miss; it says what it could
not check.

## Example 2: a short PASS

```
Skills: all 5 loaded

Safety: PASS (exp/E10-drill-filter, reviewed 2026-11-12)

Scope: 3 files, all `none` except src/app/(app)/drills/Filter.tsx (surface:
own screen only, no other person sees it). No new data, events, messages,
tables or copy. Checklist run on Filter.tsx: all lines pass or not
applicable. Nothing else to report.
```

Why it is good: a clean branch gets a short answer that still shows the
scope and the check, rather than padding.
