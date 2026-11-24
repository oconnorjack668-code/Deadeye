// src/components/video/DecodeProgress.tsx
// The shot tracker's screen while an uploaded clip is checked frame by frame
// without playing (clipDecoder.ts). Designed in docs/agent-os/design/
// 2026-11-22-loading.md (Tracker decode), approved by the founder 2026-11-23.
//
// The big percent, a real count of the shots found so far, the orange bar, and
// one line at a time from the founder's picks (marketing/2026-11-22-slogans.md).
// The line changes at most three times and then holds (WCAG 2.2.2: nothing
// keeps moving on its own); a tap on the card moves it on. Under reduced
// motion only the percent and the bar move. Nothing here changes the decode.
'use client';

import React, { useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';

/** The lines, in order; the last one is where it holds. Tracker lines say what it is doing, never that it is right. */
export const TRACKER_TIPS: ReadonlyArray<{ text: string; by?: string }> = [
  { text: 'Following the arc' },
  { text: 'Every shot can be corrected before you save.' },
  { text: "Make or miss, it's a rep" },
  { text: '"Be quick, but don\'t hurry."', by: 'John Wooden' },
];
/** How long each line stays before the next, ms. */
export const TIP_MS = 5000;
/** Lines change by themselves this many times, then hold. */
export const TIP_CHANGES = 3;

/** Four red brackets and a scan line over the clip, while it is being checked. */
export function DecodeScan() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="dd-scan absolute inset-0">
        <div className="absolute inset-x-0 bottom-0 h-16 border-b-2 border-red-500 bg-gradient-to-b from-transparent to-red-900/40" />
      </div>
      <span className="absolute left-3 top-3 h-6 w-6 border-l-[3px] border-t-[3px] border-red-500" />
      <span className="absolute right-3 top-3 h-6 w-6 border-r-[3px] border-t-[3px] border-red-500" />
      <span className="absolute bottom-3 left-3 h-6 w-6 border-b-[3px] border-l-[3px] border-red-500" />
      <span className="absolute bottom-3 right-3 h-6 w-6 border-b-[3px] border-r-[3px] border-red-500" />
    </div>
  );
}

export function DecodeProgress({ progress, shotsFound, onStop }: { progress: number; shotsFound: number; onStop: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [tip, setTip] = useState(0);
  const [changes, setChanges] = useState(0);
  const p = Math.min(1, Math.max(0, progress));
  const percent = Math.floor(p * 100);
  // Read aloud every quarter, not on every percent
  const quarter = Math.floor(percent / 25) * 25;

  useEffect(() => {
    if (reduced || changes >= TIP_CHANGES) return;
    const id = setTimeout(() => {
      setTip((t) => Math.min(t + 1, TRACKER_TIPS.length - 1));
      setChanges((n) => n + 1);
    }, TIP_MS);
    return () => clearTimeout(id);
  }, [changes, reduced]);

  /** A tap moves the line on and stops it changing by itself. */
  function nextTip() {
    setTip((t) => (t + 1) % TRACKER_TIPS.length);
    setChanges(TIP_CHANGES);
  }

  const line = TRACKER_TIPS[tip];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <p className="text-5xl font-black tabular-nums text-white" aria-hidden="true">
          {percent}%
        </p>
        <div>
          <p className="font-bold text-white">Checking your clip</p>
          <p className="text-sm text-zinc-400">
            Shots found <span className="font-bold tabular-nums text-white">{shotsFound}</span>
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Checking your clip"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={quarter}
        className="relative h-2 overflow-hidden rounded-full bg-zinc-800"
      >
        <div className="h-full origin-left rounded-full bg-orange-500 transition-transform duration-200 ease-linear" style={{ transform: `scaleX(${p})` }} />
        {/* The sheen runs over the filled part only */}
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} aria-hidden="true">
          <div className="dd-sheen absolute inset-y-0 left-0 w-1/3" />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {quarter > 0 ? `${quarter}% checked, ${shotsFound} ${shotsFound === 1 ? 'shot' : 'shots'} found` : ''}
      </p>
      <button
        type="button"
        onClick={nextTip}
        aria-label={`${line.text}${line.by ? `, ${line.by}` : ''}. Next line`}
        className="flex min-h-24 w-full flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-center"
      >
        <span key={tip} className="dd-tip block text-sm font-bold uppercase tracking-[0.2em] text-red-400">
          {line.text}
        </span>
        {line.by && <span className="mt-1 block text-xs text-zinc-400">{line.by}</span>}
      </button>
      <Button variant="secondary" size="lg" className="w-full gap-2" onClick={onStop}>
        <Square className="h-4 w-4" /> Stop early and review
      </Button>
    </div>
  );
}
