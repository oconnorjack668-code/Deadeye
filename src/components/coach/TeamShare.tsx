// src/components/coach/TeamShare.tsx
'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Share2 } from 'lucide-react';
import { parentMessage, playerInviteMessage, teamJoinPath } from '@/lib/coachSide';

/**
 * Everything a coach needs to get the team in: the code to read out, a QR
 * code to hold up at training, the join link to send players, and a message
 * for parents. Used at the end of coach setup and from the team page.
 */
const noSubscribe = () => () => {};

export function TeamShare({ teamName, code, coachName }: { teamName: string; code: string; coachName: string }) {
  // The origin and the share sheet are only known in the browser (empty on the server)
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => '');
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === 'function', () => false);
  const link = origin ? `${origin}${teamJoinPath(code)}` : '';
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'parents' | null>(null);

  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: '#09090b', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link]);

  async function copy(what: 'link' | 'parents') {
    const text = what === 'link' ? link : parentMessage({ name: teamName }, code, link, coachName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked (some in-app browsers): the code and link are on screen to copy by hand
    }
  }

  async function sharePlayers() {
    try {
      await navigator.share({ title: `Join ${teamName} on Deadeye`, text: playerInviteMessage({ name: teamName }, code, link) });
    } catch {
      // Closed the share sheet
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-center space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Team code</p>
        <p className="font-mono text-4xl font-black tracking-[0.3em] text-white">{code}</p>
        {qr && (
          // A data URL drawn in the browser; next/image adds nothing here
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR code to join ${teamName}`} width={200} height={200} className="mx-auto rounded-xl bg-white p-2" />
        )}
        <p className="text-xs text-zinc-500">Players scan this at training, or type the code in Teams.</p>
        {link && <p className="break-all text-xs text-zinc-400">{link}</p>}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {canShare ? (
          <button
            type="button"
            onClick={() => void sharePlayers()}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500"
          >
            <Share2 className="h-4 w-4" /> Send to players
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void copy('link')}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-500"
          >
            {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied === 'link' ? 'Link copied' : 'Copy join link'}
          </button>
        )}
        <button
          type="button"
          onClick={() => void copy('parents')}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-100 hover:bg-zinc-800"
        >
          {copied === 'parents' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{' '}
          {copied === 'parents' ? 'Message copied' : 'Copy a message for parents'}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        The parents&apos; message says what you can see (weekly totals, and details only if a player shares them) and that you post to the
        whole team, never privately.
      </p>
    </div>
  );
}
