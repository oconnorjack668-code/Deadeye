// src/components/coach/LeagueOptions.tsx
// The options of a league <select>: none, the leagues that fit the team
// first, every other competition by kind, and "not listed" last.
import React from 'react';
import { LEAGUE_NOT_LISTED, leagueGroups, leagueLabel } from '@/lib/leagues';

export function LeagueOptions({ ageGroup, level, county }: { ageGroup?: string | null; level?: string | null; county?: string | null }) {
  return (
    <>
      <option value="" className="bg-zinc-900 text-zinc-100">
        No league yet
      </option>
      {leagueGroups({ ageGroup, level, county }).map((group) => (
        <optgroup key={group.title} label={group.title} className="bg-zinc-900 text-zinc-400">
          {group.leagues.map((l) => (
            <option key={l.id} value={l.id} className="bg-zinc-900 text-zinc-100">
              {leagueLabel(l)}
            </option>
          ))}
        </optgroup>
      ))}
      <optgroup label="Not here?" className="bg-zinc-900 text-zinc-400">
        <option value={LEAGUE_NOT_LISTED} className="bg-zinc-900 text-zinc-100">
          My league isn&apos;t listed
        </option>
      </optgroup>
    </>
  );
}
