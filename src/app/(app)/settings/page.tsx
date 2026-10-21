// src/app/(app)/settings/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription, getCurrentAgeCheck } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { signedPhotoUrl } from '@/lib/photos-server';
import { AvatarEditor, type OwnPhoto } from '@/components/profile/AvatarEditor';
import { asMeasurementSystem } from '@/lib/units';
import { hasPro, planLabel } from '@/lib/entitlements';
import { SettingsClient } from './SettingsClient';
import { RemindersCard } from '../profile/RemindersCard';
import { ProfileSettings } from '../profile/ProfileSettings';
import { Settings as SettingsIcon } from 'lucide-react';
import pkg from '../../../../package.json';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings - Deadeye' };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, subscription, ageCheck, { data: photoRow }, { data: coachProfile }] = await Promise.all([
    getCurrentProfile(),
    getCurrentSubscription(),
    getCurrentAgeCheck(),
    // The player's own row; missing before 00043, which reads as no photo
    supabase.from('profile_photos').select('path, status, visibility').eq('user_id', user.id).maybeSingle(),
    // Missing before 00047, which reads as not set up
    supabase.from('coach_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);
  const photo: OwnPhoto | null = photoRow
    ? { url: await signedPhotoUrl(photoRow.path), status: photoRow.status, visibility: photoRow.visibility }
    : null;
  const plan = planLabel(subscription);
  const isPro = hasPro(subscription);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-zinc-600 to-zinc-500 flex items-center justify-center shadow-lg">
            <SettingsIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Settings</h1>
            <p className="text-sm text-zinc-400">{user.email}</p>
          </div>
        </div>

        {profile ? (
          <SettingsClient
            email={user.email}
            plan={plan}
            initial={{
              display_name: profile.display_name,
              account_role: profile.account_role || 'player',
              is_public: profile.is_public,
              show_position: profile.show_position ?? false,
              show_height: profile.show_height ?? false,
              show_location: profile.show_location ?? false,
              allow_friend_requests: profile.allow_friend_requests ?? true,
              share_with_coaches: profile.share_with_coaches ?? false,
              // Defaults on, so a profile row written before migration 00032
              // behaves as it always did rather than silently losing the coach
              ai_coaching_enabled: profile.ai_coaching_enabled ?? true,
              country: profile.country ?? null,
              region: profile.region ?? null,
              timezone: profile.timezone ?? null,
              measurement_system: asMeasurementSystem(profile.measurement_system),
            }}
            avatar={
              <AvatarEditor
                name={profile.display_name}
                emoji={profile.avatar_emoji ?? null}
                color={profile.avatar_color ?? null}
                photo={photo}
                is16Plus={ageCheck?.is_16_plus ?? false}
              />
            }
            notifications={<RemindersCard isPro={isPro} />}
            dataControls={<ProfileSettings initialIsPublic={profile.is_public} showLeaderboard={false} />}
            supportEmail={process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL || null}
            version={pkg.version}
            coachSetUp={!!coachProfile}
          />
        ) : (
          <p className="text-sm text-amber-300">Could not load your settings. Please refresh the page.</p>
        )}
      </div>
    </div>
  );
}
