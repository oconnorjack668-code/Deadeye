// src/app/api/billing/withdraw/route.ts
// "Withdraw from contract" for Pro (see src/lib/withdrawal.ts): ends the
// subscription now and refunds what was paid for it, within 14 days of buying.
// The webhook syncs the cancellation too; the row is also updated here so the
// page is right the moment it reloads.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { emailConfigured, sendEmail } from '@/lib/email';
import { withinWithdrawalPeriod } from '@/lib/withdrawal';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!stripeConfigured()) return Response.json({ error: 'Payments are not set up.' }, { status: 503 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!sub?.stripe_subscription_id || !sub.stripe_customer_id || sub.plan_type !== 'pro') {
    return Response.json({ error: 'There is no Pro subscription to withdraw from.' }, { status: 404 });
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  if (subscription.status === 'canceled') return Response.json({ withdrawn: true });
  if (!withinWithdrawalPeriod(subscription.start_date)) {
    return Response.json(
      { error: 'The 14 days to withdraw have passed. You can still cancel from Manage subscription, and keep Pro to the end of the period.' },
      { status: 409 }
    );
  }

  await stripe.subscriptions.cancel(subscription.id);
  await admin.from('subscriptions').update({ plan_type: 'free', status: 'canceled' }).eq('user_id', user.id);

  // Only Pro is sold, so every charge on this customer since the subscription began is for it
  let refunded = 0;
  let currency = 'eur';
  try {
    const charges = await stripe.charges.list({ customer: sub.stripe_customer_id, created: { gte: subscription.start_date }, limit: 20 });
    for (const charge of charges.data) {
      const left = charge.amount - charge.amount_refunded;
      if (!charge.paid || left <= 0) continue;
      await stripe.refunds.create({ charge: charge.id, reason: 'requested_by_customer' });
      refunded += left;
      currency = charge.currency;
    }
  } catch (err) {
    // Cancelled but not refunded: say so plainly rather than claim success
    console.error('Withdrawal refund failed', { userId: user.id, err });
    return Response.json(
      { error: 'Your subscription is cancelled, but the refund did not go through. Please contact us and we will refund you by hand.' },
      { status: 502 }
    );
  }

  const amount = new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency.toUpperCase() }).format(refunded / 100);
  const when = new Date().toLocaleString('en-IE', { dateStyle: 'long', timeStyle: 'short', timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin' });

  // The acknowledgement the law asks for, on a durable medium
  if (emailConfigured() && user.email) {
    await sendEmail({
      to: user.email,
      subject: 'You have withdrawn from Deadeye Pro',
      text: [
        `We received your withdrawal from your Deadeye Pro subscription on ${when}.`,
        '',
        `Your subscription has ended and ${amount} is being refunded to the card you paid with. Refunds usually arrive within 5 to 10 days.`,
        '',
        'Your account and training data are not affected. You are now on the free plan.',
      ].join('\n'),
    }).catch((err) => console.error('Withdrawal acknowledgement email failed', err));
  }

  return Response.json({ withdrawn: true, refunded: amount, at: when });
}
