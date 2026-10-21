// src/components/basketball/AfterSession.tsx
// What a player sees under a saved session: how it compares with their earlier
// sessions, spot by spot (src/lib/progress.ts), and - while they have no
// friends on Deadeye yet - an invite. Phase 3 of the plan: a reason to log a
// 2nd and 3rd session.
import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { compareSession, type ZoneShots } from '@/lib/progress';
import { InviteFriendCard } from './InviteFriendCard';

/** Spots shown on the card, most-shot first; the rest are in the session itself. */
const MAX_ZONES = 5;

export async function AfterSession({
  userId,
  sessionId,
  showInvite,
}: {
  userId: string;
  /** The session to compare; the newest one when null (the Hoops page after a save) */
  sessionId: string | null;
  showInvite: boolean;
}) {
  const supabase = await createClient();
  const [{ data: sessions }, invite] = await Promise.all([
    supabase.from('training_sessions').select('id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(40),
    showInvite ? inviteCode(userId) : Promise.resolve(null),
  ]);

  const list = sessions ?? [];
  const current = sessionId ? list.find((s) => s.id === sessionId) : list[0];
  // Only sessions saved before this one: opening an old session compares it
  // with what came before it, not with what came after
  const earlierIds = current ? list.filter((s) => s.created_at < current.created_at).map((s) => s.id) : [];

  let progress = null;
  if (current && earlierIds.length > 0) {
    const { data: drills } = await supabase
      .from('session_drills')
      .select('session_id, shooting_entries(shot_zone, makes, attempts)')
      .in('session_id', [current.id, ...earlierIds]);
    // The hand-written types do not describe this relation; the session page
    // reads the same nested select the same way
    const rows = (drills ?? []) as unknown as Array<{ session_id: string; shooting_entries: ZoneShots[] }>;
    progress = compareSession(
      rows.filter((d) => d.session_id === current.id).flatMap((d) => d.shooting_entries),
      rows.filter((d) => d.session_id !== current.id).flatMap((d) => d.shooting_entries)
    );
  }

  if (!progress && !invite) return null;

  return (
    <div className="mb-6 space-y-3">
      {progress && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-semibold uppercase text-zinc-400">Your progress</p>
          <p className="mt-1 font-bold text-white">{progress.headline}</p>
          <ul className="mt-4 space-y-3">
            {progress.zones.slice(0, MAX_ZONES).map((z) => {
              const change = z.before === null ? null : z.now - z.before;
              return (
                <li key={z.zone}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-zinc-300">{z.label}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {z.before !== null && <span className="text-xs text-zinc-500">{z.before}% →</span>}
                      <span className="font-bold text-white">{z.now}%</span>
                      {change === null ? (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">new spot</span>
                      ) : change !== 0 ? (
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            change > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                          }`}
                        >
                          {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {change > 0 ? '+' : ''}
                          {change}%
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {/* Before as a faint track marker, today as the bar */}
                  <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${z.now}%` }} />
                    {z.before !== null && (
                      <div className="absolute top-0 h-full w-0.5 bg-zinc-300" style={{ left: `calc(${z.before}% - 1px)` }} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-zinc-500">
            Bar: this session. White line: your earlier sessions. {progress.overall.now}% overall today
            {progress.overall.before !== null ? `, ${progress.overall.before}% before` : ''}.
          </p>
        </section>
      )}
      {invite && <InviteFriendCard code={invite} />}
    </div>
  );
}

/** The player's friend code, if they have no friends on Deadeye yet. */
async function inviteCode(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const [{ count }, { data: profile }] = await Promise.all([
    supabase.from('friendships').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('profiles').select('friend_code').eq('id', userId).maybeSingle(),
  ]);
  return (count ?? 0) === 0 && profile?.friend_code ? profile.friend_code : null;
}
