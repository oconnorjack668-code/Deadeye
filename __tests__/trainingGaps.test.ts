// __tests__/trainingGaps.test.ts
// Phase 5 training gaps (00048): the app's lists have to match what the
// database accepts, and the drill timer has to read drills the way they are
// written.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COOL_DOWN_SLUG, DRILL_SKILLS, WARM_UP_SLUG, needsHoop } from '@/lib/drills';
import { DRILL_COUNT } from '@/lib/plans';
import { TEST_TYPES, TIMED_TESTS, LENGTH_TESTS } from '@/lib/performanceTests';
import { performanceTestSchema } from '@/lib/validation';
import { DEFAULT_REST, clock, parseIntervals, phaseAt, planFor, totalSeconds } from '@/lib/drillTimer';

const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const migration = fs.readFileSync(path.join(dir, '00048_training_gaps.sql'), 'utf8');
const quoted = (sql: string) => [...sql.matchAll(/'([^']+)'/g)].map((m) => m[1]);

/** Every drill row seeded by any migration: slug, skill, equipment and whether it counts makes. */
function seededDrills() {
  const rows: Array<{ slug: string; skill: string; equipment: string[]; tracksMakes: boolean }> = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    if (!sql.includes('INSERT INTO public.drills')) continue;
    for (const m of sql.matchAll(/\('([a-z0-9-]+)', '(?:[^']|'')+', '([a-z_]+)', '[a-z_]+', '[a-z]+', '[a-z]+', ARRAY\[([^\]]*)\]/g)) {
      const rest = sql.slice(m.index!, sql.indexOf('\n  (', m.index! + 1) === -1 ? undefined : sql.indexOf('\n  (', m.index! + 1));
      rows.push({ slug: m[1], skill: m[2], equipment: quoted(m[3]), tracksMakes: /,\s*true\)\s*(,|\n|ON)/.test(rest) });
    }
  }
  // Equipment fixed after seeding, as 00048 does for a drill that left out its hoop
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const m of sql.matchAll(/SET equipment = array_append\(equipment, '([a-z ]+)'\)\s*WHERE slug = '([a-z0-9-]+)'/g)) {
      rows.find((r) => r.slug === m[2])?.equipment.push(m[1]);
    }
  }
  return rows;
}

describe('training gaps', () => {
  const drills = seededDrills();

  it('says how many drills there are, and the count is the seeded one', () => {
    expect(new Set(drills.map((d) => d.slug)).size).toBe(drills.length);
    expect(drills.length).toBe(DRILL_COUNT);
  });

  it('offers exactly the drill skills the database accepts', () => {
    const check = migration.match(/drills_skill_check CHECK \(skill IN \(([\s\S]*?)\)\)/)?.[1] ?? '';
    expect(DRILL_SKILLS.map((s) => s.id).sort()).toEqual(quoted(check).sort());
  });

  it('seeds every drill under a skill the app knows', () => {
    const known = new Set<string>(DRILL_SKILLS.map((s) => s.id));
    expect(drills.filter((d) => !known.has(d.skill)).map((d) => d.slug)).toEqual([]);
  });

  it('has the warm-up and cool-down that program days link to', () => {
    const slugs = drills.map((d) => d.slug);
    expect(slugs).toContain(WARM_UP_SLUG);
    expect(slugs).toContain(COOL_DOWN_SLUG);
  });

  it('only counts makes on drills that have a hoop', () => {
    expect(drills.filter((d) => d.tracksMakes && !needsHoop(d.equipment)).map((d) => d.slug)).toEqual([]);
  });

  it('lists exactly the tests the database accepts, and the form validates them', () => {
    const check = migration.match(/performance_tests_test_type_check CHECK \(test_type IN \(([\s\S]*?)\)\)/)?.[1] ?? '';
    expect([...TEST_TYPES.map((t) => t.id), 'custom'].sort()).toEqual(quoted(check).sort());
    for (const t of TEST_TYPES) {
      const parsed = performanceTestSchema.safeParse({ testDate: '2026-10-21', testType: t.id, value: 3.2, unit: 'seconds' });
      expect(parsed.success, t.id).toBe(true);
    }
    for (const t of [...TIMED_TESTS, ...LENGTH_TESTS]) expect(TEST_TYPES.some((x) => x.id === t), t).toBe(true);
    expect(TIMED_TESTS).toContain('sprint_10m');
    expect(TIMED_TESTS).toContain('sprint_20m');
  });

  it('keeps every comment in the migration free of apostrophes', () => {
    // See the note at the top of 00035: the Supabase editor can read one as a string
    const comments = migration.split('\n').filter((l) => l.trim().startsWith('--'));
    expect(comments.filter((l) => l.includes("'"))).toEqual([]);
  });
});

describe('drill timer', () => {
  it('reads intervals the way drills write them', () => {
    expect(parseIntervals('3 x 30 seconds')).toEqual({ rounds: 3, work: 30, rest: DEFAULT_REST });
    expect(parseIntervals('5 x 1 minute')).toEqual({ rounds: 5, work: 60, rest: DEFAULT_REST });
    expect(parseIntervals('3 x 45 seconds each hand')).toEqual({ rounds: 3, work: 45, rest: DEFAULT_REST });
    expect(parseIntervals('6 x 20 seconds on, 40 seconds off')).toEqual({ rounds: 6, work: 20, rest: 40 });
    expect(parseIntervals('3 × 30 seconds')).toEqual({ rounds: 3, work: 30, rest: DEFAULT_REST });
  });

  it('leaves drills counted in shots or makes to a plain countdown', () => {
    expect(parseIntervals('5 spots x 10 makes')).toBeNull();
    expect(parseIntervals('Make 10 in a row')).toBeNull();
    expect(parseIntervals('4 reps with 60-second rest')).toBeNull();
    expect(planFor({ reps: '5 spots x 10 makes', duration_minutes: 8 })).toEqual({ rounds: 1, work: 480, rest: 0 });
  });

  it('can time every seeded drill', () => {
    for (const d of seededDrills()) expect(totalSeconds(planFor({ reps: '1 x 30 seconds', duration_minutes: 1 })), d.slug).toBeGreaterThan(0);
  });

  it('walks through work, rest and done', () => {
    const plan = { rounds: 2, work: 30, rest: 10 };
    expect(totalSeconds(plan)).toBe(70);
    expect(phaseAt(plan, 0)).toEqual({ phase: 'work', round: 1, remaining: 30 });
    expect(phaseAt(plan, 29.5)).toEqual({ phase: 'work', round: 1, remaining: 1 });
    expect(phaseAt(plan, 30)).toEqual({ phase: 'rest', round: 1, remaining: 10 });
    expect(phaseAt(plan, 40)).toEqual({ phase: 'work', round: 2, remaining: 30 });
    // No rest after the last round
    expect(phaseAt(plan, 70)).toEqual({ phase: 'done', round: 2, remaining: 0 });
    expect(phaseAt(plan, 500).phase).toBe('done');
  });

  it('shows minutes and seconds', () => {
    expect(clock(75)).toBe('1:15');
    expect(clock(9)).toBe('0:09');
    expect(clock(-3)).toBe('0:00');
  });
});
