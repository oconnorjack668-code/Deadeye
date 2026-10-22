// src/components/clubs/ClubSearch.tsx
// Search the club list by name, another name or town, and pick one. Used for
// a player home club (Settings) and a team club board (team page).
'use client';

import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { clubPlace, searchClubs, type Club } from '@/lib/clubs';

const input =
  'w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none';

export function ClubSearch({
  id,
  selectedId,
  disabled,
  onPick,
  onQuery,
}: {
  id: string;
  selectedId?: string | null;
  disabled?: boolean;
  onPick: (club: Club) => void;
  /** The text typed, for a "not listed" form */
  onQuery?: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchClubs(query), [query]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        Search for a club
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onQuery?.(e.target.value);
          }}
          placeholder="Search by club or town"
          autoComplete="off"
          className={`${input} pl-9`}
        />
      </div>
      {query.trim().length >= 2 && (
        <ul className="max-h-64 space-y-1 overflow-y-auto" aria-label="Clubs">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(c)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{c.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {[clubPlace(c), c.aka.length ? `also ${c.aka.join(', ')}` : ''].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {c.id === selectedId && <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" aria-label="Chosen" />}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">No club by that name yet.</li>}
        </ul>
      )}
    </div>
  );
}
