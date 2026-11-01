// src/app/(app)/style-match/StyleMatchClient.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { findMatches, STYLE_TAGS, MIN_SHOTS_FOR_PROFILE, type NbaPlayer, type ShotProfile } from '@/lib/styleMatch';
import type { Database } from '@/lib/supabase/types';
import { formatHeight, type MeasurementSystem } from '@/lib/units';
import { skillLabel } from '@/lib/drills';
import { Sparkles, Lock, Target } from 'lucide-react';

export interface SavedMatch {
  slug: string;
  name: string;
  era: string;
  position: string;
  height_cm: number;
  archetype: string;
  score: number;
  height_diff_cm: number;
  shared_tags: string[];
  strengths: string[];
  signature_moves: string[];
  how_to_copy: string[];
  drill_skills: string[];
}

interface Report {
  headline?: string;
  why_you_match?: string;
  strengths_to_build?: string[];
  moves_to_learn?: Array<{ move: string; from: string; how: string }>;
  weekly_plan?: string[];
  watch_for?: string;
}

export interface SavedResult {
  id: string;
  matches: SavedMatch[];
  report: Report | null;
}

export function StyleMatchClient({
  heightCm,
  position,
  units,
  shotProfile,
  totalShots,
  canUseAi,
  lastResult,
}: {
  heightCm: number | null;
  position: string | null;
  units: MeasurementSystem;
  shotProfile: ShotProfile | null;
  totalShots: number;
  canUseAi: boolean;
  lastResult: SavedResult | null;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<SavedResult | null>(lastResult);
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!lastResult);

  if (!heightCm) {
    return (
      <Alert variant="warning" title="Add your height first">
        Matches are weighted by height. Add yours in{' '}
        <Link href="/onboarding?edit=1" className="underline">
          Profile → Edit player info
        </Link>
        .
      </Alert>
    );
  }

  function toggle(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : t.length >= 5 ? t : [...t, tag]));
  }

  async function runMatch() {
    if (tags.length === 0) {
      setError('Pick at least one thing that describes your game.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: players, error: loadError } = await supabase.from('nba_players').select('*');
    if (loadError || !players?.length) {
      setError('Could not load NBA player profiles.');
      setBusy(false);
      return;
    }
    const input = { heightCm: heightCm!, position, styleTags: tags, shotProfile };
    const top = findMatches(input, players as unknown as NbaPlayer[], 3);
    const matches: SavedMatch[] = top.map((m) => ({
      slug: m.player.slug,
      name: m.player.name,
      era: m.player.era,
      position: m.player.position,
      height_cm: m.player.height_cm,
      archetype: m.player.archetype,
      score: m.score,
      height_diff_cm: m.heightDiffCm,
      shared_tags: m.sharedTags,
      strengths: m.player.strengths,
      signature_moves: m.player.signature_moves,
      how_to_copy: m.player.how_to_copy,
      drill_skills: m.player.drill_skills,
    }));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Please log in again.');
      setBusy(false);
      return;
    }
    const styleTagLabels = tags.map((t) => STYLE_TAGS.find((s) => s.id === t)?.label || t);
    const { data: saved, error: saveError } = await supabase
      .from('style_match_results')
      .insert({
        user_id: user.id,
        source: 'profile',
        input: { ...input, styleTagLabels } as unknown as Database['public']['Tables']['style_match_results']['Insert']['input'],
        matches: matches as unknown as Database['public']['Tables']['style_match_results']['Insert']['matches'],
      })
      .select('id, matches, report')
      .single();
    setBusy(false);
    if (saveError || !saved) {
      setError(`Could not save your match: ${saveError?.message || 'unknown error'}`);
      return;
    }
    setResult(saved as unknown as SavedResult);
    setEditing(false);
  }

  async function getReport() {
    if (!result) return;
    setReportBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/style-match/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: result.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; report?: Report };
      if (!res.ok || !data.report) {
        setError(data.error || 'Could not create the report.');
        return;
      }
      setResult({ ...result, report: data.report });
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}

      {editing ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="font-bold text-white">What describes your game? (up to 5)</h2>
          <p className="text-sm text-zinc-500 mt-1 mb-3">
            Height: {formatHeight(heightCm, units)} ·{' '}
            {shotProfile
              ? `shot locations from ${totalShots} logged shots included`
              : `log ${Math.max(0, MIN_SHOTS_FOR_PROFILE - totalShots)} more shots to include where you shoot from`}
          </p>
          <div className="flex flex-wrap gap-2">
            {STYLE_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                aria-pressed={tags.includes(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold text-left ${tags.includes(t.id) ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="primary" size="lg" className="mt-4 w-full" isLoading={busy} onClick={runMatch}>
            Find my NBA matches
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-cyan-400 underline">
          Retake the style questions
        </button>
      )}

      {result && !editing && (
        <>
          <div className="space-y-4">
            {result.matches.map((m, i) => (
              <div key={m.slug} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-cyan-400">Match #{i + 1}</div>
                    <div className="text-xl font-black text-white">{m.name}</div>
                    <div className="text-xs text-zinc-500">
                      {m.position} · {formatHeight(m.height_cm, units)} · {m.archetype} · {m.era === 'legend' ? 'Legend' : 'Modern era'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-cyan-400">{m.score}%</div>
                    <div className="text-xs text-zinc-500">
                      {m.height_diff_cm === 0
                        ? 'same height'
                        : `${Math.abs(m.height_diff_cm)} cm ${m.height_diff_cm > 0 ? 'taller than him' : 'shorter than him'}`}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">Strengths</div>
                    <ul className="space-y-0.5 text-zinc-300">{m.strengths.map((s) => <li key={s}>• {s}</li>)}</ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">Signature moves</div>
                    <ul className="space-y-0.5 text-zinc-300">{m.signature_moves.map((s) => <li key={s}>• {s}</li>)}</ul>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">How to copy his game</div>
                  <ul className="space-y-0.5 text-zinc-300">{m.how_to_copy.map((s) => <li key={s}>• {s}</li>)}</ul>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.drill_skills.map((skill) => (
                    <Link key={skill} href={`/drills?skill=${skill}`} className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                      <Target className="h-3 w-3 text-orange-400" /> {skillLabel(skill)} drills
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-red-600/40 bg-red-600/10 p-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-red-400" /> AI development plan
            </h2>
            {result.report ? (
              <div className="mt-3 space-y-3 text-sm text-zinc-200">
                {result.report.headline && <p className="font-semibold text-white">{result.report.headline}</p>}
                {result.report.why_you_match && <p>{result.report.why_you_match}</p>}
                {result.report.strengths_to_build?.length ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-zinc-400 mb-1">Strengths to build</div>
                    <ul className="space-y-0.5">{result.report.strengths_to_build.map((s) => <li key={s}>• {s}</li>)}</ul>
                  </div>
                ) : null}
                {result.report.moves_to_learn?.length ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-zinc-400 mb-1">Moves to learn</div>
                    <ul className="space-y-1">
                      {result.report.moves_to_learn.map((mv) => (
                        <li key={mv.move}>
                          • <span className="font-semibold">{mv.move}</span> <span className="text-zinc-400">({mv.from})</span>: {mv.how}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.report.weekly_plan?.length ? (
                  <div>
                    <div className="text-xs font-semibold uppercase text-zinc-400 mb-1">Next 4 weeks</div>
                    <ul className="space-y-0.5">{result.report.weekly_plan.map((s) => <li key={s}>• {s}</li>)}</ul>
                  </div>
                ) : null}
                {result.report.watch_for && <p className="text-zinc-400">Film study: {result.report.watch_for}</p>}
              </div>
            ) : canUseAi ? (
              <>
                <p className="text-sm text-zinc-300 mt-1">Get a personal plan built from your matches: moves to learn, strengths to build and a 4-week focus.</p>
                <Button variant="primary" className="mt-3" isLoading={reportBusy} onClick={getReport}>
                  Create my plan
                </Button>
              </>
            ) : (
              <p className="text-sm text-zinc-300 mt-1 flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 text-zinc-400 flex-shrink-0" />
                <span>The AI development plan is part of <Link href="/pro" className="underline">Deadeye Pro</Link>. Your matches above are free.</span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
