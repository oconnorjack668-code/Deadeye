// src/app/(app)/workouts/DeleteRoutineButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export function DeleteRoutineButton({ routineId, name, programId = null }: { routineId: string; name: string; programId?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete the routine "${name}"? Your logged workouts are not affected.`)) return;
    setBusy(true);
    // Loaded on tap so the workouts list doesn't ship the Supabase library up front
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { error } = await supabase.from('workout_routines').delete().eq('id', routineId);
    if (error) {
      setBusy(false);
      window.alert(`Could not delete the routine: ${error.message}`);
      return;
    }
    // The last routine of an imported program takes the program with it, so
    // an empty program (its name) is not kept where the player can't see it
    if (programId) {
      const { count } = await supabase
        .from('workout_routines')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', programId);
      if (count === 0) await supabase.from('user_programs').delete().eq('id', programId);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      aria-label={`Delete routine ${name}`}
      className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
