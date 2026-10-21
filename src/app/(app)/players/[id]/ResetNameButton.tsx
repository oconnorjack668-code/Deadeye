// src/app/(app)/players/[id]/ResetNameButton.tsx
// Owner only (the page decides whether to show it): resets a rude display name
// to "Player" through /api/admin/reset-name.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export function ResetNameButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    if (!window.confirm(`Reset "${name}" to "Player"? The player can choose a new name in Settings.`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/admin/reset-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!res?.ok) {
      setMessage(data?.error || 'Could not reset the name.');
      return;
    }
    setMessage('Name reset to "Player".');
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-red-900/60 bg-red-950/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-red-300">Owner</p>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="mt-2 flex items-center gap-2 rounded-xl border border-red-800 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/40 disabled:opacity-50"
      >
        <ShieldAlert className="h-4 w-4" /> {busy ? 'Resetting…' : 'Reset this name to "Player"'}
      </button>
      {message && <p className="mt-2 text-xs text-zinc-300">{message}</p>}
    </div>
  );
}
