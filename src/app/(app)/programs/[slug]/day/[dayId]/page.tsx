// src/app/(app)/programs/[slug]/day/[dayId]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  canUseProgram,
  courtLink,
  getActiveProgram,
  gymLink,
  startedProgramIds,
  type ProgramDay,
  type ProgramItem,
} from '@/lib/programs';
import { ProLock } from '@/components/ProGate';
import { Button } from '@/components/ui/Button';
import { CompleteDayButton } from './CompleteDayButton';
import { ArrowLeft, Target, Dumbbell, BookOpen, Award, Info, Clock, Flame, Wind } from 'lucide-react';
import { COOL_DOWN_SLUG, WARM_UP_SLUG } from '@/lib/drills';
import { TEST_LABELS } from '@/lib/performanceTests';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Program Session - Deadeye' };

export default async function ProgramDayPage({ params }: { params: Promise<{ slug: string; dayId: string }> }) {
  const { slug, dayId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: day } = (await supabase
    .from('program_days')
    .select('*, training_programs(id, slug, name, weeks, sessions_per_week, is_free)')
    .eq('id', dayId)
    .maybeSingle()) as {
    data: (ProgramDay & { training_programs: { id: string; slug: string; name: string; is_free: boolean } }) | null;
  };
  if (!day || day.training_programs.slug !== slug) notFound();

  const [isPro, started] = await Promise.all([getHasPro(), startedProgramIds(supabase, user.id)]);
  if (!canUseProgram(day.training_programs, isPro, started)) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
          <Link href={`/programs/${slug}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> {day.training_programs.name}
          </Link>
          <ProLock title={`${day.training_programs.name} is part of Deadeye Pro`}>
            <p>
              The full program library is part of Pro: structured plans that build week by week toward a goal. Four
              programs are free to follow from start to finish.
            </p>
          </ProLock>
        </div>
      </div>
    );
  }

  const items = (day.items || []) as ProgramItem[];
  const drillSlugs = items.filter((i) => i.type === 'drill').map((i) => (i as { slug: string }).slug);
  const topicSlugs = items.filter((i) => i.type === 'study').map((i) => (i as { topic_slug: string }).topic_slug);
  const exerciseNames = items.filter((i) => i.type === 'exercise').map((i) => (i as { name: string }).name);

  const [{ data: drills }, { data: topics }, active, { data: easier }] = await Promise.all([
    // The warm-up and cool-down come with every session; they exist once 00048 is run
    supabase.from('drills').select('slug, name, duration_minutes, reps').in('slug', [...drillSlugs, WARM_UP_SLUG, COOL_DOWN_SLUG]),
    topicSlugs.length ? supabase.from('study_topics').select('id, slug, title').in('slug', topicSlugs) : Promise.resolve({ data: [] }),
    getActiveProgram(supabase, user.id),
    // Missing before 00048, which reads as no easier versions
    exerciseNames.length
      ? supabase.from('exercise_library').select('name, easier_version').eq('is_system', true).in('name', exerciseNames)
      : Promise.resolve({ data: [] }),
  ]);
  const drillBySlug = new Map((drills || []).map((d: { slug: string }) => [d.slug, d]));
  const easierFor = new Map(((easier || []) as Array<{ name: string; easier_version: string | null }>).map((e) => [e.name, e.easier_version]));
  const warmUp = drillBySlug.get(WARM_UP_SLUG) as { name: string; duration_minutes: number } | undefined;
  const coolDown = drillBySlug.get(COOL_DOWN_SLUG) as { name: string; duration_minutes: number } | undefined;
  const topicBySlug = new Map((topics || []).map((t: { slug: string }) => [t.slug, t]));

  const isActive = active?.program.id === day.training_programs.id;
  const done = isActive && active!.completedIds.has(day.id);
  const court = courtLink(items);
  const gym = gymLink(items);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href={`/programs/${slug}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> {day.training_programs.name}
        </Link>
        <div className="text-xs font-semibold uppercase text-orange-400">
          Week {day.week} · Session {day.day}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">{day.title}</h1>
        <p className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
          {day.focus} <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{day.estimated_minutes} min</span>
        </p>

        <div className="mt-6 space-y-2">
          {warmUp && (
            <Link href={`/drills/${WARM_UP_SLUG}`} className="flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 hover:bg-orange-500/15">
              <Flame className="h-5 w-5 text-orange-400 mt-0.5" />
              <div>
                <div className="font-semibold text-white text-sm">Warm up first: {warmUp.name}</div>
                <div className="text-xs text-zinc-400">{warmUp.duration_minutes} min, with a timer. No ball needed.</div>
              </div>
            </Link>
          )}
          {items.map((item, i) => {
            if (item.type === 'drill') {
              const d = drillBySlug.get(item.slug) as { name: string; duration_minutes: number; reps: string } | undefined;
              return (
                <Link key={i} href={`/drills/${item.slug}`} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
                  <Target className="h-5 w-5 text-orange-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white text-sm">{d?.name || item.slug}</div>
                    <div className="text-xs text-zinc-500">
                      {d ? `${d.reps} · ${d.duration_minutes} min` : 'Drill'}
                      {item.note ? ` · ${item.note}` : ''}
                    </div>
                  </div>
                </Link>
              );
            }
            if (item.type === 'exercise') {
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <Dumbbell className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white text-sm">{item.name}</div>
                    <div className="text-xs text-zinc-500">
                      {item.sets || 3} sets{item.reps ? ` × ${item.reps}` : ''}
                    </div>
                    {easierFor.get(item.name) && <div className="mt-1 text-xs text-zinc-400">Easier: {easierFor.get(item.name)}</div>}
                  </div>
                </div>
              );
            }
            if (item.type === 'study') {
              const t = topicBySlug.get(item.topic_slug) as { id: string; title: string } | undefined;
              return (
                <Link key={i} href={t ? `/study/${t.id}` : '/study'} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
                  <BookOpen className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white text-sm">Study: {t?.title || item.topic_slug}</div>
                    <div className="text-xs text-zinc-500">Read a lesson and take its quiz</div>
                  </div>
                </Link>
              );
            }
            if (item.type === 'test') {
              return (
                <Link key={i} href={`/workouts/tests/new?type=${item.test_type}`} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
                  <Award className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white text-sm">Test: {TEST_LABELS[item.test_type] || item.test_type}</div>
                    <div className="text-xs text-zinc-500">Log your result to track progress</div>
                  </div>
                </Link>
              );
            }
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-zinc-900/40 p-3 text-sm text-zinc-300">
                <Info className="h-4 w-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                {item.text}
              </div>
            );
          })}
          {coolDown && (
            <Link href={`/drills/${COOL_DOWN_SLUG}`} className="flex items-start gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 hover:bg-cyan-500/15">
              <Wind className="h-5 w-5 text-cyan-300 mt-0.5" />
              <div>
                <div className="font-semibold text-white text-sm">Finish with the {coolDown.name}</div>
                <div className="text-xs text-zinc-400">{coolDown.duration_minutes} min of easy stretches</div>
              </div>
            </Link>
          )}
        </div>

        <div className="mt-6 space-y-2">
          {court && (
            <Link href={court} className="block">
              <Button variant="primary" size="lg" className="w-full gap-2">
                <Target className="h-4 w-4" /> Start court drills
              </Button>
            </Link>
          )}
          {gym && (
            <Link href={gym} className="block">
              <Button variant="secondary" size="lg" className="w-full gap-2">
                <Dumbbell className="h-4 w-4" /> Start gym work
              </Button>
            </Link>
          )}
          {isActive ? (
            <CompleteDayButton enrollmentId={active!.enrollmentId} dayId={day.id} done={done} totalDays={active!.days.length} completedCount={active!.completedIds.size} />
          ) : (
            <p className="text-center text-xs text-zinc-500">Start this program to track completed sessions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
