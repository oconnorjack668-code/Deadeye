// src/components/basketball/FirstLogGuide.tsx
// Step-by-step tips the first time a player logs shots, shown only while they
// have no session saved. One line at a time, following what they have done so
// far, rather than a tour of every button they would skip.
import React from 'react';
import { Lightbulb, X } from 'lucide-react';

export type LogGuideStep = 1 | 2 | 3;

export function logGuideStep(hasSpot: boolean, shotsLogged: number): LogGuideStep {
  if (!hasSpot) return 1;
  return shotsLogged === 0 ? 2 : 3;
}

function tip(step: LogGuideStep, mode: 'track' | 'totals'): string {
  if (step === 1) return 'Tap the court where you are shooting from.';
  if (step === 2) {
    return mode === 'track'
      ? 'Shoot, then tap MAKE or MISS after every shot. Undo fixes a wrong tap.'
      : 'Pick how many shots you take from this spot, shoot them, then tap how many went in.';
  }
  return 'Nice. Tap a new spot on the court and keep going, or tap Finish at the top to save. Your shot chart starts with this session.';
}

export function FirstLogGuide({ step, mode, onHide }: { step: LogGuideStep; mode: 'track' | 'totals'; onHide: () => void }) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2.5" aria-live="polite">
      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-300">Step {step} of 3</p>
        <p className="text-sm font-semibold text-white">{tip(step, mode)}</p>
      </div>
      <button type="button" onClick={onHide} aria-label="Hide these tips" className="flex-shrink-0 p-1 text-orange-300/60 hover:text-orange-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
