// __tests__/heardFrom.test.ts
// The optional "Where did you hear about Deadeye?" answer: only listed answers
// are kept, so nothing typed or edited in can reach the counts file.
import { describe, it, expect } from 'vitest';
import { normaliseHeardFrom, heardFromLabel } from '@/lib/heardFrom';
import { buildLabel } from '@/lib/build';

describe('normaliseHeardFrom', () => {
  it('keeps listed answers, whatever the case', () => {
    expect(normaliseHeardFrom('friend')).toBe('friend');
    expect(normaliseHeardFrom(' TikTok ')).toBe('tiktok');
  });

  it('drops anything not on the list', () => {
    for (const bad of ['sean_murphy', 'st_marys_u14', 'jo@example.com', '', null, undefined, 3]) {
      expect(normaliseHeardFrom(bad)).toBeNull();
    }
  });

  it('labels answers as the player saw them, and no answer as "Didn\'t say"', () => {
    expect(heardFromLabel('radio-press')).toBe('Radio or a newspaper');
    expect(heardFromLabel(null)).toBe("Didn't say");
  });
});

describe('buildLabel', () => {
  it('names the commit, the environment and the build time in UTC', () => {
    expect(buildLabel({ sha: 'a1b2c3d', env: 'production', time: '2026-11-13T14:02:31.000Z' })).toBe(
      'a1b2c3d · production · 2026-11-13 14:02 UTC'
    );
  });

  it('still reads when built locally with no time', () => {
    expect(buildLabel({ sha: 'local', env: 'local', time: '' })).toBe('local · local');
  });
});
