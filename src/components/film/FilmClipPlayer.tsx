// src/components/film/FilmClipPlayer.tsx
// A film clip with questions. Before the tap it is the same card as every
// YouTube video in the app (YouTubeTapCard: nothing is fetched from YouTube
// or Google until then). After the tap the clip plays from its start, stops
// at each question's moment, and the question shows BELOW the video, never on
// top of it (YouTube's rules forbid covering the player). Answer, read why,
// "See it again" (back 3 seconds) or Continue; at the end it stops and the
// answers are kept. Captions are on; the speed can be slowed down.
//
// What happens when is decided by stepFilm (src/lib/film/schedule.ts); this
// component carries out its commands on the video. The video is made by
// createVideo, the YouTube IFrame API by default and a fake in tests.
'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, RotateCcw, Play as PlayIcon, X } from 'lucide-react';
import { YouTubeTapCard, youtubeShellClass } from '@/components/video/TapToLoadYouTube';
import { submitFilmAttempt } from '@/app/(app)/film/actions';
import { track } from '@/lib/events';
import type { FilmQuestion } from '@/lib/film/questions';
import {
  allAnswered,
  filmScore,
  initialFilmState,
  stepFilm,
  TICK_MS,
  type FilmClipTiming,
  type FilmCommand,
  type FilmEvent,
  type FilmPlayState,
} from '@/lib/film/schedule';
import { createYouTubeFilmVideo, speedChoices, videoErrorMessage, type CreateFilmVideo, type FilmVideo } from '@/lib/film/youtubePlayer';
import { isRealYoutubeId, youtubeEmbedUrl } from '@/lib/video/youtube';
import { cn } from '@/lib/utils';

const button =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';
const primary =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300';

interface FilmClipPlayerProps {
  clipId: string;
  videoId: string;
  title: string;
  startS: number;
  endS: number;
  questions: FilmQuestion[];
  /** For tests: a fake video in place of the YouTube IFrame API. */
  createVideo?: CreateFilmVideo;
}

type Saving = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; score: number; total: number } | { kind: 'error'; text: string };

