// src/components/workouts/ExercisePicker.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Search, Star, X, Plus, Flame } from 'lucide-react';
import { MUSCLE_GROUPS, muscleLabel, type LibraryExercise } from '@/lib/exercises';

type Filter = 'recent' | 'favorites' | 'all' | string;

interface ExercisePickerProps {
  library: LibraryExercise[];
  favoriteIds: Set<string>;
  recentNames: string[];
  onToggleFavorite: (exercise: LibraryExercise) => void;
  onPick: (exercise: LibraryExercise) => void;
  onCreateCustom: (name: string, primaryMuscle: string) => Promise<void>;
  onClose: () => void;
}

export function ExercisePicker({
  library,
  favoriteIds,
  recentNames,
  onToggleFavorite,
  onPick,
  onCreateCustom,
  onClose,
}: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(recentNames.length > 0 ? 'recent' : 'all');
  const [customMuscle, setCustomMuscle] = useState<string>('chest');
  const [creating, setCreating] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = library;
    if (q) {
      // Search always covers the whole library
      list = library.filter(
        (e) => e.name.toLowerCase().includes(q) || muscleLabel(e.primary_muscle).toLowerCase().includes(q)
      );
    } else if (filter === 'recent') {
      const byName = new Map(library.map((e) => [e.name.toLowerCase(), e]));
      list = recentNames.map((n) => byName.get(n.toLowerCase())).filter((e): e is LibraryExercise => !!e);
    } else if (filter === 'favorites') {
      list = library.filter((e) => favoriteIds.has(e.id));
    } else if (filter !== 'all') {
      list = library.filter((e) => e.primary_muscle === filter);
    }
    return [...list].sort((a, b) => (filter === 'recent' && !q ? 0 : a.name.localeCompare(b.name)));
  }, [library, query, filter, favoriteIds, recentNames]);

  const exactMatch = library.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  const chips: Array<{ id: Filter; label: string }> = [
    { id: 'recent', label: 'Recent' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'all', label: 'All' },
    ...MUSCLE_GROUPS.map((m) => ({ id: m.id, label: m.label })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 md:inset-auto md:left-1/2 md:top-12 md:h-[80vh] md:w-[560px] md:-translate-x-1/2 md:rounded-2xl md:border md:border-zinc-800 md:shadow-2xl">
      <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-10 w-10 flex items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!query && (
        <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 px-3 py-2.5 [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === c.id ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <ul className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {results.map((e) => (
          <li key={e.id} className="flex items-center gap-2 px-3">
            <button type="button" onClick={() => onPick(e)} className="flex-1 py-3 text-left">
              <div className="flex items-center gap-1.5 font-semibold text-white text-sm">
                {e.name}
                {e.is_basketball_specific && <Flame className="h-3.5 w-3.5 text-orange-400" aria-label="Basketball specific" />}
              </div>
              <div className="text-xs text-zinc-500">
                {muscleLabel(e.primary_muscle)}
                {e.equipment?.length ? ` · ${e.equipment.map((q) => q.replace(/_/g, ' ')).join(', ')}` : ''}
                {!e.is_system && ' · custom'}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(e)}
              aria-label={favoriteIds.has(e.id) ? `Remove ${e.name} from favorites` : `Add ${e.name} to favorites`}
              className="h-10 w-10 flex items-center justify-center"
            >
              <Star className={`h-4 w-4 ${favoriteIds.has(e.id) ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="p-6 text-center text-sm text-zinc-500">
            {filter === 'recent' && !query
              ? 'No recent exercises yet.'
              : filter === 'favorites' && !query
                ? 'Tap the star on any exercise to favorite it.'
                : 'No matching exercises.'}
          </li>
        )}
      </ul>

      {query.trim() && !exactMatch && (
        <div className="border-t border-zinc-800 p-3 space-y-2">
          <div className="text-xs text-zinc-400">Create &ldquo;{query.trim()}&rdquo; as a custom exercise</div>
          <div className="flex gap-2">
            <select
              value={customMuscle}
              onChange={(e) => setCustomMuscle(e.target.value)}
              aria-label="Muscle group"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            >
              {MUSCLE_GROUPS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={creating}
              onClick={async () => {
                setCreating(true);
                try {
                  await onCreateCustom(query.trim(), customMuscle);
                  setQuery('');
                } finally {
                  setCreating(false);
                }
              }}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
