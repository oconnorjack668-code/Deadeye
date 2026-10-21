// src/app/(app)/games/new/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { SavedOfflineCard } from '@/components/SavedOfflineCard';
import { COUNTING_STATS, EMPTY_BOX, GAME_TYPES, clampBox, points, type BoxScore, type CountingStat } from '@/lib/games';
import { enqueue, getUserIdForSave, isOffline, newId, saveGame, type GameSavePayload } from '@/lib/offline';
import { localDateString } from '@/lib/dates';
import { ArrowLeft, Undo2, Pencil } from 'lucide-react';

const DRAFT_KEY = 'hoopiq-game-draft-v1';

interface Draft {
  date: string;
  type: string;
  opponent: string;
  box: BoxScore;
  history: Array<Partial<BoxScore>>;
}

const fresh = (): Draft => ({ date: localDateString(), type: 'league', opponent: '', box: { ...EMPTY_BOX }, history: [] });

// Tap buttons: each adds to one or more stats
const SHOTS: Array<{ label: string; sub: string; add: Partial<BoxScore>; tone: 'make' | 'miss' }> = [
  { label: '+2', sub: '2PT make', add: { fgm2: 1, fga2: 1 }, tone: 'make' },
  { label: '2 ✗', sub: '2PT miss', add: { fga2: 1 }, tone: 'miss' },
  { label: '+3', sub: '3PT make', add: { fgm3: 1, fga3: 1 }, tone: 'make' },
  { label: '3 ✗', sub: '3PT miss', add: { fga3: 1 }, tone: 'miss' },
  { label: '+1', sub: 'FT make', add: { ftm: 1, fta: 1 }, tone: 'make' },
  { label: '1 ✗', sub: 'FT miss', add: { fta: 1 }, tone: 'miss' },
];
const OTHERS: Array<{ label: string; stat: CountingStat }> = [
  { label: 'O-Reb', stat: 'oreb' },
  { label: 'D-Reb', stat: 'dreb' },
  { label: 'Assist', stat: 'ast' },
  { label: 'Steal', stat: 'stl' },
  { label: 'Block', stat: 'blk' },
  { label: 'Turnover', stat: 'tov' },
  { label: 'Foul', stat: 'pf' },
];
const LABELS: Record<CountingStat, string> = {
  fgm2: '2PT made', fga2: '2PT attempts', fgm3: '3PT made', fga3: '3PT attempts', ftm: 'FT made', fta: 'FT attempts',
  oreb: 'Off. rebounds', dreb: 'Def. rebounds', ast: 'Assists', stl: 'Steals', blk: 'Blocks', tov: 'Turnovers', pf: 'Fouls',
};

