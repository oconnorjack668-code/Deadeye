// src/app/(app)/video/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getHasPro } from '@/lib/auth';
import { ProLock } from '@/components/ProGate';
import { VideoHub } from './VideoHub';
import { FormTrends } from './FormTrends';
import { createClient } from '@/lib/supabase/server';
import { asMeasurementSystem } from '@/lib/units';
import { Video } from 'lucide-react';
import type { ShotMechanics } from '@/lib/video/mechanics';
import { MIN_CHECKS, type FormCheckRecord } from '@/lib/video/formTrend';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Video AI - Deadeye' };

export default async function VideoPage() {
  const user = await requireUser();
  const [profile, isPro] = await Promise.all([getCurrentProfile(), getHasPro()]);

  // Form checks have been saved here since the feature shipped; this is the
  // first thing to read them back. Bounded, because a trend is about the recent
  // run and a player with years of checks should not download all of them.
  const supabase = await createClient();
  const { data: formChecks } = await supabase
    .from('video_analyses')
    .select('created_at, summary')
    .eq('user_id', user.id)
    .eq('kind', 'form_check')
    .order('created_at', { ascending: false })
    .limit(12);

  const records: FormCheckRecord[] = (formChecks || [])
    .map((row) => ({ at: row.created_at, mechanics: row.summary as unknown as ShotMechanics }))
    // A row whose summary predates the current shape, or was written by a
    // failed run, would plot as NaN and break the chart rather than the trend
    .filter((r) => r.mechanics && typeof r.mechanics.releaseAngleDeg === 'number');

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-red-600 to-pink-500 flex items-center justify-center shadow-lg">
            <Video className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Video AI</h1>
            <p className="text-sm text-zinc-400 mt-1">Shot tracking, form analysis, jump test and game film, all on your phone</p>
          </div>
        </div>
        <VideoHub
          heightCm={profile?.height_cm ?? null}
          position={profile?.position ?? null}
          hand={profile?.dominant_hand === 'left' ? 'left' : 'right'}
          units={asMeasurementSystem(profile?.measurement_system)}
        />
        {/* Each form check is free; how your form changes across them is Pro.
            Only mentioned once there are enough checks for a trend to exist,
            so a new player is not shown a lock on something they cannot use yet. */}
        {isPro ? (
          <FormTrends records={records} />
        ) : (
          records.length >= MIN_CHECKS && (
            <ProLock title="Your form over time is part of Pro" className="mt-6">
              <p>
                You have {records.length} form checks saved. Pro lines them up to show what has actually changed in your
                release angle, elbow, knee bend and timing, and what has stayed the same.
              </p>
            </ProLock>
          )
        )}
      </div>
    </div>
  );
}
