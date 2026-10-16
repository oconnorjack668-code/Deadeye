// src/lib/auth.ts
// Each helper is wrapped in React cache(), so a page that calls them from the
// layout, the page and several helpers only does the work once per request.
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Database } from './supabase/types';
import { ageGate, type AgeGate } from './parentApproval';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type AuthUser = { id: string; email: string | null };

/**
 * Retrieves the current authenticated user on the server. Returns null if unauthenticated.
 * getClaims() verifies the session JWT locally when the project uses asymmetric signing
 * keys (no network round trip), and falls back to asking Supabase Auth otherwise.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
});

/**
 * Requires user to be authenticated. Redirects to /login if not.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Fetches the player's full profile from the profiles table.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return profile;
});

export type AgeCheckRow = Database['public']['Tables']['age_checks']['Row'];

const loadAgeCheck = cache(async (): Promise<{ check: AgeCheckRow | null; failed: boolean }> => {
  const user = await getCurrentUser();
  if (!user) return { check: null, failed: false };

  const supabase = await createClient();
  const { data, error } = await supabase.from('age_checks').select('*').eq('user_id', user.id).maybeSingle();
  if (error) {
    console.error('Age check lookup failed', error);
    return { check: null, failed: true };
  }
  return { check: data, failed: false };
});

/** The player's under/over-16 answer and parent approval, or null if they have not answered. */
export async function getCurrentAgeCheck(): Promise<AgeCheckRow | null> {
  return (await loadAgeCheck()).check;
}

/**
 * Where the age check sends this player: into the app, to the age question, or
 * to wait for a parent.
 *
 * A failed lookup lets them in. Migrations are run by hand in the Supabase
 * editor and code deploys on push, so for a while the code can be live before
 * the age_checks table exists. Treating that error as "not answered" would
 * send every player to a question whose answer cannot be saved, locking
 * everyone out; letting them in leaves the gate off until 00036 is run.
 */
export async function getAgeGate(): Promise<AgeGate> {
  const { check, failed } = await loadAgeCheck();
  return failed ? 'ok' : ageGate(check);
}

/**
 * True while an under-16 is waiting for a parent, or had approval withdrawn.
 * The app layout redirects them away from every page; API routes that send
 * their data anywhere check this too, because a direct POST skips the layout.
 */
export async function awaitingParentApproval(): Promise<boolean> {
  return (await getAgeGate()) !== 'ok';
}

export const PARENT_APPROVAL_NEEDED = 'A parent or guardian needs to approve your account first.';

/**
 * Server check for owner entitlement.
 * Evaluates both the configured OWNER_EMAIL environment variable and database roles.
 */
export const checkIsOwner = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user || !user.email) return false;

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
  if (ownerEmail && user.email.toLowerCase().trim() === ownerEmail) {
    return true;
  }

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle();

  return !!roles;
});

/**
 * Retrieves the player's subscription status and available credits.
 */
export const getCurrentSubscription = cache(async (): Promise<Subscription | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const isOwner = await checkIsOwner();

  // If user is owner, they always have owner entitlement
  if (isOwner) {
    return {
      id: 'owner-entitlement',
      user_id: user.id,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan_type: 'owner',
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      video_credits_remaining: 9999,
      ai_credits_remaining: 9999,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return subscription;
});
