// src/components/video/TrackerVideoExport.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { pickRecordingType } from '@/lib/video/highlights';
import { resolveDuration } from '@/lib/video/liveRecorder';
import { clockAtMedia, heatLevel, mediaAtClock, overlayAt, replayPicks, type OverlayTimeline } from '@/lib/video/overlayTimeline';
import { drawBackdrop, drawBall, drawEndCard, drawHud, drawRim, hudUnit, verticalLayout, VERTICAL, type Rect } from '@/lib/video/overlayArt';
import { streaks } from '@/lib/video/shotStats';
import { personalBest, type ShootingTally } from '@/lib/video/personalBest';
import { localDateString } from '@/lib/dates';
import { Clapperboard, Download, Share2, Square } from 'lucide-react';

/** Seconds of video kept before the first chosen shot and after the last. */
const LEAD_MS = 3000;
const TAIL_MS = 2500;
const END_CARD_MS = 2500;
/** A slow-motion replay: this much before the make and after it, at this speed. */
const REPLAY_BEFORE_MS = 1800;
const REPLAY_AFTER_MS = 700;
const REPLAY_RATE = 0.5;
/** Sharp enough for an ad cut at 1080p. */
const EXPORT_BITS_PER_SECOND = 8_000_000;
/** The saved file is held in memory until it is shared, so it stops here (about 10 minutes). */
const MAX_EXPORT_BYTES = 600 * 1024 * 1024;
/** Longest side of the saved video. */
const MAX_SIDE = 1920;

export type ExportShape = 'original' | 'vertical';

/** A stretch of the recording to play into the saved video, at a speed. */
export interface ExportSegment {
  startMs: number;
  endMs: number;
  rate: number;
  replay: boolean;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The range to save, in recording time, from a choice of first and last shot (-1: the very start or end). */
export function exportRange(tl: OverlayTimeline, from: number, to: number, durationMs: number, offsetMs = 0): { startMs: number; endMs: number } {
  const at = (i: number) => mediaAtClock(tl.gaps, tl.calls[i].t) - offsetMs;
  const startMs = from < 0 || !tl.calls[from] ? 0 : Math.max(0, at(from) - LEAD_MS);
  const endMs = to < 0 || !tl.calls[to] ? durationMs : Math.min(durationMs, at(to) + TAIL_MS);
  return { startMs, endMs: Math.max(startMs, endMs) };
}

/**
 * What the saved video plays, in order: the chosen range at normal speed,
 * then with `slowmo` up to three of its best makes again at half speed
 * (replayPicks), before the end card.
 */
export function exportPlan(tl: OverlayTimeline, from: number, to: number, durationMs: number, offsetMs: number, slowmo: boolean): ExportSegment[] {
  const range = exportRange(tl, from, to, durationMs, offsetMs);
  const plan: ExportSegment[] = [{ ...range, rate: 1, replay: false }];
  if (!slowmo) return plan;
  const fromClock = clockAtMedia(tl.gaps, range.startMs + offsetMs).clockMs;
  const toClock = clockAtMedia(tl.gaps, range.endMs + offsetMs).clockMs;
  for (const t of replayPicks(tl, fromClock, toClock)) {
    const at = mediaAtClock(tl.gaps, t) - offsetMs;
    const startMs = Math.max(0, at - REPLAY_BEFORE_MS);
    const endMs = Math.min(durationMs, at + REPLAY_AFTER_MS);
    if (endMs > startMs) plan.push({ startMs, endMs, rate: REPLAY_RATE, replay: true });
  }
  return plan;
}

/** How long a plan takes to play, and so how long the saved video is, ms. */
export function planLengthMs(plan: readonly ExportSegment[]): number {
  return plan.reduce((n, s) => n + (s.endMs - s.startMs) / s.rate, 0) + END_CARD_MS;
}

/**
 * Saves the session's video with the tracker's overlay drawn into it - the
 * rim line, the ball and its trail, the score, the streak flame, milestones,
 * each make and miss - as it looked live, for sharing or for footage of the
 * app at work. In the footage's own shape or 9:16 for TikTok and Reels, with
 * the best makes again in slow motion if chosen.
 *
 * The recording is played through a canvas, each frame drawn with the overlay
 * as it stood at that moment (overlayTimeline.ts), and the canvas recorded.
 * Slow motion is the recording played at half speed into the same canvas.
 * Nothing is uploaded. The calls shown are the tracker's own, as they
 * happened: corrections made in review are not in it, because they were not
 * on the screen.
 */
export function TrackerVideoExport({
  file,
  timeline,
  offsetMs = 0,
  best,
}: {
  file: File;
  timeline: OverlayTimeline;
  offsetMs?: number;
  /** The player's best saved session before this one (personalBest.ts); undefined when not known. */
  best?: ShootingTally | null;
}) {
  const calls = timeline.calls;
  const [from, setFrom] = useState(-1);
  const [to, setTo] = useState(-1);
  const [shape, setShape] = useState<ExportShape>('vertical');
  const [slowmo, setSlowmo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string; capped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<'none' | 'finish' | 'cancel'>('none');
  /** Read through a function: a tap on Stop changes it while build() is awaiting. */
  const stopState = () => stopRef.current;

  useEffect(
    () => () => {
      stopRef.current = 'cancel';
      if (result) URL.revokeObjectURL(result.url);
    },
    [result]
  );

  // Length of what will be saved, from the tracking clock's own end until the file is opened
  const roughEnd = mediaAtClock(timeline.gaps, timeline.endT) - offsetMs;
  const roughPlan = exportPlan(timeline, from, to, roughEnd, offsetMs, slowmo);
  const seconds = Math.round(planLengthMs(roughPlan) / 1000);
  const replays = roughPlan.filter((s) => s.replay).length;

  async function build() {
    const type = typeof MediaRecorder !== 'undefined' ? pickRecordingType((t) => MediaRecorder.isTypeSupported(t)) : null;
    const canvas = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream };
    if (!type || !canvas.captureStream) {
      setError("This browser can't record video. Try Chrome on Android or Safari on iPhone (iOS 14.5+).");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    stopRef.current = 'none';

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('load'));
      });
      await resolveDuration(video);
      const durationMs = Number.isFinite(video.duration) ? video.duration * 1000 : roughEnd;
      const plan = exportPlan(timeline, from, to, durationMs, offsetMs, slowmo);
      const total = planLengthMs(plan);

