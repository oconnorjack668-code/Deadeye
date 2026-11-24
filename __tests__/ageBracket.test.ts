import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ageBracketLabel,
  backfillBracket,
  bracketFromSetup,
  isAdultBracket,
  isMinorBracket,
  setupAnswerFrom,
} from '@/lib/ageBracket';

describe('what setup saves (D4)', () => {
  it('saves 13-15 for a 13 to 15 sign-up without asking', () => {
    expect(bracketFromSetup(false, '')).toBe('13-15');
    // even if a stale answer were in state, the sign-up answer wins
    expect(bracketFromSetup(false, '18+')).toBe('13-15');
  });

  it('needs the answer from a 16-or-older sign-up, and picks nothing for them', () => {
    expect(bracketFromSetup(true, '')).toBeNull();
    expect(bracketFromSetup(true, '16-17')).toBe('16-17');
    expect(bracketFromSetup(true, '18+')).toBe('18+');
  });

  it('saves nothing when sign-up never asked (the layout sends them to /age-check)', () => {
    expect(bracketFromSetup(null, '18+')).toBeNull();
  });

  it('shows a saved answer when editing, and none when the old bracket does not say', () => {
    expect(setupAnswerFrom('16-17')).toBe('16-17');
    expect(setupAnswerFrom('18+')).toBe('18+');
    expect(setupAnswerFrom('23-30')).toBe('18+');
    expect(setupAnswerFrom('14-17')).toBe('');
    expect(setupAnswerFrom('13-15')).toBe('');
    expect(setupAnswerFrom(null)).toBe('');
  });
});

describe('adult and under-18, new and old values', () => {
  it('18+ is adult; 13-15 and 16-17 are under 18', () => {
    expect(isAdultBracket('18+')).toBe(true);
    expect(isMinorBracket('16-17')).toBe(true);
    expect(isMinorBracket('13-15')).toBe(true);
    expect(isAdultBracket('16-17')).toBe(false);
    expect(isMinorBracket('18+')).toBe(false);
  });

  it('still reads the old values until 00069 has run', () => {
    for (const b of ['18-22', '23-30', '30+']) expect(isAdultBracket(b)).toBe(true);
    for (const b of ['13', '14-17']) expect(isMinorBracket(b)).toBe(true);
  });

  it('treats no answer as neither', () => {
    expect(isAdultBracket(null)).toBe(false);
    expect(isMinorBracket(null)).toBe(false);
  });

  it('labels in plain words', () => {
    expect(ageBracketLabel('13-15')).toBe('13 to 15');
    expect(ageBracketLabel('16-17')).toBe('16 or 17');
    expect(ageBracketLabel('18+')).toBe('18 or older');
    expect(ageBracketLabel('30+')).toBe('18 or older');
    expect(ageBracketLabel(null)).toBeNull();
  });
});

describe('the 00069 backfill', () => {
  it('maps every old value with every sign-up answer, younger reading winning', () => {
    const cases: Array<[string | null, boolean | null, string | null]> = [
      ['13', false, '13-15'],
      ['13', true, '13-15'],
      ['13', null, '13-15'],
      ['14-17', false, '13-15'],
      ['14-17', true, '16-17'],
      ['14-17', null, '13-15'],
      ['18-22', true, '18+'],
      ['23-30', null, '18+'],
      ['30+', true, '18+'],
      ['18-22', false, '13-15'],
      ['16-17', true, '16-17'],
      ['18+', false, '18+'],
      [null, true, null],
    ];
    for (const [old, said16, expected] of cases) {
      expect(backfillBracket(old, said16), `${old} / ${said16}`).toBe(expected);
    }
  });

  it('the SQL says the same, in the same order, and touches only old values', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/00069_age_brackets_backfill.sql'), 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    const whens = [...sql.matchAll(/WHEN (.+?) THEN '([^']+)'/g)].map((m) => [m[1].trim(), m[2]]);
    expect(whens).toEqual([
      ['s.is_16_plus IS FALSE', '13-15'],
      ["p.age_bracket IN ('18-22', '23-30', '30+')", '18+'],
      ["p.age_bracket = '14-17' AND s.is_16_plus IS TRUE", '16-17'],
    ]);
    expect(sql).toMatch(/ELSE '13-15'/);
    expect(sql).toMatch(/WHERE o\.age_bracket IN \('13', '14-17', '18-22', '23-30', '30\+'\)/);
  });

  it('00068 allows old and new values and teaches the coach and friend rules the new ones', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/00068_age_brackets_allow_new.sql'), 'utf8');
    expect(sql).toContain("CHECK (age_bracket IN ('13-15', '16-17', '18+', '13', '14-17', '18-22', '23-30', '30+'))");
    expect(sql).toContain("p_bracket IN ('18+', '18-22', '23-30', '30+')");
    expect(sql).toContain("p_bracket IN ('13-15', '16-17', '13', '14-17')");
    // no rule left reading only the old values
    expect(sql).not.toMatch(/age_bracket IN \('13', '14-17'\)/);
    expect(sql).not.toMatch(/my_age IN/);
    // 00068 moves no rows
    expect(sql).not.toMatch(/SET age_bracket/);
  });
});
