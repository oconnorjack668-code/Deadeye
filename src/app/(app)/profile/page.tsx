import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { planLabel } from '@/lib/entitlements';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Pencil, Settings } from 'lucide-react';
import Link from 'next/link';
import { asMeasurementSystem, formatHeight } from '@/lib/units';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Profile - Deadeye' };

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'College / Pro Pipeline',
  college_pro: 'College / Pro',
};

const HAND_LABELS: Record<string, string> = {
  left: 'Left',
  right: 'Right',
  ambidextrous: 'Ambidextrous',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">{label}</div>
      <div className="font-semibold text-white">{value || '-'}</div>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, subscription] = await Promise.all([getCurrentProfile(), getCurrentSubscription()]);
  const units = asMeasurementSystem(profile?.measurement_system);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-slate-600 to-gray-500 flex items-center justify-center shadow-lg">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Player Profile</h1>
          <p className="text-sm text-zinc-400 mt-1">{user.email}</p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Player Info</CardTitle>
            <Link href="/onboarding?edit=1">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit player info
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile?.onboarding_completed && (
            <p className="text-sm text-amber-400">
              Your player info isn&apos;t set up yet. Tap &ldquo;Edit player info&rdquo; to add it.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={profile?.display_name} />
            <Field label="Position" value={profile?.position} />
            <Field label="Height" value={formatHeight(profile?.height_cm, units)} />
            <Field label="Level" value={profile?.playing_level ? LEVEL_LABELS[profile.playing_level] : null} />
            <Field label="Age" value={profile?.age_bracket} />
            <Field label="Dominant hand" value={profile?.dominant_hand ? HAND_LABELS[profile.dominant_hand] : null} />
            <Field label="Plan" value={<Link href="/pro" className="underline">{planLabel(subscription)}</Link>} />
            <Field label="Units" value={units === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft, lbs)'} />
          </div>
          {profile?.goals && profile.goals.length > 0 && (
            <Field label="Goals" value={profile.goals.join(', ')} />
          )}
          {profile?.focus_areas && profile.focus_areas.length > 0 && (
            <Field label="Focus areas" value={profile.focus_areas.join(', ')} />
          )}
        </CardContent>
      </Card>

      <Link
        href="/settings"
        className="mt-6 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900"
      >
        <span className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-zinc-400" />
          <span>
            <span className="block font-semibold text-white">Settings</span>
            <span className="block text-xs text-zinc-500">Privacy, region and time zone, notifications, units, your data</span>
          </span>
        </span>
        <span className="text-zinc-600">›</span>
      </Link>

      <p className="mt-8 text-center text-xs text-zinc-500">
        <Link href="/privacy" className="underline hover:text-zinc-300">Privacy policy</Link>
        {' · '}
        <Link href="/terms" className="underline hover:text-zinc-300">Terms of use</Link>
      </p>
    </div>
  );
}
