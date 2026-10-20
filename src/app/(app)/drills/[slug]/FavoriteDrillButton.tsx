// src/app/(app)/drills/[slug]/FavoriteDrillButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** Stars a drill so it shows under Favourites in the drill library. */
export function FavoriteDrillButton({ drillId, userId, initial }: { drillId: string; userId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !on;
    // Shown straight away and put back if the save fails
    setOn(next);
    const supabase = createClient();
    const { error: saveError } = next
      ? await supabase.from('drill_favorites').insert({ user_id: userId, drill_id: drillId })
      : await supabase.from('drill_favorites').delete().eq('user_id', userId).eq('drill_id', drillId);
    setBusy(false);
    if (saveError) {
      setOn(!next);
      setError('Could not save that. Try again.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={on}
        aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
          on ? 'border-amber-500/50 bg-amber-500/15 text-amber-300' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <Star className={`h-5 w-5 ${on ? 'fill-current' : ''}`} />
      </button>
      {error && <span className="mt-1 text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
