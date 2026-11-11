// src/app/(app)/workouts/DeleteProgramButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function DeleteProgramButton({ programId, name }: { programId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete the program "${name}" and all its routines? Your logged workouts are not affected.`)) return;
    setBusy(true);
    // Loaded on tap so the workouts list doesn't ship the Supabase library up front
    const { createClient } = await import('@/lib/supabase/client');
    const { error } = await createClient().from('user_programs').delete().eq('id', programId);
    setBusy(false);
    if (error) {
      window.alert(`Could not delete the program: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      aria-label={`Delete program ${name}`}
      className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
