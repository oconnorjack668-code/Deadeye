// src/app/(app)/pro/page.tsx
// What Pro is, why it costs money, and buying or managing it. Also where a
// founding member sees their free months and the founder price.
import React from 'react';
import { requireUser, getCurrentSubscription, checkIsOwner } from '@/lib/auth';
import { getStripe, proPriceLabels, stripeConfigured, trialEndFor } from '@/lib/stripe';
import { withdrawalDeadline, withinWithdrawalPeriod } from '@/lib/withdrawal';
import { hasPro } from '@/lib/entitlements';
import { foundingState } from '@/lib/founding';
import { getFoundingOffer } from '@/lib/foundingServer';
import { FREE_PLAN, PRO_PLAN, PRO_PRICE_FALLBACK, WHY_PRO_COSTS } from '@/lib/plans';
import { FoundingCard } from '@/components/FoundingCard';
import { ProActions } from './ProActions';
import { WithdrawFromContract } from './WithdrawFromContract';
import { Crown, Check } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Deadeye Pro' };

const formatDay = (d: Date) =>
  d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin' });

/** When the 14-day withdrawal window closes, formatted, or null once it has (or if Stripe can't say). */
async function withdrawalDeadlineFor(subscriptionId: string | null | undefined): Promise<string | null> {
  if (!subscriptionId) return null;
  try {
    const s = await getStripe().subscriptions.retrieve(subscriptionId);
    if (s.status === 'canceled' || !withinWithdrawalPeriod(s.start_date)) return null;
    return formatDay(withdrawalDeadline(s.start_date));
  } catch {
    return null;
  }
}

export default async function ProPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  await requireUser();
  const { success } = await searchParams;
  const [subscription, isOwner, prices, offer] = await Promise.all([
    getCurrentSubscription(),
    checkIsOwner(),
    proPriceLabels(),
    getFoundingOffer(),
  ]);
  const configured = stripeConfigured();
  const plan = subscription?.plan_type || 'free';
  const isPaying = plan === 'pro';
  const isFounder = !!subscription?.founding_claimed_at;
  const founding = foundingState(subscription, { claimed: offer.claimed, closed: !offer.open, isOwner });
  const withdrawBy = isPaying && configured ? await withdrawalDeadlineFor(subscription?.stripe_subscription_id) : null;

  const listPrice = [prices.monthly, prices.yearly].filter(Boolean).join(' or ') || PRO_PRICE_FALLBACK;
  const trialEnd = trialEndFor(subscription?.founding_pro_until);
  const chargeFrom = isFounder && trialEnd ? formatDay(new Date(trialEnd * 1000)) : null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Deadeye Pro</h1>
            <p className="text-sm text-zinc-400 mt-1">{PRO_PLAN.tagline}</p>
          </div>
        </div>

        {success && isPaying && (
          <div className="rounded-2xl border border-emerald-600/40 bg-emerald-600/10 p-4 text-sm font-semibold text-emerald-300">
            Welcome to Pro! Everything is unlocked.
          </div>
        )}
        {success && !isPaying && (
          <div className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Payment received. Pro switches on within a minute; refresh this page.
          </div>
        )}

        <FoundingCard state={founding} where="pro" founderPrice={prices.founder} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="text-lg font-bold text-white">{FREE_PLAN.name}</div>
            <div className="text-sm text-zinc-400 mb-3">{FREE_PLAN.tagline}</div>
            <ul className="space-y-2 text-sm text-zinc-300">
              {FREE_PLAN.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
            <div className="text-lg font-bold text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" /> {PRO_PLAN.name}
            </div>
            <div className="text-sm text-amber-200 mb-3">{listPrice}</div>
            <ul className="space-y-2 text-sm text-zinc-200">
              {PRO_PLAN.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="font-bold text-white">Why Pro costs money</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {WHY_PRO_COSTS.map((w) => (
              <li key={w.title} className="text-sm">
                <span className="block font-semibold text-zinc-100">{w.title}</span>
                <span className="text-zinc-400">{w.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {plan === 'owner' || isOwner ? (
          <p className="text-sm text-zinc-400">You have owner access, which includes everything in Pro.</p>
        ) : !configured ? (
          <p className="text-sm text-zinc-400">
            {hasPro(subscription)
              ? 'You have Pro. Buying Pro opens soon, so you will be able to keep it after your free months.'
              : 'Buying Pro opens soon.'}
          </p>
        ) : (
          <ProActions
            isPaying={isPaying}
            hasYearly={!!prices.yearly}
            monthlyLabel={isFounder ? prices.founder || prices.monthly : prices.monthly}
            yearlyLabel={prices.yearly}
            isFounder={isFounder}
            chargeFrom={chargeFrom}
          />
        )}
        {withdrawBy && <WithdrawFromContract deadline={withdrawBy} />}

        {!isPaying && (
          <p className="text-xs text-zinc-400">
            Under 18? Talk to a parent or guardian before buying Pro. They can pay for it, and they can see exactly what it
            includes on this page.
          </p>
        )}
        <p className="text-xs text-zinc-500">
          The price shown is the full price you pay. Payments are handled securely by Stripe. Pro renews automatically until
          you cancel; cancel any time from Manage subscription. In the first 14 days you can also withdraw for a full refund.
          See the{' '}
          <a href="/terms" className="underline">
            Terms of Use
          </a>
          .
        </p>
      </div>
    </div>
  );
}
