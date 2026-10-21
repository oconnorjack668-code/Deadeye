// src/app/(app)/profile/page.tsx
// The player's own profile: who they are as a player at a glance - level,
// streak, badges, shooting and best jump - then their player info, and a look
// at the card other players see.
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { planLabel } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { Award, ChevronRight, Crosshair, Eye, Flag, Flame, Pencil, Settings, Target, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { focusAreaLabel } from '@/lib/focusAreas';
import { asMeasurementSystem, formatHeight } from '@/lib/units';
import { loadAchievements } from '@/lib/achievements-server';
import { getShotTotals } from '@/lib/player-activity';
import { convertResult, lengthUnit } from '@/lib/performanceTests';
import { signedPhotoUrl } from '@/lib/photos-server';
import { TIER_THEME } from '@/lib/tierTheme';

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

/** Goals and focus areas as tags: as one comma-joined line they ran on as a bold wall of text. */
function TagGroup({ icon: Icon, tone, label, items, variant }: { icon: React.ElementType; tone: string; label: string; items: string[]; variant: 'orange' | 'default' }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-400">
        <Icon className={`h-3.5 w-3.5 ${tone}`} /> {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={variant} className="px-3 py-1 text-[13px] font-medium tracking-normal">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, tone, value, label, href }: { icon: React.ElementType; tone: string; value: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:border-zinc-700">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className="mt-1 text-xl font-black text-white tabular-nums">{value}</div>
      <div className="text-[11px] text-zinc-400">{label}</div>
    </Link>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, subscription, achievements, zones, { data: jumps }, { data: photoRow }] = await Promise.all([
    getCurrentProfile(),
    getCurrentSubscription(),
    loadAchievements(user.id),
    getShotTotals(user.id),
    supabase.from('performance_tests').select('value, unit').eq('user_id', user.id).in('test_type', ['standing_vertical', 'approach_vertical']),
    // Missing before 00043, which reads as no photo
    supabase.from('profile_photos').select('path').eq('user_id', user.id).maybeSingle(),
  ]);
  const units = asMeasurementSystem(profile?.measurement_system);
  const photoUrl = await signedPhotoUrl(photoRow?.path);
  const name = profile?.display_name || 'Player';
  const level = achievements.level;
  const theme = TIER_THEME[level.tier];

  const makes = zones.reduce((n, z) => n + z.makes, 0);
  const attempts = zones.reduce((n, z) => n + z.attempts, 0);
  const shooting = attempts > 0 ? `${Math.round((makes / attempts) * 100)}%` : '–';
  // Best vertical in the player's own unit, whichever unit each jump was logged in
  const jumpUnit = lengthUnit(units);
  const bestJump = (jumps || []).reduce<number | null>((best, j) => {
    const v = convertResult(j, jumpUnit);
    return v !== null && (best === null || v > best) ? v : best;
  }, null);
  const earned = achievements.badges.filter((b) => b.earned).length;
  const goals: string[] = profile?.goals || [];
  // Deduped: an old name and its new one would otherwise show as the same tag twice
  const focusAreas = [...new Set<string>((profile?.focus_areas || []).map(focusAreaLabel))];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 max-w-2xl mx-auto space-y-5">
      {/* Who they are as a player */}
      <section className={`rounded-2xl border p-5 ${theme.card}`}>
        <div className="flex items-center gap-4">
          <Avatar name={name} emoji={profile?.avatar_emoji} color={profile?.avatar_color} photoUrl={photoUrl} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-white">{name}</h1>
            <div className={`text-sm font-bold ${theme.text}`}>
              Level {level.level} · {level.tier}
            </div>
            <div className="text-xs text-zinc-400">{achievements.xp.toLocaleString()} XP</div>
          </div>
        </div>
        {level.toNext > 0 && (
          <>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${Math.round(level.progress * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              {level.toNext.toLocaleString()} XP to Level {level.level + 1}
            </div>
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/players/${user.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/50 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-950"
          >
            <Eye className="h-3.5 w-3.5" /> See what others see
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950/50 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-950"
          >
            <Pencil className="h-3.5 w-3.5" /> Avatar and photo
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={Flame}
          tone="text-orange-400"
          value={achievements.stats.currentStreak}
          label={`day streak · best ${achievements.stats.longestStreak}`}
          href="/streak"
        />
        <Stat icon={Award} tone="text-amber-300" value={`${earned}/${achievements.badges.length}`} label="badges" href="/achievements" />
        <Stat icon={Target} tone="text-red-400" value={shooting} label={`${makes.toLocaleString()} makes`} href="/basketball" />
        <Stat
          icon={TrendingUp}
          tone="text-emerald-400"
          value={bestJump === null ? '–' : `${bestJump}${jumpUnit === 'cm' ? ' cm' : '"'}`}
          label="best vertical"
          href="/workouts/tests"
        />
      </div>

      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Player info</CardTitle>
            <Link href="/onboarding?edit=1">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!profile?.onboarding_completed && (
            <p className="text-sm text-amber-400">
              Your player info isn&apos;t set up yet. Tap &ldquo;Edit&rdquo; to add it.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Position" value={profile?.position} />
            <Field label="Height" value={formatHeight(profile?.height_cm, units)} />
            <Field label="Level" value={profile?.playing_level ? LEVEL_LABELS[profile.playing_level] : null} />
            <Field label="Age" value={profile?.age_bracket} />
            <Field label="Dominant hand" value={profile?.dominant_hand ? HAND_LABELS[profile.dominant_hand] : null} />
            <Field label="Training" value={`${achievements.stats.totalSessions} sessions · ${achievements.stats.totalWorkouts} workouts`} />
            <Field label="Plan" value={<Link href="/pro" className="underline">{planLabel(subscription)}</Link>} />
            <Field label="Units" value={units === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft, lbs)'} />
          </div>
          {(goals.length > 0 || focusAreas.length > 0) && (
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              {goals.length > 0 && <TagGroup icon={Flag} tone="text-orange-400" label="Goals" items={goals} variant="orange" />}
              {focusAreas.length > 0 && (
                <TagGroup icon={Crosshair} tone="text-zinc-300" label="Focus areas" items={focusAreas} variant="default" />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Link
        href="/settings"
        className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900"
      >
        <span className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-zinc-400" />
          <span>
            <span className="block font-semibold text-white">Settings</span>
            <span className="block text-xs text-zinc-500">Avatar, privacy, email, notifications, sounds, units, your data</span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </Link>

      <p className="text-center text-xs text-zinc-500">
        <Link href="/privacy" className="underline hover:text-zinc-300">Privacy policy</Link>
        {' · '}
        <Link href="/terms" className="underline hover:text-zinc-300">Terms of use</Link>
      </p>
    </div>
  );
}
