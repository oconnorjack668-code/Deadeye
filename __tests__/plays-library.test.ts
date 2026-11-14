// @vitest-environment node
// __tests__/plays-library.test.ts
// The starter plays (src/data/plays/library.ts) are content a coach will
// judge the app by, so each one must draw, animate and read correctly: a
// valid diagram, a sensible number of steps, no age-rule warnings for the
// grade it is marked for, and every player given a job.
//
// It also keeps the seeds in supabase/migrations/ (00060 for the starter
// plays, 00063 for the launch plays; PLAY_SEEDS in the data file) in step
// with the data. After changing a play, rewrite the SQL with:
//   WRITE_PLAYS_SEED=1 npx vitest run __tests__/plays-library.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LIBRARY_PLAYS, PLAY_SEEDS, STARTER_PLAYS } from '@/data/plays/library';
import { LAUNCH_PLAYS } from '@/data/plays/launch';
import { MOVEMENT_TYPES, parseDiagram, stepCount } from '@/lib/plays/diagram';
import { ageRuleWarnings } from '@/lib/plays/ageRules';
import { isAgeGrade, isPlayCategory } from '@/lib/plays/catalog';
import { buildQuiz } from '@/lib/plays/quiz';
import { roleJobs, roleStart, stepNames } from '@/lib/plays/roles';
import { playsSeedSql, readSeedBlock, replaceSeedBlock } from '@/lib/plays/seedSql';

const MIGRATIONS = path.join(__dirname, '..', 'supabase', 'migrations');

