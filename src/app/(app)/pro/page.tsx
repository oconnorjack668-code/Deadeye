// src/app/(app)/pro/page.tsx
import React from 'react';
import { requireUser, getCurrentSubscription } from '@/lib/auth';
import { getStripe, proPriceLabels, stripeConfigured } from '@/lib/stripe';
import { withdrawalDeadline, withinWithdrawalPeriod } from '@/lib/withdrawal';
import { ProActions } from './ProActions';
import { WithdrawFromContract } from './WithdrawFromContract';
import { Crown, Check } from 'lucide-react';
import { FREE_PLAN, PRO_PLAN } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Deadeye Pro' };

const FREE = FREE_PLAN.features;
const PRO = PRO_PLAN.features;

/** When the 14-day withdrawal window closes, formatted, or null once it has (or if Stripe can't say). */
async function withdrawalDeadlineFor(subscriptionId: string | null | undefined): Promise<string | null> {
  if (!subscriptionId) return null;
  try {
    const s = await getStripe().subscriptions.retrieve(subscriptionId);
    if (s.status === 'canceled' || !withinWithdrawalPeriod(s.start_date)) return null;
    return withdrawalDeadline(s.start_date).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin',
    });
  } catch {
    return null;
  }
}

export default async function ProPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  await requireUser();
  const { success } = await searchParams;
  const subscription = await getCurrentSubscription();
  const configured = stripeConfigured();
  const { monthly, yearly } = await proPriceLabels();
  const plan = subscription?.plan_type || 'free';
  const withdrawBy = plan === 'pro' && configured ? await withdrawalDeadlineFor(subscription?.stripe_subscription_id) : null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Deadeye Pro</h1>
            <p className="text-sm text-zinc-400 mt-1">Unlimited AI coaching for serious players</p>
          </div>
        </div>

        {success && plan === 'pro' && (
          <div className="rounded-2xl border border-emerald-600/40 bg-emerald-600/10 p-4 text-sm font-semibold text-emerald-300">Welcome to Pro! Your AI coaching is now unlimited.</div>
        )}
        {success && plan !== 'pro' && (
          <div className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">Payment received. Pro switches on within a minute; refresh this page.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="text-lg font-bold text-white">Free</div>
            <div className="text-sm text-zinc-400 mb-3">{FREE_PLAN.tagline}</div>
            <ul className="space-y-2 text-sm text-zinc-300">
              {FREE.map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-transparent p-5">
            <div className="text-lg font-bold text-white flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" /> Pro</div>
            <div className="text-sm text-amber-200 mb-3">{[monthly, yearly].filter(Boolean).join(' or ') || 'Coming soon'}</div>
            <ul className="space-y-2 text-sm text-zinc-200">
              {PRO.map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />{f}</li>
              ))}
            </ul>
          </div>
        </div>

        {plan === 'owner' ? (
          <p className="text-sm text-zinc-400">You have owner access, which includes everything in Pro.</p>
        ) : !configured ? (
          <p className="text-sm text-zinc-400">Pro isn&apos;t available to buy yet.</p>
        ) : (
          <ProActions isPro={plan === 'pro'} hasYearly={!!yearly} />
        )}
        {withdrawBy && <WithdrawFromContract deadline={withdrawBy} />}
        <p className="text-xs text-zinc-500">
          The price shown is the full price you pay. Payments are handled securely by Stripe. Pro renews automatically until you cancel; cancel
          any time from Manage subscription. In the first 14 days you can also withdraw for a full refund. See the{' '}
          <a href="/terms" className="underline">
            Terms of Use
          </a>
          .
        </p>
      </div>
    </div>
  );
}
