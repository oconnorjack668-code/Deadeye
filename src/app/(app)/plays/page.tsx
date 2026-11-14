// src/app/(app)/plays/page.tsx
// The plays library on the IQ tab: plays grouped by type, with filters for
// type, team age group and saved plays, and a search. Pro plays stay in the
// list with a Pro tag (see ProGate.tsx: shown, tagged, explained). A player
// on a team sees "From your coach" first: plays set for them and the team
// playbook, which always open, Pro or not.
import React from 'react';
import Link from 'next/link';
import { Bookmark, BookOpen, ChevronRight, Search } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cleanSearch } from '@/lib/search';
import { PageHeader } from '@/components/layout/PageHeader';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { IqTabs } from '@/components/study/IqTabs';
import { ProBadge, ProNote } from '@/components/ProGate';
import { PlayCourt } from '@/components/plays/PlayCourt';
import { FromYourCoach } from '@/components/plays/FromYourCoach';
import { coachPlaysFor } from '@/lib/plays/access';
import { AGE_GRADES, ageLabel, isAgeGrade, isPlayCategory, PLAY_CATEGORIES } from '@/lib/plays/catalog';
import { filterPlays, groupByCategory, opensFor, PLAY_COLUMNS, toPlay, type PlayFilters, type PlayRow } from '@/lib/plays/rows';
import { stepCount } from '@/lib/plays/diagram';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Plays - Deadeye' };

type Params = { cat?: string; age?: string; q?: string; saved?: string };

function hrefWith(current: Params, change: Params): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...change })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/plays?${qs}` : '/plays';
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

export default async function PlaysPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const params: Params = {
    cat: isPlayCategory(raw.cat) ? raw.cat : undefined,
    age: isAgeGrade(raw.age) ? raw.age : undefined,
    q: cleanSearch(raw.q),
    saved: raw.saved === '1' ? '1' : undefined,
  };
  const filters: PlayFilters = {
    category: isPlayCategory(params.cat) ? params.cat : undefined,
    age: isAgeGrade(params.age) ? params.age : undefined,
    q: params.q,
    saved: !!params.saved,
  };

  const supabase = await createClient();
  // Before 00060 runs the tables are missing, which reads as an empty library
  const [{ data: rows }, { data: savedRows }, isPro, fromCoach] = await Promise.all([
    supabase.from('plays').select(PLAY_COLUMNS).is('owner_id', null) as unknown as Promise<{ data: PlayRow[] | null }>,
    supabase.from('play_saves').select('play_id').eq('user_id', user.id),
    getHasPro(),
    coachPlaysFor(supabase, user.id),
  ]);
  const coachIds = new Set([...fromCoach.assigned.map((a) => a.play.id), ...fromCoach.playbook.map((p) => p.id)]);
  const all = (rows ?? []).map(toPlay).filter((p) => p !== null);
  const saved = new Set((savedRows ?? []).map((s) => s.play_id));
  const groups = groupByCategory(filterPlays(all, filters, saved));
  const freeCount = all.filter((p) => p.isFree).length;
  const filtered = !!(filters.category || filters.age || filters.q || filters.saved);

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <PageHeader tone="iq" icon={BookOpen} title="Basketball IQ" subtitle="Plays to learn step by step, and your job in each" />
        <IqTabs active="plays" />

        <div className="max-w-3xl space-y-4">
          <FromYourCoach data={fromCoach} />

          {/* A plain GET form: works before any JavaScript has loaded, and
              keeps the chips by sending them along */}
          <form action="/plays" role="search">
            {params.cat && <input type="hidden" name="cat" value={params.cat} />}
            {params.age && <input type="hidden" name="age" value={params.age} />}
            {params.saved && <input type="hidden" name="saved" value="1" />}
            <label className="relative block">
              <span className="sr-only">Search plays</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                name="q"
                defaultValue={params.q}
                placeholder="Search plays"
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-base text-white placeholder:text-zinc-500"
              />
            </label>
          </form>

          <div className="space-y-2">
            <nav aria-label="Type of play" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <Chip href={hrefWith(params, { saved: params.saved ? undefined : '1' })} active={!!params.saved}>
                <Bookmark className={`mr-1 h-4 w-4 ${params.saved ? 'fill-current' : ''}`} /> Saved
              </Chip>
              <Chip href={hrefWith(params, { cat: undefined })} active={!params.cat}>
                All types
              </Chip>
              {PLAY_CATEGORIES.filter((c) => all.some((p) => p.category === c.id)).map((c) => (
                <Chip key={c.id} href={hrefWith(params, { cat: c.id })} active={params.cat === c.id}>
                  {c.label}
                </Chip>
              ))}
            </nav>
            <nav aria-label="Age group" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              <Chip href={hrefWith(params, { age: undefined })} active={!params.age}>
                Any age
              </Chip>
              {AGE_GRADES.map((g) => (
                <Chip key={g} href={hrefWith(params, { age: g })} active={params.age === g}>
                  {g}
                </Chip>
              ))}
            </nav>
          </div>

          {!isPro && freeCount > 0 && (
            <ProNote>
              {freeCount} plays are free. Every play in the library is part of Pro.
            </ProNote>
          )}

          {groups.length === 0 && (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
              {all.length === 0
                ? 'No plays here yet.'
                : filters.saved && saved.size === 0
                  ? 'You have not saved a play yet. Open one and tap the bookmark.'
                  : 'No plays match that. Try another filter.'}
              {filtered && all.length > 0 && (
                <>
                  {' '}
                  <Link href="/plays" className="font-semibold text-blue-400 hover:underline">
                    Show all plays
                  </Link>
                </>
              )}
            </p>
          )}

          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`plays-${group.id}`}>
              <h2 id={`plays-${group.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {group.label}
              </h2>
              <ul className="space-y-2">
                {group.plays.map((play) => (
                  <li key={play.id}>
                    <Link
                      href={`/plays/${play.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900"
                    >
                      <PlayCourt diagram={play.diagram} label="" className="h-16 w-16 flex-shrink-0 rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-bold text-white">{play.title}</span>
                          {!opensFor(play, isPro, coachIds.has(play.id)) ? (
                            <ProBadge />
                          ) : saved.has(play.id) ? (
                            <Bookmark className="h-4 w-4 flex-shrink-0 fill-current text-emerald-400" aria-label="Saved" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-sm text-zinc-400">
                          {ageLabel(play.minAge)} · {stepCount(play.diagram)} steps
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