export default function NewGamePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(fresh);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [teamScore, setTeamScore] = useState('');
  const [oppScore, setOppScore] = useState('');
  const [result, setResult] = useState<'' | 'win' | 'loss' | 'draw'>('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resume a game in progress (after mount: localStorage only exists in the browser)
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Draft;
          if (saved?.box) setDraft({ ...fresh(), ...saved, box: clampBox({ ...EMPTY_BOX, ...saved.box }) });
        }
      } catch {
        // unreadable draft
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // storage full
    }
  }, [draft, ready]);

  // Both scores entered: work out the result
  function setScores(team: string, opp: string) {
    setTeamScore(team);
    setOppScore(opp);
    if (team !== '' && opp !== '') setResult(Number(team) > Number(opp) ? 'win' : Number(team) < Number(opp) ? 'loss' : 'draw');
  }

  function tap(add: Partial<BoxScore>) {
    navigator.vibrate?.(15);
    setDraft((d) => {
      const box = { ...d.box };
      for (const [k, v] of Object.entries(add)) box[k as CountingStat] += v as number;
      return { ...d, box: clampBox(box), history: [...d.history.slice(-199), add] };
    });
  }

  function undo() {
    setDraft((d) => {
      const last = d.history[d.history.length - 1];
      if (!last) return d;
      const box = { ...d.box };
      for (const [k, v] of Object.entries(last)) box[k as CountingStat] = Math.max(0, box[k as CountingStat] - (v as number));
      return { ...d, box: clampBox(box), history: d.history.slice(0, -1) };
    });
  }

  function setStat(stat: CountingStat, value: string) {
    setDraft((d) => ({ ...d, box: { ...d.box, [stat]: Math.max(0, Number(value) || 0) } }));
  }

  async function save() {
    const box = clampBox(draft.box);
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const userId = await getUserIdForSave(supabase);
    if (!userId) {
      setSaving(false);
      if (isOffline()) setError('You are offline and not logged in on this phone. Your game is kept here; save it once you are back online.');
      else router.push('/login');
      return;
    }
    const num = (v: string, max: number) => (v === '' ? null : Math.max(0, Math.min(max, Math.round(Number(v)))));
    const payload: GameSavePayload = {
      id: newId(),
      game: {
        ...box,
        game_date: draft.date,
        game_type: draft.type,
        opponent: draft.opponent.trim().slice(0, 80) || null,
        result: result || null,
        team_score: num(teamScore, 300),
        opponent_score: num(oppScore, 300),
        minutes: num(minutes, 60),
        notes: notes.trim().slice(0, 1000) || null,
      },
    };
    const res = isOffline() ? { network: true, error: 'offline' } : await saveGame(supabase, userId, payload);
    if (res.error && !res.network) {
      setError(`Could not save the game: ${res.error}`);
      setSaving(false);
      return;
    }
    if (res.network) {
      enqueue({
        id: payload.id,
        kind: 'game',
        userId,
        label: `game${draft.opponent ? ` vs ${draft.opponent}` : ''} · ${points(box)} pts`,
        createdAt: Date.now(),
        payload,
      });
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    if (res.network) {
      setSaving(false);
      setSavedOffline(true);
      return;
    }
    router.push(`/games/${payload.id}`);
    router.refresh();
  }

  function discard() {
    if (!window.confirm('Discard this game? The stats you tracked will be lost.')) return;
    setDraft(fresh());
    setFinishOpen(false);
  }

  if (savedOffline) {
    return (
      <SavedOfflineCard
        what="game"
        backHref="/games"
        onAnother={() => {
          setDraft(fresh());
          setTeamScore('');
          setOppScore('');
          setResult('');
          setMinutes('');
          setNotes('');
          setFinishOpen(false);
          setSavedOffline(false);
        }}
      />
    );
  }

  const b = draft.box;
  const pct = (m: number, a: number) => (a ? `${Math.round((m / a) * 100)}%` : '–');

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/games" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> Games
          </Link>
          <button type="button" onClick={discard} className="text-xs text-zinc-500 underline">
            Discard
          </button>
        </div>

        {error && <Alert variant="error" title="Check this">{error}</Alert>}

        {/* Two rows: three across, a phone cut off both the date and the
            opponent placeholder */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            aria-label="Game date"
            className="rounded-xl bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm text-white"
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            aria-label="Game type"
            className="rounded-xl bg-zinc-900 border border-zinc-800 px-2 py-2 text-sm text-white"
          >
            {GAME_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={draft.opponent}
            onChange={(e) => setDraft((d) => ({ ...d, opponent: e.target.value }))}
            placeholder="Opponent name"
            aria-label="Opponent name"
            maxLength={80}
            className="col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
          />
        </div>

        {/* Live stat line */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-5xl font-black text-orange-400 leading-none">{points(b)}</div>
              <div className="text-xs text-zinc-400 mt-1">points</div>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-right text-xs text-zinc-300">
              <span>FG {b.fgm2 + b.fgm3}/{b.fga2 + b.fga3}</span>
              <span>3P {b.fgm3}/{b.fga3}</span>
              <span>FT {b.ftm}/{b.fta}</span>
              <span>REB {b.oreb + b.dreb}</span>
              <span>AST {b.ast}</span>
              <span>STL {b.stl}</span>
              <span>BLK {b.blk}</span>
              <span>TO {b.tov}</span>
              <span>PF {b.pf}</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">FG {pct(b.fgm2 + b.fgm3, b.fga2 + b.fga3)} · 3P {pct(b.fgm3, b.fga3)} · FT {pct(b.ftm, b.fta)}</div>
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            {COUNTING_STATS.map((s) => (
              <label key={s} className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                {LABELS[s]}
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={b[s]}
                  onChange={(e) => setStat(s, e.target.value)}
                  onBlur={() => setDraft((d) => ({ ...d, box: clampBox(d.box) }))}
                  className="w-16 rounded-lg bg-zinc-800 px-2 py-1 text-right text-white"
                />
              </label>
            ))}
            <Button variant="secondary" size="sm" className="col-span-2" onClick={() => setEditing(false)}>
              Back to tap tracking
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {SHOTS.map((s) => (
                <button
                  key={s.sub}
                  type="button"
                  onClick={() => tap(s.add)}
                  className={`rounded-2xl py-4 text-center active:scale-95 transition ${
                    s.tone === 'make' ? 'bg-emerald-600/25 text-emerald-200 border border-emerald-600/40' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  <div className="text-2xl font-black">{s.label}</div>
                  <div className="text-[11px] opacity-80">{s.sub}</div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {OTHERS.map((o) => (
                <button
                  key={o.stat}
                  type="button"
                  onClick={() => tap({ [o.stat]: 1 })}
                  className="rounded-xl bg-zinc-800 py-3 text-xs font-bold text-zinc-100 border border-zinc-700 active:scale-95 transition"
                >
                  {o.label}
                  <div className="text-base font-black text-orange-300">{b[o.stat]}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={undo}
                disabled={draft.history.length === 0}
                className="rounded-xl bg-zinc-900 py-3 text-xs font-bold text-zinc-300 border border-zinc-700 flex flex-col items-center justify-center gap-1 disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" /> Undo
              </button>
            </div>
            <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 underline">
              <Pencil className="h-3 w-3" /> Enter numbers from a box score instead
            </button>
          </>
        )}

        {finishOpen ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
            <h2 className="font-bold text-white">Final details</h2>
            <div className="grid grid-cols-2 gap-2">
              {/* These are scores, not names. Labelled "Your team" and
                  "Opponent" they collided with the opponent NAME field higher
                  up the same form, so players typed a team name into a number
                  input and it silently rejected the letters. */}
              <label className="text-xs text-zinc-400">
                Your score
                <input type="number" inputMode="numeric" min={0} value={teamScore} onChange={(e) => setScores(e.target.value, oppScore)} className="mt-1 w-full rounded-lg bg-zinc-800 px-2 py-2 text-white" />
              </label>
              <label className="text-xs text-zinc-400">
                Opponent score
                <input type="number" inputMode="numeric" min={0} value={oppScore} onChange={(e) => setScores(teamScore, e.target.value)} className="mt-1 w-full rounded-lg bg-zinc-800 px-2 py-2 text-white" />
              </label>
              <label className="text-xs text-zinc-400">
                Result
                <select value={result} onChange={(e) => setResult(e.target.value as typeof result)} className="mt-1 w-full rounded-lg bg-zinc-800 px-2 py-2 text-white">
                  <option value="">—</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="draw">Draw</option>
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Minutes played
                <input type="number" inputMode="numeric" min={0} max={60} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="mt-1 w-full rounded-lg bg-zinc-800 px-2 py-2 text-white" />
              </label>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes: what worked, what to fix (optional)"
              maxLength={1000}
              rows={2}
              className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
            />
            <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={() => void save()}>
              Save game
            </Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" className="w-full" onClick={() => setFinishOpen(true)}>
            Finish game
          </Button>
        )}
      </div>
    </div>
  );
}
