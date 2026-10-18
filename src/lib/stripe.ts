// src/lib/stripe.ts
// SERVER-ONLY: Stripe for the Deadeye Pro subscription. Everything is off until
// STRIPE_SECRET_KEY and a price id are set in the environment.
import Stripe from 'stripe';

export function stripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_MONTHLY_PRICE_ID);
}

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

export function priceIdFor(interval: 'month' | 'year'): string | null {
  return interval === 'year' ? process.env.STRIPE_PRO_YEARLY_PRICE_ID || null : process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null;
}

async function priceLabel(priceId: string | undefined): Promise<string | null> {
  if (!priceId) return null;
  try {
    const p = await getStripe().prices.retrieve(priceId);
    if (!p.unit_amount) return null;
    const amount = new Intl.NumberFormat('en-IE', { style: 'currency', currency: p.currency.toUpperCase() }).format(p.unit_amount / 100);
    return `${amount}/${p.recurring?.interval === 'year' ? 'year' : 'month'}`;
  } catch {
    return null;
  }
}

/**
 * Pro's prices as shown to players, e.g. "€6.99/month", read from Stripe so a
 * price changed there cannot disagree with one written on a page. null for a
 * plan that is not set up, or when Stripe cannot be reached.
 */
export async function proPriceLabels(): Promise<{ monthly: string | null; yearly: string | null }> {
  if (!stripeConfigured()) return { monthly: null, yearly: null };
  const [monthly, yearly] = await Promise.all([
    priceLabel(process.env.STRIPE_PRO_MONTHLY_PRICE_ID),
    priceLabel(process.env.STRIPE_PRO_YEARLY_PRICE_ID),
  ]);
  return { monthly, yearly };
}

type OurStatus ='active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

/** Maps a Stripe subscription status onto the subscriptions.status CHECK values. */
export function mapStatus(status: string): OurStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'incomplete':
      return status;
    case 'unpaid':
      return 'past_due';
    default:
      return 'canceled'; // canceled, incomplete_expired, paused
  }
}

/** Pro while the subscription is paid up (or in a trial / short grace period). */
export function planFor(status: string): 'pro' | 'free' {
  return status === 'active' || status === 'trialing' || status === 'past_due' ? 'pro' : 'free';
}
