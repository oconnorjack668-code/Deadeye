// src/app/(app)/programs/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GOAL_LABELS, canUseProgram, getActiveProgram, startedProgramIds } from '@/lib/programs';
import { ProBadge, ProNote } from '@/components/ProGate';
import { CalendarCheck, ChevronRight, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Programs - Deadeye' };

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ goal?: string }> }) {
  const user = await requireUser();
  const { goal } = await searchParams;
  const selectedGoal = goal && GOAL_LABELS[goal] ? goal : undefined;
  const supabase = await createClient();

  let query = supabase.from('training_programs').select('*').order('display_order');
  if (selectedGoal) query = query.eq('goal', selectedGoal);
  const [{ data }, active, isPro, started] = await Promise.all([
    query,
    getActiveProgram(supabase, user.id),
    getHasPro(),
    startedProgramIds(supabase, user.id),
  ]);
  const programs = data || [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg">
            <CalendarCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Programs</h1>
            <p className="text-sm text-zinc-400 mt-1">Follow a plan day by day, with drills, gym work and study built in</p>
          </div>
        </div>

        {active && (
          <div className="mb-6 rounded-2xl border border-orange-600/40 bg-orange-600/10 p-4">
            <div className="text-xs font-semibold uppercase text-orange-300">Your program</div>
            <div className="text-lg font-bold text-white">{active.program.name}</div>
            <div className="text-sm text-zinc-300 mt-1">
              {active.completedIds.size} of {active.days.length} sessions done
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-orange-500"
                style={{ width: `${active.days.length ? Math.round((active.completedIds.size / active.days.length) * 100) : 0}%` }}
              />
            </div>
            {active.next ? (
              <Link
                href={`/programs/${active.program.slug}/day/${active.next.id}`}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Play className="h-4 w-4" /> Week {active.next.week} · Session {active.next.day}: {active.next.title}
              </Link>
            ) : (
              <p className="mt-3 text-sm font-semibold text-emerald-400">Program complete. Great work!</p>
            )}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 [scrollbar-width:none]">
          <Link href="/programs" className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${!selectedGoal ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
            All
          </Link>
          {Object.entries(GOAL_LABELS).map(([id, label]) => (
            <Link
              key={id}
              href={`/programs?goal=${id}`}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${selectedGoal === id ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {!isPro && (
          <ProNote className="mb-3">
            Programs without a Pro tag are free to follow from start to finish. The rest, the longer plans built
            around a goal or a position, are part of Pro.
          </ProNote>
        )}

        <div className="space-y-2">
          {programs.map((p) => (
            <Link key={p.id} href={`/programs/${p.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
              <div>
                <div className="flex items-center gap-2 font-semibold text-white">
                  {p.name}
                  {!canUseProgram(p, isPro, started) && <ProBadge />}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 capitalize">
                  {GOAL_LABELS[p.goal]} · {p.level} · {p.position === 'any' ? 'all positions' : `${p.position}s`} · {p.weeks} weeks ·{' '}
                  {p.sessions_per_week}x/week
                </div>
                <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
            </Link>
          ))}
          {programs.length === 0 && <p className="text-sm text-zinc-500">No programs yet.</p>}
        </div>
      </div>
    </div>
  );
}
