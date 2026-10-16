// src/components/video/FormCheck.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getPoseLandmarker } from '@/lib/video/mediapipe';
import { seekTo } from '@/lib/video/seek';
import { analyzeShot, angleAt, LM, type PoseFrame, type ShotMechanics } from '@/lib/video/mechanics';
import type { Database } from '@/lib/supabase/types';
import { FileVideo, ScanLine } from 'lucide-react';

const FPS = 30;

interface Props {
  initialFile?: File | null;
  shotTimeMs?: number | null; // from the shot tracker: when the shot reached the rim
  heightCm: number | null;
  hand: 'right' | 'left';
  onResult?: (m: ShotMechanics) => void;
}

export function FormCheck({ initialFile, shotTimeMs, heightCm, hand, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [frames, setFrames] = useState<PoseFrame[]>([]);
  const [index, setIndex] = useState(0);
  const [mechanics, setMechanics] = useState<ShotMechanics | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !videoRef.current) return;
    const url = URL.createObjectURL(file);
    videoRef.current.src = url;
    videoRef.current.onloadedmetadata = () => {
      if (videoRef.current && shotTimeMs != null) videoRef.current.currentTime = Math.max(0, shotTimeMs / 1000 - 1);
    };
    return () => URL.revokeObjectURL(url);
  }, [file, shotTimeMs]);

  function drawSkeleton(frame: PoseFrame) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const p = (i: number) => ({ x: frame.landmarks[i].x * canvas.width, y: frame.landmarks[i].y * canvas.height });

    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineWidth = 3;
    for (const c of PoseLandmarker.POSE_CONNECTIONS) {
      if (c.start < 11 || c.end < 11) continue; // skip face points
      const a = p(c.start);
      const b = p(c.end);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.fillStyle = '#f97316';
    for (let i = 11; i < frame.landmarks.length; i++) {
      const pt = p(i);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Live angle labels at the shooting elbow and knees
    const l = frame.landmarks;
    const s = hand === 'right' ? [LM.rightShoulder, LM.rightElbow, LM.rightWrist] : [LM.leftShoulder, LM.leftElbow, LM.leftWrist];
    const label = (text: string, at: { x: number; y: number }) => {
      ctx.font = 'bold 14px system-ui';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(at.x + 8, at.y - 16, ctx.measureText(text).width + 8, 20);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, at.x + 12, at.y - 1);
    };
    label(`${Math.round(angleAt(l[s[0]], l[s[1]], l[s[2]]))}°`, p(s[1]));
    label(`${Math.round(angleAt(l[LM.rightHip], l[LM.rightKnee], l[LM.rightAnkle]))}°`, p(LM.rightKnee));
  }

  // Redraw the skeleton for the selected frame
  useEffect(() => {
    const video = videoRef.current;
    const frame = frames[index];
    if (!video || !frame) return;
    void seekTo(video, frame.t / 1000).then(() => drawSkeleton(frame));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames]);

  async function analyze() {
    const video = videoRef.current;
    if (!video || !file) return;
    setBusy(true);
    setError(null);
    setFrames([]);
    setMechanics(null);
    let pose;
    try {
      pose = await getPoseLandmarker();
    } catch {
      setBusy(false);
      setError('Could not load the body tracker. Check your connection and try again.');
      return;
    }

    // Analyse ~2.5 s before to 0.5 s after the shot (or the chosen moment)
    const anchor = shotTimeMs != null ? shotTimeMs / 1000 : video.currentTime + 1.5;
    const start = Math.max(0, anchor - 2.5);
    const end = Math.min(video.duration || anchor + 0.5, anchor + 0.5);
    const collected: PoseFrame[] = [];
    let ts = 0;
    for (let t = start; t <= end; t += 1 / FPS) {
      // Stop sampling rather than hang if the clip will not seek. Whatever was
      // collected up to here still goes through analyzeShot below, which has
      // its own minimum and will say so if there is too little.
      if (!(await seekTo(video, t))) break;
      ts += 1000 / FPS;
      const result = pose.detectForVideo(video, Math.round(performance.now() + ts));
      const lm = result.landmarks?.[0];
      if (lm) collected.push({ t: Math.round(t * 1000), landmarks: lm.map((q) => ({ x: q.x, y: q.y, visibility: q.visibility })) });
      setProgress((t - start) / Math.max(end - start, 0.01));
    }
    setBusy(false);

    const m = analyzeShot(collected, hand, heightCm);
    if (!m || collected.length < 10) {
      setError('Could not follow your body through the shot. Film side-on with your whole body in frame, then try again.');
      return;
    }
    setFrames(collected);
    setMechanics(m);
    setIndex(m.releaseFrame);
    onResult?.(m);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from('video_analyses').insert({ user_id: user.id, kind: 'form_check', summary: m as unknown as Database['public']['Tables']['video_analyses']['Insert']['summary'] });
  }

  const phases = mechanics
    ? [
        { label: 'Dip', frame: mechanics.dipFrame },
        { label: 'Set point', frame: mechanics.setPointFrame },
        { label: 'Release', frame: mechanics.releaseFrame },
        ...(mechanics.landingFrame != null ? [{ label: 'Landing', frame: mechanics.landingFrame }] : []),
      ]
    : [];

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}

      {!file ? (
        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
          <FileVideo className="h-6 w-6 text-cyan-400" />
          <div>
            <div className="font-semibold text-white">Choose a clip of your shot</div>
            <div className="text-xs text-zinc-500">Film side-on, whole body in frame, 1–10 seconds is ideal</div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
        </label>
      ) : (
        <>
          <div className="relative w-full overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted controls={frames.length === 0} className="w-full h-auto" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          </div>

          {frames.length === 0 && (
            <>
              <p className="text-sm text-zinc-400">
                {shotTimeMs != null
                  ? 'Ready to analyse the shot you picked.'
                  : 'Pause the video just before you start your shooting motion, then tap Analyse.'}
              </p>
              <Button variant="primary" size="lg" className="w-full gap-2" isLoading={busy} onClick={analyze}>
                <ScanLine className="h-4 w-4" /> {busy ? `Analysing ${Math.round(progress * 100)}%` : 'Analyse my form'}
              </Button>
            </>
          )}

          {mechanics && (
            <>
              <input type="range" min={0} max={frames.length - 1} value={index} onChange={(e) => setIndex(Number(e.target.value))} className="w-full accent-cyan-500" aria-label="Frame" />
              <div className="flex flex-wrap gap-2">
                {phases.map((ph) => (
                  <button key={ph.label} type="button" onClick={() => setIndex(ph.frame)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${index === ph.frame ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                    {ph.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Knee bend at the dip', `${mechanics.kneeBendDeg}°`, 'How far your knees bend to load the shot'],
                  ['Elbow at set point', `${mechanics.elbowAngleAtSetPointDeg}°`, 'Angle of your shooting arm at the top'],
                  ['Release angle', `${mechanics.releaseAngleDeg}°`, 'Forearm angle above horizontal as the ball leaves'],
                  ['Dip to release', `${mechanics.releaseTimeMs} ms`, 'How quickly you get the shot off'],
                  ['Jump height', mechanics.jumpHeightCm != null ? `≈ ${mechanics.jumpHeightCm} cm` : 'Add your height', 'Estimate from how far your hips rise'],
                  ['Landing balance', mechanics.landingBalancePct != null ? `${mechanics.landingBalancePct}%` : '–', '100% = both feet land level'],
                ].map(([title, value, hint]) => (
                  <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                    <div className="text-xs text-zinc-500">{title}</div>
                    <div className="text-xl font-black text-white">{value}</div>
                    <div className="text-[11px] text-zinc-500">{hint}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                Measurements come from a phone camera, so treat them as estimates. Comparing your own shots over time (same angle and
                distance) is more useful than any single number.
              </p>
              <button type="button" onClick={() => { setFrames([]); setMechanics(null); }} className="text-xs text-zinc-400 underline">
                Analyse a different moment
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
