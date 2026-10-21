// src/app/(app)/games/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { seasonAverages, statLine, type GameRow } from '@/lib/games';
import { Button } from '@/components/ui/Button';
import { Trophy, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Games - Deadeye' };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 text-center">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] font-semibold uppercase text-zinc-500">{label}</div>
      {sub && <div className="text-[10px] text-zinc-600">{sub}</div>}
    </div>
  );
}

const fmtPct = (v: number | null) => (v == null ? '–' : `${v}%`);
const yearAgo = () => new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

export default async function GamesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const since = yearAgo();
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('user_id', user.id)
    .gte('game_date', since)
    .order('game_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  const games = (data || []) as GameRow[];
  const s = seasonAverages(games);
  const last10 = games.slice(0, 10).reverse();
  const maxPts = Math.max(10, ...last10.map((g) => g.points));

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Games</h1>
              <p className="text-sm text-zinc-400">Your stats from real games</p>
            </div>
          </div>
          {/* Never wraps: on a phone "Log game" broke onto two lines */}
          <Link href="/games/new" className="flex-shrink-0">
            <Button variant="primary" className="gap-1.5 whitespace-nowrap">
              <Plus className="h-4 w-4" /> Log game
            </Button>
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Game stats aren&apos;t switched on yet. Run migration <code>00022_games_and_teams.sql</code> in Supabase.
          </p>
        ) : games.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center space-y-3">
            <Trophy className="h-10 w-10 text-zinc-700 mx-auto" />
            <p className="font-semibold text-zinc-200">No games yet</p>
            <p className="text-sm text-zinc-400">
              Track your points, rebounds, assists and shooting live during a game (or type in the box score after), and watch your
              season averages grow.
            </p>
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-400">
                Last 12 months · {s.games} {s.games === 1 ? 'game' : 'games'}
                {s.wins + s.losses > 0 ? ` · ${s.wins}-${s.losses}` : ''}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="PPG" value={`${s.ppg}`} sub={`best ${s.best}`} />
                <Stat label="RPG" value={`${s.rpg}`} />
                <Stat label="APG" value={`${s.apg}`} />
                <Stat label="FG%" value={fmtPct(s.fgPct)} />
                <Stat label="3P%" value={fmtPct(s.threePct)} />
                <Stat label="FT%" value={fmtPct(s.ftPct)} />
                <Stat label="SPG" value={`${s.spg}`} />
                <Stat label="BPG" value={`${s.bpg}`} />
                <Stat label="TOPG" value={`${s.topg}`} />
              </div>
              <p className="text-xs text-zinc-500">
                Effective FG% {fmtPct(s.efgPct)} · True shooting {fmtPct(s.tsPct)}
                {s.mpg != null ? ` · ${s.mpg} min per game` : ''}
              </p>
            </section>

            {last10.length > 1 && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Points, last {last10.length} games</h2>
                <div className="flex items-end gap-1.5 h-32">
                  {last10.map((g) => (
                    <Link key={g.id} href={`/games/${g.id}`} className="flex-1 flex flex-col items-center justify-end h-full group">
                      <span className="text-[10px] text-zinc-400 mb-0.5">{g.points}</span>
                      <div
                        className={`w-full rounded-t-md ${g.result === 'win' ? 'bg-emerald-500' : g.result === 'loss' ? 'bg-red-500/80' : 'bg-orange-500'} group-hover:opacity-80`}
                        style={{ height: `${Math.max(4, (g.points / maxPts) * 100)}%` }}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              {games.map((g) => (
                <Link
                  key={g.id}
                  href={`/games/${g.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {g.opponent ? `vs ${g.opponent}` : 'Game'}{' '}
                      {g.result && (
                        <span className={`text-xs font-bold ${g.result === 'win' ? 'text-emerald-400' : g.result === 'loss' ? 'text-red-400' : 'text-zinc-400'}`}>
                          {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
                          {g.team_score != null && g.opponent_score != null ? ` ${g.team_score}-${g.opponent_score}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(`${g.game_date}T00:00:00`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} · {g.game_type}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-orange-300 whitespace-nowrap">{statLine(g)}</div>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
