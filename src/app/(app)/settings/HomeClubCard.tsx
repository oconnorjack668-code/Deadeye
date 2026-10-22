// src/app/(app)/settings/HomeClubCard.tsx
// "Your club": the player picks their home club from the club list, or says
// they are not at one, or tells us about a club that is missing. It stays
// private unless they choose to show it on their player card (00051), and
// for a player under 16 that card badge reaches friends and teammates only.
'use client';

import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { clubById, clubPlace } from '@/lib/clubs';
import { ClubSearch } from '@/components/clubs/ClubSearch';

const input =
  'w-full px-3.5 py-2 rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none';

export function HomeClubCard({
  initial,
  is16Plus,
}: {
  initial: { clubId: string; showOnCard: boolean } | null;
  is16Plus: boolean;
}) {
  const [clubId, setClubId] = useState<string | null>(initial?.clubId ?? null);
  const [showOnCard, setShowOnCard] = useState(initial?.showOnCard ?? false);
  const [picking, setPicking] = useState(!initial);
  const [query, setQuery] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState({ clubName: '', town: '', county: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const club = clubById(clubId);

  async function save(nextId: string | null, nextShow: boolean) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch('/api/profile/club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: nextId, showOnCard: nextShow }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'That did not save. Try again.');
        return;
      }
      setClubId(nextId);
      setShowOnCard(nextId ? nextShow : false);
      setPicking(false);
      setQuery('');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function suggest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/clubs/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestion),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'That did not send. Try again.');
        return;
      }
      setSuggesting(false);
      setSuggestion({ clubName: '', town: '', county: '' });
      setNote('Thanks! We will add your club soon, then you can pick it here.');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader>
        <CardTitle>Your club</CardTitle>
        <CardDescription>The club you play for. Only you see it, unless you choose to show it on your player card.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="error" title="Not saved">
            {error}
          </Alert>
        )}
        {note && <p className="rounded-xl bg-emerald-600/10 px-3 py-2 text-sm text-emerald-300">{note}</p>}

        {club && !picking && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{club.name}</div>
              <div className="truncate text-xs text-zinc-500">{clubPlace(club)}</div>
            </div>
            <button type="button" onClick={() => setPicking(true)} className="flex-shrink-0 text-sm font-semibold text-orange-300 underline">
              Change
            </button>
          </div>
        )}

        {!club && !picking && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">Not at a club.</p>
            <button type="button" onClick={() => setPicking(true)} className="text-sm font-semibold text-orange-300 underline">
              Pick a club
            </button>
          </div>
        )}

        {picking && !suggesting && (
          <div className="space-y-2">
            <ClubSearch id="club-search" selectedId={clubId} disabled={busy} onQuery={setQuery} onPick={(c) => save(c.id, c.id === clubId ? showOnCard : false)} />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => save(null, false)}
                className="text-sm font-semibold text-zinc-400 underline hover:text-zinc-200"
              >
                {"I'm not at a club"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuggesting(true);
                  setSuggestion((s) => ({ ...s, clubName: query.trim() }));
                }}
                className="text-sm font-semibold text-orange-300 underline"
              >
                {"My club isn't listed? Let us know"}
              </button>
            </div>
          </div>
        )}

        {suggesting && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">Tell us your club and where it is, and we will add it.</p>
            <input
              aria-label="Club name"
              placeholder="Club name"
              value={suggestion.clubName}
              maxLength={80}
              onChange={(e) => setSuggestion({ ...suggestion, clubName: e.target.value })}
              className={input}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="Town"
                placeholder="Town"
                value={suggestion.town}
                maxLength={60}
                onChange={(e) => setSuggestion({ ...suggestion, town: e.target.value })}
                className={input}
              />
              <input
                aria-label="County"
                placeholder="County"
                value={suggestion.county}
                maxLength={40}
                onChange={(e) => setSuggestion({ ...suggestion, county: e.target.value })}
                className={input}
              />
            </div>
            <p className="text-xs text-zinc-500">Just the club, please: no names, phone numbers or emails.</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={suggest} disabled={busy || suggestion.clubName.trim().length < 2} isLoading={busy}>
                Send
              </Button>
              <Button variant="outline" onClick={() => setSuggesting(false)} disabled={busy}>
                Back
              </Button>
            </div>
          </div>
        )}

        {club && !picking && (
          <label className="flex cursor-pointer items-start justify-between gap-4 pt-1">
            <span>
              <span className="flex items-center gap-1.5 text-sm text-zinc-200">
                <Shield className="h-4 w-4 text-orange-300" aria-hidden /> Show my club on my player card
              </span>
              <span className="block text-xs text-zinc-500">
                {is16Plus
                  ? 'Anyone who can open your card sees it as a badge under your name.'
                  : 'Only your friends and teammates see it, as a badge under your name.'}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={showOnCard}
              disabled={busy}
              onChange={(e) => save(clubId, e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-orange-500"
            />
          </label>
        )}
      </CardContent>
    </Card>
  );
}
