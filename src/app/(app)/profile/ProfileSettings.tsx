// src/app/(app)/profile/ProfileSettings.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function ProfileSettings({ initialIsPublic, showLeaderboard = true }: { initialIsPublic: boolean; showLeaderboard?: boolean }) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleVisibility() {
    const next = !isPublic;
    setSavingVisibility(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; isPublic?: boolean };
      if (!res.ok) {
        setError(data.error || `Could not update leaderboard visibility (${res.status}).`);
        return;
      }
      setIsPublic(Boolean(data.isPublic));
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSavingVisibility(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not delete your account.');
        setDeleting(false);
        return;
      }
      await createClient().auth.signOut().catch(() => undefined);
      if (typeof caches !== 'undefined') await caches.delete('hoopiq-pages-v1').catch(() => false);
      try {
        localStorage.removeItem('hoopiq-offline-queue-v1');
        localStorage.removeItem('hoopiq-exercise-cache-v1');
      } catch {
        // storage unavailable
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {error && <Alert variant="error" title="Error">{error}</Alert>}

      {showLeaderboard && (
      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            When on, other players can see your display name and points. Your training details stay private.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-zinc-200">Show me on the leaderboard</span>
            <input
              type="checkbox"
              role="switch"
              checked={isPublic}
              disabled={savingVisibility}
              onChange={toggleVisibility}
              className="h-5 w-5 accent-red-500"
            />
          </label>
        </CardContent>
      </Card>
      )}

      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Download a copy of everything Deadeye stores about you (profile, sessions, workouts, study, AI reports) as
            a JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/account/export"
            download
            className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Download my data
          </a>
          <p className="mt-2 text-xs text-zinc-500">
            See the <a href="/privacy" className="underline">Privacy Policy</a> and{' '}
            <a href="/terms" className="underline">Terms of Use</a>.
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-900/50 bg-red-950/10">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            Permanently deletes your account, training history, AI reports, quiz results and uploaded videos, and
            cancels Pro straight away if you have it. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label htmlFor="confirm-delete" className="block text-xs text-zinc-400">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
          />
          <Button
            variant="danger"
            className="w-full"
            disabled={confirmText !== 'DELETE' || deleting}
            isLoading={deleting}
            onClick={deleteAccount}
          >
            Delete my account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
