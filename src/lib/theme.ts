// src/lib/theme.ts
// Light, dark, or whatever the phone is set to.
//
// The app opens on the phone's own setting, as most apps do (Nielsen Norman
// Group found users expect apps to follow it), and Settings > Appearance can
// pin light or dark. Light exists because many players train outdoors, where
// a dark screen washes out in the sun.
//
// The choice is kept on the device, like the shot sounds: it is about the
// screen in the player's hand, not their account. The theme itself is CSS
// (src/app/theme.css); this only decides which one, and sets
// <html data-theme> before the first paint so there is no flash of the wrong
// one (THEME_SCRIPT, inlined in the root layout's head).

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_KEY = 'deadeye-theme';
/** Fired on window when the choice changes in this tab. */
export const THEME_EVENT = 'deadeye-theme-change';

/** The browser bar colour for each theme: the page background. */
export const THEME_COLOR: Record<Theme, string> = { dark: '#09090b', light: '#f4f4f5' };

export function parseThemeChoice(raw: string | null | undefined): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function resolveTheme(choice: ThemeChoice, systemPrefersLight: boolean): Theme {
  if (choice === 'system') return systemPrefersLight ? 'light' : 'dark';
  return choice;
}

export function readThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(window.localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

function systemPrefersLight(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    return false;
  }
}

/** Puts the chosen theme on the page and the browser bar. */
export function applyTheme(choice: ThemeChoice = readThemeChoice()): Theme {
  const theme = resolveTheme(choice, systemPrefersLight());
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLOR[theme]));
  return theme;
}

export function storeThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private window: the choice lasts this visit, which is still applied below
  }
  applyTheme(choice);
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Runs in the head before anything paints. Plain ES5 and self-contained: it is
 * inlined as text, so it cannot import anything above. Falls back to dark,
 * which is how the app has always looked, if anything goes wrong.
 */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem('${THEME_KEY}');var l=window.matchMedia('(prefers-color-scheme: light)').matches;var t=c==='light'||c==='dark'?c:(l?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
