// __tests__/programContent.test.ts
// Every drill, exercise, lesson and test a programme day points to has to exist.
// A missing one does not fail anywhere: the day page just shows a bare slug, the
// gym logger gets an exercise with no history, or a study link goes nowhere.
// Programme content lives only in SQL, so this reads the SQL itself - every
// migration plus seed.sql - and checks each reference against what those same
// files seed. New programmes are covered the moment their migration is added.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const SUPABASE = path.join(__dirname, '..', 'supabase');
const MIGRATIONS = path.join(SUPABASE, 'migrations');

interface SqlFile {
  name: string;
  /** Migration number, or Infinity for seed.sql. */
  number: number;
  sql: string;
}

const files: SqlFile[] = [
  ...readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, number: parseInt(f, 10), sql: readFileSync(path.join(MIGRATIONS, f), 'utf8') })),
  { name: 'seed.sql', number: Infinity, sql: readFileSync(path.join(SUPABASE, 'seed.sql'), 'utf8') },
];

// ---------------------------------------------------------------------------
// A small SQL reader: just enough for the INSERT ... VALUES shapes used here.
// ---------------------------------------------------------------------------

/** Index just past the string literal opening at `start` ('' is an escaped quote). */
function endOfString(text: string, start: number): number {
  let j = start + 1;
  while (j < text.length) {
    if (text[j] === "'" && text[j + 1] === "'") j += 2;
    else if (text[j] === "'") return j + 1;
    else j++;
  }
  return text.length;
}

/** Top-level statements with comments removed. Strings and $$ bodies stay whole. */
function statements(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (ch === "'") {
      const end = endOfString(sql, i);
      cur += sql.slice(i, end);
      i = end;
    } else if (ch === '$' && /^\$\w*\$/.test(sql.slice(i))) {
      const tag = /^\$\w*\$/.exec(sql.slice(i))![0];
      const close = sql.indexOf(tag, i + tag.length);
      const end = close === -1 ? sql.length : close + tag.length;
      cur += sql.slice(i, end);
      i = end;
    } else if (ch === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      i++;
    } else {
      cur += ch;
      i++;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Reads `(a, b, ...), (c, d, ...)` from `start`. Fields are left as raw SQL. */
function readTuples(text: string, start: number): { rows: string[][]; end: number } {
  const rows: string[][] = [];
  let i = start;
  const skipSpace = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  skipSpace();
  while (text[i] === '(') {
    const fields: string[] = [];
    let field = '';
    let depth = 0;
    i++;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "'") {
        const end = endOfString(text, i);
        field += text.slice(i, end);
        i = end;
        continue;
      }
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') {
        if (depth === 0) break;
        depth--;
      }
      if (ch === ',' && depth === 0) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
      i++;
    }
    fields.push(field.trim());
    rows.push(fields);
    i++; // the closing bracket
    skipSpace();
    if (text[i] !== ',') break;
    i++;
    skipSpace();
  }
  return { rows, end: i };
}

/** The value of a SQL string literal, or the raw text for anything else. */
function literal(raw: string): string {
  const m = /^'([\s\S]*)'$/.exec(raw);
  return m ? m[1].replace(/''/g, "'") : raw;
}

interface Insert {
  file: SqlFile;
  table: string;
  rows: Array<Record<string, string>>;
}

/**
 * Both shapes in use: INSERT INTO t (cols) VALUES (...), and
 * INSERT INTO t (cols) SELECT ... FROM (VALUES (...)) AS v(cols), where the
 * alias names the columns of the VALUES list.
 */
function parseInsert(file: SqlFile, stmt: string): Insert | null {
  const head = /^INSERT\s+INTO\s+(?:public\.)?(\w+)\s*\(([^)]*)\)/i.exec(stmt);
  if (!head) return null;
  let columns = head[2].split(',').map((c) => c.trim());
  const rest = stmt.slice(head[0].length);
  const values = /\bVALUES\b/i.exec(rest);
  if (!values) return null;
  const { rows, end } = readTuples(rest, values.index + values[0].length);
  const alias = /^\s*\)\s*AS\s+\w+\s*\(([^)]*)\)/i.exec(rest.slice(end));
  if (alias) columns = alias[1].split(',').map((c) => c.trim());
  return {
    file,
    table: head[1],
    rows: rows.map((fields) => Object.fromEntries(columns.map((c, i) => [c, literal(fields[i] ?? '')]))),
  };
}

