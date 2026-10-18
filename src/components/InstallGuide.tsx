// src/components/InstallGuide.tsx
// How to put Deadeye on your home screen, for the phone and browser in hand.
// Used on the landing page, /install, and as a reminder on the dashboard.
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Bell, Check, Copy, Download, EllipsisVertical, Maximize2, Share, SquarePlus, WifiOff } from 'lucide-react';
import { detectInstallPlatform, type InstallPlatform } from '@/lib/installPlatform';
import { INSTALLABLE_EVENT } from '@/components/ServiceWorkerRegistrar';

const noSubscribe = () => () => {};

function subscribeInstallable(onChange: () => void) {
  window.addEventListener(INSTALLABLE_EVENT, onChange);
  return () => window.removeEventListener(INSTALLABLE_EVENT, onChange);
}

function readPlatform(): InstallPlatform {
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return detectInstallPlatform(navigator.userAgent, { standalone, touchPoints: navigator.maxTouchPoints || 0 });
}

type Phone = 'iphone' | 'android';

export function InstallGuide({ showWhy = true }: { showWhy?: boolean }) {
  // null during the server render, which cannot know the device
  const platform = useSyncExternalStore<InstallPlatform | null>(noSubscribe, readPlatform, () => null);
  const canPrompt = useSyncExternalStore(subscribeInstallable, () => !!window.__deadeyeInstallPrompt, () => false);
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');
  const [picked, setPicked] = useState<Phone | null>(null);
  const [copied, setCopied] = useState(false);

  const phone: Phone = picked ?? (platform === 'android' ? 'android' : 'iphone');

  async function install() {
    const prompt = window.__deadeyeInstallPrompt;
    if (!prompt) return;
    await prompt.prompt().catch(() => undefined);
    // Chrome allows the offer once; after an answer it is spent either way
    window.__deadeyeInstallPrompt = null;
    window.dispatchEvent(new Event(INSTALLABLE_EVENT));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address is on screen to copy by hand
    }
  }

  if (platform === 'installed') {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 p-4 text-sm font-semibold text-emerald-300">
        <Check className="h-4 w-4" /> You are using the Deadeye app. Nothing more to do.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {platform === 'in-app' && (
        <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-bold text-white">Open this page in Safari or Chrome first</p>
          <p>
            You are inside another app&apos;s browser, like Instagram or Snapchat, and apps can&apos;t be installed from
            there. Tap the <strong>⋯</strong> or <strong>⋮</strong> menu and choose <strong>Open in browser</strong>{' '}
            (or Open in Safari / Chrome), then follow the steps below.
          </p>
          <CopyLink origin={origin} copied={copied} onCopy={copyLink} />
        </div>
      )}

      {platform === 'desktop' && (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          <p className="font-bold text-white">Deadeye is made for your phone</p>
          <p>Open this address on your phone, then follow the steps for it below.</p>
          <CopyLink origin={origin} copied={copied} onCopy={copyLink} />
        </div>
      )}

      <div className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900 p-1" role="tablist" aria-label="Your phone">
        {(['iphone', 'android'] as Phone[]).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={phone === p}
            onClick={() => setPicked(p)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              phone === p ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {p === 'iphone' ? 'iPhone' : 'Android'}
          </button>
        ))}
      </div>

      {phone === 'iphone' ? (
        <ol className="space-y-3 text-sm text-zinc-300">
          <Step n={1}>
            Open Deadeye in <strong className="text-white">Safari</strong> and tap the Share button{' '}
            <Share className="inline h-4 w-4 align-text-bottom text-sky-400" aria-label="Share" /> at the bottom of the
            screen.
          </Step>
          <Step n={2}>
            Scroll down and tap <strong className="text-white">Add to Home Screen</strong>{' '}
            <SquarePlus className="inline h-4 w-4 align-text-bottom" aria-hidden />.
          </Step>
          <Step n={3}>
            Tap <strong className="text-white">Add</strong>. Deadeye is now on your home screen; open it from there
            from now on.
          </Step>
          {platform === 'ios-other' && (
            <li className="rounded-lg bg-zinc-900 p-3 text-xs text-zinc-400">
              Using Chrome or another browser? Its Share button is in the address bar. If Add to Home Screen isn&apos;t
              there, open this page in Safari instead.
            </li>
          )}
        </ol>
      ) : (
        <div className="space-y-3">
          {canPrompt && (
            <button
              type="button"
              onClick={install}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-500"
            >
              <Download className="h-5 w-5" /> Install Deadeye
            </button>
          )}
          <ol className="space-y-3 text-sm text-zinc-300">
            <Step n={1}>
              Open Deadeye in <strong className="text-white">Chrome</strong> and tap the menu{' '}
              <EllipsisVertical className="inline h-4 w-4 align-text-bottom" aria-label="three dots" /> at the top right.
            </Step>
            <Step n={2}>
              Tap <strong className="text-white">Install app</strong> (on some phones it says{' '}
              <strong className="text-white">Add to Home screen</strong>).
            </Step>
            <Step n={3}>
              Tap <strong className="text-white">Install</strong>. Deadeye appears with your other apps.
            </Step>
          </ol>
        </div>
      )}

      {showWhy && (
        <ul className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
          <li className="flex gap-2 rounded-lg bg-zinc-900/70 p-3">
            <Maximize2 className="h-4 w-4 flex-shrink-0 text-orange-400" /> Full screen, opened from your home screen like
            any other app.
          </li>
          <li className="flex gap-2 rounded-lg bg-zinc-900/70 p-3">
            <WifiOff className="h-4 w-4 flex-shrink-0 text-orange-400" /> Log training with no signal in the gym; it
            uploads when you are back online.
          </li>
          <li className="flex gap-2 rounded-lg bg-zinc-900/70 p-3">
            <Bell className="h-4 w-4 flex-shrink-0 text-orange-400" /> Training reminders. On iPhone these only work once
            Deadeye is on your home screen.
          </li>
        </ul>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-black text-white">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function CopyLink({ origin, copied, onCopy }: { origin: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200">{origin || '…'}</code>
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
      >
        <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
