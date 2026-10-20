// src/app/parents/PhotoDecision.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/** Approve or decline a child's photo, or remove one already approved. */
export function PhotoDecision({ token, child, approved }: { token: string; child: string; approved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  async function decide(decision: 'approve' | 'remove') {
    setBusy(decision);
    setError(null);
    const res = await fetch('/api/parents/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, decision }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      setError(data?.error || 'Could not save your answer. Please try again.');
      return;
    }
    if (decision === 'remove') setRemoved(true);
    else router.refresh();
  }

  if (removed) {
    return (
      <p className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-sm text-zinc-300">
        The photo has been deleted. {child} keeps their emoji avatar and can ask again with a different photo.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5">
      {error && <Alert variant="error">{error}</Alert>}
      {approved ? (
        <Button variant="outline" onClick={() => void decide('remove')} isLoading={busy === 'remove'}>
          Remove this photo
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => void decide('approve')} isLoading={busy === 'approve'} disabled={busy !== null}>
            Approve
          </Button>
          <Button variant="outline" onClick={() => void decide('remove')} isLoading={busy === 'remove'} disabled={busy !== null}>
            Don&apos;t approve
          </Button>
        </div>
      )}
    </div>
  );
}
