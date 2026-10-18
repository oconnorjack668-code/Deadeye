// src/lib/foundingServer.ts
// SERVER-ONLY: reading the founding member offer's count, which needs the
// service role (players can only see their own subscription row).
import { createAdminClient } from './supabase/admin';
import { FOUNDING_PLACES, foundingOfferSwitchedOff, placesLeft } from './founding';

export interface FoundingOffer {
  /** New claims are possible: switched on and places left. */
  open: boolean;
  claimed: number;
  placesLeft: number;
  /** False when the count could not be read; pages then describe the offer without a number. */
  counted: boolean;
}

export async function getFoundingOffer(): Promise<FoundingOffer> {
  const closed = foundingOfferSwitchedOff();
  try {
    const { count, error } = await createAdminClient()
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .not('founding_claimed_at', 'is', null);
    if (error) throw error;
    const claimed = count || 0;
    return { open: !closed && claimed < FOUNDING_PLACES, claimed, placesLeft: placesLeft(claimed), counted: true };
  } catch {
    // Unknown count: still describe the offer while it is switched on, and let
    // the claim itself (which counts under a lock) be the final word
    return { open: !closed, claimed: 0, placesLeft: FOUNDING_PLACES, counted: false };
  }
}
