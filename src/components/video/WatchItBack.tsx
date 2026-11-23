// src/components/video/WatchItBack.tsx
// "Watch it back" on the shot tracker's review (D1, docs/agent-os/design/
// 2026-11-20-watch-it-back.md, restyled by 2026-11-22-polish.md).
//
// An uploaded clip is checked frame by frame without playing (clipDecoder.ts),
// so the player never saw the tracker at work and could not tell when it was
// wrong. This plays the whole clip with the tracker's overlay drawn on it - the
// rim, the ball, the score, each MAKE and MISS - from the calls as corrected
// here, never the tracker's first ones. Paused on a call, one tap flips it;
// paused anywhere else, a make or miss can be added at that moment, so a shot
// the tracker never saw gets a time and can be replayed and charted.
//
// Muted, like the old per-shot replay; no sound button in v1. The clip stays
// on the phone: the file is played from an object URL and nothing is sent.
'use client';

import React, { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Check, Maximize2, Minimize2, Pause, Play, Plus, RotateCcw, SkipBack, SkipForward, Trash2, Undo2, Video, X } from 'lucide-react';
import { resolveDuration } from '@/lib/video/liveRecorder';
import { clockAtMedia, heatLevel, mediaAtClock, nearestCall, overlayAt, pinsCrowded, type OverlayTimeline } from '@/lib/video/overlayTimeline';
import { drawBall, drawHud, drawRim, hudUnit } from '@/lib/video/overlayArt';
import type { TrackedShot } from '@/lib/video/trackedShots';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { track } from '@/lib/events';
import { cn } from '@/lib/utils';

/** A shot review plays from this long before the call... */
const REVIEW_BEFORE_MS = 2500;
/** ...and pauses this long after it, with the MAKE or MISS still up. */
const REVIEW_AFTER_MS = 800;
/** A tap on the bar this close to a pin, px, reviews that shot. */
const PIN_SNAP_PX = 16;
/** The bar's thumb, px: the pins sit on the thumb's path, inset by half of it. */
const THUMB_PX = 16;
/** Smallest HUD unit, CSS px: about the live HUD's size on a phone held upright. */
const HUD_MIN_U = 0.85;
/** Arrow keys on the bar move this far, ms. */
const ARROW_STEP_MS = 1000;

