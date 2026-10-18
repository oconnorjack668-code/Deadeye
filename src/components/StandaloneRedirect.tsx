// src/components/StandaloneRedirect.tsx
// The landing page is the website, for everyone - signed in or not - so it
// can be looked at and shared. The one place it should not appear by itself is
// the installed app: the manifest starts it at /dashboard, but some phones keep
// the page they were on when it was added instead, and an app that opens on its
// own sales page every time is broken. So when the page is running as the
// installed app, it moves on to where the app belongs - unless the player
// opened the website from inside the app on purpose (?site=1, from Settings).
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function StandaloneRedirect({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    if (new URLSearchParams(window.location.search).get('site') === '1') return;
    router.replace(signedIn ? '/dashboard' : '/login');
  }, [router, signedIn]);
  return null;
}
