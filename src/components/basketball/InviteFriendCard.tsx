// src/components/basketball/InviteFriendCard.tsx
// "Train with a friend", straight after a session is saved: when a player is
// proudest of what they did, and most likely to send it. Shown while they have
// no friends on Deadeye yet (AfterSession).
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Share2, Users } from 'lucide-react';

export function InviteFriendCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/friends/add/${code}`;
    const text = `I just logged a session on Deadeye. Add me and let's see who shoots better this week! My friend code is ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Deadeye', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}: ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet closed
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-600/40 bg-gradient-to-br from-cyan-600/15 to-transparent p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-600/20">
          <Users className="h-5 w-5 text-cyan-300" />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-white">Train with a friend</p>
          <p className="mt-0.5 text-sm text-zinc-300">
            It&apos;s easier to keep going with someone to beat. See each other&apos;s week and race on the friends leaderboard.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          <Share2 className="h-4 w-4" /> {copied ? 'Link copied' : 'Invite a friend'}
        </button>
        <Link href="/friends" className="text-sm font-semibold text-zinc-400 hover:text-zinc-200">
          Or add one by code
        </Link>
      </div>
    </div>
  );
}
