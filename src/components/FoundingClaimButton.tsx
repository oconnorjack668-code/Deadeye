// src/components/FoundingClaimButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift } from 'lucide-react';
import { FOUNDING_MONTHS } from '@/lib/founding';

export function FoundingClaimButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/founding/claim', { method: 'POST' }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error || 'Could not claim it just now. Please try again.');
      return;
    }
    // The pages read Pro from the server, so a refresh is what switches it on everywhere
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
      >
        <Gift className="h-4 w-4" /> {busy ? 'Claiming…' : `Claim ${FOUNDING_MONTHS} months of Pro free`}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
