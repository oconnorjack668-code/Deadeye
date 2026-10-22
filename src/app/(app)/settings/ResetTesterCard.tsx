// src/app/(app)/settings/ResetTesterCard.tsx
// Shown only to tester logins (TEST_ACCOUNT_EMAILS). Turns the account back
// into a brand-new player through /api/account/reset-tester, clears what this
// browser remembers about it, signs back in and starts setup.
'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/** What a phone remembers between visits: the logger's mode and draft, hidden tips, the starting steps */
function forgetThisBrowser() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('hoopiq-') || k.startsWith('deadeye-'));
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // storage unavailable: a private window has nothing to forget anyway
  }
}

export function ResetTesterCard({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/reset-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not reset this account.');
        setResetting(false);
        return;
      }
      forgetThisBrowser();
      if (typeof caches !== 'undefined') await caches.delete('hoopiq-pages-v1').catch(() => false);
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      // A full load, so nothing from the old account stays on screen
      window.location.assign(signInError ? '/login' : '/onboarding');
    } catch {
      setError('Network error. Check your connection and try again.');
      setResetting(false);
    }
  }

  return (
    <Card className="border-amber-900/50 bg-amber-950/10">
      <CardHeader>
        <CardTitle>Tester: start again as a new player</CardTitle>
        <CardDescription>
          Deletes everything on this account and makes it again with the same email, so the next visit goes through
          setup, the welcome screen and a first log like a brand-new player. No email is sent. Only tester logins see
          this.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <Alert variant="error" title="Not reset">{error}</Alert>}
        <label htmlFor="tester-password" className="block text-xs text-zinc-400">
          Password to sign back in with (it can be the one you use now)
        </label>
        <input
          id="tester-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        />
        <label htmlFor="confirm-reset" className="block text-xs text-zinc-400">
          Type RESET to confirm
        </label>
        <input
          id="confirm-reset"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoComplete="off"
          className="w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
        />
        <Button
          variant="danger"
          className="w-full"
          disabled={confirmText !== 'RESET' || !password || resetting}
          isLoading={resetting}
          onClick={reset}
        >
          Reset to a new player
        </Button>
      </CardContent>
    </Card>
  );
}