export function FilmClipPlayer({ clipId, videoId, title, startS, endS, questions, createVideo = createYouTubeFilmVideo }: FilmClipPlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const [play, setPlay] = useState<FilmPlayState>(initialFilmState);
  const [rates, setRates] = useState<number[]>([1]);
  const [rate, setRate] = useState(1);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState<Saving>({ kind: 'idle' });
  const [manualMode, setManualMode] = useState(false);

  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<FilmVideo | null>(null);
  const stateRef = useRef<FilmPlayState>(play);
  /** No video controls (the API did not load): questions are stepped through by hand. */
  const manual = useRef(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const speedId = useId();

  const timingRef = useRef<FilmClipTiming>({ startS, endS, questions });
  const clipIdRef = useRef(clipId);
  useEffect(() => {
    timingRef.current = { startS, endS, questions };
    clipIdRef.current = clipId;
  }, [startS, endS, questions, clipId]);
  /** The answers are kept once, the first time the clip finishes with every question answered. */
  const saveStarted = useRef(false);

  const save = useCallback((picks: Record<string, number>) => {
    saveStarted.current = true;
    setSaving({ kind: 'saving' });
    const list = Object.entries(picks).map(([key, pick]) => ({ key, pick }));
    void submitFilmAttempt(clipIdRef.current, list).then(
      (res) => {
        if (res.ok) {
          track('film_done');
          setSaving({ kind: 'saved', score: res.score, total: res.total });
        } else setSaving({ kind: 'error', text: res.error });
      },
      () => setSaving({ kind: 'error', text: 'Could not save your answers. Check your connection.' })
    );
  }, []);

  const send = useCallback(
    (event: FilmEvent) => {
      const timing = timingRef.current;
      let next = stepFilm(timing, stateRef.current, event);
      run(video.current, next.commands);
      // With no video to report the time, the next question comes as soon as one is done
      while (manual.current && next.state.phase.kind === 'watching') {
        next = stepFilm(timing, next.state, { type: 'tick', t: timing.endS });
      }
      stateRef.current = next.state;
      setPlay(next.state);
      if (next.state.phase.kind === 'finished' && !saveStarted.current && allAnswered(timing.questions, next.state.picks)) save(next.state.picks);
    },
    [save]
  );

  useEffect(() => {
    track('film_opened');
  }, []);

  // After the tap: attach the video controls, then report the time four times a second
  useEffect(() => {
    if (!loaded || !frame.current) return;
    let cancelled = false;
    let timer: number | undefined;
    createVideo(frame.current, {
      onEnded: () => send({ type: 'ended' }),
      onError: (code) => setProblem(videoErrorMessage(code)),
    }).then(
      (v) => {
        if (cancelled) return v.destroy();
        video.current = v;
        setRates(speedChoices(v.rates()));
        timer = window.setInterval(() => send({ type: 'tick', t: v.currentTime() }), TICK_MS);
      },
      () => {
        if (cancelled) return;
        // The clip still plays from YouTube's own controls; the questions come after it
        manual.current = true;
        setManualMode(true);
        setProblem('The clip cannot stop at each question on this device. Watch it, then answer the questions below.');
        send({ type: 'tick', t: timingRef.current.endS });
      }
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      video.current?.destroy();
      video.current = null;
    };
  }, [loaded, createVideo, send]);

  const { phase } = play;
  const index = phase.kind === 'asking' || phase.kind === 'answered' || phase.kind === 'replaying' ? phase.index : null;
  const question = index !== null ? questions[index] : null;
  const picked = question ? play.picks[question.key] : undefined;

  // A new question takes focus, so keyboard and screen-reader users land on it
  useEffect(() => {
    if (phase.kind === 'asking') questionHeading.current?.focus();
  }, [phase.kind, index]);

  const finished = phase.kind === 'finished';

  if (!isRealYoutubeId(videoId)) return null;

  function changeSpeed(value: number) {
    setRate(value);
    video.current?.setRate(value);
  }

  return (
    <div className="space-y-3">
      <div className={youtubeShellClass()}>
        {loaded ? (
          <iframe
            ref={frame}
            src={youtubeEmbedUrl(videoId, { start: startS, end: endS, autoplay: true, captions: true, jsApiOrigin: window.location.origin })}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <YouTubeTapCard title={title} onTap={() => setLoaded(true)} />
        )}
      </div>

      {problem && (
        <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          {problem}
        </p>
      )}

      {loaded && !manualMode && rates.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor={speedId} className="text-sm text-zinc-400">
            Speed
          </label>
          <select
            id={speedId}
            value={rate}
            onChange={(e) => changeSpeed(Number(e.target.value))}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-white"
          >
            {rates.map((r) => (
              <option key={r} value={r}>
                {r === 1 ? 'Normal' : `${r}x`}
              </option>
            ))}
          </select>
        </div>
      )}

      {!loaded && questions.length > 0 && (
        <p className="text-sm text-zinc-400">
          {questions.length === 1 ? 'The clip stops once to ask you a question.' : `The clip stops ${questions.length} times to ask you a question.`}
        </p>
      )}

      {question && index !== null && (
        <section aria-labelledby="film-question" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Question {index + 1} of {questions.length}
          </p>
          <h2 id="film-question" ref={questionHeading} tabIndex={-1} className="font-bold text-white focus:outline-none">
            {question.question}
          </h2>
          <ul className="space-y-2">
            {question.options.map((option, i) => {
              const isPick = picked === i;
              const isRight = i === question.correct_index;
              const shown = picked !== undefined;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => send({ type: 'answer', pick: i })}
                    disabled={shown || phase.kind !== 'asking'}
                    aria-pressed={isPick}
                    className={cn(
                      'flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                      !shown && 'border-zinc-700 bg-zinc-950/60 text-zinc-100 hover:bg-zinc-800',
                      shown && isRight && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
                      shown && isPick && !isRight && 'border-red-500/50 bg-red-500/10 text-red-200',
                      shown && !isPick && !isRight && 'border-zinc-800 text-zinc-400'
                    )}
                  >
                    <span>{option}</span>
                    {shown && isRight && <Check className="h-4 w-4 flex-shrink-0" aria-label="Right answer" />}
                    {shown && isPick && !isRight && <X className="h-4 w-4 flex-shrink-0" aria-label="Your answer" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {picked !== undefined && (
            <div role="status" className="space-y-1 text-sm">
              <p className={picked === question.correct_index ? 'font-semibold text-emerald-300' : 'font-semibold text-zinc-200'}>
                {picked === question.correct_index ? 'Right.' : `Not quite. The answer is: ${question.options[question.correct_index]}`}
              </p>
              {question.explanation && <p className="text-zinc-300">{question.explanation}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!manualMode && (
              <button type="button" onClick={() => send({ type: 'see_again' })} disabled={phase.kind === 'replaying'} className={button}>
                <RotateCcw className="h-4 w-4" /> See it again
              </button>
            )}
            {phase.kind === 'answered' && (
              <button type="button" onClick={() => send({ type: 'continue' })} className={primary}>
                <PlayIcon className="h-4 w-4" /> Continue
              </button>
            )}
          </div>
        </section>
      )}

      {finished && (
        <section aria-label="Clip finished" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          {questions.length > 0 && (
            <p className="text-sm text-zinc-200">
              You got <span className="font-black tabular-nums text-white">{filmScore(questions, play.picks)}</span> of{' '}
              <span className="font-black tabular-nums text-white">{questions.length}</span> right.
            </p>
          )}
          {saving.kind === 'saving' && <p className="text-sm text-zinc-400">Saving your answers...</p>}
          {saving.kind === 'saved' && <p className="text-sm text-emerald-400">Answers saved.</p>}
          {saving.kind === 'error' && (
            <p role="alert" className="text-sm text-red-400">
              {saving.text}
            </p>
          )}
          {!manualMode && (
            <button type="button" onClick={() => send({ type: 'watch_again' })} className={button}>
              <RotateCcw className="h-4 w-4" /> Watch again
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function run(video: FilmVideo | null, commands: FilmCommand[]) {
  if (!video) return;
  for (const c of commands) {
    if (c.type === 'pause') video.pause();
    else if (c.type === 'play') video.play();
    else video.seekTo(c.to);
  }
}
