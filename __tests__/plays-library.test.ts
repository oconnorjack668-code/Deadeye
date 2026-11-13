// @vitest-environment node
// __tests__/plays-library.test.ts
// The starter plays (src/data/plays/library.ts) are content a coach will
// judge the app by, so each one must draw, animate and read correctly: a
// valid diagram, a sensible number of steps, no age-rule warnings for the
// grade it is marked for, and every player given a job.
//
// It also keeps the seed in supabase/migrations/00060_plays.sql in step with
// the data file. After changing a play, rewrite the SQL with:
//   WRITE_PLAYS_SEED=1 npx vitest run __tests__/plays-library.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LIBRARY_PLAYS } from '@/data/plays/library';
import { parseDiagram, stepCount } from '@/lib/plays/diagram';
import { ageRuleWarnings } from '@/lib/plays/ageRules';
import { isAgeGrade, isPlayCategory } from '@/lib/plays/catalog';
import { roleJobs, roleStart, stepNames } from '@/lib/plays/roles';
import { playsSeedSql, readSeedBlock, replaceSeedBlock } from '@/lib/plays/seedSql';

const MIGRATION = path.join(__dirname, '..', 'supabase', 'migrations', '00060_plays.sql');

describe('the library plays', () => {
  it('has ten plays with unique, URL-safe slugs', () => {
    expect(LIBRARY_PLAYS).toHaveLength(10);
    const slugs = LIBRARY_PLAYS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('makes about half free, principles first', () => {
    const free = LIBRARY_PLAYS.filter((p) => p.is_free);
    expect(free.length).toBe(5);
    expect(LIBRARY_PLAYS.filter((p) => p.category === 'principles').every((p) => p.is_free)).toBe(true);
  });

  it('files every play under a known type and age grade, within the column limits', () => {
    for (const p of LIBRARY_PLAYS) {
      expect(isPlayCategory(p.category), p.slug).toBe(true);
      expect(isAgeGrade(p.min_age), p.slug).toBe(true);
      expect(p.title.length, p.slug).toBeLessThanOrEqual(80);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(600);
      expect(p.tags.length, p.slug).toBeLessThanOrEqual(10);
      expect(p.coaching_points.length, p.slug).toBeGreaterThanOrEqual(4);
      expect(p.coaching_points.length, p.slug).toBeLessThanOrEqual(12);
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

describe('the seed in 00060_plays.sql', () => {
  it('matches src/data/plays/library.ts (rewrite with WRITE_PLAYS_SEED=1)', () => {
    const fileText = fs.readFileSync(MIGRATION, 'utf8');
    const generated = playsSeedSql(LIBRARY_PLAYS);
    if (process.env.WRITE_PLAYS_SEED === '1') {
      fs.writeFileSync(MIGRATION, replaceSeedBlock(fileText, generated));
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
