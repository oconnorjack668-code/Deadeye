// src/components/FoundingCard.tsx
// The founding member offer as a player sees it, wherever it appears:
//   can claim  - what it is, and the button
//   active     - on the Pro page always; on the dashboard only in the last
//                FOUNDING_REMINDER_DAYS, as the heads-up that it is ending
//   ended      - the founder price, on the Pro page
import React from 'react';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import {
  FOUNDER_PRICE_FALLBACK,
  FOUNDING_MONTHS,
  FOUNDING_PLACES,
  FOUNDING_REMINDER_DAYS,
  showPlacesLeft,
  type FoundingState,
} from '@/lib/founding';
import { FoundingClaimButton } from './FoundingClaimButton';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin' });
}

export function FoundingCard({
  state,
  where,
  founderPrice,
}: {
  state: FoundingState;
  where: 'dashboard' | 'pro';
  /** e.g. "€4.99/month", from Stripe when it is set up */
  founderPrice?: string | null;
}) {
  const price = founderPrice || FOUNDER_PRICE_FALLBACK;

  if (state.kind === 'can-claim') {
    return (
      <div className="mb-4 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
          <Gift className="h-4 w-4" /> Founding member offer
        </p>
        <p className="mt-1 text-lg font-black text-white">
          The first {FOUNDING_PLACES} players get {FOUNDING_MONTHS} months of Pro free
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Every Pro feature, with no card and nothing to cancel: it simply ends after {FOUNDING_MONTHS} months. After that,
          founding members can keep Pro for {price}, for as long as they stay subscribed.
        </p>
        {showPlacesLeft(state.placesLeft) && (
          <p className="mt-2 text-sm font-bold text-amber-300">
            Only {state.placesLeft} place{state.placesLeft === 1 ? '' : 's'} left
          </p>
        )}
        <div className="mt-4">
          <FoundingClaimButton />
        </div>
      </div>
    );
  }

  if (state.kind === 'active') {
    if (where === 'dashboard' && state.daysLeft > FOUNDING_REMINDER_DAYS) return null;
    const ending = state.daysLeft <= FOUNDING_REMINDER_DAYS;
    return (
      <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <p className="flex items-center gap-2 font-bold text-white">
          <Gift className="h-4 w-4 text-amber-400" />
          {ending
            ? `Your founding member Pro ends on ${formatDate(state.until)}`
            : `Founding member: Pro is yours until ${formatDate(state.until)}`}
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          {ending
            ? `After that you go back to Free automatically, and nothing is charged. You can keep Pro for the founder price of ${price}.`
            : `${state.daysLeft} days left. When it ends you go back to Free automatically, unless you choose to keep Pro for the founder price of ${price}.`}
        </p>
        {where === 'dashboard' && (
          <Link href="/pro" className="mt-2 inline-block text-sm font-semibold text-amber-300 underline">
            See the founder price
          </Link>
        )}
      </div>
    );
  }

  if (state.kind === 'ended' && where === 'pro') {
    return (
      <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <p className="flex items-center gap-2 font-bold text-white">
          <Gift className="h-4 w-4 text-amber-400" /> Founder price: {price}
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Thanks for being one of the first players on Deadeye. As a founding member you can keep Pro for {price}, for as
          long as you stay subscribed.
        </p>
      </div>
    );
  }

  return null;
}
