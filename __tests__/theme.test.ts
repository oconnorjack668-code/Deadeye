import { describe, it, expect } from 'vitest';
import { parseThemeChoice, resolveTheme, THEME_KEY, THEME_SCRIPT } from '@/lib/theme';

describe('theme choice', () => {
  it('reads only light or dark as a pinned choice', () => {
    expect(parseThemeChoice('light')).toBe('light');
    expect(parseThemeChoice('dark')).toBe('dark');
    expect(parseThemeChoice(null)).toBe('system');
    expect(parseThemeChoice('purple')).toBe('system');
  });

  it('follows the phone on System, and ignores it when pinned', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('runs the inline script against the same key, and falls back to dark', () => {
    expect(THEME_SCRIPT).toContain(THEME_KEY);
    const set: Record<string, string> = {};
    const fakeWindow = { matchMedia: () => ({ matches: true }) };
    const fakeDocument = { documentElement: { setAttribute: (k: string, v: string) => (set[k] = v) } };
    new Function('localStorage', 'window', 'document', THEME_SCRIPT)({ getItem: () => null }, fakeWindow, fakeDocument);
    expect(set['data-theme']).toBe('light');
    new Function('localStorage', 'window', 'document', THEME_SCRIPT)(
      { getItem: () => { throw new Error('blocked'); } },
      fakeWindow,
      fakeDocument
    );
    expect(set['data-theme']).toBe('dark');
  });
});
