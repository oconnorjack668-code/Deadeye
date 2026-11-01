// src/app/(app)/friends/FriendsClient.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  REQUEST_MESSAGES,
  normaliseCode,
  rankFriends,
  weeklyScore,
  type FeedItem,
  type FriendRow,
  type RequestResult,
} from '@/lib/friends';
import { Share2, UserPlus, Check, X, Flame, Dumbbell, Target, Award, Trophy } from 'lucide-react';

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

const FEED_ICON = { hoops: Target, gym: Dumbbell, game: Trophy, badge: Award } as const;

export function FriendsClient({ myId, myCode, rows, feed }: { myId: string; myCode: string; rows: FriendRow[]; feed: FeedItem[] }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const incoming = rows.filter((r) => r.status === 'incoming');
  const outgoing = rows.filter((r) => r.status === 'outgoing');
  const ranked = rankFriends(rows);
  const friendCount = ranked.filter((r) => !r.is_me).length;
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/friends/add/${myCode}` : `/friends/add/${myCode}`;

  // PromiseLike, not Promise: supabase's .rpc()/.update() builders are thenables,
  // not actual Promise instances (they lack .catch()/.finally()), but `await`
  // works on anything with a `.then()`.
  async function call(key: string, fn: () => PromiseLike<{ data?: unknown; error: { message: string } | null }>) {
    setBusy(key);
    setMessage(null);
    const { data, error } = await fn();
    setBusy(null);
    if (error) {
      setMessage({ tone: 'error', text: error.message });
      return null;
    }
    router.refresh();
    return data;
  }

  async function addByCode(e: React.FormEvent) {
    e.preventDefault();
    const clean = normaliseCode(code);
    if (clean.length !== 6) {
      setMessage({ tone: 'error', text: 'Friend codes are 6 letters and numbers.' });
      return;
    }
    const result = (await call('add', () => createClient().rpc('send_friend_request', { p_code: clean }))) as RequestResult | null;
    if (result) {
      setMessage({ tone: result === 'sent' || result === 'accepted' ? 'success' : 'error', text: REQUEST_MESSAGES[result] });
      if (result === 'sent' || result === 'accepted') setCode('');
    }
  }

  async function share() {
    const text = `Add me on Deadeye! My friend code is ${myCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Deadeye', text, url: inviteUrl });
        return;
      }
      await navigator.clipboard.writeText(`${text}: ${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // share sheet closed
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.tone} title={message.tone === 'success' ? 'Done' : 'Check this'}>
          {message.text}
        </Alert>
      )}

      {/* Invite + add */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-500">Your friend code</div>
            <div className="text-3xl font-black tracking-[0.2em] text-white">{myCode}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void share()} aria-label="Share invite">
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="ml-1.5">{copied ? 'Copied' : 'Invite'}</span>
            </Button>
          </div>
        </div>
        <form onSubmit={addByCode} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(normaliseCode(e.target.value))}
            placeholder="Friend's code"
            aria-label="Friend's code"
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 min-w-0 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm font-semibold tracking-widest text-zinc-100 uppercase focus:border-cyan-500 focus:outline-none"
          />
          <Button type="submit" variant="primary" isLoading={busy === 'add'}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Add
          </Button>
        </form>
        <p className="text-sm text-zinc-500">
          Friends see your display name, training totals and badges. Your notes, videos and details stay private.
        </p>
      </div>

      {/* Requests */}
      {incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-white">Friend requests</h2>
          {incoming.map((r) => (
            <div key={r.friendship_id} className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-700/40 bg-cyan-950/20 p-3">
              <span className="font-semibold text-white">{r.display_name}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={busy === `a-${r.friendship_id}`}
                  onClick={() =>
                    call(`a-${r.friendship_id}`, () =>
                      // Safe: only rendered for rows with status 'incoming'/'outgoing', which always have a real friendship_id.
                      createClient().rpc('respond_friend_request', { p_friendship_id: r.friendship_id!, p_accept: true })
                    )
                  }
                >
                  <Check className="h-4 w-4 mr-1" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Decline ${r.display_name}`}
                  isLoading={busy === `d-${r.friendship_id}`}
                  onClick={() =>
                    call(`d-${r.friendship_id}`, () =>
                      createClient().rpc('respond_friend_request', { p_friendship_id: r.friendship_id!, p_accept: false })
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Weekly leaderboard */}
      <section className="space-y-2">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" /> This week
          <span className="text-xs font-normal text-zinc-500">last 7 days</span>
        </h2>
        {friendCount === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-400">
            Add friends with their code, or tap Invite to send yours. Then you&apos;ll compete here every week.
          </p>
        ) : (
          <ol className="space-y-2">
            {ranked.map((r, i) => {
              const pct = r.attempts_7d ? Math.round(((r.makes_7d || 0) / r.attempts_7d) * 100) : null;
              return (
                <li
                  key={r.user_id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${r.is_me ? 'border-orange-600/50 bg-orange-600/10' : 'border-zinc-800 bg-zinc-900/70'}`}
                >
                  <span className={`w-6 text-center text-lg font-black ${i === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">
                      {r.display_name} {r.is_me && <span className="text-xs text-orange-400">(you)</span>}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {(r.sessions_7d || 0) + (r.workouts_7d || 0)} sessions · {r.minutes_7d || 0} min
                      {r.attempts_7d ? ` · ${r.makes_7d}/${r.attempts_7d} (${pct}%)` : ''}
                    </div>
                  </div>
                  {(r.streak || 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-400">
                      <Flame className="h-3.5 w-3.5" /> {r.streak}
                    </span>
                  )}
                  <span className="w-12 text-right text-sm font-black text-cyan-400">{weeklyScore(r)}</span>
                  {!r.is_me && r.friendship_id && (
                    <button
                      type="button"
                      aria-label={`Remove ${r.display_name}`}
                      className="text-zinc-500 hover:text-red-400"
                      onClick={() => {
                        if (window.confirm(`Remove ${r.display_name} from your friends?`)) {
                          void call(`r-${r.friendship_id}`, () => createClient().rpc('remove_friendship', { p_friendship_id: r.friendship_id! }));
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="text-sm text-zinc-500">Points: 20 per session or workout, 1 per 5 minutes, 1 per shot made.</p>
      </section>

      {/* Feed */}
      {feed.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-white">Friend activity</h2>
          <ul className="space-y-2">
            {feed.map((f, i) => {
              const Icon = FEED_ICON[f.kind] || Target;
              return (
                <li key={`${f.user_id}-${f.created_at}-${i}`} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${f.kind === 'badge' || f.kind === 'game' ? 'text-amber-400' : f.kind === 'gym' ? 'text-emerald-400' : 'text-orange-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-200">
                      <span className="font-semibold text-white">{f.user_id === myId ? 'You' : f.display_name}</span> · {f.title}
                    </p>
                    {f.detail && <p className="text-sm text-zinc-400">{f.detail}</p>}
                  </div>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">{timeAgo(f.created_at)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-400">Waiting for them to accept</h2>
          {outgoing.map((r) => (
            <div key={r.friendship_id} className="flex items-center justify-between rounded-xl border border-zinc-800 p-2.5 text-sm text-zinc-300">
              {r.display_name}
              <button
                type="button"
                className="text-xs text-zinc-500 underline"
                onClick={() => void call(`c-${r.friendship_id}`, () => createClient().rpc('remove_friendship', { p_friendship_id: r.friendship_id! }))}
              >
                Cancel
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
