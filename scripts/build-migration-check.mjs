// scripts/build-migration-check.mjs
// Builds docs/check-migrations.sql, one query the founder pastes into the
// Supabase SQL editor to see which migrations have not been run. Run again
// whenever a migration is added:
//   node scripts/build-migration-check.mjs
//
// Migrations are run by hand and nothing records which have been, so this
// reads every file in supabase/migrations/ and lists what each one creates:
// tables, columns, functions and indexes. The query reports any that are not
// in the database, with the migration they came from. Policies, grants, row
// data and constraints are not checked (a later migration often replaces
// them), so a migration that only changes those is listed as unchecked.
//
// An object a later migration drops is no longer expected, and one it
// recreates is expected again, so the files are read in order.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'supabase/migrations';
const OUT = 'docs/check-migrations.sql';

/** The file without comments: whole-line ones, and trailing ones after an even number of quotes */
function code(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const at = line.indexOf('--');
      if (at === -1) return line;
      const before = line.slice(0, at);
      return (before.match(/'/g) || []).length % 2 === 0 ? before : line;
    })
    .join('\n');
}

const NAME = '"?([a-z_][a-z_0-9]*)"?';
const PUBLIC = '(?:public\\.)?';

/** Objects each migration creates, in file order, minus what a later one drops */
export function expectedObjects(files) {
  // key -> { migration, kind, object, column }
  const live = new Map();
  const checkedBy = new Map();
  for (const { id, text } of files) {
    const sql = code(text);
    // Every create and drop in the file, then applied in the order they appear,
    // so a function dropped and made again in the same file is still expected
    const events = [];
    const find = (re, make) => {
      for (const m of sql.matchAll(re)) events.push({ at: m.index, ...make(m) });
    };
    const add = (kind, object, column = '') => ({ op: 'add', kind, object, column });
    const drop = (kind, object, column = '') => ({ op: 'drop', kind, object, column });

    find(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${PUBLIC}${NAME}(?![a-z_0-9.])`, 'gi'), (m) => add('table', m[1].toLowerCase()));
    find(new RegExp(`drop\\s+table\\s+(?:if\\s+exists\\s+)?${PUBLIC}${NAME}(?![a-z_0-9.])`, 'gi'), (m) => drop('table', m[1].toLowerCase()));

    // ALTER TABLE statements, to the next semicolon: ADD COLUMN / DROP COLUMN
    for (const m of sql.matchAll(new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?public\\.${NAME}([^;]*);`, 'gi'))) {
      const table = m[1].toLowerCase();
      for (const c of m[2].matchAll(new RegExp(`add\\s+column\\s+(?:if\\s+not\\s+exists\\s+)?${NAME}`, 'gi'))) events.push({ at: m.index + c.index, ...add('column', table, c[1].toLowerCase()) });
      for (const c of m[2].matchAll(new RegExp(`drop\\s+column\\s+(?:if\\s+exists\\s+)?${NAME}`, 'gi'))) events.push({ at: m.index + c.index, ...drop('column', table, c[1].toLowerCase()) });
    }

    find(new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${NAME}\\s*\\(`, 'gi'), (m) => add('function', m[1].toLowerCase()));
    find(new RegExp(`drop\\s+function\\s+(?:if\\s+exists\\s+)?public\\.${NAME}\\s*\\(`, 'gi'), (m) => drop('function', m[1].toLowerCase()));

    find(new RegExp(`create\\s+(?:unique\\s+)?index\\s+(?:if\\s+not\\s+exists\\s+)?${NAME}\\s+on\\s+(?:only\\s+)?${PUBLIC}`, 'gi'), (m) => add('index', m[1].toLowerCase()));
    find(new RegExp(`drop\\s+index\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${NAME}`, 'gi'), (m) => drop('index', m[1].toLowerCase()));

    events.sort((a, b) => a.at - b.at);
    for (const e of events) {
      const key = `${e.kind}:${e.object}:${e.column}`;
      if (e.op === 'add') {
        live.set(key, { migration: id, kind: e.kind, object: e.object, column: e.column });
        checkedBy.set(id, (checkedBy.get(id) ?? 0) + 1);
      } else {
        live.delete(key);
        // A dropped table takes its columns with it
        if (e.kind === 'table') for (const k of [...live.keys()]) if (k.startsWith(`column:${e.object}:`)) live.delete(k);
      }
    }
  }
  const unchecked = files.map((f) => f.id).filter((id) => !checkedBy.has(id));
  return { objects: [...live.values()], unchecked };
}

export function buildCheck(files) {
  const { objects, unchecked } = expectedObjects(files);
  const ids = files.map((f) => f.id);
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  const rows = objects.map((o) => `    (${q(o.migration)}, ${q(o.kind)}, ${q(o.object)}, ${q(o.column)})`).join(',\n');
  return `-- docs/check-migrations.sql
--
-- Which migrations have not been run? Paste all of this into the Supabase SQL
-- editor and press Run. It only reads: it changes nothing.
--
-- The first row says how many things it checked and how many are missing. Any
-- other row is one missing thing and the migration it came from: run that
-- migration (supabase/migrations/<number>_*.sql, in number order, all
-- are safe to run again), then run this again.
--
-- It checks the tables, columns, functions and indexes each migration creates.
-- It does not check policies, grants or data, so these migrations, which only
-- change those, cannot be told apart from not being run:
--   ${unchecked.length ? unchecked.join(', ') : 'none'}
--
-- Written by scripts/build-migration-check.mjs from supabase/migrations/
-- (${ids[0]} to ${ids[ids.length - 1]}, ${ids.length} files, ${objects.length} things). Do not edit it by
-- hand: add a migration, then run  node scripts/build-migration-check.mjs
--
-- NOTE ON STYLE: no apostrophes in these comments (see 00035).

WITH expected(migration, kind, obj, col) AS (
  VALUES
${rows}
),
checked AS (
  SELECT
    e.migration,
    e.kind,
    e.obj,
    e.col,
    CASE e.kind
      WHEN 'table' THEN to_regclass(format('public.%I', e.obj)) IS NOT NULL
      WHEN 'column' THEN EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = e.obj AND c.column_name = e.col
      )
      WHEN 'function' THEN EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = e.obj
      )
      WHEN 'index' THEN EXISTS (
        SELECT 1 FROM pg_indexes i WHERE i.schemaname = 'public' AND i.indexname = e.obj
      )
    END AS present
  FROM expected e
)
SELECT result, detail
FROM (
  SELECT 0 AS ord, 'summary' AS result,
         (SELECT count(*) FROM checked) || ' things checked, ' ||
         (SELECT count(*) FROM checked WHERE NOT present) || ' missing' AS detail
  UNION ALL
  SELECT 1, 'missing, from ' || migration,
         kind || ' ' || obj || CASE WHEN col <> '' THEN '.' || col ELSE '' END
  FROM checked
  WHERE NOT present
) t
ORDER BY ord, result, detail;
`;
}

function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => /^\d{5}_.*\.sql$/.test(f))
    .sort()
    .map((f) => ({ id: f.slice(0, 5), text: fs.readFileSync(path.join(DIR, f), 'utf8') }));
  const sql = buildCheck(files);
  fs.writeFileSync(OUT, sql);
  const { objects, unchecked } = expectedObjects(files);
  console.log(`${OUT}: ${objects.length} things from ${files.length} migrations; unchecked: ${unchecked.join(', ') || 'none'}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
