// src/components/video/HighlightReel.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { highlightWindows, pickRecordingType, reelLengthMs } from '@/lib/video/highlights';
import { Film, Share2, Download } from 'lucide-react';

/**
 * Builds a highlight reel of the makes in a shooting video, entirely on the phone:
 * plays each window into a canvas (with a title card and a running make counter) and
 * records the canvas with MediaRecorder. Nothing is uploaded.
 */
export function HighlightReel({ file, makeTimesMs, makes, attempts }: { file: File; makeTimesMs: number[]; makes: number; attempts: number }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => () => {
    cancelRef.current = true;
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const windows = highlightWindows(makeTimesMs);
  const seconds = Math.round(reelLengthMs(windows) / 1000) + 2;

  async function build() {
    const type = typeof MediaRecorder !== 'undefined' ? pickRecordingType((t) => MediaRecorder.isTypeSupported(t)) : null;
    const canvasProbe = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream };
    if (!type || !canvasProbe.captureStream) {
      setError("This browser can't record video. Try Chrome on Android or Safari on iPhone (iOS 14.5+).");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    cancelRef.current = false;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('load'));
      });
      const duration = video.duration * 1000;
      const clips = highlightWindows(makeTimesMs, { durationMs: duration });

      // Portrait or landscape, max 1280 on the long side
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = canvasProbe;
      canvas.width = Math.round((video.videoWidth * scale) / 2) * 2;
      canvas.height = Math.round((video.videoHeight * scale) / 2) * 2;
      const ctx = canvas.getContext('2d')!;
      const stream = canvas.captureStream!(30);
      const recorder = new MediaRecorder(stream, { mimeType: type.mimeType, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

      const font = (px: number, weight = 800) => `${weight} ${Math.round(px * (canvas.width / 720))}px system-ui, sans-serif`;
      const titleCard = (ms: number) =>
        new Promise<void>((resolve) => {
          const end = performance.now() + ms;
          const tick = () => {
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.font = font(64, 900);
            ctx.fillText('Deadeye', canvas.width / 2, canvas.height * 0.42);
            ctx.fillStyle = '#f97316';
            ctx.font = font(26, 700);
            ctx.fillText('SHOOTING HIGHLIGHTS', canvas.width / 2, canvas.height * 0.42 + 44 * (canvas.width / 720));
            ctx.fillStyle = '#e4e4e7';
            ctx.font = font(40, 800);
            ctx.fillText(`${makes}/${attempts} · ${attempts ? Math.round((makes / attempts) * 100) : 0}%`, canvas.width / 2, canvas.height * 0.62);
            if (performance.now() < end) requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        });

      recorder.start(250);
      await titleCard(1500);

      let shown = 0;
      const total = reelLengthMs(clips);
      let done = 0;
      for (const clip of clips) {
        if (cancelRef.current) break;
        recorder.pause();
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = clip.startMs / 1000;
        });
        recorder.resume();
        await video.play();
        await new Promise<void>((resolve) => {
          const draw = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Running make counter, bumped as each make in this clip happens
            const madeSoFar = shown + makeTimesMs.filter((t) => t >= clip.startMs && t <= video.currentTime * 1000).length;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(16, 16, 200 * (canvas.width / 720), 64 * (canvas.width / 720));
            ctx.fillStyle = '#f97316';
            ctx.textAlign = 'left';
            ctx.font = font(34, 900);
            ctx.fillText(`🏀 ${Math.min(madeSoFar, makes)}`, 30, 16 + 46 * (canvas.width / 720));
            setProgress((done + (video.currentTime * 1000 - clip.startMs)) / Math.max(total, 1));
            if (cancelRef.current || video.ended || video.currentTime * 1000 >= clip.endMs) {
              video.pause();
              resolve();
            } else requestAnimationFrame(draw);
          };
          draw();
        });
        shown += clip.makes;
        done += clip.endMs - clip.startMs;
      }

      recorder.stop();
      await stopped;
      if (cancelRef.current) return;
      const blob = new Blob(chunks, { type: type.mimeType.split(';')[0] });
      setResult({ url: URL.createObjectURL(blob), blob, name: `deadeye-highlights.${type.extension}` });
    } catch {
      setError('Could not build the highlight reel from this video.');
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
        await navigator.share({ files: [shareFile], text: `${makes}/${attempts} on Deadeye 🏀` });
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

  if (makeTimesMs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-pink-600/40 bg-pink-600/10 p-4 space-y-3">
      <div className="flex items-center gap-2 font-bold text-white">
        <Film className="h-5 w-5 text-pink-400" /> Highlight reel
      </div>
      {result ? (
        <>
          <video src={result.url} controls playsInline className="w-full rounded-xl bg-black" />
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1 gap-2" onClick={() => void share()}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <a href={result.url} download={result.name} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-zinc-200">
              <Download className="h-4 w-4" /> Save
            </a>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-300">
            Cut your {Math.min(makeTimesMs.length, 20)} makes into a ~{seconds}s clip, made on your phone. Keep this screen open while it
            records (it plays through in real time).
          </p>
          {busy && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-pink-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <Button variant="primary" className="w-full" isLoading={busy} onClick={() => void build()}>
            Make highlight reel
          </Button>
        </>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {windows.length > 0 && !result && !busy && <p className="text-sm text-zinc-500">{windows.length} clips · no sound</p>}
    </div>
  );
}
