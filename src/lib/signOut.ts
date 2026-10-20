// src/lib/signOut.ts
// Signing out of this phone. Browser only: called from a tap.

/**
 * Stops this phone's training reminders: they belong to the player who is
 * signing out. Runs before sign-out (the server needs the login to forget the
 * device) and never blocks it.
 */
async function stopReminders() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (!sub) return;
    await Promise.race([
      fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    await sub.unsubscribe().catch(() => false);
  } catch {
    // no service worker / push support: nothing to stop
  }
}

/** Signs out, and clears what this phone kept for the player. The caller then goes to /login. */
export async function signOutOfThisPhone(): Promise<void> {
  await stopReminders();
  // Loaded on tap: the Supabase library is large and most pages don't otherwise need it
  const { createClient } = await import('@/lib/supabase/client');
  await createClient().auth.signOut();
  // Pages kept for offline logging belong to this player
  if (typeof caches !== 'undefined') await caches.delete('hoopiq-pages-v1').catch(() => false);
}
