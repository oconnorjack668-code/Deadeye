// __tests__/signupRef.test.ts
// Outreach routes (?ref=) travel in the address from the landing page to the
// sign-up form; only plain route codes get through, never anything else.
import { describe, it, expect } from 'vitest';
import { ROUTES, normaliseRef, refFromSearch, signupHref } from '@/lib/signupRef';
import { buildLabel } from '@/lib/build';

describe('normaliseRef', () => {
  it('keeps the known route codes, whatever the case', () => {
    expect(normaliseRef('friends')).toBe('friends');
    expect(normaliseRef(' Wexford-Press ')).toBe('wexford-press');
  });

  it('drops every code not on the list, so a name or a school can never be saved or counted', () => {
    for (const bad of ['sean_murphy', 'st_marys_u14', 'reddit-irl', 'jo@example.com', 'two words', '<script>', '', null, undefined]) {
      expect(normaliseRef(bad)).toBeNull();
    }
  });

  it('every listed route is itself a plain code that would pass the old shape check', () => {
    for (const r of ROUTES) expect(r).toMatch(/^[a-z0-9][a-z0-9_-]{0,39}$/);
  });
});

describe('signupHref and refFromSearch', () => {
  it('carries a valid route to the sign-up form and reads it back', () => {
    expect(signupHref('friends')).toBe('/signup?ref=friends');
    expect(refFromSearch('?ref=friends&utm_source=x')).toBe('friends');
  });

  it('leaves the plain sign-up address when there is no valid route', () => {
    expect(signupHref(null)).toBe('/signup');
    expect(signupHref('a b')).toBe('/signup');
    expect(signupHref('sean_murphy')).toBe('/signup');
    expect(refFromSearch('')).toBeNull();
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
