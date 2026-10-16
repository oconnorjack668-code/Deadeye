// src/components/AgeChoice.tsx
// "How old are you?" - asked at sign-up, and once on /age-check for accounts
// made before parent approval existed. Under 16 needs a parent (00036).
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type AgeAnswer = '16-plus' | '13-15';

const OPTIONS: Array<{ value: AgeAnswer; label: string; hint: string }> = [
  { value: '16-plus', label: "I'm 16 or older", hint: 'You can start straight away.' },
  { value: '13-15', label: "I'm 13, 14 or 15", hint: 'A parent or guardian approves your account first.' },
];

export function AgeChoice({
  value,
  onChange,
  error,
}: {
  value: AgeAnswer | null;
  onChange: (value: AgeAnswer) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-200">How old are you?</legend>
      <div className="grid gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              value === o.value ? 'border-red-500/70 bg-red-500/10' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
            )}
          >
            <input
              type="radio"
              name="age"
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 h-4 w-4 accent-red-500"
            />
            <span>
              <span className="block font-semibold text-zinc-100">{o.label}</span>
              <span className="block text-xs text-zinc-400">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">Deadeye is for players aged 13 and over.</p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </fieldset>
  );
}
