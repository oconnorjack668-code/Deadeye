// src/app/(app)/focus/page.tsx
// Focus Finder: a player or coach names what needs work, in their own words or
// from a list, and gets the film, IQ quizzes, drills and guides already in the
// app that work on it. Free and instant; an AI week plan on top costs one AI
// report. A coach can send the plan to a team as an assignment, and the link
// in it opens this page with the same weaknesses picked.
import React from 'react';
import { ScanSearch } from 'lucide-react';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { aiProviderCompany } from '@/lib/ai/config';
import { aiReportsLeft, hasPro } from '@/lib/entitlements';
import { isStaff } from '@/lib/coachSide';
import { loadFocusContent, loadPlayerSignals } from '@/lib/focus/content';
import { loadSavedFocusPlan } from '@/lib/focus/service';
import { drillLevelFor } from '@/lib/focus/plan';
import { cleanWeaknessIds } from '@/lib/focus/weaknesses';
import { FocusFinder, type CoachTeam } from './FocusFinder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Focus Finder - Deadeye' };

type Search = { w?: string; q?: string; plan?: string; from?: string; team?: string; mode?: string };

export default async function FocusPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();

  const [profile, subscription, content, { data: memberships }, { data: recent }] = await Promise.all([
    getCurrentProfile(),
    getCurrentSubscription(),
    loadFocusContent(supabase, user.id),
    supabase.from('team_members').select('role, teams(id, name, level, age_group)').eq('user_id', user.id),
    supabase
      .from('ai_reports')
      .select('id, created_at, output_content')
      .eq('user_id', user.id)
      .eq('report_type', 'development_plan')
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const teams: CoachTeam[] = ((memberships || []) as unknown as Array<{ role: string; teams: { id: string; name: string; level: string | null; age_group: string | null } | null }>)
    .filter((m) => isStaff(m.role) && m.teams)
    .map((m) => ({ id: m.teams!.id, name: m.teams!.name, level: drillLevelFor(m.teams!.level), ageGroup: m.teams!.age_group }));

  const coachOnly = profile?.account_role === 'coach';
  // A coach-only account has no playing log to read suggestions from
  const signals = coachOnly ? [] : await loadPlayerSignals(supabase, user.id);

  const saved = params.plan ? await loadSavedFocusPlan(params.plan) : null;

  // Why the AI plan is not on offer, when it is not. Said plainly rather than hidden.
  const aiBlocked = !aiProviderCompany()
    ? 'The AI plan is not switched on for Deadeye yet. Everything above still works.'
    : profile?.ai_coaching_enabled === false
      ? 'You switched AI coaching off in Settings, so the AI plan is off too.'
      : null;
  const unlimited = hasPro(subscription);
  const reportsLeft = unlimited ? null : aiReportsLeft(subscription);

  const startMode = params.mode === 'team' || (coachOnly && params.from !== 'coach') ? 'team' : 'player';

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <PageHeader tone="train" icon={ScanSearch} title="Focus Finder" subtitle="Name a weakness. Get the film, IQ and drills that fix it." />
        <FocusFinder
          content={content}
          signals={signals}
          teams={teams}
          initialIds={saved ? saved.weaknessIds : cleanWeaknessIds(params.w)}
          initialText={typeof params.q === 'string' ? params.q.slice(0, 600) : ''}
          initialMode={teams.length ? (saved?.mode ?? startMode) : 'player'}
          initialTeamId={teams.find((t) => t.id === params.team)?.id ?? teams[0]?.id ?? null}
          fromCoach={params.from === 'coach'}
          playerLevel={drillLevelFor(profile?.playing_level)}
          savedPlan={saved ? { id: params.plan!, plan: saved.focusPlan } : null}
          recentPlans={(recent || [])
            .filter((r) => r.id !== params.plan)
            .map((r) => ({ id: r.id, createdAt: r.created_at, summary: ((r.output_content || {}) as { summary?: string }).summary || 'Focus plan' }))}
          aiBlocked={aiBlocked}
          reportsLeft={reportsLeft}
          myId={user.id}
        />
      </div>
    </div>
  );
}
