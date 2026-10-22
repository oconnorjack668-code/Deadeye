// src/app/(app)/video/VideoHub.tsx
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FilmTagger } from '@/components/video/FilmTagger';
import { ClipUploader } from '@/components/video/ClipUploader';
import { VideoAIFeedback, type ShootingSummary } from '@/components/video/VideoAIFeedback';
import type { ShotMechanics } from '@/lib/video/mechanics';
import type { MeasurementSystem } from '@/lib/units';

// MediaPipe is browser-only (WebAssembly, WebGL), so these load on the client only
const Loading = () => <p className="text-sm text-zinc-500">Loading…</p>;
const ShotTracker = dynamic(() => import('@/components/video/ShotTracker').then((m) => m.ShotTracker), { ssr: false, loading: Loading });
const FormCheck = dynamic(() => import('@/components/video/FormCheck').then((m) => m.FormCheck), { ssr: false, loading: Loading });
const JumpTest = dynamic(() => import('@/components/video/JumpTest').then((m) => m.JumpTest), { ssr: false, loading: Loading });

export type Tab = 'shots' | 'form' | 'jump' | 'film' | 'clips';

// Each tab carries a one-word label for phones: five two-word labels in a
// five-column grid gives each cell about 68px at 360px wide, so they wrapped
// onto two lines and the tap target shrank below the ~44px guideline.
const TABS: Array<{ id: Tab; label: string; short: string }> = [
  { id: 'shots', label: 'Shot tracker', short: 'Shots' },
  { id: 'form', label: 'Form check', short: 'Form' },
  { id: 'jump', label: 'Jump test', short: 'Jump' },
  { id: 'film', label: 'Game film', short: 'Film' },
  { id: 'clips', label: 'Saved clips', short: 'Clips' },
];

export function VideoHub({
  heightCm,
  position,
  hand,
  units,
  initialTab = 'shots',
}: {
  heightCm: number | null;
  position: string | null;
  hand: 'right' | 'left';
  units: MeasurementSystem;
  /** From ?tab=, so search can open Form check or the jump test directly */
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formShotMs, setFormShotMs] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [shooting, setShooting] = useState<ShootingSummary | null>(null);
  const [mechanics, setMechanics] = useState<ShotMechanics | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            className={`min-h-11 rounded-lg px-1 py-2 text-xs font-semibold whitespace-nowrap ${
              tab === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-500'
            }`}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tabs stay mounted so switching doesn't lose a session in progress */}
      <div className={tab === 'shots' ? '' : 'hidden'}>
        <ShotTracker
          onSummary={setShooting}
          onCheckForm={(file, shotMs) => {
            setFormFile(file);
            setFormShotMs(shotMs);
            setFormKey((k) => k + 1);
            setTab('form');
          }}
        />
      </div>
      <div className={tab === 'form' ? '' : 'hidden'}>
        <FormCheck key={formKey} initialFile={formFile} shotTimeMs={formShotMs} heightCm={heightCm} hand={hand} onResult={setMechanics} />
      </div>
      <div className={tab === 'jump' ? '' : 'hidden'}>
        <JumpTest units={units} />
      </div>
      <div className={tab === 'film' ? '' : 'hidden'}>
        <FilmTagger heightCm={heightCm} position={position} />
      </div>
      <div className={tab === 'clips' ? '' : 'hidden'}>
        <ClipUploader />
      </div>

      {(tab === 'shots' || tab === 'form') && <VideoAIFeedback key={`${!!shooting}-${!!mechanics}`} shooting={shooting} mechanics={mechanics} />}
    </div>
  );
}
