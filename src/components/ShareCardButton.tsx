// src/components/ShareCardButton.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { track } from '@/lib/events';

export type CardSize = 'story' | 'feed';

/** The card's address with the player's choices. The name goes on only with name=1, which nothing sets by default. */
export function cardUrl(path: string, opts: { showName: boolean; size: CardSize }): string {
  const url = new URL(path, 'http://x');
  url.searchParams.delete('name');
  url.searchParams.delete('format');
  if (opts.showName) url.searchParams.set('name', '1');
  if (opts.size === 'feed') url.searchParams.set('format', 'feed');
  return `${url.pathname}${url.search}`;
}

const SIZES: Array<{ id: CardSize; label: string }> = [
  { id: 'story', label: 'Story' },
  { id: 'feed', label: 'Post' },
];

/**
 * "Share" opens a sheet with the card itself, before anything leaves the
 * phone: a "Show my name" switch (off by default; founder, 2026-11-22), the
 * size, then Share (the phone's share sheet) or Save image.
 */
export function ShareCardButton({
  path,
  text,
  label = 'Share',
  variant = 'button',
}: {
  path: string;
  text: string;
  label?: string;
  /** button: the orange action; quiet: a text button under the screen's main actions */
  variant?: 'button' | 'quiet';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [showName, setShowName] = useState(false);
  const [size, setSize] = useState<CardSize>('story');
  const [card, setCard] = useState<{ src: string; blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const want = cardUrl(path, { showName, size });

  // Fetch the card for the current choices while the sheet is open
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(want)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        setCard({ src: URL.createObjectURL(blob), blob, url: want });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, want, attempt]);

  // Free each preview once it is replaced, and the last when the button leaves the page
  useEffect(() => {
    if (!card) return;
    return () => URL.revokeObjectURL(card.src);
  }, [card]);

  const ready = card && card.url === want ? card : null;

  function openSheet() {
    // Every share starts with the name off, even if it was on last time
    setShowName(false);
    setFailed(false);
    setMessage(null);
    setOpen(true);
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Tap outside to close, where supported (not Safari yet); Esc and the back gesture close it everywhere
    dialog.setAttribute('closedby', 'any');
    dialog.showModal();
  }

  function change(next: { showName?: boolean; size?: CardSize }) {
    setFailed(false);
    setMessage(null);
    if (next.showName !== undefined) setShowName(next.showName);
    if (next.size) setSize(next.size);
  }

  function save(blob: Blob) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'deadeye.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  }

  async function share() {
    if (!ready) return;
    setBusy(true);
    setMessage(null);
    try {
      const file = new File([ready.blob], 'deadeye.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        save(ready.blob);
        setMessage('This phone cannot share images from here, so the card was saved instead.');
      }
      track('share_card_shared');
    } catch (err) {
      // Closing the phone's share sheet is not an error
      if (!(err instanceof DOMException && err.name === 'AbortError')) setMessage('Could not share the image. Try Save image.');
    } finally {
      setBusy(false);
    }
  }

  function saveImage() {
    if (!ready) return;
    save(ready.blob);
    track('share_card_shared');
    setMessage('Saved.');
  }

  const loading = !ready && !failed;

  return (
    <>
      {variant === 'quiet' ? (
        <button
          type="button"
          onClick={openSheet}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-800/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" /> {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={openSheet}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" /> {label}
        </button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="share-sheet-title"
        onClose={() => setOpen(false)}
        className="m-0 mt-auto w-full max-w-none overscroll-contain rounded-t-3xl border border-b-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-100 backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-black/70 sm:mx-auto sm:mb-6 sm:max-w-md sm:rounded-3xl sm:border-b"
      >
        {open && (
          <div className="max-h-[90dvh] overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" aria-hidden="true" />
            <div className="flex gap-4">
              <div
                className={`relative flex-shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 ${size === 'feed' ? 'aspect-[4/5]' : 'aspect-[9/16]'} w-28`}
              >
                {ready ? (
                  // A blob URL made here: next/image cannot optimise it
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ready.src} alt={`Preview of your share card, ${showName ? 'with your first name' : 'no name on it'}`} className="h-full w-full object-cover" />
                ) : (
                  <div className={`h-full w-full ${loading ? 'animate-pulse bg-zinc-800' : ''}`} aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <h2 id="share-sheet-title" className="text-lg font-black text-white">
                  Share your result
                </h2>
                <p className="mt-1 text-sm text-zinc-400">We never add your face, school or town. Check the preview for anything you typed, like an opponent&apos;s name.</p>
              </div>
            </div>

            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-white">Show my name</span>
                <span className="block text-xs text-zinc-400">Off until you turn it on. First name only.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={showName}
                onChange={(e) => change({ showName: e.target.checked })}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-7 w-12 flex-shrink-0 rounded-full border border-zinc-500/70 bg-zinc-800 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5.5 after:w-5.5 after:rounded-full after:bg-zinc-300 after:transition-transform peer-checked:border-orange-500 peer-checked:bg-orange-600 peer-checked:after:translate-x-5 peer-checked:after:bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500"
              />
            </label>

            <fieldset className="mt-3">
              <legend className="sr-only">Card size</legend>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-900 p-1">
                {SIZES.map((s) => (
                  <label
                    key={s.id}
                    className={`flex h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-500 ${
                      size === s.id ? 'bg-zinc-700 text-white' : 'text-zinc-400'
                    }`}
                  >
                    <input type="radio" name="share-size" value={s.id} checked={size === s.id} onChange={() => change({ size: s.id })} className="sr-only" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void share()}
                disabled={!ready || busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-base font-semibold text-white hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <Share2 className="h-5 w-5" aria-hidden="true" /> {loading ? 'Making image…' : 'Share'}
              </button>
              <button
                type="button"
                onClick={saveImage}
                disabled={!ready}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zinc-500/70 text-base font-semibold text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <Download className="h-5 w-5" aria-hidden="true" /> Save image
              </button>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Not now
              </button>
            </div>

            <p role="status" className="mt-2 min-h-5 text-center text-sm text-zinc-400">
              {failed ? (
                <span className="text-red-400">
                  Could not make the image.{' '}
                  <button type="button" className="underline" onClick={() => {
                      setFailed(false);
                      setAttempt((n) => n + 1);
                    }}>
                    Try again
                  </button>
                </span>
              ) : (
                message
              )}
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}
