// src/components/basketball/FirstSessionResult.tsx
// The result screen after a player's first saved session (D2; design
// docs/agent-os/design/2026-11-22-polish.md, "First-session result", mockup
// 2026-11-22-polish-result): their number big, the zone lit on the shot chart,
// the badge and level just earned, "Go again" and "Done for today" the same
// size, and "Share this result" opening the share sheet (name off by default).
// Replaces the green "First session logged" card, which never showed the score.
import React from 'react';
import { Check, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { loadAchievements } from '@/lib/achievements-server';
import { BADGE_XP, BADGES } from '@/lib/achievements';
import { ZONE_LABELS, type CourtZone } from '@/lib/court';
import { zonePct, type ChartZoneInput } from '@/lib/shotChart';
import { ShotChart } from './ShotHeatMap';
import { ResultActions } from './ResultActions';
import { FirstSessionCelebration } from './FirstSessionCelebration';
import { ShareCardButton } from '@/components/ShareCardButton';
import { CountUp } from '@/components/CountUp';

const FIRST_BADGE = BADGES.find((b) => b.id === 'first-session');

export interface FirstSessionResultData {
  sessionId: string;
  /** yyyy-mm-dd */
  date: string;
  zones: ChartZoneInput[];
  badge: { title: string; xp: number } | null;
  level: { level: number; tier: string; progress: number; toNext: number };
}

export function FirstSessionResultView({ sessionId, date, zones, badge, level }: FirstSessionResultData) {
  const makes = zones.reduce((n, z) => n + z.makes, 0);
  const attempts = zones.reduce((n, z) => n + z.attempts, 0);
  const shotZones = zones.filter((z) => z.attempts > 0);
  const where =
    shotZones.length === 1 && shotZones[0].zone in ZONE_LABELS
      ? `from ${ZONE_LABELS[shotZones[0].zone as CourtZone]}`
      : `from ${shotZones.length} spots`;
  const score = `${makes}/${attempts}`;
  const percent = zonePct({ makes, attempts });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-300">
          <Check className="h-4 w-4" aria-hidden="true" /> First session logged
        </p>
        <p className="text-sm text-zinc-400">
          {new Date(`${date}T00:00:00`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      <section
        aria-label="Your result"
        className="overflow-hidden rounded-3xl border border-orange-600/30 bg-gradient-to-b from-orange-600/25 via-zinc-900 to-zinc-950 px-5 pb-5 pt-6"
      >
        <h1 className="sr-only">
          {makes} of {attempts} shots, {percent}%
        </h1>
        <p
          aria-hidden="true"
          className="text-center font-black leading-none tracking-tighter text-white tabular-nums [text-shadow:0_0_60px_rgb(249_115_22/0.55),0_0_20px_rgb(249_115_22/0.25)]"
          // 104 px, smaller on a narrow phone or a longer score so "18/33" still fits at 360 px
          style={{ fontSize: `min(104px, calc((100vw - 72px) / ${(score.length * 0.62).toFixed(2)}))` }}
        >
          <CountUp value={makes} />
          <span className="text-zinc-500">/</span>
          {attempts}
        </p>
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-300" aria-hidden="true">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-lg font-black text-emerald-300 tabular-nums">
            {percent}%
          </span>
          {where}
        </p>
        <div className="deadeye-fade-in mt-4">
          <ShotChart zones={zones} id={`res-${sessionId.slice(0, 8)}`} variant="session" />
        </div>
      </section>

      <section aria-label="What you earned" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        {badge && (
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-600 to-orange-700 ring-1 ring-inset ring-white/15">
              <Target className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">New badge</p>
              <p className="font-black text-white">{badge.title}</p>
            </div>
            <p className="font-bold text-amber-300 tabular-nums">+{badge.xp} XP</p>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <p className="text-white">
            <span className="font-black">Level {level.level}</span> {level.tier}
          </p>
          {level.toNext > 0 && (
            <p className="text-zinc-400 tabular-nums">
              {level.toNext} XP to Level {level.level + 1}
            </p>
          )}
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-label={`Level ${level.level} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level.progress * 100)}
        >
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(4, Math.round(level.progress * 100))}%` }} />
        </div>
      </section>

      <ResultActions />

      <div className="flex justify-center">
        <ShareCardButton
          path={`/api/share/session?id=${sessionId}`}
          text={`${score} shots on Deadeye 🏀`}
          label="Share this result"
          variant="quiet"
        />
      </div>
    </div>
  );
}

/**
 * Loads and shows the result. Falls back to the old card for a first session
 * with no shots (a ball-handling session has no score to show).
 */
export async function FirstSessionResult({ userId, sessionId, xp }: { userId: string; sessionId: string; xp: number }) {
  const supabase = await createClient();
  const [{ data: session }, { data: drills }, achievements] = await Promise.all([
    supabase.from('training_sessions').select('session_date').eq('id', sessionId).eq('user_id', userId).maybeSingle(),
    supabase.from('session_drills').select('shooting_entries(shot_zone, makes, attempts)').eq('session_id', sessionId).eq('user_id', userId),
    // Also awards the First Session badge, which is what the card below shows
    loadAchievements(userId),
  ]);
  // The hand-written types do not describe this relation (as in AfterSession)
  const entries = ((drills ?? []) as unknown as Array<{ shooting_entries: Array<{ shot_zone: string; makes: number; attempts: number }> }>).flatMap(
    (d) => d.shooting_entries ?? []
  );
  if (!session || entries.reduce((n, e) => n + e.attempts, 0) === 0) return <FirstSessionCelebration xp={xp} />;

  const firstBadge = achievements.badges.find((b) => b.id === 'first-session');
  return (
    <FirstSessionResultView
      sessionId={sessionId}
      date={(session as { session_date: string }).session_date}
      zones={entries.map((e) => ({ zone: e.shot_zone, makes: e.makes, attempts: e.attempts }))}
      badge={firstBadge?.earned && FIRST_BADGE ? { title: FIRST_BADGE.title, xp: BADGE_XP[FIRST_BADGE.tier] } : null}
      level={{
        level: achievements.level.level,
        tier: achievements.level.tier,
        progress: achievements.level.progress,
        toNext: achievements.level.toNext,
      }}
    />
  );
}
