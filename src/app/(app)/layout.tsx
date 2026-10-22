// src/app/(app)/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { requireUser, checkIsOwner, getCurrentProfile, getAgeGate } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { visiblePhotoUrls } from '@/lib/photos-server';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickLog } from '@/components/layout/QuickLog';
import { OfflineSync } from '@/components/OfflineSync';
import { appModeFor } from '@/lib/coachSide';

export const metadata = {
  title: 'Deadeye Basketball Training',
  description: 'Train with intent. See your progress. Improve every day.',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // All cached per request, so pages that also need them don't query again.
  // The photo is the player's own, which they always see, approved or not.
  const [profile, isOwner, gate, photos] = await Promise.all([
    getCurrentProfile(),
    checkIsOwner(),
    getAgeGate(),
    createClient().then((supabase) => visiblePhotoUrls(supabase, [user.id])),
  ]);

  // Under-16s wait for a parent before anything else (00036), onboarding included
  if (gate === 'ask-age') redirect('/age-check');
  if (gate === 'needs-parent') redirect('/parent-approval');

  // Coaching has its own menu; logging a session belongs to playing
  const mode = appModeFor(profile);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar profile={profile} photoUrl={photos.get(user.id) ?? null} isOwner={isOwner} mode={mode} canSwitch={profile?.account_role === 'both'} />

      <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        {children}
      </main>

      {mode === 'playing' && <QuickLog />}
      <BottomNav mode={mode} />
      <OfflineSync />
    </div>
  );
}
