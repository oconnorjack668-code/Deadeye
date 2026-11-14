// src/app/(app)/film/[id]/page.tsx
// One film clip: the player with its questions below it, where it comes
// from, a save button and private notes. A Pro clip on Free shows what it is
// and that it is Pro, not the video, unless the player's coach set it (on its
// own or in a pack) or it is in a free pack: team work is never behind a
// paywall. Coaches also get "Add to a pack" and "Assign to team".
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { ProLock } from '@/components/ProGate';
import { FilmClipPlayer } from '@/components/film/FilmClipPlayer';
import { SaveClipButton } from '@/components/film/SaveClipButton';
import { FilmNotes } from '@/components/film/FilmNotes';
import { ClipCoachTools } from '@/components/film/ClipCoachTools';
import { clipAccess } from '@/lib/film/access';
import { levelLabel, themeLabel } from '@/lib/film/catalog';
import { clipLength, FILM_CLIP_COLUMNS, opensFor, toClip, type FilmClipRow } from '@/lib/film/rows';
import { coachAccess } from '@/lib/plays/access';
import { UUID_PATTERN } from '@/lib/plays/input';
import { COACH_SEES_LINE } from '@/lib/plays/progress';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Film clip - Deadeye' };

export default async function FilmClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Anything else would only reach the database as an error
  if (!UUID_PATTERN.test(id)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  // Row-level security returns published clips only
  const [{ data: row }, { data: savedRow }, { data: note }, isPro, access, coach] = await Promise.all([
    supabase.from('film_clips').select(FILM_CLIP_COLUMNS).eq('id', id).maybeSingle() as unknown as Promise<{ data: FilmClipRow | null }>,
    supabase.from('film_saves').select('clip_id').eq('user_id', user.id).eq('clip_id', id).maybeSingle(),
    supabase.from('film_notes').select('body').eq('user_id', user.id).eq('clip_id', id).maybeSingle(),
    getHasPro(),
    clipAccess(supabase, id),
    coachAccess(supabase, user.id),
  ]);
  if (!row) notFound();
  const clip = toClip(row);
  const locked = clip ? !opensFor(clip, isPro, access.assigned, access.inFreePack) : false;

  let packs: Array<{ id: string; title: string; hasClip: boolean }> = [];
  if (coach.isCoach && clip && !locked) {
    const { data: own } = await supabase.from('film_packs').select('id, title').eq('owner_id', user.id).order('updated_at', { ascending: false });
    const ownIds = (own ?? []).map((p) => p.id);
    const { data: holding } = ownIds.length
      ? await supabase.from('film_pack_clips').select('pack_id').eq('clip_id', id).in('pack_id', ownIds)
      : { data: [] as Array<{ pack_id: string }> };
    const has = new Set((holding ?? []).map((h) => h.pack_id));
    packs = (own ?? []).map((p) => ({ id: p.id, title: p.title, hasClip: has.has(p.id) }));
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/film" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> Film
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">{row.title}</h1>
              {clip && (
                <p className="mt-1 text-sm text-zinc-400">
                  {themeLabel(clip.theme)} · {levelLabel(clip.level)} · {clipLength(clip)}
                </p>
              )}
            </div>
            {clip && !locked && <SaveClipButton clipId={clip.id} userId={user.id} initial={!!savedRow} />}
          </div>

          {!clip ? (
            <p role="alert" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              This clip could not be shown. Try another one from the library.
            </p>
          ) : locked ? (
            <ProLock title="This clip is part of Pro">
              <p>Pro opens every clip in the library, each stopping at the key moments to ask you the right read. The free clips are marked in the library.</p>
            </ProLock>
          ) : (
            <>
              <FilmClipPlayer
                clipId={clip.id}
                videoId={clip.videoId}
                title={clip.title}
                startS={clip.startS}
                endS={clip.endS}
                questions={clip.questions}
              />
              <p className="text-sm text-zinc-500">Video from {clip.channel} on YouTube.</p>

              {access.assigned && clip.questions.length > 0 && (
                <p className="flex items-start gap-2 text-sm text-zinc-400">
                  <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" /> {COACH_SEES_LINE}
                </p>
              )}

              <FilmNotes clipId={clip.id} initial={note?.body ?? ''} />

              {coach.isCoach && (
                <section aria-labelledby="clip-coach-tools" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <h2 id="clip-coach-tools" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    For your team
                  </h2>
                  <ClipCoachTools clipId={clip.id} teams={coach.staffTeams} packs={packs} />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
