// __tests__/signupRef.test.ts
// Outreach routes (?ref=) travel in the address from the landing page to the
// sign-up form; only plain route codes get through, never anything else.
import { describe, it, expect } from 'vitest';
import { normaliseRef, refFromSearch, signupHref } from '@/lib/signupRef';
import { buildLabel } from '@/lib/build';

describe('normaliseRef', () => {
  it('keeps plain route codes, lower-cased', () => {
    expect(normaliseRef('friends')).toBe('friends');
    expect(normaliseRef(' Reddit_IRL-3x3 ')).toBe('reddit_irl-3x3');
  });

  it('drops anything that is not a plain code: emails, spaces, symbols, too long, empty', () => {
    for (const bad of ['jo@example.com', 'two words', '<script>', '-leading', 'a'.repeat(41), '', null, undefined]) {
      expect(normaliseRef(bad)).toBeNull();
    }
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
