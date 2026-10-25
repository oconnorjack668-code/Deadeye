// @vitest-environment node
// __tests__/migration-check.test.ts
// docs/check-migrations.sql is how the founder finds out which migrations have
// not been run. It is built from supabase/migrations/ by
// scripts/build-migration-check.mjs, so this fails when a migration is added
// and the file is not rebuilt, and checks the reader on the cases that matter.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildCheck, expectedObjects } from '../scripts/build-migration-check.mjs';

const DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs
  .readdirSync(DIR)
  .filter((f) => /^\d{5}_.*\.sql$/.test(f))
  .sort()
  .map((f) => ({ id: f.slice(0, 5), text: fs.readFileSync(path.join(DIR, f), 'utf8') }));

describe('docs/check-migrations.sql', () => {
  it('is up to date with supabase/migrations (run: node scripts/build-migration-check.mjs)', () => {
    const committed = fs.readFileSync(path.join(__dirname, '..', 'docs', 'check-migrations.sql'), 'utf8');
    expect(committed).toBe(buildCheck(files));
  });

  it('has no apostrophe in its comments, like every migration (see 00035)', () => {
    const comments = buildCheck(files)
      .split('\n')
      .filter((l) => l.startsWith('--'));
    expect(comments.filter((l) => l.includes("'"))).toEqual([]);
  });

  it('expects the objects the latest migrations create', () => {
    const { objects } = expectedObjects(files);
    const has = (kind: string, object: string, column = '') => objects.some((o: { kind: string; object: string; column: string }) => o.kind === kind && o.object === object && o.column === column);
    expect(has('table', 'app_events')).toBe(true); // 00045
    expect(has('table', 'player_clubs')).toBe(true); // 00051
    expect(has('column', 'founder_posts', 'everyone')).toBe(true); // 00054
    expect(has('function', 'team_roster')).toBe(true); // dropped in 00024 and 00034, then made again
  });
});

describe('what the reader takes from a migration', () => {
  const read = (sql: string) => expectedObjects([{ id: '00001', text: sql }]).objects.map((o: { kind: string; object: string; column: string }) => `${o.kind} ${o.object}${o.column ? '.' + o.column : ''}`);

  it('finds tables, columns, functions and indexes in public, ignoring comments', () => {
    expect(
      read(`
        -- CREATE TABLE public.not_this (id int);
        CREATE TABLE IF NOT EXISTS public.a (id int);
        CREATE TABLE b (id int);
        CREATE TABLE auth.c (id int);
        ALTER TABLE public.a ADD COLUMN IF NOT EXISTS x int, ADD COLUMN y text;
        CREATE OR REPLACE FUNCTION public.f(a int) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;
        CREATE UNIQUE INDEX IF NOT EXISTS a_x_idx ON public.a (x);
      `).sort()
    ).toEqual(['column a.x', 'column a.y', 'function f', 'index a_x_idx', 'table a', 'table b']);
  });

  it('stops expecting what a later migration drops, and expects it again once recreated', () => {
    const run = (parts: string[]) =>
      expectedObjects(parts.map((text, i) => ({ id: String(i + 1).padStart(5, '0'), text })))
        .objects.map((o: { kind: string; object: string; column: string }) => `${o.kind} ${o.object}${o.column ? '.' + o.column : ''}`)
        .sort();
    expect(run(['CREATE TABLE public.t (a int); ALTER TABLE public.t ADD COLUMN b int;', 'DROP TABLE IF EXISTS public.t;'])).toEqual([]);
    expect(run(['CREATE FUNCTION public.g() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;', 'DROP FUNCTION IF EXISTS public.g();'])).toEqual([]);
    expect(run(['CREATE FUNCTION public.g() RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;', 'DROP FUNCTION IF EXISTS public.g();', 'CREATE FUNCTION public.g(a int) RETURNS int AS $$ SELECT 2 $$ LANGUAGE sql;'])).toEqual(['function g']);
  });

  it('lists a migration that only changes policies as unchecked', () => {
    const { unchecked } = expectedObjects([
      { id: '00001', text: 'CREATE TABLE public.t (a int);' },
      { id: '00002', text: 'DROP POLICY IF EXISTS p ON public.t; CREATE POLICY p ON public.t FOR SELECT USING (true);' },
    ]);
    expect(unchecked).toEqual(['00002']);
  });
});
