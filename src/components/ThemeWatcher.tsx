// src/components/ThemeWatcher.tsx
'use client';

import { useEffect } from 'react';
import { applyTheme, THEME_EVENT, THEME_KEY } from '@/lib/theme';

/**
 * Keeps the theme in step after the first paint: when the phone switches
 * between light and dark (a sunset schedule, say) while the app is open on
 * System, and when the choice changes in another tab. Renders nothing.
 */
export function ThemeWatcher() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => applyTheme();
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) update();
    };
    // The meta tag rendered by Next names one colour; set it to the theme in use
    update();
    media.addEventListener('change', update);
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_EVENT, update);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(THEME_EVENT, update);
    };
  }, []);
  return null;
}
