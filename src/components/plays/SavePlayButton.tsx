// src/components/plays/SavePlayButton.tsx
// Saves a play so it shows under Saved in the plays library. Same pattern as
// FavoriteDrillButton: shown straight away, put back if the save fails.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SavePlayButton({ playId, userId, initial }: { playId: string; userId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !on;
    setOn(next);
    const supabase = createClient();
    const { error: saveError } = next
      ? await supabase.from('play_saves').insert({ user_id: userId, play_id: playId })
      : await supabase.from('play_saves').delete().eq('user_id', userId).eq('play_id', playId);
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
        aria-label={on ? 'Remove from saved plays' : 'Save this play'}
        className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
          on ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Bookmark className={`h-5 w-5 ${on ? 'fill-current' : ''}`} />
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
