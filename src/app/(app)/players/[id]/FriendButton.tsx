// src/app/(app)/players/[id]/FriendButton.tsx
// Add a friend from their player card (send_friend_request_to, 00046), or
// answer a request they already sent. Unfriending stays on the Friends page.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Clock, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { REQUEST_MESSAGES, type RequestResult } from '@/lib/friends';

export type FriendState =
  | { kind: 'none' }
  | { kind: 'friends' }
  | { kind: 'outgoing'; friendshipId: string }
  | { kind: 'incoming'; friendshipId: string };

const primary =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-60';
const quiet =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 px-5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60';

export function FriendButton({ userId, initial }: { userId: string; initial: FriendState }) {
  const router = useRouter();
  const [state, setState] = useState<FriendState>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, next: FriendState) {
    setBusy(true);
    setMessage(null);
    const { error } = await action();
    setBusy(false);
    if (error) {
      setMessage('That did not work. Try again in a moment.');
      return;
    }
    setState(next);
    // The card shows more (streak, photo) to friends
    if (next.kind === 'friends') router.refresh();
  }

  async function add() {
    setBusy(true);
    setMessage(null);
    const { data, error } = await createClient().rpc('send_friend_request_to', { p_user: userId });
    setBusy(false);
    if (error) {
      setMessage('That did not work. Try again in a moment.');
      return;
    }
    const result = data as RequestResult;
    if (result === 'sent') {
      // Shown at once; the refresh brings the new request's id (for Cancel)
      // and the page remounts this with it
      setState({ kind: 'outgoing', friendshipId: '' });
      router.refresh();
    } else if (result === 'accepted') {
      setState({ kind: 'friends' });
      router.refresh();
    } else {
      setMessage(REQUEST_MESSAGES[result] ?? 'Done.');
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap justify-center gap-2">
        {state.kind === 'none' && (
          <button type="button" className={primary} disabled={busy} onClick={add}>
            <UserPlus className="h-4 w-4" /> Add friend
          </button>
        )}
        {state.kind === 'outgoing' && (
          <>
            <span className={`${quiet} cursor-default hover:bg-transparent`}>
              <Clock className="h-4 w-4" /> Requested
            </span>
            {state.friendshipId && (
              <button
                type="button"
                className="text-sm font-semibold text-zinc-400 underline hover:text-zinc-200"
                disabled={busy}
                onClick={() =>
                  run(() => createClient().rpc('remove_friendship', { p_friendship_id: state.friendshipId }), { kind: 'none' })
                }
              >
                Cancel
              </button>
            )}
          </>
        )}
        {state.kind === 'incoming' && (
          <>
            <button
              type="button"
              className={primary}
              disabled={busy}
              onClick={() =>
                run(() => createClient().rpc('respond_friend_request', { p_friendship_id: state.friendshipId, p_accept: true }), {
                  kind: 'friends',
                })
              }
            >
              <Check className="h-4 w-4" /> Accept request
            </button>
            <button
              type="button"
              className={quiet}
              disabled={busy}
              onClick={() =>
                run(() => createClient().rpc('respond_friend_request', { p_friendship_id: state.friendshipId, p_accept: false }), {
                  kind: 'none',
                })
              }
            >
              Decline
            </button>
          </>
        )}
        {state.kind === 'friends' && (
          <Link href="/friends" className={quiet}>
            <Check className="h-4 w-4 text-emerald-400" /> Friends
          </Link>
        )}
      </div>
      {message && <p className="text-center text-xs text-zinc-400">{message}</p>}
    </div>
  );
}
