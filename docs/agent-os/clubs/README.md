# Clubs and leagues

Kept by the club-growth agent (`.claude/agents/club-growth.md`). Both files
open in Excel or Google Sheets.

- `directory.csv`: every basketball club in Ireland (and Northern Ireland,
  through Basketball NI), one row each. Organisations only: the club's name,
  town, county, area board, levels, underage, girls' and boys' teams,
  website and its public club contact channel. Never a person's name,
  private email or phone, even when a club website shows one; roles such as
  "Children's Officer" are fine.
- `leagues.csv`: the competitions a team can play in, by level, gender and
  age group: national senior leagues, national underage leagues and cups,
  each area board's underage leagues, and schools competitions.
- `pipeline.md`: the clubs Deadeye is talking to, by stage.

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
