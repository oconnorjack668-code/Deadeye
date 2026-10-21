// src/app/(app)/welcome/page.tsx
// Where onboarding ends for a new player, instead of the dashboard. One
// question - are you at a court right now? - because most players sign up from
// a TikTok or Instagram link, often nowhere near one, and "go log shots" means
// nothing to them yet. On 19 Oct 2026, 12 of the 17 players who had finished
// setup never did anything at all afterwards.
import React from 'react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { WelcomeClient } from './WelcomeClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Welcome - Deadeye' };

export default async function WelcomePage() {
  await requireUser();
  const profile = await getCurrentProfile();
  const firstName = (profile?.display_name || '').trim().split(/\s+/)[0] || null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-xl p-4 md:p-8">
        <WelcomeClient firstName={firstName} />
      </div>
    </div>
  );
}
