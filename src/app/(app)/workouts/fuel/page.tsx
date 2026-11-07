// src/app/(app)/workouts/fuel/page.tsx
// Fuelling habits around training. Deliberately not calories or macros - see
// the reasoning in src/lib/fuel.ts and migration 00026.
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { FuelLogger } from '@/components/workouts/FuelLogger';
import { summarise, eatingBeforeInsight, type FuelEntry } from '@/lib/fuel';
import { userCalendarNow } from '@/lib/userTime';
import { addDays } from '@/lib/dates';
import { Apple, ArrowLeft, Lightbulb } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fuel - Deadeye' };

/** How much history the summary and the insight look at. */
const WINDOW_DAYS = 60;

export default async function FuelPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { today } = await userCalendarNow();

  const { data } = await supabase
    .from('fuel_logs')
    .select('log_date, ate_before, ate_after, hydration, sleep_hours, energy')
    .eq('user_id', user.id)
    .gte('log_date', addDays(today, -WINDOW_DAYS))
    .order('log_date', { ascending: false });

  const entries = (data || []) as unknown as FuelEntry[];
  const todays = entries.find((e) => e.log_date === today) || null;
  const summary = summarise(entries);
  const insight = eatingBeforeInsight(entries);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href="/workouts" className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back to Gym
        </Link>

        <PageHeader tone="gym" icon={Apple} title="Fuel" subtitle="Eating, water and sleep around your training" />

        <FuelLogger existing={todays} />

        {summary.daysLogged > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Days logged</div>
              <div className="mt-1 text-2xl font-black text-white">{summary.daysLogged}</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Ate before</div>
              <div className="mt-1 text-2xl font-black text-emerald-400">
                {summary.ateBeforeRate === null ? '–' : `${summary.ateBeforeRate}%`}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Avg sleep</div>
              <div className="mt-1 text-2xl font-black text-cyan-400">
                {summary.averageSleep === null ? '–' : `${summary.averageSleep}h`}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600/20">
            <Lightbulb className="h-5 w-5 text-blue-400" />
          </span>
          <div>
            <div className="text-sm font-bold text-white">What your own days show</div>
            <p className="mt-0.5 text-sm text-zinc-400">{insight.message}</p>
          </div>
        </div>

        <p className="mt-5 text-sm text-zinc-500">
          This tracks habits, not calories. If you want to change how you eat for sport, talk to a parent, a coach
          or a dietitian rather than guessing from an app.
        </p>
      </div>
    </div>
  );
}
