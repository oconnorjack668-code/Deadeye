// src/components/video/VideoAIFeedback.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ShotMechanics } from '@/lib/video/mechanics';
import { Sparkles, Lightbulb, CheckCircle2 } from 'lucide-react';
import { FREE_MONTHLY_AI_REPORTS } from '@/lib/entitlements';

export interface ShootingSummary {
  makes: number;
  attempts: number;
  zone: string;
  minutes: number;
}

type Choice = 'shooting' | 'mechanics' | 'both';

export function VideoAIFeedback({ shooting, mechanics }: { shooting: ShootingSummary | null; mechanics: ShotMechanics | null }) {
  const options: Array<{ id: Choice; label: string; enabled: boolean }> = [
    { id: 'shooting', label: 'My shooting data (makes, misses, %)', enabled: !!shooting },
    { id: 'mechanics', label: 'My shot mechanics (angles, timing, jump)', enabled: !!mechanics },
    { id: 'both', label: 'Both', enabled: !!shooting && !!mechanics },
  ];
  const firstEnabled = options.find((o) => o.enabled)?.id || 'shooting';
  const [choice, setChoice] = useState<Choice>(firstEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ summary: string; keyInsights: string[]; recommendations: string[] } | null>(null);

  if (!shooting && !mechanics) return null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/video/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: choice,
          shooting: choice !== 'mechanics' ? shooting : undefined,
          mechanics: choice !== 'shooting' ? mechanics : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; report?: typeof report };
      if (!res.ok || !data.report) {
        setError(data.error || 'Could not get feedback.');
        return;
      }
      setReport(data.report);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-4 space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-red-400" /> AI feedback
      </h3>
      {!report ? (
        <>
          <p className="text-sm text-zinc-300">What should the AI look at? Only these numbers are sent, never your video.</p>
          <div className="space-y-1.5">
            {options.map((o) => (
              <label key={o.id} className={`flex items-center gap-2 text-sm ${o.enabled ? 'text-zinc-200' : 'text-zinc-600'}`}>
                <input type="radio" name="video-ai-data" disabled={!o.enabled} checked={choice === o.id} onChange={() => setChoice(o.id)} className="accent-red-500" />
                {o.label}
              </label>
            ))}
          </div>
          <Button variant="primary" isLoading={busy} onClick={run}>
            Get AI feedback
          </Button>
          <p className="text-xs text-zinc-500">
            On Free this uses one of your {FREE_MONTHLY_AI_REPORTS} AI reports for the month. Unlimited with Pro.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </>
      ) : (
        <div className="space-y-3 text-sm text-zinc-200">
          <p className="font-semibold text-white">{report.summary}</p>
          {report.keyInsights.length > 0 && (
            <ul className="space-y-1">
              {report.keyInsights.map((k) => (
                <li key={k} className="flex gap-2"><Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />{k}</li>
              ))}
            </ul>
          )}
          {report.recommendations.length > 0 && (
            <ul className="space-y-1">
              {report.recommendations.map((r) => (
                <li key={r} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />{r}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-zinc-500">Saved to your AI Coach reports.</p>
        </div>
      )}
    </div>
  );
}
