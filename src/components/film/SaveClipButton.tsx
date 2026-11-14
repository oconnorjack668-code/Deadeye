// src/components/film/SaveClipButton.tsx
// Saves a film clip so it shows under Saved in the film library (for a
// coach, this is favouriting it). Same pattern as SavePlayButton: shown
// straight away, put back if the save fails.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SaveClipButton({ clipId, userId, initial }: { clipId: string; userId: string; initial: boolean }) {
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
      ? await supabase.from('film_saves').insert({ user_id: userId, clip_id: clipId })
      : await supabase.from('film_saves').delete().eq('user_id', userId).eq('clip_id', clipId);
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
        aria-label={on ? 'Remove from saved clips' : 'Save this clip'}
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
