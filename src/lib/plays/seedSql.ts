// src/lib/plays/seedSql.ts
// Turns the library plays (src/data/plays/library.ts) into the INSERT that
// seeds them, so the SQL is never edited by hand. __tests__/plays-library.test.ts
// checks the block in supabase/migrations/00060_plays.sql matches, and
// rewrites it when run with WRITE_PLAYS_SEED=1.
//
// Re-runnable: a play already there (same slug, library row) is updated in
// place, so fixing a coaching point and re-running the file fixes it live.
import type { LibraryPlay } from '@/data/plays/library';

export const SEED_BEGIN = '-- BEGIN LIBRARY PLAYS (generated from src/data/plays/library.ts by __tests__/plays-library.test.ts; do not edit by hand)';
export const SEED_END = '-- END LIBRARY PLAYS';

function text(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function textArray(values: readonly string[]): string {
  return values.length ? `ARRAY[${values.map(text).join(', ')}]::text[]` : `'{}'::text[]`;
}

function row(p: LibraryPlay): string {
  return `  (${[
    text(p.slug),
    text(p.title),
    text(p.category),
    text(p.min_age),
    textArray(p.tags),
    text(p.description),
    textArray(p.coaching_points),
    `${text(JSON.stringify(p.diagram))}::jsonb`,
    p.is_free ? 'true' : 'false',
  ].join(', ')})`;
}

export function playsSeedSql(plays: readonly LibraryPlay[]): string {
  return [
    SEED_BEGIN,
    'INSERT INTO public.plays (slug, title, category, min_age, tags, description, coaching_points, diagram, is_free) VALUES',
    plays.map(row).join(',\n'),
    'ON CONFLICT (slug) WHERE owner_id IS NULL DO UPDATE SET',
    '  title = EXCLUDED.title, category = EXCLUDED.category, min_age = EXCLUDED.min_age, tags = EXCLUDED.tags,',
    '  description = EXCLUDED.description, coaching_points = EXCLUDED.coaching_points, diagram = EXCLUDED.diagram,',
    '  is_free = EXCLUDED.is_free, updated_at = now();',
    SEED_END,
  ].join('\n');
}

/** Puts `block` between the markers in a migration file's text. */
export function replaceSeedBlock(fileText: string, block: string): string {
  const start = fileText.indexOf(SEED_BEGIN);
  const end = fileText.indexOf(SEED_END);
  if (start === -1 || end === -1 || end < start) throw new Error('The seed markers are missing from the migration');
  return fileText.slice(0, start) + block + fileText.slice(end + SEED_END.length);
}

/** The block between (and including) the markers, or null. */
export function readSeedBlock(fileText: string): string | null {
  const start = fileText.indexOf(SEED_BEGIN);
  const end = fileText.indexOf(SEED_END);
  return start === -1 || end === -1 ? null : fileText.slice(start, end + SEED_END.length);
}
