// src/app/(app)/film/packs/[id]/page.tsx
// A pack of film clips, in order, with which ones the player has done. A
// library pack is free or Pro; a pack the player's coach set always opens.
// A coach can set any pack they can open for a team, and on their own pack
// take clips out or delete it.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, ClipboardList, Eye } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { ProBadge, ProLock } from '@/components/ProGate';
import { DeletePackButton, RemoveClipButton } from '@/components/film/PackOwnerTools';
import { doneClipIds, packAssigned } from '@/lib/film/access';
import { levelLabel } from '@/lib/film/catalog';
import { clipLength, FILM_CLIP_COLUMNS, opensFor, packOpensFor, toClip, type FilmClip, type FilmClipRow } from '@/lib/film/rows';
import { coachAccess } from '@/lib/plays/access';
import { UUID_PATTERN } from '@/lib/plays/input';
import { COACH_SEES_LINE } from '@/lib/plays/progress';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Film pack - Deadeye' };

const toolLink =
  'inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800';

type PackRow = { id: string; owner_id: string | null; title: string; description: string; is_free: boolean };

export default async function FilmPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  // Row-level security returns published library packs, the user's own, and
  // a coach pack set for their team; nothing else
  const [{ data: pack }, { data: links }, isPro, assigned, done, coach] = await Promise.all([
    supabase.from('film_packs').select('id, owner_id, title, description, is_free').eq('id', id).maybeSingle() as unknown as Promise<{ data: PackRow | null }>,
    supabase.from('film_pack_clips').select('clip_id, position').eq('pack_id', id).order('position'),
    getHasPro(),
    packAssigned(supabase, id),
    doneClipIds(supabase, user.id),
    coachAccess(supabase, user.id),
  ]);
  if (!pack) notFound();
  const order = (links ?? []).map((l) => l.clip_id);
  const { data: rows } = order.length
    ? ((await supabase.from('film_clips').select(FILM_CLIP_COLUMNS).in('id', order)) as unknown as { data: FilmClipRow[] | null })
    : { data: [] as FilmClipRow[] };
  const byId = new Map<string, FilmClip>();
  for (const row of rows ?? []) {
    const clip = toClip(row);
    if (clip) byId.set(clip.id, clip);
  }
  const clips = order.flatMap((cid) => byId.get(cid) ?? []);
  const mine = pack.owner_id === user.id;
  const locked = !packOpensFor(pack, isPro, assigned);
  const freeLibraryPack = pack.owner_id === null && pack.is_free;
  const doneCount = clips.filter((c) => done.has(c.id)).length;

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/film" className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> Film
          </Link>

          <div>
            <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">{pack.title}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {mine ? 'Your pack' : pack.owner_id ? 'From your coach' : 'Pack'} · {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
              {clips.length > 0 && ` · ${doneCount} done`}
            </p>
          </div>
          {pack.description && <p className="text-sm text-zinc-300">{pack.description}</p>}

          {locked ? (
            <ProLock title="This pack is part of Pro">
              <p>Pro opens every pack and every clip in the library. The free packs are marked in the library.</p>
            </ProLock>
          ) : (
            <>
              {assigned && (
                <p className="flex items-start gap-2 text-sm text-zinc-400">
                  <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" /> {COACH_SEES_LINE}
                </p>
              )}

              {clips.length === 0 ? (
                <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
                  {mine ? 'No clips in this pack yet. Open a clip and tap Add to pack.' : 'No clips in this pack yet.'}
                </p>
              ) : (
                <ol className="space-y-2">
                  {clips.map((clip, i) => (
                    <li key={clip.id} className="flex items-center gap-2">
                      <Link
                        href={`/film/${clip.id}`}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900"
                      >
                        <span className="w-5 flex-shrink-0 text-sm font-bold tabular-nums text-zinc-500">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-white">{clip.title}</span>
                          <span className="mt-0.5 block text-sm text-zinc-400">
                            {levelLabel(clip.level)} · {clipLength(clip)}
                          </span>
                        </span>
                        {!opensFor(clip, isPro, assigned, freeLibraryPack) ? (
                          <ProBadge />
                        ) : done.has(clip.id) ? (
                          <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-emerald-400">
                            <Check className="h-4 w-4" /> Done
                          </span>
                        ) : (
                          <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                        )}
                      </Link>
                      {mine && <RemoveClipButton packId={pack.id} clipId={clip.id} title={clip.title} />}
                    </li>
                  ))}
                </ol>
              )}

              {coach.isCoach && (
                <section aria-labelledby="pack-coach-tools" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <h2 id="pack-coach-tools" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    For your team
                  </h2>
                  {coach.staffTeams.length > 0 ? (
                    clips.length > 0 && (
                      <Link href={`/coach/assignments?team=${coach.staffTeams[0].id}&pack=${pack.id}`} className={toolLink}>
                        <ClipboardList className="h-4 w-4" /> Assign to team
                      </Link>
                    )
                  ) : (
                    <p className="text-sm text-zinc-400">
                      <Link href="/coach/setup?step=team" className="font-semibold text-orange-400 hover:underline">
                        Set up a team
                      </Link>{' '}
                      to set packs for your players.
                    </p>
                  )}
                  {mine && <DeletePackButton packId={pack.id} />}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
