// src/app/age-check/AgeCheckForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgeChoice, type AgeAnswer } from '@/components/AgeChoice';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function AgeCheckForm() {
  const router = useRouter();
  const [age, setAge] = useState<AgeAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!age) {
      setError('Please choose an answer.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch('/api/age-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is16Plus: age === '16-plus' }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { next?: string; error?: string } | undefined;
    if (!res?.ok || !data?.next) {
      setError(data?.error || 'Could not save your answer. Please try again.');
      setSaving(false);
      return;
    }
    router.replace(data.next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5">
      {error && <Alert variant="error">{error}</Alert>}
      <AgeChoice value={age} onChange={setAge} />
      <p className="text-xs text-zinc-500">Please answer honestly. You can&apos;t change this answer later.</p>
      <Button type="submit" className="w-full" isLoading={saving}>
        Continue
      </Button>
    </form>
  );
}
