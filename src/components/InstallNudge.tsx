// src/components/InstallNudge.tsx
// One line on the dashboard for a player using Deadeye in a phone's browser
// rather than from the home screen. One quiet line, not a card, because the
// dashboard keeps today's session at the top on purpose; and gone for good once
// dismissed. Never shown on a computer, where there is nothing to install to.
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Smartphone, X } from 'lucide-react';
import { detectInstallPlatform } from '@/lib/installPlatform';

const KEY = 'deadeye-install-nudge-dismissed';
const noSubscribe = () => () => {};

function shouldShow(): boolean {
  try {
    if (localStorage.getItem(KEY)) return false;
  } catch {
    // storage blocked: show it, and dismissing lasts for this visit
  }
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const platform = detectInstallPlatform(navigator.userAgent, { standalone, touchPoints: navigator.maxTouchPoints || 0 });
  return platform !== 'installed' && platform !== 'desktop';
}

export function InstallNudge() {
  const wanted = useSyncExternalStore(noSubscribe, shouldShow, () => false);
  const [dismissed, setDismissed] = useState(false);
  if (!wanted || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // not remembered, which only means it can come back next visit
    }
  }

  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
      <Smartphone className="h-4 w-4 flex-shrink-0 text-orange-400" />
      <Link href="/install" className="min-w-0 flex-1 truncate hover:text-zinc-200">
        Add Deadeye to your home screen for full screen and reminders <span className="text-orange-400">· How</span>
      </Link>
      <button type="button" onClick={dismiss} aria-label="Hide this" className="flex-shrink-0 p-1 text-zinc-600 hover:text-zinc-300">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
