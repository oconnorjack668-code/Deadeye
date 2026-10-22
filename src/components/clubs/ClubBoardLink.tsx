// src/components/clubs/ClubBoardLink.tsx
// The way into a club board, on the Teams page and a team page
import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { clubInitials } from '@/lib/clubBoard';

export function ClubBoardLink({ club }: { club: { id: string; name: string } }) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-600/20 via-zinc-900 to-zinc-900 p-3 transition hover:border-orange-400/60"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-black text-zinc-950 shadow-md shadow-orange-950/50">
        {clubInitials(club.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-orange-300">Club board</span>
        <span className="block truncate font-bold text-white">{club.name}</span>
      </span>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-orange-300 transition group-hover:translate-x-0.5" />
    </Link>
  );
}
