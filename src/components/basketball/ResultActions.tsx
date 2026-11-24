// src/components/basketball/ResultActions.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { track } from '@/lib/events';

/**
 * The two next steps on the first-session result, the same size (founder,
 * 2026-11-22): one orange "Go again", one outline "Done for today". Records
 * that the result was seen, and a tap on Go again, for D2's signal.
 */
export function ResultActions() {
  useEffect(() => {
    track('first_result_seen');
  }, []);

  return (
    <div className="space-y-3">
      <Link
        href="/basketball/new"
        onClick={() => track('first_result_go_again')}
        className="flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-orange-600 text-base font-semibold text-white shadow-md shadow-orange-950/20 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <RotateCcw className="h-5 w-5" aria-hidden="true" /> Go again
      </Link>
      <Link
        href="/dashboard"
        className="flex h-13 w-full items-center justify-center rounded-xl border border-zinc-500/70 text-base font-semibold text-zinc-100 hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        Done for today
      </Link>
    </div>
  );
}
