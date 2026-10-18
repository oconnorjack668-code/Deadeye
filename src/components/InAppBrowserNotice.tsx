// src/components/InAppBrowserNotice.tsx
// The first thing someone sees when they open Deadeye from a link inside
// TikTok, Instagram or Snapchat - which is where a bio link opens, and where
// most new players will arrive from. Those browsers cannot add a web app to the
// home screen, and an account made in one does not stay logged in once the
// page is opened in Safari or Chrome. Saying so before they sign up saves them
// doing everything twice.
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { detectInstallPlatform, inAppBrowserName } from '@/lib/installPlatform';

const noSubscribe = () => () => {};

/** A string, so useSyncExternalStore sees an unchanged value as unchanged. */
function readInApp(): string {
  const ua = navigator.userAgent;
  if (detectInstallPlatform(ua, { touchPoints: navigator.maxTouchPoints || 0 }) !== 'in-app') return '';
  return `in-app:${inAppBrowserName(ua) || ''}`;
}

export function InAppBrowserNotice() {
  // Empty on the server, which cannot know the browser
  const state = useSyncExternalStore(noSubscribe, readInApp, () => '');
  const href = useSyncExternalStore(noSubscribe, () => window.location.href, () => '');
  const [copied, setCopied] = useState(false);
  if (!state) return null;

  const name = state.slice('in-app:'.length);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the menu route above still works
    }
  }

  return (
    <div className="mx-auto mb-8 max-w-md rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-left">
      <p className="flex items-center gap-2 font-bold text-white">
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-amber-400" /> Open this in Safari or Chrome first
      </p>
      <p className="mt-1.5 text-sm text-amber-100">
        You&apos;re in {name ? `${name}'s` : "another app's"} browser, which can&apos;t install apps. Tap the{' '}
        <strong>⋯</strong> or <strong>⋮</strong> menu at the top and choose <strong>Open in browser</strong>. Do it
        before you sign up, so you only have to log in once.
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/10"
      >
        <Copy className="h-3.5 w-3.5" /> {copied ? 'Link copied' : 'Or copy the link to paste in your browser'}
      </button>
    </div>
  );
}
