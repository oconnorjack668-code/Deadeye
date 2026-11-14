// src/app/(app)/coach/playbook/page.tsx
// The coach's Playbook tab: the plays they have drawn or copied, and each
// team's playbook (the plays its players can open). Free keeps 5 plays and a
// playbook for one team; the page says so before the limit is hit.
import React from 'react';
import Link from 'next/link';
import { ChevronRight, Pencil, Plus } from 'lucide-react';
import { requireUser, getHasPro } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProNote } from '@/components/ProGate';
import { RemoveFromPlaybookButton } from '@/components/plays/RemoveFromPlaybookButton';
import { coachAccess } from '@/lib/plays/access';
import { categoryLabel } from '@/lib/plays/catalog';
import { canDrawAnother, FREE_COACH_PLAYS, FREE_PLAYBOOK_TEAMS } from '@/lib/plays/limits';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Playbook - Deadeye' };

type PlayLite = { id: string; title: string; category: string; owner_id: string | null };

const card = 'rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4';
const sectionLabel = 'text-xs font-semibold uppercase tracking-wider text-zinc-400';

export default async function PlaybookPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ isCoach, staffTeams }, isPro, { data: own }] = await Promise.all([
    coachAccess(supabase, user.id),
    getHasPro(),
    supabase.from('plays').select('id, title, category, owner_id').eq('owner_id', user.id).order('updated_at', { ascending: false }),
  ]);
  const teamIds = staffTeams.map((t) => t.id);
  const { data: book } = teamIds.length
    ? ((await supabase.from('team_playbook').select('team_id, plays(id, title, category, owner_id)').in('team_id', teamIds)) as unknown as {
        data: Array<{ team_id: string; plays: PlayLite | null }> | null;
      })
    : { data: [] };
  const mine = (own ?? []) as PlayLite[];
  const canDraw = canDrawAnother(mine.length, isPro);

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">Playbook</h1>
          <p className="text-sm text-zinc-400">Plays you draw, and the plays each team learns</p>
        </div>

        {!isCoach ? (
          <p className={`${card} text-sm text-zinc-300`}>
            The playbook is for coaches.{' '}
            <Link href="/coach/setup" className="font-semibold text-orange-400 hover:underline">
              Set up as a coach
            </Link>
          </p>
        ) : (
          <>
            <section aria-labelledby="my-plays" className={`${card} space-y-3`}>
              <div className="flex items-center justify-between gap-3">
                <h2 id="my-plays" className={sectionLabel}>
                  Your plays{!isPro && ` · ${mine.length} of ${FREE_COACH_PLAYS}`}
                </h2>
              </div>
              {mine.length === 0 ? (
                <p className="text-sm text-zinc-400">None yet. Draw one, or copy one from the library and make it yours.</p>
              ) : (
                <ul className="space-y-2">
                  {mine.map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <Link href={`/plays/${p.id}`} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-zinc-950/60 px-3 py-2 hover:bg-zinc-900">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-white">{p.title}</span>
                          <span className="block text-sm text-zinc-400">{categoryLabel(p.category)}</span>
                        </span>
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                      </Link>
                      <Link
                        href={`/plays/${p.id}/edit`}
                        aria-label={`Edit ${p.title}`}
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {canDraw ? (
                  <Link href="/plays/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:brightness-110">
                    <Plus className="h-5 w-5" /> Draw a play
                  </Link>
                ) : (
                  <p className="text-sm text-zinc-300">Free keeps {FREE_COACH_PLAYS} plays. Delete one to draw another.</p>
                )}
                <Link href="/plays" className="inline-flex h-11 items-center rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800/80">
                  Copy from the library
                </Link>
              </div>
              {!isPro && (
                <ProNote>
                  Free keeps {FREE_COACH_PLAYS} plays and a playbook for {FREE_PLAYBOOK_TEAMS} team. Pro keeps as many plays as you like, for up to 10 teams.
                </ProNote>
              )}
            </section>

            <section aria-labelledby="team-playbooks" className="space-y-3">
              <h2 id="team-playbooks" className={sectionLabel}>
                Team playbooks
              </h2>
              {staffTeams.length === 0 ? (
                <p className={`${card} text-sm text-zinc-400`}>
                  <Link href="/coach/setup?step=team" className="font-semibold text-orange-400 hover:underline">
                    Set up a team
                  </Link>{' '}
                  to give its players a playbook.
                </p>
              ) : (
                staffTeams.map((team) => {
                  const plays = (book ?? []).filter((r) => r.team_id === team.id && r.plays).map((r) => r.plays!);
                  return (
                    <div key={team.id} className={`${card} space-y-2`}>
                      <h3 className="font-bold text-white">{team.name}</h3>
                      {plays.length === 0 ? (
                        <p className="text-sm text-zinc-400">Empty. Open a play and tap Add to team playbook; its players can then open it.</p>
                      ) : (
                        <ul className="space-y-2">
                          {plays.map((p) => (
                            <li key={p.id} className="flex items-center gap-2">
                              <Link href={`/plays/${p.id}`} className="flex min-h-11 min-w-0 flex-1 items-center rounded-xl bg-zinc-950/60 px-3 py-2 hover:bg-zinc-900">
                                <span className="truncate text-sm font-semibold text-white">{p.title}</span>
                              </Link>
                              <RemoveFromPlaybookButton teamId={team.id} playId={p.id} title={p.title} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
