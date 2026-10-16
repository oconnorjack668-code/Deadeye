// src/app/parent-approval/WaitingForParent.tsx
'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, RefreshCw, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const noSubscribe = () => () => {};

export function WaitingForParent({ token, emailedTo }: { token: string; emailedTo: string | null }) {
  const router = useRouter();
  // window is not there during server render, so both read as empty until hydrated
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === 'function', () => false);
  const link = origin ? `${origin}/parents/${token}` : '';
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check again whenever they come back to the app, e.g. after the parent approved on their phone
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [router]);

  async function share() {
    try {
      await navigator.share({
        title: 'Approve my Deadeye account',
        text: 'Can you approve my account on Deadeye, the basketball training app? It takes a minute:',
        url: link,
      });
    } catch {
      // closed the share sheet
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Press and hold the link to copy it instead.');
    }
  }

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut().catch(() => undefined);
    router.replace('/login');
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/account/delete', { method: 'POST' }).catch(() => null);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      setError(data?.error || 'Could not delete your account.');
      setBusy(false);
      return;
    }
    await createClient().auth.signOut().catch(() => undefined);
    router.replace('/');
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {emailedTo && (
        <Alert variant="info" title="Nearly there">
          We emailed {emailedTo}. Ask your parent to open that email and tap the link in it.
        </Alert>
      )}

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Link for your parent</p>
        <p className="break-all rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200 select-all">{link || '…'}</p>
        <div className="grid grid-cols-2 gap-2">
          {canShare ? (
            <Button onClick={share} disabled={!link}>
              <Share2 className="mr-1.5 h-4 w-4" /> Send link
            </Button>
          ) : (
            <Button onClick={copy} disabled={!link}>
              <Copy className="mr-1.5 h-4 w-4" /> {copied ? 'Copied' : 'Copy link'}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Check again
          </Button>
        </div>
        {canShare && (
          <button type="button" onClick={copy} className="text-xs text-zinc-400 underline hover:text-zinc-200">
            {copied ? 'Copied' : 'Or copy the link'}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <button type="button" onClick={signOut} disabled={busy} className="underline hover:text-zinc-300">
          Sign out
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-2">
            Delete everything?
            <button type="button" onClick={deleteAccount} disabled={busy} className="font-semibold text-red-400 underline">
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="underline">
              No
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="underline hover:text-zinc-300">
            Delete my account
          </button>
        )}
      </div>
    </div>
  );
}
