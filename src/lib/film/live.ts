// src/lib/film/live.ts
// SERVER: whether Film is open. Film adds new data about players (film
// attempts, private notes) and sends viewing to YouTube after a tap, so it
// stays closed to players until the DPIA covering it is signed (STATUS S1,
// docs/legal/dpia.md R12-R13). The owner can always open it, to add clips in
// Owner tools and check them before players see them.
//
// To open Film for everyone: set FILM_LIVE=true in Vercel (Production) and
// redeploy. Nothing else changes.
import { checkIsOwner } from '@/lib/auth';

/** True when FILM_LIVE=true: Film is open to every signed-in player. */
export function filmLiveForEveryone(): boolean {
  return (process.env.FILM_LIVE || '').trim().toLowerCase() === 'true';
}

/** Whether the signed-in user can use Film: everyone once it is live, the owner before. */
export async function filmOpenForMe(): Promise<boolean> {
  if (filmLiveForEveryone()) return true;
  return checkIsOwner();
}

export const FILM_NOT_OPEN = 'Film is not open yet.';
