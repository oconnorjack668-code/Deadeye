// src/lib/plays/live.ts
// SERVER: whether Plays is open. Plays is open to everyone by default; this is
// the switch to close it for players if something goes wrong (a bad play, a
// quiz that marks wrong), without a code change. The owner can always open
// it, to check and fix plays while it is closed.
//
// To close Plays for players: set PLAYS_LIVE=false in Vercel (Production) and
// redeploy. Remove it (or set it to anything else) and redeploy to open again.
import { checkIsOwner } from '@/lib/auth';

/** False only when PLAYS_LIVE=false: otherwise Plays is open to every signed-in player. */
export function playsLiveForEveryone(): boolean {
  return (process.env.PLAYS_LIVE || '').trim().toLowerCase() !== 'false';
}

/** Whether the signed-in user can use Plays: everyone while it is live, the owner always. */
export async function playsOpenForMe(): Promise<boolean> {
  if (playsLiveForEveryone()) return true;
  return checkIsOwner();
}

export const PLAYS_NOT_OPEN = 'Plays are not open right now.';
