// src/app/error.tsx
'use client'; // Error boundaries must be Client Components

import React, { useEffect } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/reportError';
import { ReportProblem } from '@/components/ReportProblem';

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError('boundary', error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
        <div className="text-4xl mb-3">🏀</div>
        <h1 className="text-xl font-black text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-400">
          That one rimmed out. The problem has been reported automatically. Try again, or head back to your dashboard.
        </p>
        {error.digest && <p className="mt-2 text-[11px] text-zinc-600">Error code: {error.digest}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => retry()}
            className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-500"
          >
            Try again
          </button>
          <Link href="/dashboard" className="text-sm text-zinc-400 underline">
            Go to dashboard
          </Link>
        </div>
        {/* The crash report says where it broke; only the player can say what
            they were doing when it did */}
        <ReportProblem
          label="Tell us what you were doing"
          context={`After a crash${error.digest ? ` (error code ${error.digest})` : ''}: ${error.message}`}
          className="mt-4 text-xs text-zinc-500 underline"
          panelClassName="mt-4 border-t border-zinc-800 pt-4"
        />
      </div>
    </div>
  );
}
