// src/components/StarterSteps.tsx
// The four starting steps on the dashboard, with a one-off XP bonus for
// finishing them. See src/lib/starter.ts for why these four.
'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  INSTALLED_KEY,
  SAMPLE_TRIED_KEY,
  STARTER_BONUS_XP,
  STARTER_HIDDEN_KEY,
  STARTER_STEPS,
  readFlag,
  runningInstalled,
  writeFlag,
  type StarterStepId,
} from '@/lib/starter';

const noSubscribe = () => () => {};

/**
 * What this device knows, as one string so the snapshot is a stable primitive:
 * installed, sample watched, hidden. Null on the server, which has no storage,
 * so the card renders after hydration rather than flashing the wrong ticks.
 */
function deviceSnapshot(): string {
  const installed = runningInstalled() || readFlag(INSTALLED_KEY);
  return [installed, readFlag(SAMPLE_TRIED_KEY), readFlag(STARTER_HIDDEN_KEY)].map((b) => (b ? '1' : '0')).join('');
}

export function StarterSteps({ iqDone, shotsDone }: { iqDone: boolean; shotsDone: boolean }) {
  const router = useRouter();
  const device = useSyncExternalStore(noSubscribe, deviceSnapshot, () => null);
  const [hidden, setHidden] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opened from the home screen once is enough to count, from then on, in the
  // browser on this phone too
  useEffect(() => {
    if (runningInstalled()) writeFlag(INSTALLED_KEY);
  }, []);

  if (!device || hidden || device[2] === '1') return null;

  const done: Record<StarterStepId, boolean> = {
    install: device[0] === '1',
    sample: device[1] === '1',
    iq: iqDone,
    shots: shotsDone,
  };
  const count = STARTER_STEPS.filter((s) => done[s.id]).length;
  const allDone = count === STARTER_STEPS.length;

  function hide() {
    writeFlag(STARTER_HIDDEN_KEY);
    setHidden(true);
  }

  async function claim() {
    setClaiming(true);
    setError(null);
    const res = await fetch('/api/starter-bonus', { method: 'POST' }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!res?.ok) {
      setError(data?.error || 'Could not claim your bonus. Check your connection and try again.');
      setClaiming(false);
      return;
    }
    setClaimed(true);
    setClaiming(false);
    // The XP lands in the level on the next render of the dashboard, and the
    // level-up banner there celebrates it if it was enough for a new level
    setTimeout(() => router.refresh(), 2200);
  }

  if (claimed) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-transparent p-5 text-center">
        <div className="deadeye-pop text-4xl font-black text-amber-300">+{STARTER_BONUS_XP} XP</div>
        <p className="mt-1 text-sm font-semibold text-white">Starting steps done. You&apos;re all set up.</p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Starting steps · {count} of 4</p>
          <p className="mt-0.5 text-sm text-zinc-300">
            Finish all four for a <span className="font-bold text-amber-300">+{STARTER_BONUS_XP} XP</span> bonus.
          </p>
        </div>
        <button type="button" onClick={hide} aria-label="Hide the starting steps" className="flex-shrink-0 p-1 text-zinc-600 hover:text-zinc-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(count / 4) * 100}%` }} />
      </div>

      <ol className="mt-3 space-y-1.5">
        {STARTER_STEPS.map((step) =>
          done[step.id] ? (
            <li key={step.id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-zinc-500">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600">
                <Check className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="line-through decoration-zinc-600">{step.title}</span>
            </li>
          ) : (
            <li key={step.id}>
              <Link href={step.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-800/60">
                <span className="h-6 w-6 flex-shrink-0 rounded-full border-2 border-zinc-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{step.title}</span>
                  <span className="block text-xs text-zinc-500">{step.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
              </Link>
            </li>
          )
        )}
      </ol>

      {allDone && (
        <Button variant="primary" size="lg" className="mt-3 w-full gap-2" isLoading={claiming} onClick={claim}>
          <Gift className="h-5 w-5" /> Claim +{STARTER_BONUS_XP} XP
        </Button>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
