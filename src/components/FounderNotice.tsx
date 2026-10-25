// src/components/FounderNotice.tsx
// A founder post sent to every player (00054), as a slim strip at the very top
// of the dashboard: one line of label running into the message, cut to two
// lines with Read more, so it is noticed without pushing Today down. Amber, the
// app's "worth a look" colour: red means an error or a miss, and a note from the
// founder should not read as something broken.
// Dismissing it hides it on this device only, since there is nothing to save;
// a newer notice shows again. It stops showing after FOUNDER_NOTICE_DAYS.
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Megaphone, X } from 'lucide-react';
import type { FounderPost } from '@/lib/founderPosts';

const DISMISSED_KEY = 'deadeye:founder-notice-dismissed';
// Past this, the two-line cut will usually hide some of it, so offer Read more
const LONG_AT = 110;
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

export function FounderNotice({ post }: { post: FounderPost }) {
  // Counted as dismissed on the server render, so a dismissed notice never flashes in
  const dismissed = useSyncExternalStore(subscribe, dismissedOnThisDevice, () => post.id);
  const [open, setOpen] = useState(false);
  if (dismissed === post.id) return null;
  const long = post.body.length > LONG_AT || post.body.includes('\n');

  return (
    <section className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
      <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1 text-sm leading-snug">
        <p className={`whitespace-pre-line break-words text-zinc-200 ${open ? '' : 'line-clamp-2'}`}>
          <span className="font-semibold text-amber-300">From the founder</span>
          <span className="text-zinc-500"> · </span>
          {post.body}
        </p>
        {long && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="mt-1 text-xs font-semibold text-amber-300/90 hover:text-amber-200"
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss this notice"
        onClick={() => dismissOnThisDevice(post.id)}
        className="-m-3.5 p-3.5 text-zinc-500 hover:text-zinc-300"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
