// src/app/(app)/film/page.tsx
// The Film part of the IQ tab: short clips from real games that stop at the
// key moment and ask the right read. A player on a team sees "From your
// coach" first (clips and packs set for them, which always open, Pro or
// not), then the packs they are part way through, then the library by theme
// with a level filter, a search and their saved clips. Pro clips stay in the
// list with a Pro tag. "Ask your coach" (film_questions) is linked at the
// bottom, unchanged. Until the owner publishes clips this says they are on
// the way.
import React from 'react';
import Link from 'next/link';
import { Bookmark, BookOpen, ChevronRight, Layers, Search } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cleanSearch } from '@/lib/search';
import { PageHeader } from '@/components/layout/PageHeader';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { IqTabs } from '@/components/study/IqTabs';
import { ProBadge, ProNote } from '@/components/ProGate';
import { FilmFromYourCoach } from '@/components/film/FilmFromYourCoach';
import { coachFilmFor, doneClipIds } from '@/lib/film/access';
import { FILM_LEVELS, FILM_THEMES, isFilmLevel, isFilmTheme, levelLabel } from '@/lib/film/catalog';
import {
  clipLength,
  continuePacks,
  filterClips,
  FILM_CLIP_COLUMNS,
  groupByTheme,
  opensFor,
  packOpensFor,
  toClip,
  type FilmClipRow,
  type FilmFilters,
} from '@/lib/film/rows';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Film - Deadeye' };

type Params = { theme?: string; level?: string; q?: string; saved?: string };

