// src/app/(app)/pro/WithdrawFromContract.tsx
// The EU withdrawal function (src/lib/withdrawal.ts). The law asks for a label
// that says what it does - "withdraw from contract", not just "cancel" - and a
// second step to confirm, so a stray tap cannot end a subscription.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function WithdrawFromContract({ deadline }: { deadline: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'closed' | 'confirm'>('closed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ refunded?: string; at?: string } | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/billing/withdraw', { method: 'POST' }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; refunded?: string; at?: string } | undefined;
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error || 'Something went wrong. Please try again.');
      return;
    }
    setDone({ refunded: data?.refunded, at: data?.at });
    router.refresh();
  }

  if (done) {
    return (
      <Alert variant="success" title="You have withdrawn from Pro">
        We received your withdrawal{done.at ? ` on ${done.at}` : ''}.
        {done.refunded ? ` ${done.refunded} is being refunded to your card.` : ''} You are now on the free plan.
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div>
        <div className="text-sm font-semibold text-white">Changed your mind?</div>
        <p className="text-xs text-zinc-400">
          You can withdraw from your Pro contract until {deadline} and get a full refund. Pro ends straight away.
        </p>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {step === 'closed' ? (
        <Button variant="outline" className="w-full" onClick={() => setStep('confirm')}>
          Withdraw from contract
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-300">Withdraw from Deadeye Pro? Your subscription ends now and you get a full refund.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={confirm} isLoading={busy}>
              Confirm withdrawal
            </Button>
            <Button variant="outline" onClick={() => setStep('closed')} disabled={busy}>
              Keep Pro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
