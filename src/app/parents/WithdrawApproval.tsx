// src/app/parents/WithdrawApproval.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function WithdrawApproval({ token, child }: { token: string; child: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/parents/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      setError(data?.error || 'Could not withdraw your approval. Please try again.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5">
      {error && <Alert variant="error">{error}</Alert>}
      {confirming ? (
        <>
          <p className="text-sm text-zinc-300">
            {child}&apos;s account will be locked straight away, and deleted after 30 days unless you approve it again.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={withdraw} isLoading={busy}>
              Withdraw approval
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <Button variant="outline" onClick={() => setConfirming(true)}>
          Withdraw my approval
        </Button>
      )}
    </div>
  );
}