function hrefWith(current: Params, change: Params): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...change })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/film?${qs}` : '/film';
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold ${
        active ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </Link>
  );
}

const card = 'rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4';
const sectionLabel = 'mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400';
const rowLink = 'flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900';

type PackRow = { id: string; title: string; description: string; is_free: boolean; owner_id: string | null };

export default async function FilmPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const params: Params = {
    theme: isFilmTheme(raw.theme) ? raw.theme : undefined,
    level: isFilmLevel(raw.level) ? raw.level : undefined,
    q: cleanSearch(raw.q),
    saved: raw.saved === '1' ? '1' : undefined,
  };
  const filters: FilmFilters = {
    theme: isFilmTheme(params.theme) ? params.theme : undefined,
    level: isFilmLevel(params.level) ? params.level : undefined,
    q: params.q,
    saved: !!params.saved,
  };

  const supabase = await createClient();
  // Before 00062 runs the tables are missing, which reads as an empty library.
  // Row-level security returns published clips and packs only.
  const [{ data: rows }, { data: savedRows }, { data: packRows }, isPro, fromCoach, done] = await Promise.all([
    supabase.from('film_clips').select(FILM_CLIP_COLUMNS).order('title') as unknown as Promise<{ data: FilmClipRow[] | null }>,
    supabase.from('film_saves').select('clip_id').eq('user_id', user.id),
    supabase.from('film_packs').select('id, title, description, is_free, owner_id').is('owner_id', null).order('title') as unknown as Promise<{
      data: PackRow[] | null;
    }>,
    getHasPro(),
    coachFilmFor(supabase, user.id),
    doneClipIds(supabase, user.id),
  ]);
  const packs = packRows ?? [];
  const { data: packClipRows } = packs.length
    ? await supabase.from('film_pack_clips').select('pack_id, clip_id, position').in('pack_id', packs.map((p) => p.id)).order('position')
    : { data: [] as Array<{ pack_id: string; clip_id: string; position: number }> };

  const all = (rows ?? []).map(toClip).filter((c) => c !== null);
  const saved = new Set((savedRows ?? []).map((s) => s.clip_id));
  const clipsOf = (packId: string) => (packClipRows ?? []).filter((r) => r.pack_id === packId).map((r) => r.clip_id);
  const coachClipIds = new Set([...fromCoach.clips.map((a) => a.clip.id), ...fromCoach.packs.flatMap((a) => a.clipIds)]);
  const freePackClipIds = new Set(packs.filter((p) => p.is_free).flatMap((p) => clipsOf(p.id)));
  const groups = groupByTheme(filterClips(all, filters, saved));
  const freeCount = all.filter((c) => c.isFree).length;
  const filtered = !!(filters.theme || filters.level || filters.q || filters.saved);
  const going = continuePacks(
    [
      ...fromCoach.packs.map((a) => ({ id: a.packId, title: a.packTitle, clipIds: a.clipIds })),
      ...packs.filter((p) => packOpensFor(p, isPro)).map((p) => ({ id: p.id, title: p.title, clipIds: clipsOf(p.id) })),
    ].filter((p, i, list) => list.findIndex((x) => x.id === p.id) === i),
    done
  );
  const shownPacks = packs.filter((p) => clipsOf(p.id).length > 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <PageHeader tone="iq" icon={BookOpen} title="Basketball IQ" subtitle="Watch the game and learn to read it" />
        <IqTabs active="film" />

        <div className="max-w-3xl space-y-4">
          <FilmFromYourCoach data={fromCoach} done={done} />

          {going.length > 0 && (
            <section aria-labelledby="film-continue">
              <h2 id="film-continue" className={sectionLabel}>
                Continue
              </h2>
              <ul className="space-y-2">
                {going.map((p) => (
                  <li key={p.packId}>
                    <Link href={`/film/${p.nextClipId}`} className={rowLink}>
                      <Layers className="h-5 w-5 flex-shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-white">{p.title}</span>
                        <span className="mt-0.5 block text-sm text-zinc-400">
                          {p.done} of {p.of} clips done · next clip
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {all.length === 0 ? (
            <section className={card}>
              <h2 className="font-bold text-white">Clips are on the way</h2>
              <p className="mt-1 text-sm text-zinc-300">
                Short clips from real games that stop at the key moment and ask you what the right read is. The first
                ones are being picked now.
              </p>
            </section>
          ) : (
            <>
              {/* A plain GET form: works before any JavaScript has loaded, and
                  keeps the chips by sending them along */}
              <form action="/film" role="search">
                {params.theme && <input type="hidden" name="theme" value={params.theme} />}
                {params.level && <input type="hidden" name="level" value={params.level} />}
                {params.saved && <input type="hidden" name="saved" value="1" />}
                <label className="relative block">
                  <span className="sr-only">Search film</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={params.q}
                    placeholder="Search film"
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-base text-white placeholder:text-zinc-500"
                  />
                </label>
              </form>

              <div className="space-y-2">
                <nav aria-label="Theme" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <Chip href={hrefWith(params, { saved: params.saved ? undefined : '1' })} active={!!params.saved}>
                    <Bookmark className={`mr-1 h-4 w-4 ${params.saved ? 'fill-current' : ''}`} /> Saved
                  </Chip>
                  <Chip href={hrefWith(params, { theme: undefined })} active={!params.theme}>
                    All themes
                  </Chip>
                  {FILM_THEMES.filter((t) => all.some((c) => c.theme === t.id)).map((t) => (
                    <Chip key={t.id} href={hrefWith(params, { theme: t.id })} active={params.theme === t.id}>
                      {t.label}
                    </Chip>
                  ))}
                </nav>
                <nav aria-label="Level" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                  <Chip href={hrefWith(params, { level: undefined })} active={!params.level}>
                    Any level
                  </Chip>
                  {FILM_LEVELS.map((l) => (
                    <Chip key={l.id} href={hrefWith(params, { level: l.id })} active={params.level === l.id}>
                      {l.label}
                    </Chip>
                  ))}
                </nav>
              </div>

              {!isPro && freeCount > 0 && (
                <ProNote>
                  {freeCount === 1 ? '1 clip is free' : `${freeCount} clips are free`}, and so are the free packs. Every clip in the library is part of Pro.
                </ProNote>
              )}

              {!filtered && shownPacks.length > 0 && (
                <section aria-labelledby="film-packs">
                  <h2 id="film-packs" className={sectionLabel}>
                    Packs
                  </h2>
                  <ul className="space-y-2">
                    {shownPacks.map((p) => (
                      <li key={p.id}>
                        <Link href={`/film/packs/${p.id}`} className={rowLink}>
                          <Layers className="h-5 w-5 flex-shrink-0 text-zinc-400" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-bold text-white">{p.title}</span>
                              {!packOpensFor(p, isPro) && <ProBadge />}
                            </span>
                            <span className="mt-0.5 block text-sm text-zinc-400">
                              {clipsOf(p.id).length} {clipsOf(p.id).length === 1 ? 'clip' : 'clips'}
                            </span>
                          </span>
                          <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {groups.length === 0 && (
                <p className={`${card} text-sm text-zinc-400`}>
                  {filters.saved && saved.size === 0 ? 'You have not saved a clip yet. Open one and tap the bookmark.' : 'No clips match that. Try another filter.'}{' '}
                  <Link href="/film" className="font-semibold text-blue-400 hover:underline">
                    Show all clips
                  </Link>
                </p>
              )}

              {groups.map((group) => (
                <section key={group.id} aria-labelledby={`film-${group.id}`}>
                  <h2 id={`film-${group.id}`} className={sectionLabel}>
                    {group.label}
                  </h2>
                  <ul className="space-y-2">
                    {group.clips.map((clip) => (
                      <li key={clip.id}>
                        <Link href={`/film/${clip.id}`} className={rowLink}>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-bold text-white">{clip.title}</span>
                              {!opensFor(clip, isPro, coachClipIds.has(clip.id), freePackClipIds.has(clip.id)) ? (
                                <ProBadge />
                              ) : done.has(clip.id) ? (
                                <span className="flex-shrink-0 text-sm font-semibold text-emerald-400">Done</span>
                              ) : saved.has(clip.id) ? (
                                <Bookmark className="h-4 w-4 flex-shrink-0 fill-current text-emerald-400" aria-label="Saved" />
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-sm text-zinc-400">
                              {levelLabel(clip.level)} · {clipLength(clip)} · {clip.questions.length} {clip.questions.length === 1 ? 'question' : 'questions'}
                            </span>
                          </span>
                          <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}

          <Link href="/film-questions" className={`flex items-center gap-3 ${card} hover:bg-zinc-900`}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">Ask your coach</span>
              <span className="block text-sm text-zinc-400">Was that the right read? Ask about one decision in your own game film</span>
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}
