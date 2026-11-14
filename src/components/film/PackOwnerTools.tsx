// src/components/film/PackOwnerTools.tsx
// On a coach's own pack: take a clip out, or delete the whole pack. The
// database only lets the pack's owner do either.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { deletePack, removeClipFromPack } from '@/app/(app)/film/actions';

export function RemoveClipButton({ packId, clipId, title }: { packId: string; clipId: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await removeClipFromPack(packId, clipId);
          setBusy(false);
          if (!res.ok) return setError(res.error);
          router.refresh();
        }}
        aria-label={`Take ${title} out of the pack`}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-400">
          {error}
        </span>
      )}
    </>
  );
}

export function DeletePackButton({ packId }: { packId: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const style = 'inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold disabled:opacity-40';
  return (
    <div className="space-y-2">
      {sure ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await deletePack(packId);
              setBusy(false);
              if (!res.ok) return setError(res.error);
              router.push('/coach/playbook');
            }}
            className={`${style} border-red-500/50 text-red-300 hover:bg-red-500/10`}
          >
            <Trash2 className="h-4 w-4" /> Yes, delete the pack
          </button>
          <button type="button" onClick={() => setSure(false)} className={`${style} border-zinc-700 text-zinc-200 hover:bg-zinc-800`}>
            Keep it
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setSure(true)} className={`${style} border-zinc-800 text-zinc-300 hover:bg-zinc-800`}>
          <Trash2 className="h-4 w-4" /> Delete pack
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
