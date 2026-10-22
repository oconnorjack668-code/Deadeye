// src/app/(app)/leaderboard/Standings.tsx
// The podium and the rows below it. Server components: nothing here needs the browser.
import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/Badge';
import { shareOfLeader } from '@/lib/leaderboard';
import type { RowLook } from '@/lib/leaderboard-server';
import { Crown, Flame } from 'lucide-react';

export interface Standing {
  user_id: string;
  player_name: string;
  points: number;
  rank: number;
  sessions_completed: number;
  training_days: number;
  current_streak: number;
  is_me: boolean;
  total: number;
}

// Badge tiers stay gold, silver and bronze: they are a scale, not brand colour
const TIERS = {
  1: { ring: 'from-amber-200 via-amber-400 to-amber-600', text: 'text-amber-300', block: 'from-amber-400/25 border-amber-400/30', height: 'h-28' },
  2: { ring: 'from-zinc-100 via-zinc-300 to-zinc-500', text: 'text-zinc-200', block: 'from-zinc-300/20 border-zinc-300/25', height: 'h-20' },
  3: { ring: 'from-orange-300 via-orange-600 to-amber-800', text: 'text-orange-400', block: 'from-orange-600/25 border-orange-600/30', height: 'h-14' },
} as const;

function tierOf(rank: number): 1 | 2 | 3 {
  return rank <= 1 ? 1 : rank === 2 ? 2 : 3;
}

function PodiumSpot({ player, look, first }: { player: Standing; look?: RowLook; first: boolean }) {
  const tier = TIERS[tierOf(player.rank)];
  return (
    <Link href={`/players/${player.user_id}`} className="group flex min-w-0 flex-1 flex-col items-center">
      <Crown className={`mb-1 h-6 w-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] ${first ? '' : 'invisible'}`} aria-hidden />
      <div className={`rounded-full bg-gradient-to-b p-[3px] ${tier.ring}`}>
        <div className="rounded-full bg-zinc-950">
          <Avatar name={player.player_name} emoji={look?.emoji} color={look?.color} photoUrl={look?.photoUrl} size={first ? 76 : 58} />
        </div>
      </div>
      <span className="mt-2 w-full truncate text-center text-sm font-bold text-white group-hover:underline">{player.player_name}</span>
      {player.is_me ? (
        <Badge variant="brand" className="mt-0.5 px-2 py-0 text-[10px]">
          You
        </Badge>
      ) : look?.level ? (
        <span className="mt-0.5 text-[11px] font-semibold text-zinc-500">Lv {look.level}</span>
      ) : null}
      <div
        className={`mt-2 flex w-full flex-col items-center justify-start rounded-t-2xl border border-b-0 bg-gradient-to-b to-transparent pt-2 ${tier.block} ${tier.height}`}
      >
        <span className={`text-2xl font-black tabular-nums ${tier.text}`}>{player.points}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">pts</span>
      </div>
    </Link>
  );
}

/** Top three, second-first-third so the winner stands in the middle. */
export function Podium({ top, looks }: { top: Standing[]; looks: Map<string, RowLook> }) {
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 px-3 pt-5 sm:px-8">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative mx-auto flex max-w-md items-end gap-2 sm:gap-4">
        {order.map((p) => (
          <PodiumSpot key={p.user_id} player={p} look={looks.get(p.user_id)} first={p === top[0]} />
        ))}
      </div>
    </div>
  );
}

export function StandingRow({ player, look, leaderPoints }: { player: Standing; look?: RowLook; leaderPoints: number }) {
  const share = shareOfLeader(player.points, leaderPoints);
  return (
    <Link
      href={`/players/${player.user_id}`}
      className={`flex items-center gap-3 px-3 py-3 transition-colors hover:bg-zinc-800/50 sm:px-4 ${
        player.is_me ? 'bg-red-500/10 shadow-[inset_3px_0_0_var(--color-red-500)]' : ''
      }`}
    >
      <span className={`w-7 flex-shrink-0 text-center text-sm font-black tabular-nums ${player.is_me ? 'text-red-300' : 'text-zinc-500'}`}>
        {player.rank}
      </span>
      <Avatar name={player.player_name} emoji={look?.emoji} color={look?.color} photoUrl={look?.photoUrl} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold text-white">{player.player_name}</span>
          {player.is_me && (
            <Badge variant="brand" className="flex-shrink-0 px-2 py-0 text-[10px]">
              You
            </Badge>
          )}
          {look?.level ? (
            <span className="flex-shrink-0 rounded-md bg-zinc-800 px-1.5 py-px text-[10px] font-bold text-zinc-300">Lv {look.level}</span>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400" style={{ width: `${share}%` }} />
          </div>
          <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-zinc-500" title={`${player.training_days} training days`}>
            {player.training_days}d
            {player.current_streak > 0 && (
              <>
                <Flame className="ml-1 h-3 w-3 text-orange-400" aria-label="streak" />
                {player.current_streak}
              </>
            )}
          </span>
        </div>
      </div>
      <div className="w-12 flex-shrink-0 text-right">
        <div className="text-lg font-black leading-none tabular-nums text-white">{player.points}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">pts</div>
      </div>
    </Link>
  );
}
