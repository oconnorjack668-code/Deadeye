// src/components/plays/RemoveFromPlaybookButton.tsx
// Takes a play out of a team playbook, from the coach's Playbook tab. The
// play itself stays; the team's players just stop seeing it there.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function RemoveFromPlaybookButton({ teamId, playId, title }: { teamId: string; playId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient().from('team_playbook').delete().eq('team_id', teamId).eq('play_id', playId);
    setBusy(false);
    if (error) {
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        aria-label={`Take ${title} out of this playbook`}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
      {failed && (
        <span role="alert" className="text-sm text-red-400">
          Not removed. Try again.
        </span>
      )}
    </>
  );
}
