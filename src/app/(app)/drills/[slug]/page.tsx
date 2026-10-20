// src/app/(app)/drills/[slug]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/Button';
import { skillLabel, type Drill } from '@/lib/drills';
import { ArrowLeft, Clock, Play, PlayCircle, CheckCircle2, AlertTriangle, Wrench } from 'lucide-react';
import { DemoVideo } from '@/components/DemoVideo';
import { FavoriteDrillButton } from './FavoriteDrillButton';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Drill - Deadeye' };

export default async function DrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: drill } = (await supabase.from('drills').select('*').eq('slug', slug).maybeSingle()) as { data: Drill | null };
  if (!drill) notFound();
  // Before 00042 runs the table is missing, which reads as not a favourite
  const { data: favorite } = await supabase
    .from('drill_favorites')
    .select('drill_id')
    .eq('user_id', user.id)
    .eq('drill_id', drill.id)
    .maybeSingle();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href={`/drills?skill=${drill.skill}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> {skillLabel(drill.skill)} drills
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-white">{drill.name}</h1>
            <p className="text-sm text-zinc-400 mt-1 capitalize">
              {skillLabel(drill.skill)} · {drill.sub_skill.replace(/_/g, ' ')} · {drill.level} · {drill.players}
            </p>
          </div>
          <FavoriteDrillButton drillId={drill.id} userId={user.id} initial={!!favorite} />
        </div>

        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="text-xs font-semibold uppercase text-zinc-500 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time
            </div>
            <div className="text-white font-semibold">{drill.duration_minutes} min</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="text-xs font-semibold uppercase text-zinc-500">Reps</div>
            <div className="text-white font-semibold text-sm">{drill.reps}</div>
          </div>
        </div>

        {drill.demo_video_id && (
          <div className="mb-5">
            <DemoVideo id={drill.demo_video_id} title={drill.name} />
          </div>
        )}

        <section className="space-y-4 text-sm">
          <div>
            <h2 className="font-bold text-white mb-1 flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-zinc-400" /> Setup
            </h2>
            <p className="text-zinc-300">{drill.setup}</p>
            {drill.equipment.length > 0 && (
              <p className="text-xs text-zinc-500 mt-1">Equipment: {drill.equipment.join(', ')}</p>
            )}
          </div>

          <div>
            <h2 className="font-bold text-white mb-1">How to do it</h2>
            <ol className="list-decimal pl-5 space-y-1 text-zinc-300">
              {drill.instructions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="font-bold text-white mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Coaching cues
            </h2>
            <ul className="space-y-1 text-zinc-300">
              {drill.coaching_cues.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-bold text-white mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Common mistakes
            </h2>
            <ul className="space-y-1 text-zinc-300">
              {drill.common_mistakes.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mt-6 space-y-2">
          <Link href={`/basketball/new?drill=${drill.slug}`} className="block">
            <Button variant="primary" size="lg" className="w-full gap-2">
              <Play className="h-4 w-4" /> Start this drill
            </Button>
          </Link>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${drill.name} basketball drill`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
          >
            <PlayCircle className="h-4 w-4 text-red-500" /> {drill.demo_video_id ? 'More demos on YouTube' : 'Watch demos on YouTube'}
          </a>
        </div>
      </div>
    </div>
  );
}
