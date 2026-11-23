// src/lib/usePrefersReducedMotion.ts
// Whether the player asked their phone for less motion, kept in step if they
// change it. False on the server, where there is no screen to ask.
import { useSyncExternalStore } from 'react';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  const mq = window.matchMedia?.(REDUCED_QUERY);
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => !!window.matchMedia?.(REDUCED_QUERY).matches,
    () => false
  );
}
