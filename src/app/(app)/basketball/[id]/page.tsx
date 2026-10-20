// src/app/(app)/basketball/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ZONE_LABELS } from '@/lib/court';
import type { ShotZone } from '@/lib/supabase/types';
import { ArrowLeft, Target, Sparkles, Video } from 'lucide-react';
import { ShareCardButton } from '@/components/ShareCardButton';
import { DeleteSessionButton } from './DeleteSessionButton';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Session - Deadeye' };

function pct(makes: number, attempts: number): string {
  return attempts > 0 ? `${Math.round((makes / attempts) * 100)}%` : '–';
}

export default async function BasketballSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: session }, { data: drills }] = (await Promise.all([
    supabase.from('training_sessions').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('session_drills')
      .select('id, drill_name, drill_category, duration_minutes, display_order, shooting_entries(shot_zone, makes, attempts)')
      .eq('session_id', id)
      .order('display_order'),
  ])) as [
    {
      data: {
        session_date: string;
        session_type: string;
        duration_minutes: number;
        intensity_rpe: number;
        perceived_quality: number;
        notes: string | null;
        verified_by_video: boolean | null;
      } | null;
    },
    {
      data: Array<{
        id: string;
        drill_name: string;
        drill_category: string;
        duration_minutes: number | null;
        shooting_entries: Array<{ shot_zone: ShotZone; makes: number; attempts: number }>;
      }> | null;
    },
  ];

  if (!session) notFound();

  const entries = (drills || []).flatMap((d) => d.shooting_entries);
  const makes = entries.reduce((n, e) => n + e.makes, 0);
  const attempts = entries.reduce((n, e) => n + e.attempts, 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Link href="/basketball" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Hoops
        </Link>
        <h1 className="text-3xl font-black tracking-tight text-white capitalize flex items-center gap-2">
          <Target className="h-7 w-7 text-orange-400" /> {session.session_type.replace(/-/g, ' ')}
        </h1>
        {/* Says where the count came from, not that it is correct. A camera
            watched these shots; the player then confirmed each call by hand,
            which is the part that makes the number worth anything. */}
        {session.verified_by_video && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
            <Video className="h-3.5 w-3.5" /> Counted from video
          </p>
        )}
        <p className="text-sm text-zinc-400 mt-1 mb-6">
          {new Date(`${session.session_date}T00:00:00`).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}{' '}
          · {session.duration_minutes} min · RPE {session.intensity_rpe}/10 · Quality {session.perceived_quality}/5
        </p>
        <div className="-mt-3 mb-6">
          <ShareCardButton
            path={`/api/share/session?id=${id}`}
            text={attempts > 0 ? `${makes}/${attempts} shots today on Deadeye 🏀` : 'Put the work in today on Deadeye 🏀'}
          />
        </div>

        {attempts > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/70 mb-4">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-zinc-400">Shooting</div>
                <div className="text-3xl font-black text-orange-400">{pct(makes, attempts)}</div>
              </div>
              <div className="text-right text-sm text-zinc-300">
                {makes} makes
                <br />
                {attempts} attempts
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {(drills || []).map((d) => {
            const dm = d.shooting_entries.reduce((n, e) => n + e.makes, 0);
            const da = d.shooting_entries.reduce((n, e) => n + e.attempts, 0);
            return (
              <Card key={d.id} className="border-zinc-800 bg-zinc-900/70">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-white">{d.drill_name}</div>
                      <div className="text-xs text-zinc-500 capitalize">
                        {d.drill_category.replace(/-/g, ' ')}
                        {d.duration_minutes ? ` · ${d.duration_minutes} min` : ''}
                      </div>
                    </div>
                    {da > 0 && (
                      <div className="text-sm font-bold text-white">
                        {dm}/{da} <span className="text-zinc-500">{pct(dm, da)}</span>
                      </div>
                    )}
                  </div>
                  {d.shooting_entries.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {d.shooting_entries.map((e) => (
                        <div key={e.shot_zone} className="flex justify-between">
                          <span className="text-zinc-400">{ZONE_LABELS[e.shot_zone] || e.shot_zone}</span>
                          <span className="text-zinc-200">
                            {e.makes}/{e.attempts} · {pct(e.makes, e.attempts)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {session.notes && (
          <Card className="border-zinc-800 bg-zinc-900/70 mt-4">
            <CardContent className="p-4 text-sm text-zinc-300 whitespace-pre-line">{session.notes}</CardContent>
          </Card>
        )}

        <Link href="/ai-coach" className="block mt-6">
          <Button variant="outline" className="w-full gap-2">
            <Sparkles className="h-4 w-4" /> Get AI feedback on this session
          </Button>
        </Link>

        <DeleteSessionButton id={id} />
      </div>
    </div>
  );
}
