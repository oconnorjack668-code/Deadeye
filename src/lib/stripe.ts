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
export async function proPriceLabels(): Promise<{ monthly: string | null; yearly: string | null; founder: string | null }> {
  if (!stripeConfigured()) return { monthly: null, yearly: null, founder: null };
  const [monthly, yearly, founder] = await Promise.all([
    priceLabel(process.env.STRIPE_PRO_MONTHLY_PRICE_ID),
    priceLabel(process.env.STRIPE_PRO_YEARLY_PRICE_ID),
    priceLabel(process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID),
  ]);
  return { monthly, yearly, founder };
}

/**
 * The monthly price a player checks out at: the founder price for anyone who
 * claimed the founding member offer (it is theirs for as long as they stay
 * subscribed), the normal one otherwise. Falls back to the normal price if no
 * founder price is set up, rather than refusing the sale.
 */
export function monthlyPriceFor(isFoundingMember: boolean): string | null {
  return (isFoundingMember && process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID) || process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null;
}

/** Stripe refuses a Checkout trial that ends sooner than this. */
export const MIN_TRIAL_MS = 48 * 3_600_000;

/**
 * When a subscription bought now should start charging. A founding member
 * still inside their free months is not charged until those end, so locking
 * in the founder price early costs them nothing. null means charge now.
 */
export function trialEndFor(foundingProUntil: string | null | undefined, now: Date = new Date()): number | null {
  if (!foundingProUntil) return null;
  const end = new Date(foundingProUntil).getTime();
  if (!Number.isFinite(end) || end - now.getTime() < MIN_TRIAL_MS) return null;
  return Math.floor(end / 1000);
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
