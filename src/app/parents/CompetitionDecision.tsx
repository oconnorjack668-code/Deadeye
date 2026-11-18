// src/app/parents/CompetitionDecision.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { EntryStatus } from '@/lib/supabase/types';

/** Approve or decline a child's competition entry, or change an earlier answer. */
export function CompetitionDecision({ token, child, status }: { token: string; child: string; status: EntryStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'decline') {
    setBusy(decision);
    setError(null);
    const res = await fetch('/api/parents/competition', {
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
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5">
      {error && <Alert variant="error">{error}</Alert>}
      {status === 'pending_parent' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => void decide('approve')} isLoading={busy === 'approve'} disabled={busy !== null}>
            Approve
          </Button>
          <Button variant="outline" onClick={() => void decide('decline')} isLoading={busy === 'decline'} disabled={busy !== null}>
            Decline
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-300">You can change your mind until the competition closes.</p>
          {status === 'valid' ? (
            <Button variant="outline" onClick={() => void decide('decline')} isLoading={busy === 'decline'}>
              Withdraw {child}&apos;s entry
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void decide('approve')} isLoading={busy === 'approve'}>
              Approve {child}&apos;s entry
            </Button>
          )}
        </>
      )}
    </div>
  );
}
