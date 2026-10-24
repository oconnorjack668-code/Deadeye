// src/components/FounderNotice.tsx
// A founder post sent to every player (00054), at the top of the dashboard.
// Dismissing it hides it on this device only, since there is nothing to save;
// a newer notice shows again. It stops showing after FOUNDER_NOTICE_DAYS.
'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import { FounderPostItem } from '@/components/FounderPostList';
import type { FounderPost } from '@/lib/founderPosts';

const DISMISSED_KEY = 'deadeye:founder-notice-dismissed';
const listeners = new Set<() => void>();

/** The id of the notice dismissed on this device, or an empty string */
function dismissedOnThisDevice(): string {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) ?? '';
  } catch {
    return '';
  }
}

function dismissOnThisDevice(id: string) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, id);
  } catch {
    // Private mode: the notice simply comes back next visit
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function FounderNotice({ post, founderId }: { post: FounderPost; founderId: string }) {
  // Counted as dismissed on the server render, so a dismissed notice never flashes in
  const dismissed = useSyncExternalStore(subscribe, dismissedOnThisDevice, () => post.id);
  if (dismissed === post.id) return null;

  return (
    <section role="status" className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <Megaphone className="h-4 w-4 text-red-400" /> From the founder
        </h2>
        <div className="flex items-center gap-3">
          <Link href={`/players/${founderId}`} className="text-xs font-semibold text-orange-300 underline">
            All posts
          </Link>
          <button
            type="button"
            aria-label="Dismiss this notice"
            onClick={() => dismissOnThisDevice(post.id)}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ul>
        <FounderPostItem post={post} />
      </ul>
    </section>
  );
}
