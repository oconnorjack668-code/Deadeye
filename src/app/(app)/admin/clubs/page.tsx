// src/app/(app)/admin/clubs/page.tsx
// Owner only: "my club is not listed" suggestions from players (00051),
// grouped so one club named by several players shows once. Each has its
// directory row ready to paste into docs/agent-os/clubs/directory.csv (then
// `node scripts/build-clubs.mjs`), or is dismissed. Who suggested it is never
// shown: only how many players did.
import React from 'react';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalize } from '@/lib/search';
import { PageHeader } from '@/components/layout/PageHeader';
import { CopyButton } from '@/components/CopyButton';
import { Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Club suggestions - Deadeye' };

const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** A row for docs/agent-os/clubs/directory.csv, in its column order */
function directoryRow(name: string, town: string | null, county: string | null, date: string): string {
  return [
    name, '', 'club', town || 'to check', county || 'to check', 'Ireland', 'to check', 'to check', 'to check', 'to check', 'to check',
    'to check', 'to check', 'player suggestion in the app', 'to check (player suggestion)', date, 'Suggested by players; confirm it exists.',
  ].map(csvField).join(',');
}

async function dismiss(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const ids = String(formData.get('ids') || '').split(',').filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length) await createAdminClient().from('club_suggestions').update({ resolved: true }).in('id', ids);
  revalidatePath('/admin/clubs');
}

export default async function ClubSuggestionsPage() {
  if (!(await checkIsOwner())) notFound();
  const { data, error } = await createAdminClient()
    .from('club_suggestions')
    .select('id, user_id, club_name, town, county, created_at')
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(500);

  const groups = new Map<string, { name: string; town: string | null; county: string | null; ids: string[]; players: Set<string>; latest: string }>();
  for (const s of data ?? []) {
    const key = `${normalize(s.club_name)}|${normalize(s.town ?? '')}`;
    const g = groups.get(key) ?? { name: s.club_name, town: s.town, county: s.county, ids: [], players: new Set<string>(), latest: s.created_at };
    g.ids.push(s.id);
    g.players.add(s.user_id);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.players.size - a.players.size);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <PageHeader tone="hoops" icon={Shield} title="Club suggestions" subtitle="Clubs players say are missing" />
        {error ? (
          <p className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-300">
            Run 00051_home_club.sql in the Supabase SQL editor to turn this on.
          </p>
        ) : list.length === 0 ? (
          <p className="text-sm text-zinc-500">No suggestions waiting. Players send them from Settings → Your club.</p>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Copy a row into <code>docs/agent-os/clubs/directory.csv</code> (or ask Claude to add it), then run{' '}
              <code>node scripts/build-clubs.mjs</code>. Dismiss it once it is added, or if it is not a real club.
            </p>
            <ul className="space-y-2">
              {list.map((g) => {
                const row = directoryRow(g.name, g.town, g.county, today);
                return (
                  <li key={g.ids[0]} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{g.name}</div>
                        <div className="text-xs text-zinc-500">
                          {[g.town, g.county].filter(Boolean).join(', ') || 'No town given'} · {g.players.size}{' '}
                          {g.players.size === 1 ? 'player' : 'players'}
                        </div>
                      </div>
                      <form action={dismiss}>
                        <input type="hidden" name="ids" value={g.ids.join(',')} />
                        <button type="submit" className="text-xs font-semibold text-zinc-500 underline hover:text-zinc-300">
                          Dismiss
                        </button>
                      </form>
                    </div>
                    <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded-lg bg-zinc-950 p-2 text-[11px] text-zinc-400">{row}</code>
                    <div className="mt-2">
                      <CopyButton text={row} label="Copy directory row" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