      // Where the picture and the HUD go on the canvas
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      let W: number;
      let H: number;
      let picture: Rect;
      let area: Rect;
      let backdrop = false;
      if (shape === 'vertical') {
        W = VERTICAL.w;
        H = VERTICAL.h;
        ({ picture, area, backdrop } = verticalLayout(vw, vh, W, H));
      } else {
        const scale = Math.min(1, MAX_SIDE / Math.max(vw, vh));
        W = Math.round((vw * scale) / 2) * 2;
        H = Math.round((vh * scale) / 2) * 2;
        picture = { x: 0, y: 0, w: W, h: H };
        area = picture;
      }
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      const pu = hudUnit(picture.w, picture.h);
      const scratch = document.createElement('canvas');
      const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: type.mimeType, videoBitsPerSecond: EXPORT_BITS_PER_SECOND });
      const chunks: Blob[] = [];
      let bytes = 0;
      let capped = false;
      recorder.ondataavailable = (e) => {
        if (!e.data.size) return;
        chunks.push(e.data);
        bytes += e.data.size;
        if (bytes >= MAX_EXPORT_BYTES && stopRef.current === 'none') {
          capped = true;
          stopRef.current = 'finish';
        }
      };
      const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

      /** One frame of the session, with the overlay as it stood at that moment. */
      const paint = (mediaMs: number, replay: boolean) => {
        if (backdrop) drawBackdrop(ctx, video, vw, vh, W, H, scratch);
        ctx.drawImage(video, picture.x, picture.y, picture.w, picture.h);
        const { clockMs, held } = clockAtMedia(timeline.gaps, mediaMs + offsetMs);
        const s = overlayAt(timeline, clockMs, held);
        ctx.save();
        ctx.translate(picture.x, picture.y);
        if (s.rim) drawRim(ctx, picture.w, picture.h, s.rim, pu, s.tone);
        drawBall(ctx, picture.w, picture.h, s.trail, s.ball, pu, heatLevel(s.streak));
        ctx.restore();
        drawHud(ctx, W, H, s, mediaMs, family, { area, replay });
      };

      const seek = (ms: number) =>
        new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = ms / 1000;
        });

      let done = 0;
      let mainEndMs = plan[0].startMs;
      for (const [i, seg] of plan.entries()) {
        if (stopState() !== 'none') break;
        if (i > 0) recorder.pause();
        await seek(seg.startMs);
        paint(seg.startMs, seg.replay);
        if (i === 0) recorder.start(1000);
        else recorder.resume();
        video.playbackRate = seg.rate;
        await video.play();
        // Paced by animation frames, not requestVideoFrameCallback: this video
        // is never on the page, and a video that is not shown presents no
        // frames to call back on. A frame is drawn whenever the video moved on.
        await new Promise<void>((resolve) => {
          let lastMs = -1;
          const step = () => {
            const mediaMs = video.currentTime * 1000;
            if (stopState() !== 'none' || video.ended || mediaMs >= seg.endMs) {
              video.pause();
              resolve();
              return;
            }
            if (mediaMs !== lastMs) {
              lastMs = mediaMs;
              paint(mediaMs, seg.replay);
              setProgress((done + (mediaMs - seg.startMs) / seg.rate) / total);
            }
            requestAnimationFrame(step);
          };
          step();
        });
        if (!seg.replay) mainEndMs = Math.min(video.currentTime * 1000, seg.endMs);
        done += (seg.endMs - seg.startMs) / seg.rate;
      }

      if (stopState() !== 'cancel') {
        // The numbers as they stood on screen where the session part stopped
        const made = calls.filter((c) => c.t <= clockAtMedia(timeline.gaps, mainEndMs + offsetMs).clockMs).map((c) => c.made);
        const tally = { makes: made.filter(Boolean).length, attempts: made.length };
        // Only a whole session, made to the end, can claim a best: a part of
        // one is not a session's %
        const whole = from < 0 && to < 0 && stopState() === 'none';
        const stats = { ...tally, bestRun: streaks(made).best, personalBest: whole && personalBest(tally, best).kind === 'new' };
        await new Promise<void>((resolve) => {
          const began = performance.now();
          const tick = () => {
            const p = (performance.now() - began) / END_CARD_MS;
            drawEndCard(ctx, W, H, stats, Math.min(1, p), family);
            setProgress((done + Math.min(1, p) * END_CARD_MS) / total);
            if (p < 1 && stopState() !== 'cancel') requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        });
      }

      recorder.stop();
      await stopped;
      stream.getTracks().forEach((t) => t.stop());
      if (stopState() === 'cancel') return;
      const blob = new Blob(chunks, { type: type.mimeType.split(';')[0] });
      const suffix = shape === 'vertical' ? '-vertical' : '';
      setResult({ url: URL.createObjectURL(blob), blob, name: `deadeye-tracker-${localDateString()}${suffix}.${type.extension}`, capped });
    } catch {
      setError('Could not make the video from this recording.');
    } finally {
      URL.revokeObjectURL(video.src);
      setBusy(false);
    }
  }

  async function share() {
    if (!result) return;
    const shareFile = new File([result.blob], result.name, { type: result.blob.type });
    try {
      if (navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile] });
        return;
      }
    } catch {
      return; // share sheet closed
    }
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.name;
    a.click();
  }

  /** Stops early and keeps what is made so far. */
  function finishEarly() {
    stopRef.current = 'finish';
  }

  const shotLabel = (i: number) => `Shot ${i + 1} · ${calls[i].made ? 'make' : 'miss'} · ${clock(mediaAtClock(timeline.gaps, calls[i].t) - offsetMs)}`;
  const selectClass = 'mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-2 py-2 text-sm font-normal normal-case tracking-normal text-zinc-200';
  const shapeButton = (value: ExportShape, label: string) => (
    <button
      type="button"
      aria-pressed={shape === value}
      onClick={() => setShape(value)}
      className={`h-11 flex-1 rounded-xl border text-sm font-semibold ${
        shape === value ? 'border-orange-500 bg-orange-600/15 text-white' : 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
      <div className="flex items-center gap-2 font-bold text-white">
        <Clapperboard className="h-5 w-5 text-orange-400" /> Video with the tracker
      </div>
      {result ? (
        <>
          <video
            src={result.url}
            controls
            playsInline
            className={`rounded-xl bg-black ${shape === 'vertical' ? 'mx-auto max-h-[70vh] w-auto' : 'w-full'}`}
          />
          {result.capped && <p className="text-sm text-zinc-400">It stopped early to save space on your phone. Pick a shorter part for the rest.</p>}
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1 gap-2" onClick={() => void share()}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <a href={result.url} download={result.name} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-zinc-200">
              <Download className="h-4 w-4" /> Save
            </a>
          </div>
          <button type="button" onClick={() => setResult(null)} className="w-full text-center text-sm text-zinc-400 underline">
            Make another
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-300">
            Your session with everything the tracker showed: the rim line, the ball, the score, the streak flame and each make and miss.
            Made on your phone; nothing is uploaded.
          </p>
          {!busy && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  From
                  <select
                    value={from}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFrom(v);
                      if (to >= 0 && v > to) setTo(v);
                    }}
                    className={selectClass}
                  >
                    <option value={-1}>The start</option>
                    {calls.map((_, i) => (
                      <option key={i} value={i}>
                        {shotLabel(i)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  To
                  <select
                    value={to}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTo(v);
                      if (v >= 0 && from > v) setFrom(v);
                    }}
                    className={selectClass}
                  >
                    <option value={-1}>The end</option>
                    {calls.map((_, i) => (
                      <option key={i} value={i}>
                        {shotLabel(i)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Shape</p>
                <div className="mt-1 flex gap-2">
                  {shapeButton('vertical', 'Vertical 9:16')}
                  {shapeButton('original', 'As filmed')}
                </div>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm text-zinc-200">
                <input type="checkbox" checked={slowmo} onChange={(e) => setSlowmo(e.target.checked)} className="h-5 w-5 accent-orange-600" />
                Slow-mo replays of the best makes
              </label>
            </>
          )}
          {busy && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }} />
            </div>
          )}
          {busy ? (
            <Button variant="secondary" className="w-full gap-2" onClick={finishEarly}>
              <Square className="h-4 w-4" /> Stop here and keep it
            </Button>
          ) : (
            <Button variant="primary" className="w-full" onClick={() => void build()}>
              Make the video
            </Button>
          )}
          <p className="text-sm text-zinc-500">
            About {clock(seconds * 1000)} long{slowmo && replays ? `, with ${replays} slow-mo ${replays === 1 ? 'replay' : 'replays'}` : ''}, no sound. It plays
            through as it is made, so keep this screen open.
          </p>
        </>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