describe('the library plays', () => {
  it('has 36 plays with unique, URL-safe slugs', () => {
    expect(LIBRARY_PLAYS).toHaveLength(36);
    const slugs = LIBRARY_PLAYS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('has the launch mix from plan section 10', () => {
    const count = (category: string) => LIBRARY_PLAYS.filter((p) => p.category === category).length;
    expect({
      principles: count('principles'),
      half_court: count('half_court'),
      pick_and_roll: count('pick_and_roll'),
      blob: count('blob'),
      slob: count('slob'),
      press_break: count('press_break'),
      zone_offence: count('zone_offence'),
      end_of_quarter: count('end_of_quarter'),
    }).toEqual({ principles: 6, half_court: 10, pick_and_roll: 3, blob: 5, slob: 4, press_break: 2, zone_offence: 4, end_of_quarter: 2 });
    expect(LIBRARY_PLAYS.filter((p) => p.tags.includes('horns'))).toHaveLength(3);
  });

  it('makes about 12 free, every principle among them', () => {
    const free = LIBRARY_PLAYS.filter((p) => p.is_free);
    expect(free.length).toBe(12);
    expect(LIBRARY_PLAYS.filter((p) => p.category === 'principles').every((p) => p.is_free)).toBe(true);
  });

  it('keeps zone offences for U15 and up, and pick-and-roll for U12 and up', () => {
    for (const p of LIBRARY_PLAYS.filter((x) => x.category === 'zone_offence')) expect(p.min_age, p.slug).toBe('U15');
    for (const p of LIBRARY_PLAYS.filter((x) => x.category === 'pick_and_roll')) expect(p.min_age, p.slug).toBe('U12');
    expect(LIBRARY_PLAYS.find((p) => p.slug === 'spain-pick-and-roll')?.min_age).toBe('U15');
  });

  it.each(LAUNCH_PLAYS.map((p) => [p.slug, p] as const))('%s moves at least three players, so the role quiz has three questions', (_slug, p) => {
    const movers = new Set(p.diagram.frames.flatMap((f) => f.actions.filter((a) => MOVEMENT_TYPES.includes(a.type)).map((a) => a.from)));
    expect(movers.size).toBeGreaterThanOrEqual(3);
    expect(buildQuiz(p.diagram)).toHaveLength(3);
  });

  it('files every play under a known type and age grade, within the column limits', () => {
    for (const p of LIBRARY_PLAYS) {
      expect(isPlayCategory(p.category), p.slug).toBe(true);
      expect(isAgeGrade(p.min_age), p.slug).toBe(true);
      expect(p.title.length, p.slug).toBeLessThanOrEqual(80);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(600);
      expect(p.tags.length, p.slug).toBeLessThanOrEqual(10);
      expect(p.coaching_points.length, p.slug).toBeGreaterThanOrEqual(4);
      expect(p.coaching_points.length, p.slug).toBeLessThanOrEqual(6);
    }
  });

  it.each(LIBRARY_PLAYS.map((p) => [p.slug, p] as const))('%s is a valid diagram of 4 to 8 steps', (_slug, p) => {
    const result = parseDiagram(p.diagram);
    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(stepCount(p.diagram)).toBeGreaterThanOrEqual(4);
    expect(stepCount(p.diagram)).toBeLessThanOrEqual(8);
  });

  it.each(LIBRARY_PLAYS.map((p) => [p.slug, p] as const))('%s breaks no underage rule for its youngest grade', (_slug, p) => {
    expect(ageRuleWarnings(p)).toEqual([]);
  });

  it('uses the full five on offence, numbered 1 to 5, and no names', () => {
    for (const p of LIBRARY_PLAYS) {
      expect(p.diagram.players.map((pl) => pl.label).sort(), p.slug).toEqual(['1', '2', '3', '4', '5']);
    }
  });

  it('names every step and gives every player a start and a job at each step', () => {
    for (const p of LIBRARY_PLAYS) {
      const names = stepNames(p.diagram);
      expect(names.every((n) => n.length > 0 && !n.includes('?')), p.slug).toBe(true);
      for (const player of p.diagram.players) {
        expect(roleStart(p.diagram, player.id)).toMatch(/^Start /);
        const jobs = roleJobs(p.diagram, player.id);
        expect(jobs).toHaveLength(stepCount(p.diagram));
        expect(jobs.every((j) => j.length > 0 && !j.includes('?')), `${p.slug} ${player.id}`).toBe(true);
      }
    }
  });

  it('keeps every text free of "--", which the migration readers treat as a comment', () => {
    const texts = LIBRARY_PLAYS.flatMap((p) => [p.title, p.description, ...p.coaching_points, ...p.tags, JSON.stringify(p.diagram)]);
    expect(texts.filter((t) => t.includes('--'))).toEqual([]);
  });
});

describe('the seed migrations', () => {
  it('seeds every play exactly once, and 00060 keeps its ten starter plays', () => {
    const seeded = PLAY_SEEDS.flatMap((s) => s.plays.map((p) => p.slug));
    expect(seeded.sort()).toEqual(LIBRARY_PLAYS.map((p) => p.slug).sort());
    expect(PLAY_SEEDS[0]).toEqual({ migration: '00060_plays.sql', plays: STARTER_PLAYS });
    expect(STARTER_PLAYS).toHaveLength(10);
  });

  it.each(PLAY_SEEDS.map((s) => [s.migration, s] as const))('%s matches the data file (rewrite with WRITE_PLAYS_SEED=1)', (migration, seed) => {
    const file = path.join(MIGRATIONS, migration);
    const fileText = fs.readFileSync(file, 'utf8');
    const generated = playsSeedSql(seed.plays);
    if (process.env.WRITE_PLAYS_SEED === '1') {
      fs.writeFileSync(file, replaceSeedBlock(fileText, generated));
      return;
    }
    // A Windows checkout (core.autocrlf) turns line endings into \r\n
    expect(readSeedBlock(fileText.replace(/\r\n/g, '\n'))).toBe(generated);
  });

  it('updates a play in place when the file is run again', () => {
    expect(playsSeedSql(LIBRARY_PLAYS)).toMatch(/ON CONFLICT \(slug\) WHERE owner_id IS NULL DO UPDATE SET/);
  });

  it('doubles quote marks inside the text', () => {
    const sql = playsSeedSql([{ ...LIBRARY_PLAYS[0], title: "Coach's play", coaching_points: ["Don't wait"] }]);
    expect(sql).toContain("'Coach''s play'");
    expect(sql).toContain("ARRAY['Don''t wait']::text[]");
  });
});