const inserts: Insert[] = files.flatMap((file) =>
  statements(file.sql)
    .map((stmt) => parseInsert(file, stmt))
    .filter((x): x is Insert => x !== null)
);

const rowsOf = (table: string) => inserts.filter((x) => x.table === table).flatMap((x) => x.rows.map((row) => ({ row, file: x.file })));

// ---------------------------------------------------------------------------
// What exists
// ---------------------------------------------------------------------------

const drillSlugs = new Set(rowsOf('drills').map(({ row }) => row.slug));
const exerciseNames = new Set(rowsOf('exercise_library').map(({ row }) => row.name));
const topicSlugs = new Set(rowsOf('study_topics').map(({ row }) => row.slug));

/** The last test_type CHECK list wins, as a later migration would replace it. 'custom' is not a programme test. */
const testTypes = (() => {
  const lists = files.flatMap((f) => [...f.sql.matchAll(/test_type\s+IN\s*\(([^)]*)\)/gi)].map((m) => m[1]));
  const last = lists[lists.length - 1] || '';
  return new Set([...last.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((t) => t !== 'custom'));
})();

const GOALS = ['shooting', 'ball_handling', 'finishing', 'athleticism', 'vertical', 'complete', 'in_season'];

interface ProgramRow {
  slug: string;
  name: string;
  goal: string;
  weeks: number;
  sessionsPerWeek: number;
  displayOrder: number;
  file: SqlFile;
}

const programs: ProgramRow[] = rowsOf('training_programs').map(({ row, file }) => ({
  slug: row.slug,
  name: row.name,
  goal: row.goal,
  weeks: Number(row.weeks),
  sessionsPerWeek: Number(row.sessions_per_week),
  displayOrder: Number(row.display_order),
  file,
}));
const programBySlug = new Map(programs.map((p) => [p.slug, p]));

interface DayRow {
  where: string;
  slug: string;
  week: number;
  day: number;
  focus: string;
  minutes: number;
  items: unknown;
  file: SqlFile;
}

const days: DayRow[] = rowsOf('program_days').map(({ row, file }) => {
  let items: unknown;
  try {
    items = JSON.parse(row.items);
  } catch {
    items = undefined;
  }
  return {
    where: `${row.slug} week ${row.week} day ${row.day}`,
    slug: row.slug,
    week: Number(row.week),
    day: Number(row.day),
    focus: row.focus,
    minutes: Number(row.estimated_minutes),
    items,
    file,
  };
});

type Item = Record<string, unknown>;
const itemsOf = (d: DayRow): Item[] => (Array.isArray(d.items) ? (d.items as Item[]) : []);

/** Every item of a type across every day, with where it sits. */
const all = (type: string) => days.flatMap((d) => itemsOf(d).filter((i) => i.type === type).map((item) => ({ item, where: d.where })));

// ---------------------------------------------------------------------------

describe('programme content: the reader found the seeded data', () => {
  it('reads the libraries the programmes point into', () => {
    // If the SQL shapes change and the reader stops seeing rows, every check
    // below would pass for the wrong reason. These floors catch that.
    expect(drillSlugs.size).toBeGreaterThanOrEqual(150);
    expect(exerciseNames.size).toBeGreaterThanOrEqual(150);
    expect(topicSlugs.size).toBeGreaterThanOrEqual(12);
    expect(testTypes.size).toBe(7);
    expect(programs.length).toBeGreaterThanOrEqual(10);
    expect(days.length).toBeGreaterThanOrEqual(100);
  });
});