export interface WatchItBackHandle {
  /** Scrolls the player into view and plays one shot: a list row's ▶. */
  watch(id: number): void;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type Kind = 'make' | 'miss' | 'unclear';
const kindOf = (s: TrackedShot): Kind => (!s.confident ? 'unclear' : s.made ? 'make' : 'miss');

export function WatchItBack({
  file,
  offsetMs,
  timeline,
  shots,
  onSet,
  onAdd,
  onDelete,
  onRestore,
  onCurrent,
  ref,
}: {
  file: File;
  /** Where the recording starts on the tracking clock (a live recording starts a little after it). */
  offsetMs: number;
  /** The run's timeline with the corrected calls (shotsToTimeline). */
  timeline: OverlayTimeline;
  shots: TrackedShot[];
  onSet: (id: number, made: boolean) => void;
  /** Adds a shot at this time on the tracking clock. */
  onAdd: (made: boolean, clockMs: number) => void;
  onDelete: (id: number) => void;
  onRestore: (shot: TrackedShot) => void;
  /** The shot the player is on, for the list to highlight; null between shots. */
  onCurrent?: (id: number | null) => void;
  ref?: Ref<WatchItBackHandle>;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  /** Media time to pause at, ms, while a shot review plays. */
  const stopAtRef = useRef<number | null>(null);
  /** Whether a drag on the bar began while playing, so it resumes on release. */
  const dragRef = useRef<{ x: number; wasPlaying: boolean } | null>(null);
  const playedRef = useRef(false);
  const editedRef = useRef(false);

  const reduced = usePrefersReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [mediaMs, setMediaMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  const [rate, setRate] = useState<1 | 0.5>(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [removed, setRemoved] = useState<{ shot: TrackedShot; number: number } | null>(null);
  const [railW, setRailW] = useState(0);
  const [announce, setAnnounce] = useState('');

  const mediaOf = (s: TrackedShot) => mediaAtClock(timeline.gaps, s.t) - offsetMs;
  // Shots past the end of the recording (a live one that stopped early to save space) cannot be watched
  const watchable = durationMs === null ? shots : shots.filter((s) => mediaOf(s) <= durationMs);
  const unwatchable = shots.length - watchable.length;
  const here = clockAtMedia(timeline.gaps, mediaMs + offsetMs);
  const current = here.held ? null : nearestCall(watchable, here.clockMs);
  const currentNumber = current ? shots.indexOf(current) + 1 : 0;
  const ended = durationMs !== null && mediaMs >= durationMs - 50;
  const makes = shots.filter((s) => s.made).length;
  const total = durationMs ?? 0;

  // The file's address is made and set on the video here and released when the
  // effect is cleaned up, as ShotReplay did: made during render and released in
  // an effect, development's double mount released it before it loaded.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const url = URL.createObjectURL(file);
    video.src = url;
    return () => {
      video.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Redraw on every edit while paused: a flipped call shows at once
  // Effect events: they draw with this render's timeline from inside the effects below
  const redraw = useEffectEvent(() => draw());
  const onFrame = useEffectEvent(() => tick());
  useEffect(() => redraw(), [timeline, reduced]);

  useEffect(() => {
    onCurrent?.(current?.id ?? null);
  }, [current?.id, onCurrent]);

  // Drawn on each new video frame while playing; a paused video presents none,
  // so seeks, pauses, edits and resizes draw once each
  useEffect(() => {
    const video = videoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (h: number) => void;
    }) | null;
    if (!playing || !video) return;
    let handle = 0;
    let stopped = false;
    const byFrame = typeof video.requestVideoFrameCallback === 'function';
    const step = () => {
      if (stopped) return;
      onFrame();
      handle = byFrame ? video.requestVideoFrameCallback!(step) : requestAnimationFrame(step);
    };
    step();
    return () => {
      stopped = true;
      if (byFrame) video.cancelVideoFrameCallback?.(handle);
      else cancelAnimationFrame(handle);
    };
  }, [playing]);

  // The canvas follows the picture's size, in device pixels; the bar's width
  // decides whether its pins fit. The bar moves into the stage full screen.
  useEffect(() => {
    const canvas = canvasRef.current;
    const rail = railRef.current;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      redraw();
      if (rail) setRailW(rail.clientWidth);
    });
    if (canvas) observer.observe(canvas);
    if (rail) observer.observe(rail);
    return () => observer.disconnect();
  }, [fullscreen]);

  // The back gesture or Escape leaves full screen without our button
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useImperativeHandle(ref, () => ({
    watch(id: number) {
      const shot = shots.find((s) => s.id === id);
      if (!shot) return;
      sectionRef.current?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      reviewShot(shot);
    },
  }));

  /** The overlay as it stood at the video's current frame, over the picture. */
  function draw() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const ratio = window.devicePixelRatio || 1;
    const W = Math.round(canvas.clientWidth * ratio);
    const H = Math.round(canvas.clientHeight * ratio);
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const tl = timeline;
    const at = video.currentTime * 1000;
    const { clockMs, held } = clockAtMedia(tl.gaps, at + offsetMs);
    const s = overlayAt(tl, clockMs, held);
    const u = hudUnit(W, H);
    if (s.rim) drawRim(ctx, W, H, s.rim, u, s.tone);
    drawBall(ctx, W, H, s.trail, s.ball, u, heatLevel(s.streak));
    const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    // The HUD is sized to the picture, as in a saved video; on the small player
    // in the page that left the score and pills too small to read, so it never
    // goes below HUD_MIN_U of a CSS pixel per unit
    const k = Math.max(1, (HUD_MIN_U * ratio) / u);
    ctx.save();
    ctx.scale(k, k);
    drawHud(ctx, W / k, H / k, s, at, family, { mark: false, still: reduced });
    ctx.restore();
  }

