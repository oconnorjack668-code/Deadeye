// src/components/AppearancePicker.tsx
'use client';

import React, { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { readThemeChoice, storeThemeChoice, THEME_EVENT, THEME_KEY, type ThemeChoice } from '@/lib/theme';

const OPTIONS: Array<{ value: ThemeChoice; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === THEME_KEY && onChange();
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * System, Light or Dark, as phones and most apps offer it. Read through
 * useSyncExternalStore: the choice lives in this device's storage, which the
 * server render cannot see, so it renders System there and the real choice on
 * the client without a hydration mismatch.
 */
export function AppearancePicker() {
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => 'system' as ThemeChoice);
  return (
    <div className="px-4 py-3">
      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-950/60 p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={choice === value}
            onClick={() => storeThemeChoice(value)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 ${
              choice === value ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        System follows your phone. Light is easier to read outdoors in the sun.
      </p>
    </div>
  );
}
