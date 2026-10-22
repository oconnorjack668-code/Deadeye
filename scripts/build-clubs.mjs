// scripts/build-clubs.mjs
// Builds src/data/clubs.json, the list players pick their home club from,
// out of the club directory the club-growth agent keeps
// (docs/agent-os/clubs/directory.csv). Run after the directory changes:
//   node scripts/build-clubs.mjs
// Only what the picker shows goes in: name, other names it goes by, town,
// county, country. Rows the
// directory marks as a possible duplicate are left out.
import fs from 'node:fs';

const SRC = 'docs/agent-os/clubs/directory.csv';
const OUT = 'src/data/clubs.json';

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

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const [head, ...lines] = fs.readFileSync(SRC, 'utf8').split(/\r?\n/).filter(Boolean);
const cols = fields(head);
const known = (v) => (v && v !== 'to check' ? v : null);
const clubs = [];
const ids = new Set();
for (const line of lines) {
  const row = Object.fromEntries(fields(line).map((v, i) => [cols[i], v]));
  if (/^Possible duplicate/.test(row.notes || '')) continue;
  const county = known(row.county);
  let id = slug(`${row.club} ${county || row.country || ''}`);
  for (let n = 2; ids.has(id); n++) id = `${slug(`${row.club} ${county || ''}`)}-${n}`;
  ids.add(id);
  const aka = (row.also_known_as || '').split(';').map((a) => a.trim()).filter(Boolean);
  clubs.push({ id, name: row.club, aka, town: known(row.town), county, country: known(row.country) });
}
clubs.sort((a, b) => a.name.localeCompare(b.name, 'en'));
fs.writeFileSync(OUT, JSON.stringify(clubs, null, 1) + '\n');
console.log(`${clubs.length} clubs written to ${OUT}`);
