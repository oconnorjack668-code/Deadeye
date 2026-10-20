// src/app/(app)/basketball/[id]/DeleteSessionButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Deletes a hoops session; its drills and shots go with it (ON DELETE CASCADE). */
export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm('Delete this session and all its shots? This cannot be undone.')) return;
    setBusy(true);
    // Loaded on tap so the session page doesn't ship the Supabase library up front
    const { createClient } = await import('@/lib/supabase/client');
    const { error } = await createClient().from('training_sessions').delete().eq('id', id);
    if (error) {
      setBusy(false);
      window.alert(`Could not delete: ${error.message}`);
      return;
    }
    router.push('/basketball');
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void remove()} disabled={busy} className="mt-6 w-full text-center text-xs text-red-400/80 underline disabled:opacity-50">
      {busy ? 'Deleting…' : 'Delete session'}
    </button>
  );
}
