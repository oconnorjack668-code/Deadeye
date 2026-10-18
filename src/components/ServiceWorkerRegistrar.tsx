// src/components/ServiceWorkerRegistrar.tsx
'use client';

import { useEffect } from 'react';

/** Chrome's install offer, held so an "Install Deadeye" button can use it later. */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __deadeyeInstallPrompt?: InstallPromptEvent | null;
  }
}

export const INSTALLABLE_EVENT = 'deadeye:installable';

// Registers public/sw.js (offline page + static asset cache) in production builds.
// Also catches Chrome's install offer: it fires once, early in page load, and a
// component that starts listening when it mounts can miss it, so it is kept on
// window from here, which mounts with the root layout.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    const onInstallable = (e: Event) => {
      e.preventDefault();
      window.__deadeyeInstallPrompt = e as InstallPromptEvent;
      window.dispatchEvent(new Event(INSTALLABLE_EVENT));
    };
    const onInstalled = () => {
      window.__deadeyeInstallPrompt = null;
      window.dispatchEvent(new Event(INSTALLABLE_EVENT));
    };
    window.addEventListener('beforeinstallprompt', onInstallable);
    window.addEventListener('appinstalled', onInstalled);

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}
