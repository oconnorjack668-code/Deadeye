// src/components/video/FilmTagger.tsx
'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FILM_TAGS, STYLE_TAGS, findMatches, styleFromFilm, MIN_FILM_SHOTS, type NbaPlayer } from '@/lib/styleMatch';
import { boxScoreFromFilm, statEventCount, tagCountsToBoxScore, type FilmEvent } from '@/lib/filmStats';
import { GAME_TYPES, points, statLine } from '@/lib/games';
import { localDateString } from '@/lib/dates';
import { enqueue, getUserIdForSave, isOffline, newId, saveGame, type GameSavePayload } from '@/lib/offline';
import type { Database } from '@/lib/supabase/types';
import { FileVideo, Undo2, Users, X, Rewind, FastForward, StepForward, ClipboardList } from 'lucide-react';

const SPEEDS = [0.25, 0.5, 1] as const;
/** One frame at 30fps - enough to land on the exact moment a shot drops. */
const FRAME = 1 / 30;

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function FilmTagger({ heightCm, position }: { heightCm: number | null; position: string | null }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [format, setFormat] = useState('1v1');
  const [events, setEvents] = useState<FilmEvent[]>([]);
  const [speed, setSpeed] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [savingGame, setSavingGame] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMatch, setSavedMatch] = useState<string[] | null>(null);

  // Game details, only needed when saving the tagged film as a game
  // Lazy initializer: todayString() reads the clock, so calling it inline would
  // be an impure call during render (and would re-run on every render).
  const [gameDate, setGameDate] = useState(localDateString);
  const [gameType, setGameType] = useState<string>('pickup');
  const [opponent, setOpponent] = useState('');

  function pick(file: File) {
    setHasVideo(true);
    setEvents([]);
    setSavedMatch(null);
    requestAnimationFrame(() => {
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(file);
    });
  }

  function tag(type: string) {
    setEvents((e) =>
      [...e, { t: Math.round((videoRef.current?.currentTime || 0) * 10) / 10, type }].sort((a, b) => a.t - b.t)
    );
    navigator.vibrate?.(15);
  }

  function removeEvent(index: number) {
    setEvents((e) => e.filter((_, i) => i !== index));
  }

  function seek(seconds: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + seconds));
  }

  function stepFrame() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.min(v.duration || Infinity, v.currentTime + FRAME);
  }

  function applySpeed(rate: number) {
    setSpeed(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }

  // Derived from the tag list only, so they are memoised rather than rebuilt on
  // every keystroke in the opponent field.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.type, (m.get(e.type) || 0) + 1);
    return m;
  }, [events]);
  const film = useMemo(() => styleFromFilm(events), [events]);
  const box = useMemo(() => boxScoreFromFilm(events), [events]);
  const statEvents = useMemo(() => statEventCount(events), [events]);

  async function saveAsGame() {
    if (statEvents === 0) {
      setError('Tag at least one shot, rebound or assist before saving a game.');
      return;
    }
    setSavingGame(true);
    setError(null);
    const supabase = createClient();
    const userId = await getUserIdForSave(supabase);
    if (!userId) {
      setSavingGame(false);
      if (isOffline()) setError('You are offline and not logged in on this phone. Tag again once you are back online.');
      else router.push('/login');
      return;
    }
    const payload: GameSavePayload = {
      id: newId(),
      game: {
        ...box,
        game_date: gameDate,
        game_type: gameType,
        opponent: opponent.trim().slice(0, 80) || null,
        result: null,
        team_score: null,
        opponent_score: null,
        minutes: null,
        notes: `Tagged from game film (${format}).`,
      },
    };
    const res = isOffline() ? { network: true, error: 'offline' } : await saveGame(supabase, userId, payload);
    if (res.error && !res.network) {
      setError(`Could not save the game: ${res.error}`);
      setSavingGame(false);
      return;
    }
    if (res.network) {
      enqueue({
        id: payload.id,
        kind: 'game',
        userId,
        label: `game from film${opponent ? ` vs ${opponent}` : ''} · ${points(box)} pts`,
        createdAt: Date.now(),
        payload,
      });
      setSavingGame(false);
      setError('Saved on this phone. It will sync to your stats once you are back online.');
      return;
    }
    router.push(`/games/${payload.id}`);
    router.refresh();
  }

  async function matchFromFilm() {
    if (!heightCm) {
      setError('Add your height in Profile → Edit player info first.');
      return;
    }
    if (film.styleTags.length === 0 && !film.shotProfile) {
      setError(`Tag more plays first (at least 2 of a kind, or ${MIN_FILM_SHOTS} shots).`);
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const [{ data: players }, { data: auth }] = await Promise.all([supabase.from('nba_players').select('*'), supabase.auth.getUser()]);
    if (!players?.length || !auth?.user) {
      setError('Could not load NBA player profiles.');
      setBusy(false);
      return;
    }
    const input = { heightCm, position, styleTags: film.styleTags, shotProfile: film.shotProfile };
    const top = findMatches(input, players as unknown as NbaPlayer[], 3);
    const matches = top.map((m) => ({
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
    const styleTagLabels = film.styleTags.map((t) => STYLE_TAGS.find((s) => s.id === t)?.label || t);
    const summary = Object.fromEntries(counts);
    const [{ error: saveError }] = await Promise.all([
      supabase.from('style_match_results').insert({
        user_id: auth.user.id,
        source: 'video',
        input: { ...input, styleTagLabels, film: { format, events: summary } } as unknown as Database['public']['Tables']['style_match_results']['Insert']['input'],
        matches: matches as unknown as Database['public']['Tables']['style_match_results']['Insert']['matches'],
      }),
      supabase.from('video_analyses').insert({ user_id: auth.user.id, kind: 'game_film', summary: { format, events: summary } }),
    ]);
    setBusy(false);
    if (saveError) {
      setError(`Could not save your match: ${saveError.message}`);
      return;
    }
    setSavedMatch(matches.map((m) => `${m.name} (${m.score}%)`));
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}
      <p className="text-sm text-zinc-300">
        Play back your game and tap a button each time you make a play. Deadeye turns the tags into a real box score you
        can save to your stats, and into a style profile that finds the NBA players you play most like.
      </p>

      {!hasVideo ? (
        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
          <FileVideo className="h-6 w-6 text-cyan-400" />
          <div>
            <div className="font-semibold text-white">Choose your game video</div>
            <div className="text-xs text-zinc-500">1v1, 2v2, 3v3 or 5v5. Stays on your phone. Only film people who agreed to it.</div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
      ) : (
        <>
          <video ref={videoRef} controls playsInline className="w-full rounded-2xl bg-black" />

          {/* Playback controls. Tagging live at full speed means missing plays;
              half speed and a frame step make the call easy to get right. */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seek(-5)}
              aria-label="Back 5 seconds"
              className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
            >
              <Rewind className="h-4 w-4" /> 5s
            </button>
            <button
              type="button"
              onClick={() => seek(5)}
              aria-label="Forward 5 seconds"
              className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
            >
              <FastForward className="h-4 w-4" /> 5s
            </button>
            <button
              type="button"
              onClick={stepFrame}
              aria-label="Step one frame forward"
              className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200 active:bg-zinc-700"
            >
              <StepForward className="h-4 w-4" /> Frame
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySpeed(s)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${speed === s ? 'bg-cyan-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}
              >
                {s}×
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {['1v1', '2v2', '3v3', '5v5'].map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${format === f ? 'bg-cyan-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                {f}
              </button>
            ))}
          </div>

          {(['shot', 'offense', 'defense'] as const).map((group) => (
            <div key={group}>
              <div className="text-xs font-semibold uppercase text-zinc-500 mb-1.5">{group === 'shot' ? 'Your shots' : group === 'offense' ? 'Offense' : 'Defense'}</div>
              <div className="grid grid-cols-3 gap-2">
                {FILM_TAGS.filter((t) => t.group === group).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => tag(t.id)}
                    className={`relative rounded-xl py-3 text-xs font-bold active:scale-95 transition-transform ${
                      t.id.endsWith('_make') ? 'bg-emerald-600/80 text-white' : t.id.endsWith('_miss') ? 'bg-red-600/70 text-white' : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    {t.label}
                    {counts.get(t.id) ? <span className="absolute right-1.5 top-1 text-[10px] text-white/80">{counts.get(t.id)}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              {events.length} plays tagged · {film.shots} shots
            </span>
            <button type="button" onClick={() => setEvents((e) => e.slice(0, -1))} disabled={events.length === 0} className="flex items-center gap-1 disabled:opacity-40">
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </button>
          </div>

          {/* Timeline. Undo only ever removed the most recent tag, so a mis-tap
              ten plays ago meant starting the game again. */}
          {events.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="text-xs font-semibold uppercase text-zinc-500 mb-2">Tagged plays</div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {events.map((e, i) => {
                  const label = FILM_TAGS.find((t) => t.id === e.type)?.label || e.type;
                  return (
                    <div key={`${e.t}-${e.type}-${i}`} className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime = e.t;
                        }}
                        className="flex-1 flex items-center gap-2 text-left hover:text-white"
                      >
                        <span className="w-11 flex-shrink-0 tabular-nums text-xs text-zinc-500">{clock(e.t)}</span>
                        <span className="text-zinc-300">{label}</span>
                        {!tagCountsToBoxScore(e.type) && <span className="text-[10px] uppercase text-zinc-600">style only</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEvent(i)}
                        aria-label={`Remove ${label} at ${clock(e.t)}`}
                        className="flex-shrink-0 text-zinc-600 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Box score */}
          {statEvents > 0 && (
            <div className="rounded-2xl border border-emerald-600/30 bg-emerald-600/10 p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Your stat line</span>
                <span className="text-xs text-zinc-400">{statEvents} counted plays</span>
              </div>
              <div className="text-2xl font-black text-white">{statLine(box)}</div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-zinc-300">
                <span>FG {box.fgm2 + box.fgm3}/{box.fga2 + box.fga3}</span>
                <span>3PT {box.fgm3}/{box.fga3}</span>
                <span>FT {box.ftm}/{box.fta}</span>
                <span>OREB {box.oreb}</span>
                <span>DREB {box.dreb}</span>
                <span>STL {box.stl}</span>
                <span>BLK {box.blk}</span>
                <span>TOV {box.tov}</span>
                <span>PF {box.pf}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  aria-label="Game date"
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                />
                <select
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value)}
                  aria-label="Game type"
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                >
                  {GAME_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                maxLength={80}
                placeholder="Opponent (optional)"
                aria-label="Opponent"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
              <Button variant="primary" size="lg" className="w-full gap-2" isLoading={savingGame} onClick={() => void saveAsGame()}>
                <ClipboardList className="h-4 w-4" /> Save as a game
              </Button>
              <p className="text-xs text-zinc-500">
                Saves to your game stats and season averages. Every number comes from a play you tagged.
              </p>
            </div>
          )}

          {film.styleTags.length > 0 && (
            <p className="text-sm text-zinc-300">
              Your style so far: {film.styleTags.map((t) => STYLE_TAGS.find((s) => s.id === t)?.label.replace(/^I /, '') || t).join(' · ')}
            </p>
          )}

          <Button variant="secondary" size="lg" className="w-full gap-2" isLoading={busy} onClick={matchFromFilm}>
            <Users className="h-4 w-4" /> Find my NBA match from this game
          </Button>

          {savedMatch && (
            <div className="rounded-2xl border border-cyan-600/40 bg-cyan-600/10 p-4 text-sm text-zinc-200">
              <div className="font-bold text-white">You play most like: {savedMatch.join(', ')}</div>
              <Link href="/style-match" className="mt-2 inline-block text-cyan-400 underline">
                See full breakdown, moves to copy and your AI plan
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
