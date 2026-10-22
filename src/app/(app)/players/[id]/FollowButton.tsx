// src/app/(app)/players/[id]/FollowButton.tsx
// Follow the founder from their card (set_follow, 00050). Following puts their
// posts on the dashboard; it tells the founder nothing about the player.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const primary =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60';
const quiet =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60';

export function FollowButton({ userId, initial }: { userId: string; initial: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    const { data, error } = await createClient().rpc('set_follow', { p_user: userId, p_follow: !following });
    setBusy(false);
    if (error || data === 'not_followable') {
      setMessage('That did not work. Try again in a moment.');
      return;
    }
    setFollowing(data === 'following');
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-center">
        {following ? (
          <button type="button" className={quiet} disabled={busy} onClick={toggle} aria-pressed="true">
            <Check className="h-4 w-4 text-emerald-400" /> Following
          </button>
        ) : (
          <button type="button" className={primary} disabled={busy} onClick={toggle} aria-pressed="false">
            <Bell className="h-4 w-4" /> Follow
          </button>
        )}
      </div>
      <p className="text-center text-xs text-zinc-500">
        {following
          ? 'Their posts show on your dashboard. Tap Following to stop.'
          : 'Get their challenges and tips on your dashboard. They only see how many follow, never who.'}
      </p>
      {message && <p className="text-center text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
