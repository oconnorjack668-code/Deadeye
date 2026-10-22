// @vitest-environment node
// __tests__/search.test.ts
// App search, the half that runs on the phone (src/lib/search.ts): the words
// players type find the right thing, each mode and the owner see their own,
// and every result goes to a page that exists.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SEARCH_ENTRIES, SEARCH_SUGGESTIONS, cleanSearch, normalize, searchEntries, suggestedEntries } from '@/lib/search';

const player = { mode: 'playing' as const, isOwner: false };
const titles = (r: ReturnType<typeof searchEntries>) => [...r.do, ...r.go].map((e) => e.title);

describe('searchEntries', () => {
  it('puts the exact thing first', () => {
    expect(searchEntries('log shots', player).do[0].title).toBe('Log shots');
    expect(searchEntries('leaderboard', player).go[0].title).toBe('Leaderboard');
  });

  it('finds things by the words players use, not only their names', () => {
    expect(titles(searchEntries('camera', player))).toContain('Track shots with the camera');
    expect(titles(searchEntries('rest day', player))).toContain('Streaks');
    expect(titles(searchEntries('delete account', player))).toContain('Your data');
    expect(titles(searchEntries('log out', player))).toContain('Account');
    expect(titles(searchEntries('vertical', player))).toContain('Test your jump');
  });

  it('takes Irish and US spellings, accents, capitals and part words', () => {
    expect(titles(searchEntries('program', player))).toContain('Programmes');
    expect(titles(searchEntries('defense', player))).toContain('Drill library');
    expect(titles(searchEntries('DÉFENCE', player))).toContain('Drill library');
    expect(titles(searchEntries('streak', player))).toContain('Streaks');
    expect(titles(searchEntries('stre', player))).toContain('Streaks');
  });

  it('needs every word typed to match', () => {
    expect(titles(searchEntries('log zebra', player))).toEqual([]);
    expect(titles(searchEntries('qqqq', player))).toEqual([]);
    expect(titles(searchEntries('   ', player))).toEqual([]);
  });

  it('shows coaches the coaching side, and players the playing side', () => {
    const coach = { mode: 'coaching' as const, isOwner: false };
    expect(titles(searchEntries('assignments', coach))).toContain('Assignments');
    expect(titles(searchEntries('assignments', player))).not.toContain('Assignments');
    expect(titles(searchEntries('log shots', coach))).not.toContain('Log shots');
    expect(titles(searchEntries('drills', coach))).toContain('Drill library');
  });

  it('keeps owner tools to the owner', () => {
    expect(titles(searchEntries('funnel', player))).toEqual([]);
    expect(titles(searchEntries('funnel', { mode: 'playing', isOwner: true }))).toContain('Player funnel');
  });

  it('never lists players', () => {
    expect(SEARCH_ENTRIES.some((e) => e.href.startsWith('/players'))).toBe(false);
  });
});

describe('the entries themselves', () => {
  const appDir = path.join(process.cwd(), 'src/app');
  function pageExists(href: string): boolean {
    const route = href.split(/[?#]/)[0].replace(/^\//, '');
    return [path.join(appDir, '(app)', route, 'page.tsx'), path.join(appDir, route, 'page.tsx')].some((f) => fs.existsSync(f));
  }

  it('each goes to a page that exists', () => {
    const missing = SEARCH_ENTRIES.filter((e) => !pageExists(e.href)).map((e) => e.href);
    expect(missing).toEqual([]);
  });

  it('each Settings link lands on a section that exists', () => {
    const settings = fs.readFileSync(path.join(appDir, '(app)/settings/SettingsClient.tsx'), 'utf8');
    const anchors = SEARCH_ENTRIES.filter((e) => e.href.startsWith('/settings#')).map((e) => e.href.split('#')[1]);
    expect(anchors.filter((a) => !settings.includes(`id="${a}"`))).toEqual([]);
  });

  it('has unique ids, and suggestions that exist', () => {
    expect(new Set(SEARCH_ENTRIES.map((e) => e.id)).size).toBe(SEARCH_ENTRIES.length);
    for (const mode of ['playing', 'coaching'] as const) {
      expect(suggestedEntries(mode)).toHaveLength(SEARCH_SUGGESTIONS[mode].length);
    }
  });
});

describe('cleanSearch and normalize', () => {
  it('strips what would mean something inside a database filter', () => {
    expect(cleanSearch('free throw,name.eq.x)(*')).toBe('free throw name eq x');
    expect(cleanSearch("  euro-step o'neal  ")).toBe("euro-step o'neal");
    expect(cleanSearch('"%_')).toBeUndefined();
    expect(cleanSearch('x'.repeat(60))).toHaveLength(40);
  });

  it('matches regardless of accents and punctuation', () => {
    expect(normalize('Défense: Free-Throw!')).toBe('defense free throw');
  });
});
