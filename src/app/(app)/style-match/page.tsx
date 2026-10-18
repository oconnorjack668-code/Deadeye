// src/app/(app)/style-match/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { shotProfileFromZones } from '@/lib/styleMatch';
import { asMeasurementSystem } from '@/lib/units';
import { StyleMatchClient, type SavedResult } from './StyleMatchClient';
import { getShotTotals } from '@/lib/player-activity';
import { Users } from 'lucide-react';
import { hasPro } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Play Style Match - Deadeye' };

export default async function StyleMatchPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, subscription, zoneTotals, { data: last }] = await Promise.all([
    getCurrentProfile(),
    getCurrentSubscription(),
    getShotTotals(user.id),
    supabase
      .from('style_match_results')
      .select('id, input, matches, report, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const shotProfile = shotProfileFromZones(zoneTotals.map((z) => ({ shot_zone: z.zone, attempts: z.attempts })));
  const totalShots = zoneTotals.reduce((n, z) => n + z.attempts, 0);
  const canUseAi = hasPro(subscription);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Play Style Match</h1>
            <p className="text-sm text-zinc-400 mt-1">Which NBA players you play like, adjusted for your height, and what to copy</p>
          </div>
        </div>

        <StyleMatchClient
          heightCm={profile?.height_cm ?? null}
          position={profile?.position ?? null}
          units={asMeasurementSystem(profile?.measurement_system)}
          shotProfile={shotProfile}
          totalShots={totalShots}
          canUseAi={canUseAi}
          lastResult={last as unknown as SavedResult | null}
        />
      </div>
    </div>
  );
}
