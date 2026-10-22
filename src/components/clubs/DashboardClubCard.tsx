// src/components/clubs/DashboardClubCard.tsx
// "Pick your club" on the dashboard, for a player with no home club yet. The
// club stays private (00051); showing it on the player card is a separate
// switch in Settings → Your club. "I'm not at a club" hides the card on this
// device only, since there is nothing to save.
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Shield, X } from 'lucide-react';
import { ClubSearch } from '@/components/clubs/ClubSearch';
import type { Club } from '@/lib/clubs';

const HIDDEN_KEY = 'deadeye:club-card-hidden';
const listeners = new Set<() => void>();

function hiddenOnThisDevice(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

function hideOnThisDevice() {
  try {
    window.localStorage.setItem(HIDDEN_KEY, '1');
  } catch {
    // Private mode: the card simply comes back next visit
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function DashboardClubCard() {
  const router = useRouter();
  // Hidden on the server render, so a dismissed card never flashes in
  const hidden = useSyncExternalStore(subscribe, hiddenOnThisDevice, () => true);
  const [saved, setSaved] = useState<Club | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(club: Club) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: club.id, showOnCard: false }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'That did not save. Try again.');
        return;
      }
      setSaved(club);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (hidden && !saved) return null;

  if (saved) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-white">{saved.name} is your club</p>
          <p className="text-zinc-300">
            Only you can see it. To show it as a badge on your player card, go to{' '}
            <Link href="/settings#club" className="font-semibold text-emerald-300 underline">
              Settings → Your club
            </Link>
            .
          </p>
        </div>
        <button type="button" aria-label="Close" onClick={() => router.refresh()} className="text-zinc-500 hover:text-zinc-300">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-600/15 via-zinc-900 to-zinc-900 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/20">
          <Shield className="h-5 w-5 text-orange-300" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-white">Pick your club</h2>
          <p className="text-sm text-zinc-400">Who do you play for? Only you see it, unless you choose to show it on your card.</p>
        </div>
      </div>
      <ClubSearch id="dashboard-club-search" disabled={busy} onPick={(c) => void pick(c)} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={hideOnThisDevice} className="font-semibold text-zinc-400 underline hover:text-zinc-200">
          {"I'm not at a club"}
        </button>
        <Link href="/settings#club" className="font-semibold text-orange-300 underline">
          {"My club isn't listed"}
        </Link>
      </div>
    </section>
  );
}
