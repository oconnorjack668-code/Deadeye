// src/components/BackButton.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Back to wherever the player came from: a player card opens from the
 * leaderboard, the friends list and team pages alike. Opened from a link
 * with nothing to go back to, it goes to `fallback`.
 */
export function BackButton({ fallback, label = 'Back' }: { fallback: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
