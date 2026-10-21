// src/app/(app)/basketball/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { Plus, Target, ListChecks, ClipboardList, Video, Lightbulb, ChevronRight } from 'lucide-react';
import { formatShootingPercentage } from '@/lib/stats';
import { getShotTotals } from '@/lib/player-activity';
import { FirstSessionCelebration } from '@/components/basketball/FirstSessionCelebration';
import { AfterSession } from '@/components/basketball/AfterSession';
import { XP_VALUES } from '@/lib/achievements';

export const metadata = {
  title: 'Hoops - Deadeye',
};

export default async function BasketballPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: sessions }, { count: totalSessions }, shootingData] = await Promise.all([
    // Recent sessions
    supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(10)
      .returns<Array<{
        id: string;
        session_type: string;
        session_date: string;
        duration_minutes: number;
        intensity_rpe: number;
        perceived_quality: number;
        notes: string | null;
        verified_by_video: boolean | null;
      }>>(),
    // Total count (the list above only shows the latest 10)
    supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Career shooting totals (per zone, added up in the database)
    getShotTotals(user.id),
  ]);

  const totalMakes = shootingData?.reduce((sum, s) => sum + s.makes, 0) || 0;
  const totalAttempts = shootingData?.reduce((sum, s) => sum + s.attempts, 0) || 0;
  const overallPct = formatShootingPercentage(totalMakes, totalAttempts);
  const zonesTracked = shootingData?.length || 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <PageHeader tone="hoops" icon={Target} title="Hoops" subtitle="Drills, shooting and game minutes" />

        {/* The shot logger lands here after saving (?saved=1) */}
        {saved === '1' && totalSessions === 1 && <FirstSessionCelebration xp={XP_VALUES.session} />}
        {/* After a hand-logged save: how the newest session compares, and an invite */}
        {saved === '1' && <AfterSession userId={user.id} sessionId={null} showInvite />}

        {/* One unmistakable primary action, full width. It used to sit inline
            beside the heading, which on a phone squeezed it to a chip. */}
        <Link href="/basketball/new" className="block mb-3">
          <Button variant="primary" size="lg" className="w-full gap-2 shadow-lg shadow-orange-900/30">
            <Plus className="h-5 w-5" /> New session
          </Button>
        </Link>

        {/* Camera tracking promoted out of the Train directory. Propping the
            phone up is the category-standard way to log a shooting session -
            burying it three taps deep made it invisible. */}
        <Link
          href="/video"
          className="mb-3 flex items-center gap-3 rounded-2xl border border-red-600/30 bg-red-600/10 p-3 hover:bg-red-600/15"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-600/20">
            <Video className="h-5 w-5 text-red-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-white">Track with your camera</span>
            <span className="block text-xs text-zinc-400">Prop your phone up and it counts shots for you</span>
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
        </Link>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/games">
            <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 transition-colors h-full">
              <CardContent className="p-4">
                <ClipboardList className="h-5 w-5 text-amber-400 mb-2" />
                <div className="text-sm font-semibold text-white">Log a game</div>
                <div className="text-xs text-zinc-500">Add your stats</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/drills">
            <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 transition-colors h-full">
              <CardContent className="p-4">
                <ListChecks className="h-5 w-5 text-orange-400 mb-2" />
                <div className="text-sm font-semibold text-white">Drill library</div>
                <div className="text-xs text-zinc-500">Steps, cues and mistakes</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Career shooting</div>
              <span className="text-3xl font-black text-orange-400">{overallPct}</span>
              <div className="text-xs text-zinc-500 mt-2">
                {totalMakes} makes · {totalAttempts} attempts
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Sessions</div>
              <span className="text-3xl font-black text-emerald-400">{totalSessions || 0}</span>
              <div className="text-xs text-zinc-500 mt-2">
                {sessions?.[0]
                  ? `Last one: ${new Date(`${sessions[0].session_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'None yet'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Only worth nudging once there is some shooting data but not enough
            for the zone breakdown to mean anything */}
        {totalAttempts > 0 && zonesTracked < 3 && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/20">
              <Lightbulb className="h-5 w-5 text-blue-400" />
            </span>
            <div>
              <div className="text-sm font-bold text-white">Fill out your shot chart</div>
              <div className="text-xs text-zinc-400">
                Only {zonesTracked} zone{zonesTracked === 1 ? '' : 's'} tracked so far. Shoot from the wings and corners
                next to see where you are strongest.
              </div>
            </div>
          </div>
        )}

        {/* Session History */}
        {sessions && sessions.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Recent sessions</h2>
              {(totalSessions || 0) > sessions.length && (
                <span className="text-xs text-zinc-500">
                  Showing {sessions.length} of {totalSessions}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link key={session.id} href={`/basketball/${session.id}`} className="block">
                  <Card className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 hover:border-orange-500/30 transition-all">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 font-semibold text-white capitalize">
                          {session.session_type.replace(/-/g, ' ')}
                          {session.verified_by_video && (
                            <Video className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" aria-label="Counted from video" />
                          )}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          {new Date(`${session.session_date}T00:00:00`).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })} · {session.duration_minutes} min · RPE {session.intensity_rpe}/10
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-10 text-center">
              <Target className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No sessions yet</h3>
              <p className="text-sm text-zinc-400">
                Tap <span className="font-semibold text-zinc-300">New session</span> to log your first one.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
