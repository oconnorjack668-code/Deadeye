# Clubs and leagues

Kept by the club-growth agent (`.claude/agents/club-growth.md`). Both files
open in Excel or Google Sheets.

- `directory.csv`: every basketball club on Basketball Ireland's club finder
  (https://ireland.basketball/find-a-club), Northern Ireland included, one
  row each: 254 on 2026-10-22, with town and county from each club's map
  position (OpenStreetMap). The finder can include clubs that have stopped,
  so `status` is `listed by Basketball Ireland` until a club's own site or a
  league confirms it is active. Organisations only: the club's name,
  town, county, area board, levels, underage, girls' and boys' teams,
  website and its public club contact channel. Never a person's name,
  private email or phone, even when a club website shows one; roles such as
  "Children's Officer" are fine.
- `leagues.csv`: the competitions a team can play in, by level, gender and
  age group: national senior leagues, national underage leagues and cups,
  each area board's underage leagues, and schools competitions.
- `pipeline.md`: the clubs Deadeye is talking to, by stage.

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

## Where this goes next

1. The directory becomes the list a player picks their home club from
   (private by default; club-growth sees counts of 5 or more only).
2. `leagues.csv` becomes the list a coach picks from when making a team
   (for example U18 boys → the area board U18 league, the National Cup U18).

Both are app features built later, from these files.

## Sources

The official lists are on Basketball Ireland (`ireland.basketball`, the club
finder and competitions pages), Basketball NI (`basketballni.com`), the area
board sites and club websites. The cloud environment's network must allow
those sites for the agent to read them (see the founder note in the README).