describe('programme content: every reference exists', () => {
  it('every day belongs to a seeded programme (an unknown slug is silently dropped by the JOIN)', () => {
    expect(days.filter((d) => !programBySlug.has(d.slug)).map((d) => d.where)).toEqual([]);
  });

  it('every day has a readable items list of known item shapes', () => {
    const bad: string[] = [];
    for (const d of days) {
      if (!Array.isArray(d.items)) {
        bad.push(`${d.where}: items is not a JSON array`);
        continue;
      }
      if (d.items.length === 0) bad.push(`${d.where}: no items`);
      for (const item of itemsOf(d)) {
        const ok =
          (item.type === 'drill' && typeof item.slug === 'string' && (item.note === undefined || typeof item.note === 'string')) ||
          (item.type === 'exercise' &&
            typeof item.name === 'string' &&
            (item.sets === undefined || (Number.isInteger(item.sets) && (item.sets as number) >= 1 && (item.sets as number) <= 10)) &&
            (item.reps === undefined || typeof item.reps === 'string')) ||
          (item.type === 'study' && typeof item.topic_slug === 'string') ||
          (item.type === 'test' && typeof item.test_type === 'string') ||
          (item.type === 'note' && typeof item.text === 'string' && item.text.length > 0);
        if (!ok) bad.push(`${d.where}: ${JSON.stringify(item)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every drill slug is in the drill library', () => {
    expect(all('drill').filter(({ item }) => !drillSlugs.has(item.slug as string)).map(({ item, where }) => `${where}: ${item.slug}`)).toEqual([]);
  });

  it('every exercise name is in the gym library, spelled exactly', () => {
    expect(all('exercise').filter(({ item }) => !exerciseNames.has(item.name as string)).map(({ item, where }) => `${where}: ${item.name}`)).toEqual([]);
  });

  it('every study topic slug is a Basketball IQ section', () => {
    expect(all('study').filter(({ item }) => !topicSlugs.has(item.topic_slug as string)).map(({ item, where }) => `${where}: ${item.topic_slug}`)).toEqual([]);
  });

  it('every test type is one a player can log', () => {
    expect(all('test').filter(({ item }) => !testTypes.has(item.test_type as string)).map(({ item, where }) => `${where}: ${item.test_type}`)).toEqual([]);
  });
});

describe('programme content: shape of each programme', () => {
  it('uses only the goals the table allows, and display orders do not collide', () => {
    expect(programs.filter((p) => !GOALS.includes(p.goal)).map((p) => `${p.slug}: ${p.goal}`)).toEqual([]);
    const orders = programs.map((p) => p.displayOrder);
    expect(new Set(orders).size).toBe(orders.length);
    expect(new Set(programs.map((p) => p.slug)).size).toBe(programs.length);
  });

  it('has sessions_per_week days in every one of its weeks, numbered from 1', () => {
    const bad: string[] = [];
    for (const p of programs) {
      for (let week = 1; week <= p.weeks; week++) {
        const dayNumbers = days.filter((d) => d.slug === p.slug && d.week === week).map((d) => d.day).sort((a, b) => a - b);
        const expected = Array.from({ length: p.sessionsPerWeek }, (_, i) => i + 1);
        if (dayNumbers.join(',') !== expected.join(',')) bad.push(`${p.slug} week ${week}: days ${dayNumbers.join(',') || 'none'}`);
      }
      const beyond = days.filter((d) => d.slug === p.slug && (d.week < 1 || d.week > p.weeks));
      if (beyond.length) bad.push(`${p.slug}: ${beyond.length} days outside weeks 1-${p.weeks}`);
    }
    expect(bad).toEqual([]);
  });

  it('keeps estimated minutes inside what the table accepts', () => {
    expect(days.filter((d) => !(d.minutes >= 5 && d.minutes <= 180)).map((d) => `${d.where}: ${d.minutes}`)).toEqual([]);
  });

  // Held to the newer content only: 00014 predates these conventions and has
  // already run in production, so it is not rewritten to meet them.
  const newer = programs.filter((p) => p.file.number >= 39);

  it('names a phase in every week of the newer programmes', () => {
    const bad = days
      .filter((d) => newer.some((p) => p.slug === d.slug))
      .filter((d) => !new RegExp(`^Week ${d.week} \\([^)]+\\): \\S`).test(d.focus))
      .map((d) => `${d.where}: ${d.focus}`);
    expect(bad).toEqual([]);
  });

  it('gives newer programmes of six weeks or more a deload or taper week', () => {
    const bad = newer
      .filter((p) => p.weeks >= 6)
      .filter((p) => !days.some((d) => d.slug === p.slug && /^Week \d+ \([^)]*(deload|taper)[^)]*\)/i.test(d.focus)))
      .map((p) => p.slug);
    expect(bad).toEqual([]);
  });

  it('adds athleticism programmes, so the Athleticism group is not empty', () => {
    // Onboarding sends players who want defence, a first step or durable
    // ankles and knees to /programs?goal=athleticism (src/lib/recommend.ts)
    expect(programs.filter((p) => p.goal === 'athleticism').length).toBeGreaterThanOrEqual(3);
  });
});
