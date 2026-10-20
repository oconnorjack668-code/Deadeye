// src/lib/accountDeletion.ts
// SERVER-ONLY: permanently deletes an account. Every table references
// auth.users with ON DELETE CASCADE, so deleting the auth user removes all
// rows; uploaded videos live in storage and are removed first, and a paid
// subscription is cancelled at Stripe before anything is deleted.
import type { createAdminClient } from './supabase/admin';
import { getStripe, stripeConfigured } from './stripe';

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Stops Stripe charging for an account that is about to go.
 *
 * The subscriptions row is deleted with the account, but the subscription at
 * Stripe is not, so without this a Pro player who deleted their account went
 * on being billed every month for an account that no longer existed. Cancelled
 * now rather than at the end of the period: there is nothing left to use.
 */
async function cancelSubscription(admin: Admin, userId: string): Promise<boolean> {
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (!sub?.stripe_subscription_id || sub.status === 'canceled') return true;
  if (!stripeConfigured()) {
    console.error('Account deletion: subscription found but Stripe is not configured', { userId });
    return false;
  }
  try {
    const stripe = getStripe();
    const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    if (current.status !== 'canceled' && current.status !== 'incomplete_expired') {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }
    return true;
  } catch (err) {
    // Gone at Stripe already: nothing left to charge
    if ((err as { code?: string }).code === 'resource_missing') return true;
    console.error('Account deletion: cancelling the subscription failed', { userId, err });
    return false;
  }
}

export async function deleteAccount(admin: Admin, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  // First, so a failure leaves the account whole rather than deleted but still billed
  if (!(await cancelSubscription(admin, userId))) {
    return {
      ok: false,
      error: 'Could not cancel your Pro subscription, so nothing was deleted. Please try again, or cancel it in Manage subscription first.',
    };
  }

  // Remove the player's video files (stored under videos/<user_id>/)
  for (;;) {
    const { data: files, error } = await admin.storage.from('videos').list(userId, { limit: 100 });
    if (error) {
      console.error('Account deletion: listing videos failed', error);
      return { ok: false, error: 'Could not delete your videos. Please try again.' };
    }
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage.from('videos').remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) {
      console.error('Account deletion: removing videos failed', removeError);
      return { ok: false, error: 'Could not delete your videos. Please try again.' };
    }
  }

  // And the profile photo (avatars/<user_id>/, 00043). One file at most, and
  // the bucket is missing before 00043, so this never holds the deletion up
  const { data: photos } = await admin.storage.from('avatars').list(userId, { limit: 100 });
  if (photos?.length) await admin.storage.from('avatars').remove(photos.map((f) => `${userId}/${f.name}`));

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('Account deletion failed', deleteError);
    return { ok: false, error: 'Could not delete your account. Please try again.' };
  }
  return { ok: true };
}