  /** One frame while playing: draw, move the bar, stop a shot review at its end. */
  function tick() {
    const video = videoRef.current;
    if (!video) return;
    draw();
    const at = video.currentTime * 1000;
    // Rounded so the page updates ten times a second, not on every frame
    setMediaMs(Math.round(at / 100) * 100);
    if (stopAtRef.current !== null && at >= stopAtRef.current) {
      stopAtRef.current = null;
      video.pause();
    }
  }

  function syncTime() {
    const video = videoRef.current;
    if (!video) return;
    setMediaMs(video.currentTime * 1000);
    draw();
  }

  async function onMetadata(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget;
    setVideoSize({ w: video.videoWidth, h: video.videoHeight });
    // A live recording's webm has no length until the browser has read to its end
    await resolveDuration(video);
    if (Number.isFinite(video.duration)) setDurationMs(video.duration * 1000);
  }

  function play() {
    const video = videoRef.current;
    if (!video) return;
    setRemoved(null);
    video.playbackRate = rate;
    video.play().catch(() => undefined);
    setStarted(true);
    if (!playedRef.current) {
      playedRef.current = true;
      track('watch_back_played');
    }
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video || failed) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    stopAtRef.current = null;
    if (ended) seek(0);
    play();
  }

  function seek(ms: number) {
    const video = videoRef.current;
    if (!video) return;
    const to = Math.max(0, durationMs === null ? ms : Math.min(ms, durationMs));
    video.currentTime = to / 1000;
    setMediaMs(to);
    setRemoved(null);
  }

  /** Plays one shot: from a little before the call to just after it, then pauses on it. */
  function reviewShot(shot: TrackedShot) {
    const at = mediaOf(shot);
    if (durationMs !== null && at > durationMs) return;
    seek(at - REVIEW_BEFORE_MS);
    stopAtRef.current = at + REVIEW_AFTER_MS;
    play();
  }

  function stepShot(direction: -1 | 1) {
    const list = watchable;
    let i: number;
    if (current) i = list.indexOf(current) + direction;
    else if (direction > 0) i = list.findIndex((s) => mediaOf(s) > mediaMs);
    else i = list.findLastIndex((s) => mediaOf(s) < mediaMs);
    if (i >= 0 && i < list.length) reviewShot(list[i]);
  }

  function toggleRate() {
    const next = rate === 1 ? 0.5 : 1;
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  function toggleFullscreen() {
    const next = !fullscreen;
    setFullscreen(next);
    const stage = stageRef.current as (HTMLDivElement & { requestFullscreen?: () => Promise<void> }) | null;
    if (next && stage?.requestFullscreen && !document.fullscreenElement) {
      stage.requestFullscreen().catch(() => undefined);
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      if (videoSize && videoSize.w > videoSize.h) orientation?.lock?.('landscape').catch(() => undefined);
    } else if (!next && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  function edited() {
    if (editedRef.current) return;
    editedRef.current = true;
    track('watch_back_edited');
  }

  /** The count after a change, for the screen reader. */
  function tally(next: TrackedShot[]): string {
    return `${next.filter((s) => s.made).length} of ${next.length} made.`;
  }

  function setCall(shot: TrackedShot, made: boolean) {
    onSet(shot.id, made);
    edited();
    const next = shots.map((s) => (s.id === shot.id ? { ...s, made, confident: true } : s));
    setAnnounce(`Shot ${shots.indexOf(shot) + 1} is now a ${made ? 'make' : 'miss'}. ${tally(next)}`);
  }

  function removeShot(shot: TrackedShot) {
    const number = shots.indexOf(shot) + 1;
    onDelete(shot.id);
    edited();
    setRemoved({ shot, number });
    setAnnounce(`Shot ${number} removed. ${tally(shots.filter((s) => s.id !== shot.id))}`);
  }

  function undoRemove() {
    if (!removed) return;
    onRestore(removed.shot);
    setAnnounce(`Shot ${removed.number} is back.`);
    setRemoved(null);
  }

  function addHere(made: boolean) {
    onAdd(made, here.clockMs);
    edited();
    setAnnounce(`Added a ${made ? 'make' : 'miss'} at ${clock(mediaMs)}. ${makes + (made ? 1 : 0)} of ${shots.length + 1} made.`);
  }

  function onRailKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const direction = e.key === 'ArrowLeft' ? -1 : 1;
    if (e.shiftKey) stepShot(direction);
    else seek(mediaMs + direction * ARROW_STEP_MS);
  }

  function onRailDown(e: React.PointerEvent<HTMLInputElement>) {
    const video = videoRef.current;
    dragRef.current = { x: e.clientX, wasPlaying: !!video && !video.paused };
    stopAtRef.current = null;
    video?.pause();
  }

  function onRailUp(e: React.PointerEvent<HTMLInputElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    // A tap (not a drag) beside a pin reviews that shot
    if (Math.abs(e.clientX - drag.x) < 6 && total > 0) {
      const box = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - box.left;
      const span = box.width - THUMB_PX;
      let near: TrackedShot | null = null;
      let nearPx = PIN_SNAP_PX;
      for (const s of watchable) {
        const px = Math.abs(THUMB_PX / 2 + (mediaOf(s) / total) * span - x);
        if (px <= nearPx) {
          near = s;
          nearPx = px;
        }
      }
      if (near) {
        reviewShot(near);
        return;
      }
    }
    if (drag.wasPlaying) play();
  }

  function onKey(e: React.KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a')) return;
    if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      togglePlay();
    }
  }

  const fractions = total > 0 ? watchable.map((s) => mediaOf(s) / total) : [];
  const crowded = pinsCrowded(fractions, Math.max(0, railW - THUMB_PX));
  const valueText = `${clock(mediaMs)} of ${clock(total)}${current ? `, shot ${currentNumber}` : ''}`;
  const hideControls = fullscreen && playing;

  /** What the strip under the controls says and offers, by what is paused. */
  function strip() {
    if (playing) {
      return <p className="text-sm text-zinc-400">Tap the picture to pause. Then fix a call, or add a shot the tracker missed.</p>;
    }
    if (removed) {
      return (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Shot {removed.number} removed</p>
            <p className="text-sm text-zinc-400">It no longer counts.</p>
          </div>
          <button type="button" onClick={undoRemove} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
            <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
          </button>
        </div>
      );
    }
    if (!started && mediaMs === 0) {
      return (
        <p className="text-sm text-zinc-400">
          {shots.length === 0
            ? 'No shots found. Watch the clip and add any the tracker missed.'
            : 'Press play. Tap the picture to pause, then fix a call or add a shot the tracker missed.'}
        </p>
      );
    }
    if (ended) {
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">
            End of clip · {makes} of {shots.length} made
          </p>
          <button type="button" onClick={togglePlay} className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Watch again
          </button>
        </div>
      );
    }
    if (here.held) {
      return <p className="text-sm text-zinc-400">The tracker was paused here while the hoop was re-set.</p>;
    }
    if (current) {
      const unclear = !current.confident;
      const said = current.called;
      const line = unclear
        ? 'Unclear. The tracker was not sure.'
        : !said
          ? 'Added by you. Tap to change.'
          : !said.confident
            ? 'The tracker was not sure. You set it.'
            : said.made === current.made
              ? `Tracker said ${said.made ? 'Make' : 'Miss'}. Tap to change.`
              : `Tracker said ${said.made ? 'Make' : 'Miss'}. You changed it.`;
      return (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">
                <span className="font-semibold text-white">Shot {currentNumber}</span> · {clock(mediaOf(current))}
              </p>
              <p className={cn('text-sm', unclear ? 'text-amber-400' : 'text-zinc-400')}>{line}</p>
            </div>
            <button
              type="button"
              onClick={() => removeShot(current)}
              className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Not a shot
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={!unclear && current.made}
              onClick={() => setCall(current, true)}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-xl font-semibold',
                !unclear && current.made
                  ? 'bg-emerald-600 text-white shadow-[0_0_18px_rgba(16,185,129,0.35)]'
                  : 'border border-emerald-600/50 text-emerald-300 hover:bg-emerald-600/10'
              )}
            >
              <Check className="h-4 w-4" aria-hidden="true" /> Make
            </button>
            <button
              type="button"
              aria-pressed={!unclear && !current.made}
              onClick={() => setCall(current, false)}
              className={cn(
                'flex h-12 items-center justify-center gap-2 rounded-xl font-semibold',
                !unclear && !current.made ? 'bg-red-600 text-white' : 'border border-red-600/50 text-red-300 hover:bg-red-600/10'
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Miss
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">No call here</p>
          <p className="text-sm text-zinc-400">Paused at {clock(mediaMs)}. Missed one? Add it.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => addHere(true)}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-emerald-600/50 px-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-600/10"
          >
            <Plus className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> Add a make here
          </button>
          <button
            type="button"
            onClick={() => addHere(false)}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-red-600/50 px-2 text-sm font-semibold text-red-300 hover:bg-red-600/10"
          >
            <Plus className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> Add a miss here
          </button>
        </div>
      </div>
    );
  }

  const controlButton = 'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:opacity-40';
  const aspect = videoSize ? videoSize.w / videoSize.h : null;
  // The picture box is the video's own shape, never letterboxed inside the
  // video element, so the overlay drawn over it stays on the hoop
  const pictureStyle: React.CSSProperties = aspect
    ? { aspectRatio: `${videoSize!.w} / ${videoSize!.h}`, width: fullscreen ? `min(100vw, calc(100dvh * ${aspect}))` : `min(100%, calc(70vh * ${aspect}))` }
    : { width: '100%' };

  const controls = (
    <div
      className={cn(
        fullscreen ? 'absolute inset-x-0 bottom-0 bg-black/80 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3' : 'px-4 pb-3 pt-2',
        hideControls && 'hidden'
      )}
    >
      {fullscreen && <div className="mx-auto mb-1 max-w-xl">{strip()}</div>}
      <div className="mx-auto max-w-xl">
        {/* The bar: pins above the track, the native range under them for touch, keys and screen readers */}
        <div ref={railRef} className="relative h-12">
          <div className="pointer-events-none absolute inset-x-2 top-[calc(50%-1.375rem)] h-4" aria-hidden="true">
            {watchable.map((s, i) => {
              const kind = kindOf(s);
              const isCurrent = current?.id === s.id;
              const left = `${(fractions[i] ?? 0) * 100}%`;
              if (crowded) {
                return (
                  <span
                    key={s.id}
                    className={cn(
                      'absolute bottom-0 w-[3px] -translate-x-1/2 rounded-full',
                      kind === 'make' ? 'h-3.5' : 'h-2',
                      isCurrent ? 'bg-white' : kind === 'make' ? 'bg-emerald-400' : kind === 'miss' ? 'bg-red-400' : 'bg-amber-400'
                    )}
                    style={{ left }}
                  />
                );
              }
              return (
                <span
                  key={s.id}
                  className={cn(
                    'absolute top-1/2 -translate-x-1/2 -translate-y-1/2',
                    kind === 'make' && 'h-2.5 w-2.5 rounded-full bg-emerald-400',
                    kind === 'miss' && 'h-2.5 w-2.5 rounded-full border-2 border-red-400',
                    kind === 'unclear' && 'h-2 w-2 rotate-45 bg-amber-400',
                    isCurrent && 'ring-2 ring-white'
                  )}
                  style={{ left }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.round(total))}
            step={100}
            value={Math.round(Math.min(mediaMs, total))}
            disabled={total <= 0}
            aria-label="Position in the clip"
            aria-valuetext={valueText}
            onChange={(e) => seek(Number(e.target.value))}
            onKeyDown={onRailKey}
            onPointerDown={onRailDown}
            onPointerUp={onRailUp}
            onPointerCancel={() => (dragRef.current = null)}
            className="dd-scrub absolute inset-0 h-full w-full"
            style={{ '--p': `${total > 0 ? (Math.min(mediaMs, total) / total) * 100 : 0}%` } as React.CSSProperties}
          />
        </div>

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!loaded}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 disabled:opacity-50"
          >
            {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => stepShot(-1)} disabled={!watchable.length} aria-label="Previous shot" className={controlButton}>
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => stepShot(1)} disabled={!watchable.length} aria-label="Next shot" className={controlButton}>
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm tabular-nums text-zinc-400">
            <span className="font-semibold text-white">{clock(mediaMs)}</span> / {clock(total)}
          </p>
          <button
            type="button"
            onClick={toggleRate}
            aria-label={rate === 1 ? 'Speed: normal. Play at half speed' : 'Speed: half. Play at normal speed'}
            className={cn(controlButton, 'w-auto px-3 text-sm font-semibold tabular-nums')}
          >
            {rate === 1 ? '1x' : '0.5x'}
          </button>
        </div>
        {unwatchable > 0 && total > 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            The recording stopped at {clock(total)}, so {unwatchable === 1 ? 'the shot after that cannot' : `the ${unwatchable} shots after that cannot`} be
            watched.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} aria-labelledby="watch-it-back-title" onKeyDown={onKey} className="scroll-mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
        <h3 id="watch-it-back-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Video className="h-4 w-4" aria-hidden="true" /> Watch it back
        </h3>
        <p className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" /> Make
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-red-400" aria-hidden="true" /> Miss
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rotate-45 bg-amber-400" aria-hidden="true" /> Unclear
          </span>
        </p>
      </div>

      <div ref={stageRef} className={fullscreen ? 'fixed inset-0 z-50 flex items-center justify-center bg-black' : 'relative bg-black'}>
        {failed ? (
          <p className="p-4 text-sm text-zinc-400">This browser could not play the video back.</p>
        ) : (
          <div className="relative mx-auto" style={pictureStyle}>
            <video
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => void onMetadata(e)}
              onLoadedData={() => {
                setLoaded(true);
                draw();
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => {
                setPlaying(false);
                syncTime();
              }}
              onEnded={() => setPlaying(false)}
              onSeeked={syncTime}
              onError={() => setFailed(true)}
              className="block h-auto w-full"
            />
            {/* The picture is the tap target; the labelled play button does the same */}
            <canvas ref={canvasRef} onClick={togglePlay} aria-hidden="true" className="absolute inset-0 h-full w-full cursor-pointer touch-manipulation" />
            {!started && (
              <button
                type="button"
                onClick={togglePlay}
                disabled={!loaded}
                aria-label={loaded ? 'Play the clip' : 'Loading the clip'}
                className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg"
              >
                {loaded ? (
                  <Play className="ml-1 h-7 w-7" aria-hidden="true" />
                ) : (
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-950 motion-reduce:animate-none" aria-hidden="true" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}
              className={cn('absolute flex h-11 w-11 items-center justify-center rounded-xl bg-black/60 text-white', fullscreen ? 'right-3 top-3' : 'bottom-2 right-2')}
            >
              {fullscreen ? <Minimize2 className="h-5 w-5" aria-hidden="true" /> : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        )}

        {/* Playing full screen: only a thin line for where it is */}
        {hideControls && total > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" aria-hidden="true">
            <div className="h-full origin-left bg-white" style={{ transform: `scaleX(${Math.min(1, mediaMs / total)})` }} />
          </div>
        )}
        {fullscreen && !failed && controls}
      </div>

      {!fullscreen && !failed && controls}
      {!fullscreen && !failed && <div className="border-t border-zinc-800 px-4 py-3">{strip()}</div>}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
