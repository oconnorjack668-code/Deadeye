// src/lib/founding.ts
// The founding member offer: the first FOUNDING_PLACES players to claim it get
// FOUNDING_MONTHS of Pro free, and after that can keep Pro at the founder
// price for as long as they stay subscribed.
//
// Claimed, not handed out. A player has to tap to take it, so the places go to
// people who want them, and a quiet account costs nothing whether it claims or
// not: free Pro only costs AI that gets used and money that would otherwise
// have been paid, and an inactive player does neither. No card is ever asked
// for, so nobody is charged by surprise when it ends - which matters when many
// of the players are under 18.
//
// The cap is enforced by claim_founding_pro() in 00037, under a lock, using
// the numbers passed from here, so the "places left" a page shows and the rule
// that stops one claim too many cannot disagree.

export const FOUNDING_PLACES = 100;
export const FOUNDING_MONTHS = 3;

/** Days before the end that the "keep Pro at the founder price" nudge appears. */
export const FOUNDING_REMINDER_DAYS = 7;

/**
 * Closes the offer early whatever the count, e.g. FOUNDING_OFFER_CLOSED=true
 * in Vercel. Players who already claimed keep their months; only new claims stop.
 */
export function foundingOfferSwitchedOff(): boolean {
  return (process.env.FOUNDING_OFFER_CLOSED || '').trim().toLowerCase() === 'true';
}

export function placesLeft(claimed: number): number {
  return Math.max(0, FOUNDING_PLACES - claimed);
}

export interface FoundingFields {
  plan_type: string | null;
  founding_claimed_at: string | null;
  founding_pro_until: string | null;
}

export type FoundingState =
  /** Can still claim: open, places left, not claimed, not already paying. */
  | { kind: 'can-claim'; placesLeft: number }
  /** Claimed and still inside the free months. */
  | { kind: 'active'; until: Date; daysLeft: number }
  /** Claimed, the free months are over, not paying: the founder price is theirs. */
  | { kind: 'ended' }
  /** Nothing to show: owner, already paying, offer closed or full. */
  | { kind: 'none' };

export function foundingState(
  sub: FoundingFields | null | undefined,
  { claimed, closed, isOwner }: { claimed: number; closed: boolean; isOwner: boolean },
  now: Date = new Date()
): FoundingState {
  if (!sub || isOwner || sub.plan_type === 'owner') return { kind: 'none' };
  if (sub.founding_claimed_at) {
    const until = sub.founding_pro_until ? new Date(sub.founding_pro_until) : null;
    if (until && until.getTime() > now.getTime()) {
      return { kind: 'active', until, daysLeft: Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86_400_000)) };
    }
    return sub.plan_type === 'pro' ? { kind: 'none' } : { kind: 'ended' };
  }
  if (sub.plan_type === 'pro' || closed) return { kind: 'none' };
  const left = placesLeft(claimed);
  return left > 0 ? { kind: 'can-claim', placesLeft: left } : { kind: 'none' };
}

/**
 * The exact number of places left is only shown once it is this low. "97
 * places left" reads as nobody wanting it; "only 20 left" is the moment the
 * number helps. Above this the offer is described as "the first 100 players".
 */
export const SHOW_PLACES_LEFT_AT = 25;

export function showPlacesLeft(left: number): boolean {
  return left > 0 && left <= SHOW_PLACES_LEFT_AT;
}

/** The founder price as shown when Stripe cannot be asked (see plans.ts). */
export const FOUNDER_PRICE_FALLBACK = '€4.99/month';
