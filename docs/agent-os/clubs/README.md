# Clubs and leagues

Kept by the club-growth agent (`.claude/agents/club-growth.md`). Both files
open in Excel or Google Sheets.

- `directory.csv`: Irish basketball clubs, Northern Ireland included, one
  row each: 277 on 2026-10-22. The base is Basketball Ireland's club finder
  (https://ireland.basketball/find-a-club, 254 clubs, town and county from
  each map position via OpenStreetMap). The finder misses clubs, so rows
  also come from the area boards' own club lists (DLBB, Basketball NI), club
  pages, local news and the founder. `status` says which: `verified (...)`
  when a club's own page or a board list shows it, `listed by Basketball
  Ireland` for finder entries not yet confirmed active, `to check (...)`
  when only news or an old source mentions it.
- `leagues.csv`: the competitions a team can play in, by level, gender and
  age group: national senior leagues, national underage leagues and cups,
  each area board's underage leagues, and schools competitions.
- `pipeline.md`: the clubs Deadeye is talking to, by stage.

The app reads both files through `node scripts/build-clubs.mjs`: the home
club picker (`src/data/clubs.json`, from `directory.csv`) and the league a
coach picks for a team (`src/data/leagues.json`, from `leagues.csv`). Run it
after either file changes, and commit the CSV and the JSON together.
`also_known_as` holds other names players search by (for example the Wexford
Blazers for Wexford BC), separated by `;`.

**The `id` column is fixed.** The app stores it (a player's home club, a
team's league), so never change or reuse an id, even when a row's name or
county changes. Leave `id` empty on a new row: the script gives it one and
writes it into the CSV.

## Age groups

Basketball Ireland's national underage rules
(https://www.dlbb.ie/Documents/National%20Underage%20Rules%202022_23.pdf)
set the grades U9 to U18, by year of birth (the season's age limit counts
from 1 January), with U11 and below as development leagues. U20 is national
only (U20 National League and Cup), then senior. Schools use their own
grades (Minor, Junior; U16 and U19 cups). A player may play at most two
grades in their own area board in one season. These are the choices a coach
picks from when making a team.

Every row has its `source` and a `status`: `verified` (seen on the source,
on `last_checked`) or `to check`. Nothing is guessed: a value the source
does not give stays `to check`.

## In the app

1. Players pick their home club from the directory in Settings (00051).
   It is private unless they show it on their card; club-growth sees counts
   of 5 or more only.
2. Coaches pick their team's league from `leagues.csv` at coach setup and
   in Team details (00052). Leagues for the team's age group come first,
   then its county's area board, then schools competitions for a school
   team, then every other competition. "My league isn't listed" is counted
   in the Monday file, so a rise means the list has a gap to fill.

## Sources

The official lists are on Basketball Ireland (`ireland.basketball`, the club
finder and competitions pages), Basketball NI (`basketballni.com`), the area
board sites and club websites. The cloud environment's network must allow
those sites for the agent to read them (see the founder note in the README).
