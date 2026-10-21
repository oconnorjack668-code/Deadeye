// src/components/layout/ModeSwitch.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MODE_HOME } from '@/lib/coachSide';
import type { AppMode } from '@/lib/supabase/types';

/**
 * "Playing · Coaching" for someone who plays and coaches. The choice is saved
 * on the profile (app_mode, 00047), so the app opens in it next time, on any
 * phone. Before 00047 is run the save fails and the menus stay as they were,
 * but the switch still takes them to that side's home page.
 */
export function ModeSwitch({ mode }: { mode: AppMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function choose(next: AppMode) {
    if (next === mode || busy) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ app_mode: next }).eq('id', user.id);
    router.push(MODE_HOME[next]);
    router.refresh();
    setBusy(false);
  }

  return (
    <div role="group" aria-label="Switch between playing and coaching" className="flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-0.5 text-xs font-semibold">
      {(['playing', 'coaching'] as AppMode[]).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          disabled={busy}
          onClick={() => void choose(m)}
          className={`rounded-lg px-2.5 py-1.5 capitalize transition-colors ${
            mode === m ? (m === 'coaching' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white') : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
