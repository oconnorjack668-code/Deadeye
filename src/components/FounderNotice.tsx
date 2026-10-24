// src/components/FounderNotice.tsx
// A founder post sent to every player (00054), as a banner at the very top of
// the dashboard. Amber, the app's "worth a look" colour: red means an error or a
// miss, and a note from the founder should not read as something broken.
// Dismissing it hides it on this device only, since there is nothing to save;
// a newer notice shows again. It stops showing after FOUNDER_NOTICE_DAYS.
'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import { postKindLabel, type FounderPost } from '@/lib/founderPosts';

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
    <section className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            From the founder · {postKindLabel(post.kind)}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-amber-50">{post.body}</p>
          <Link href={`/players/${founderId}`} className="mt-2 inline-block text-xs font-semibold text-amber-300 underline">
            All posts
          </Link>
        </div>
        <button
          type="button"
          aria-label="Dismiss this notice"
          onClick={() => dismissOnThisDevice(post.id)}
          className="-m-3.5 p-3.5 text-amber-300/70 hover:text-amber-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
