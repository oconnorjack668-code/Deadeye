// src/app/(app)/drills/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DRILL_LEVELS, DRILL_PLAYERS, DRILL_SKILLS, skillLabel, type Drill } from '@/lib/drills';
import { cleanSearch } from '@/lib/search';
import { ListChecks, Clock, Search, Star, User, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Drill Library - Deadeye' };

type Filters = { skill?: string; level?: string; players?: string; q?: string; fav?: string; hoop?: string };

function hrefWith(current: Filters, change: Filters): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `/drills?${qs}` : '/drills';
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
        active ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </Link>
  );
}

export default async function DrillsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const filters: Filters = {
    skill: DRILL_SKILLS.some((s) => s.id === raw.skill) ? raw.skill : undefined,
    level: (DRILL_LEVELS as readonly string[]).includes(raw.level || '') ? raw.level : undefined,
    players: (DRILL_PLAYERS as readonly string[]).includes(raw.players || '') ? raw.players : undefined,
    q: cleanSearch(raw.q),
    fav: raw.fav === '1' ? '1' : undefined,
    hoop: raw.hoop === 'no' ? 'no' : undefined,
  };

  const supabase = await createClient();
  let query = supabase
    .from('drills')
    .select('id, slug, name, skill, sub_skill, level, players, duration_minutes, reps')
    .order('skill')
    .order('name');
  if (filters.skill) query = query.eq('skill', filters.skill);
  if (filters.level) query = query.eq('level', filters.level);
  if (filters.players) query = query.eq('players', filters.players);
  // For a hall, a driveway with no hoop, or a bedroom
  if (filters.hoop) query = query.not('equipment', 'cs', '{hoop}');
  // Name or sub-skill, so "euro" finds the Euro step and "free throw" the
  // free throw drills. Sub-skills are stored with underscores.
  if (filters.q) query = query.or(`name.ilike."*${filters.q}*",sub_skill.ilike."*${filters.q.replace(/ /g, '_')}*"`);
  // Before 00042 runs the table is missing, which reads as no favourites
  const [{ data }, { data: favRows }] = await Promise.all([
    query as unknown as Promise<{ data: Drill[] | null }>,
    supabase.from('drill_favorites').select('drill_id').eq('user_id', user.id),
  ]);
  const favorites = new Set((favRows || []).map((f) => f.drill_id));
  const drills = (data || []).filter((d) => !filters.fav || favorites.has(d.id));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg">
            <ListChecks className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Drill Library</h1>
            <p className="text-sm text-zinc-400 mt-1">{drills.length} drills with steps, cues and common mistakes</p>
          </div>
        </div>

        {/* A plain GET form: works before any JavaScript has loaded, and keeps
            the chips below by sending them along */}
        <form action="/drills" className="mb-3 flex gap-2">
          {filters.skill && <input type="hidden" name="skill" value={filters.skill} />}
          {filters.level && <input type="hidden" name="level" value={filters.level} />}
          {filters.players && <input type="hidden" name="players" value={filters.players} />}
          {filters.fav && <input type="hidden" name="fav" value="1" />}
          {filters.hoop && <input type="hidden" name="hoop" value="no" />}
          <label className="relative flex-1">
            <span className="sr-only">Search drills</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Search drills"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500"
            />
          </label>
        </form>

        <div className="space-y-2 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <Chip href={hrefWith(filters, { fav: filters.fav ? undefined : '1' })} active={!!filters.fav}>
              <span className="inline-flex items-center gap-1">
                <Star className={`h-3 w-3 ${filters.fav ? 'fill-current' : ''}`} /> Favourites
              </span>
            </Chip>
            <Chip href={hrefWith(filters, { skill: undefined })} active={!filters.skill}>All skills</Chip>
            {DRILL_SKILLS.map((s) =>
              // There are no IQ drills, so the chip opened an empty list. IQ is
              // trained in the study section instead.
              s.id === 'iq' ? (
                <Chip key={s.id} href="/study" active={false}>
                  {s.label} →
                </Chip>
              ) : (
                <Chip key={s.id} href={hrefWith(filters, { skill: s.id })} active={filters.skill === s.id}>
                  {s.label}
                </Chip>
              )
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <Chip href={hrefWith(filters, { level: undefined })} active={!filters.level}>Any level</Chip>
            {DRILL_LEVELS.map((l) => (
              <Chip key={l} href={hrefWith(filters, { level: l })} active={filters.level === l}>
                {l}
              </Chip>
            ))}
            <span className="w-2" />
            <Chip href={hrefWith(filters, { players: undefined })} active={!filters.players}>Any size</Chip>
            {DRILL_PLAYERS.map((p) => (
              <Chip key={p} href={hrefWith(filters, { players: p })} active={filters.players === p}>
                {p}
              </Chip>
            ))}
            <span className="w-2" />
            <Chip href={hrefWith(filters, { hoop: filters.hoop ? undefined : 'no' })} active={!!filters.hoop}>
              No hoop needed
            </Chip>
          </div>
        </div>

        <div className="space-y-2">
          {drills.map((d) => (
            <Link key={d.id} href={`/drills/${d.slug}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    {favorites.has(d.id) && <Star className="h-3.5 w-3.5 flex-shrink-0 fill-amber-400 text-amber-400" aria-label="Favourite" />}
                    {d.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {skillLabel(d.skill)} · {d.sub_skill.replace(/_/g, ' ')} · <span className="capitalize">{d.level}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">{d.reps}</div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-zinc-500 flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {d.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    {d.players === 'solo' ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />} {d.players}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {drills.length === 0 && (
            <p className="text-sm text-zinc-500">
              {filters.fav && !filters.q
                ? 'No favourites yet. Tap the star on any drill to keep it here.'
                : 'No drills match these filters.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
