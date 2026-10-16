// src/app/parents/ParentApprovalForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export function ParentApprovalForm({ token, child, emailStep }: { token: string; child: string; emailStep: boolean }) {
  const router = useRouter();
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch('/api/parents/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, parentName, parentEmail, agree }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { status?: string; error?: string } | undefined;
    setSaving(false);
    if (!res?.ok) {
      setError(data?.error || 'Something went wrong. Please try again.');
      return;
    }
    if (data?.status === 'email_sent') setSentTo(parentEmail.trim());
    else router.refresh();
  }

  if (sentTo) {
    return (
      <Alert variant="success" title="Check your email">
        We sent a link to {sentTo}. Open it and tap Approve to finish. {child}&apos;s account is not approved until you do.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5">
      <h2 className="text-base font-bold text-white">Approve {child}&apos;s account</h2>
      {error && <Alert variant="error">{error}</Alert>}
      <Input label="Your full name" value={parentName} onChange={(e) => setParentName(e.target.value)} required autoComplete="name" />
      <Input
        label="Your email"
        type="email"
        value={parentEmail}
        onChange={(e) => setParentEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-300">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-500" />
        <span>
          I am {child}&apos;s parent or legal guardian, I have read the above, and I agree to {child} using Deadeye.
        </span>
      </label>
      <Button type="submit" className="w-full" isLoading={saving}>
        {emailStep ? 'Continue' : 'Approve'}
      </Button>
      {emailStep && <p className="text-xs text-zinc-500">We will email you a link to confirm.</p>}
    </form>
  );
}
