// src/components/LevelUpCelebration.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { PartyPopper, X } from 'lucide-react';
import { tierFor, type TierName } from '@/lib/achievements';
import { TIER_THEME } from '@/lib/tierTheme';

const SEEN_KEY = 'deadeye-level-seen';

/**
 * A moment for levelling up, the first time the player sees their new level.
 *
 * Levels are worked out from what has been logged, so there is no "you just
 * levelled up" event to hang this on. Instead the level last shown on this
 * phone is remembered, and anything higher is celebrated once. The first visit
 * only records the level: a player who has been training for months should
 * not be told they just reached a level they reached long ago.
 */
export function LevelUpCelebration({ level, tier }: { level: number; tier: TierName }) {
  const [from, setFrom] = useState<number | null>(null);

  // Read after the page has painted, never during render: the server has no
  // storage, and a banner the server did not render would not match
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const seen = Number(localStorage.getItem(SEEN_KEY));
        if (Number.isFinite(seen) && seen > 0 && level > seen) setFrom(seen);
        localStorage.setItem(SEEN_KEY, String(level));
      } catch {
        // Storage blocked: no celebration, which is fine
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [level]);

  if (from === null) return null;
  const newTier = tierFor(from).name !== tier;
  const theme = TIER_THEME[tier];

  return (
    <div
      role="status"
      className={`deadeye-pop relative mb-4 overflow-hidden rounded-2xl border p-4 ${theme.card}`}
    >
      <button
        type="button"
        onClick={() => setFrom(null)}
        aria-label="Close"
        className="absolute right-2 top-2 rounded-lg p-1.5 text-zinc-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${theme.chip}`}>
          <PartyPopper className="h-6 w-6" />
        </span>
        <div>
          <div className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Level up</div>
          <div className="text-2xl font-black text-white">
            Level {level}
            {level - from > 1 && <span className="ml-1.5 text-sm font-semibold text-zinc-400">up {level - from} levels</span>}
          </div>
          {newTier && <div className={`text-sm font-semibold ${theme.text}`}>You are now {tier === 'All-Star' || tier === 'MVP' ? 'an' : 'a'} {tier}</div>}
        </div>
      </div>
    </div>
  );
}
