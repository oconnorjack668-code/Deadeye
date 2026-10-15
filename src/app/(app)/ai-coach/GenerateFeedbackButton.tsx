// src/app/(app)/ai-coach/GenerateFeedbackButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function GenerateFeedbackButton({ sessionId, disabled }: { sessionId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai-coach/session-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not generate feedback.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right space-y-1">
      <Button variant="primary" size="sm" onClick={handleClick} isLoading={loading} disabled={disabled || loading}>
        {/* Not "Analyzing…", which is the exact word reviewers of other apps'
            AI coaches single out as sounding like a machine thinking about
            them. This says what it is actually doing. */}
        {loading ? 'Reading your session…' : 'Get AI feedback'}
      </Button>
      {error && <p className="text-xs text-red-400 max-w-[16rem]">{error}</p>}
    </div>
  );
}
