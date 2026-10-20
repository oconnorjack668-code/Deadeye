// src/app/(app)/workouts/exercises/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MUSCLE_GROUPS, type LibraryExercise } from '@/lib/exercises';
import { exerciseLevel } from '@/lib/generator';
import { ArrowLeft, Flame } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Exercise Library - Deadeye' };

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ muscle?: string }>;
}) {
  await requireUser();
  const { muscle } = await searchParams;
  const selected = MUSCLE_GROUPS.find((m) => m.id === muscle)?.id;
  const supabase = await createClient();

  let query = supabase
    .from('exercise_library')
    .select('id, name, primary_muscle, equipment, description, cues, is_basketball_specific, is_system')
    .order('name');
  if (selected) query = query.eq('primary_muscle', selected);
  const { data } = (await query) as { data: LibraryExercise[] | null };
  const exercises = data || [];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link href="/workouts" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Gym
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white">Exercise Library</h1>
        <p className="text-sm text-zinc-400 mt-1 mb-4">
          {exercises.length} exercises
          {selected ? '' : ' across every muscle group'}. <Flame className="inline h-3.5 w-3.5 text-orange-400" /> = especially useful for hoopers.
        </p>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 [scrollbar-width:none]">
          <Link
            href="/workouts/exercises"
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
              !selected ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            All
          </Link>
          {MUSCLE_GROUPS.map((m) => (
            <Link
              key={m.id}
              href={`/workouts/exercises?muscle=${m.id}`}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                selected === m.id ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {m.label}
            </Link>
          ))}
        </div>

        <div className="space-y-2">
          {exercises.map((e) => (
            <details key={e.id} className="group rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    {e.name}
                    {e.is_basketball_specific && <Flame className="h-3.5 w-3.5 text-orange-400" aria-label="Basketball specific" />}
                    {exerciseLevel({ name: e.name, primary_muscle: e.primary_muscle, equipment: e.equipment ?? [] }) === 'advanced' ? (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">ADVANCED</span>
                    ) : exerciseLevel({ name: e.name, primary_muscle: e.primary_muscle, equipment: e.equipment ?? [] }) === 'intermediate' ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">NOT FOR BEGINNERS</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {MUSCLE_GROUPS.find((m) => m.id === e.primary_muscle)?.label || 'Other'}
                    {e.equipment?.length ? ` · ${e.equipment.map((q) => q.replace(/_/g, ' ')).join(', ')}` : ''}
                  </div>
                </div>
                <span className="text-zinc-600 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                {/* The library says nothing else about who an exercise is for, and
                    many players here are 13 to 15 */}
                {exerciseLevel({ name: e.name, primary_muscle: e.primary_muscle, equipment: e.equipment ?? [] }) !== 'beginner' && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    Learn this one with a coach first, and build up from the easier exercises in this group. Stop if anything
                    hurts.
                  </p>
                )}
                {e.description && <p className="text-zinc-300">{e.description}</p>}
                {e.cues?.length > 0 && (
                  <ul className="list-disc pl-5 text-zinc-400 space-y-0.5">
                    {e.cues.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${e.name} exercise form`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-emerald-400 underline"
                >
                  Watch how to do it on YouTube
                </a>
                <Link href={`/workouts/exercise?name=${encodeURIComponent(e.name)}`} className="ml-4 inline-block text-xs text-zinc-300 underline">
                  Your history
                </Link>
              </div>
            </details>
          ))}
          {exercises.length === 0 && <p className="text-sm text-zinc-500">No exercises in this group yet.</p>}
        </div>
      </div>
    </div>
  );
}
