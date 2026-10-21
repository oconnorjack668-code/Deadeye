// __tests__/nameFilter.test.ts
// Display names are seen by players as young as 13. The filter has to catch the
// obvious and its disguises, leave ordinary names alone, and match the
// database trigger that actually enforces it (00044).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLOCKED_PARTS, BLOCKED_WORDS, nameBlocked } from '@/lib/nameFilter';

describe('nameBlocked', () => {
  it('catches the name that was on the leaderboard, and its disguises', () => {
    for (const name of ['Nipple twister', 'NIPPLE', 'n1pple_tw1ster', 'Nip ple', 'niiipple']) {
      expect(nameBlocked(name), name).toBe(true);
    }
  });

  it('catches whole-word terms but not names that contain them', () => {
    expect(nameBlocked('big dick')).toBe(true);
    expect(nameBlocked('Ass Master')).toBe(true);
    for (const name of ['Cassidy', 'Arsenal fan', 'Hancock', 'Dickson', 'Sexton', 'Bobby', 'Nigeria', 'Titan', 'Grapes']) {
      expect(nameBlocked(name), name).toBe(false);
    }
  });

  it('leaves ordinary player names alone', () => {
    for (const name of ['Jack O Connor', 'Tester', 'Player', 'Steph 30', 'Áine', 'KD7', 'Mamba Mentality']) {
      expect(nameBlocked(name), name).toBe(false);
    }
  });
});

describe('the database trigger', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/00044_display_name_filter.sql'), 'utf8');
  const list = (name: string) => {
    const body = sql.match(new RegExp(`${name} text\\[\\] := ARRAY\\[([\\s\\S]*?)\\];`))?.[1] ?? '';
    return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  };

  it('uses exactly the same lists as the app', () => {
    expect(list('v_parts')).toEqual(BLOCKED_PARTS);
    expect(list('v_words')).toEqual(BLOCKED_WORDS);
  });
});
