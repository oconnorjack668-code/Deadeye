// src/components/clubs/ClubLinkCard.tsx
// On a team page: the team club board. A head coach asks to put the team on
// its club board (pending until the founder checks with the club), and can
// take it off. Everyone on an approved team gets a way in.
'use client';

import React, { useState } from 'react';
import { ClubBoardLink } from '@/components/clubs/ClubBoardLink';
import { useRouter } from 'next/navigation';
import { Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ClubSearch } from '@/components/clubs/ClubSearch';
import { clubById, clubPlace } from '@/lib/clubs';
import type { ClubLink } from '@/lib/clubBoard';

export function ClubLinkCard({ teamId, isCoach, link }: { teamId: string; isCoach: boolean; link: ClubLink | null }) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const club = clubById(link?.club_id);

  async function send(clubId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'That did not save. Try again.');
        return;
      }
      setPicking(false);
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  // Approved: the way in, for everyone on the team
  if (club && link?.status === 'approved' && !picking) {
    return (
      <div className="space-y-2">
        <ClubBoardLink club={club} />
        {isCoach && (
          <button type="button" disabled={busy} onClick={() => void send(null)} className="text-xs text-zinc-500 underline hover:text-zinc-300">
            Take this team off the club board
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (!isCoach) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-600/15">
          <Users className="h-5 w-5 text-orange-300" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white">Club board</p>
          <p className="text-sm text-zinc-400">
            One page for all your club&apos;s teams: coaches&apos; notices, a club challenge, and how each team trained this week. Team
            totals only, never a single player.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Not sent">
          {error}
        </Alert>
      )}

      {club && link?.status === 'pending' && !picking ? (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Clock className="h-4 w-4" /> Waiting to join {club.name}
          </p>
          <p className="text-xs text-amber-100/60">{clubPlace(club)}
          </p>
          <p className="text-xs text-amber-100/80">
            Deadeye checks with the club before any team joins its board, so only the club&apos;s own teams can see it. This usually
            takes a day or two.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setPicking(true)} className="text-xs font-semibold text-amber-200 underline">
              Wrong club?
            </button>
            <button type="button" disabled={busy} onClick={() => void send(null)} className="text-xs text-amber-100/70 underline">
              Cancel request
            </button>
          </div>
        </div>
      ) : picking ? (
        <div className="space-y-2">
          <ClubSearch id={`club-board-${teamId}`} selectedId={link?.club_id} disabled={busy} onPick={(c) => void send(c.id)} />
          <p className="text-xs text-zinc-500">
            Club not in the list? Tell us from Settings → Your club → &quot;My club isn&apos;t listed&quot;, and we&apos;ll add it.
          </p>
          <button type="button" onClick={() => setPicking(false)} className="text-xs text-zinc-500 underline">
            Back
          </button>
        </div>
      ) : (
        <Button variant="primary" size="sm" className="w-full" onClick={() => setPicking(true)}>
          Put this team on its club board
        </Button>
      )}
    </div>
  );
}
