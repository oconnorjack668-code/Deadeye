// scripts/build-clubs.mjs
// Builds the two lists the app reads out of the files the club-growth agent
// keeps in docs/agent-os/clubs/. Run after either file changes:
//   node scripts/build-clubs.mjs
//
//   directory.csv -> src/data/clubs.json    clubs a player picks as home club
//   leagues.csv   -> src/data/leagues.json  competitions a coach picks for a team
//
// Every row has a fixed `id`. The app stores it (player_clubs.club_id,
// teams.league_id), so an id never changes once given, even when the row's
// name or county does. A new row without one gets one here, written back
// into its CSV. Only what the pickers show goes into the JSON. Club rows
// the directory marks as a possible duplicate are left out.
import fs from 'node:fs';

const CLUBS_CSV = 'docs/agent-os/clubs/directory.csv';
const LEAGUES_CSV = 'docs/agent-os/clubs/leagues.csv';

/** One CSV line into fields, with quoted fields that may hold commas */
function fields(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const csvLine = (values) => values.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',');

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

const known = (v) => (v && !v.startsWith('to check') ? v : null);

/**
 * Reads a CSV whose first column is `id` (added if missing), gives each row
 * without an id a new unique one from `idFor`, and writes the file back only
 * when an id was added. Returns the rows as objects.
 */
function readWithIds(file, idFor) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  let cols = fields(head);
  let parsed = lines.map(fields);
  if (cols[0] !== 'id') {
    cols = ['id', ...cols];
    parsed = parsed.map((r) => ['', ...r]);
  }
  const rows = parsed.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? ''])));
  const ids = new Set();
  for (const row of rows) {
    if (!row.id) continue;
    if (!/^[a-z0-9-]{2,90}$/.test(row.id)) throw new Error(`${file}: bad id "${row.id}"`);
    if (ids.has(row.id)) throw new Error(`${file}: id "${row.id}" is used twice`);
    ids.add(row.id);
  }
  let added = 0;
  for (const row of rows) {
    if (row.id) continue;
    const base = idFor(row);
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    row.id = id;
    added++;
  }
  if (added || fields(head)[0] !== 'id') {
    fs.writeFileSync(file, [csvLine(cols), ...rows.map((r) => csvLine(cols.map((c) => r[c])))].join('\n') + '\n');
  }
  if (added) console.log(`${added} new ids written to ${file}`);
  return rows;
}

// ---------------------------------------------------------------- clubs
const clubRows = readWithIds(CLUBS_CSV, (row) => slug(`${row.club} ${known(row.county) || row.country || ''}`));
const clubs = clubRows
  .filter((row) => !/^Possible duplicate/.test(row.notes || ''))
  .map((row) => ({
    id: row.id,
    name: row.club,
    aka: (row.also_known_as || '').split(';').map((a) => a.trim()).filter(Boolean),
    town: known(row.town),
    county: known(row.county),
    country: known(row.country),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
fs.writeFileSync('src/data/clubs.json', JSON.stringify(clubs, null, 1) + '\n');
console.log(`${clubs.length} clubs written to src/data/clubs.json`);

// -------------------------------------------------------------- leagues
const GENDERS = ['men', 'women', 'girls', 'boys', 'men and women'];
const gender = (v) => (GENDERS.includes(v) ? v : null);

/** The team age groups (src/lib/coachSide.ts) a competition is for. Area board leagues run every grade. */
function agesOf(row) {
  if (row.level.startsWith('area board')) return 'all';
  const text = row.age_groups.toLowerCase();
  const ages = [...text.matchAll(/\bu(\d{1,2})\b/g)].map((m) => `U${m[1]}`);
  if (/\bsenior\b/.test(text)) ages.push('Senior');
  return [...new Set(ages)];
}

const kindOf = (level) => (level.startsWith('area board') ? 'area' : level.startsWith('schools') ? 'schools' : 'national');

const leagueRows = readWithIds(LEAGUES_CSV, (row) => slug(`${row.competition} ${gender(row.gender) || ''}`));
const leagues = leagueRows.map((row) => ({
  id: row.id,
  name: row.competition,
  kind: kindOf(row.level),
  cup: /\bcup\b|championship/.test(row.level),
  gender: gender(row.gender),
  ages: agesOf(row),
  region: known(row.region),
}));
fs.writeFileSync('src/data/leagues.json', JSON.stringify(leagues, null, 1) + '\n');
console.log(`${leagues.length} competitions written to src/data/leagues.json`);
