// src/components/video/JumpTest.tsx
'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getPoseLandmarker, resetPoseLandmarker } from '@/lib/video/mediapipe';
import { nextPoseTimestamp } from '@/lib/video/poseClock';
import { detectJump, flightSeconds, jumpHeightCm, plausibleFlight, type FootSample } from '@/lib/video/jump';
import type { MeasurementSystem } from '@/lib/units';
import { isPersonalBest, lengthUnit } from '@/lib/performanceTests';
import { localDateString } from '@/lib/dates';
import { seekTo } from '@/lib/video/seek';
import { ArrowUpFromLine, ChevronLeft, ChevronRight, FileVideo } from 'lucide-react';

const SLOW_MOTION = [
  { factor: 1, label: 'Normal video' },
  { factor: 4, label: 'Slow-mo 120 fps (4×)' },
  { factor: 8, label: 'Slow-mo 240 fps (8×)' },
];

// Frame-step size: fine enough for 60 fps video
const FRAME_RATE = 60;

// Ankles, heels and hips in MediaPipe Pose
const FEET = [27, 28, 29, 30];
const HIPS = [23, 24];

export function JumpTest({ units }: { units: MeasurementSystem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [slow, setSlow] = useState(1);
  const [takeoff, setTakeoff] = useState<number | null>(null);
  const [landing, setLanding] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testType, setTestType] = useState<'standing_vertical' | 'approach_vertical'>('standing_vertical');
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const flight = takeoff != null && landing != null ? flightSeconds(takeoff, landing, slow) : null;
  const heightCm = flight != null ? jumpHeightCm(flight) : null;
  const shown = heightCm == null ? null : units === 'imperial' ? `${(heightCm / 2.54).toFixed(1)} in` : `${heightCm.toFixed(1)} cm`;

  function open(f: File) {
    setFile(f);
    setTakeoff(null);
    setLanding(null);
    setMessage(null);
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(f);
        videoRef.current.currentTime = 0.05;
      }
    });
  }

  function step(frames: number) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + frames / FRAME_RATE));
  }

  async function autoDetect() {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);
    setMessage(null);
    let pose;
    try {
      pose = await getPoseLandmarker();
    } catch {
      setBusy(false);
      setMessage({ tone: 'error', text: 'Could not load the body tracker. Check your connection and try again.' });
      return;
    }
    // From the current moment: ~2.5 s of real time (longer for slow-motion video), max 240 frames
    const start = video.currentTime;
    const end = Math.min(video.duration || start + 3, start + 2.5 * slow);
    const dt = Math.max(1 / 120, (end - start) / 240);
    const samples: FootSample[] = [];
    try {
      for (let t = start; t <= end; t += dt) {
        // Stop sampling rather than hang if the clip will not seek; whatever was
        // collected still goes through the jump analysis, which has its own
        // minimum and reports plainly when there is too little.
        if (!(await seekTo(video, t))) break;
        const lm = pose.detectForVideo(video, nextPoseTimestamp(20)).landmarks?.[0];
        if (lm) {
          const avg = (idx: number[]) => idx.reduce((n, i) => n + lm[i].y, 0) / idx.length;
          samples.push({ t, footY: avg(FEET), hipY: avg(HIPS) });
        }
        setProgress((t - start) / Math.max(end - start, 0.01));
      }
    } catch {
      // A failed graph stays failed, so drop it: the next try builds a new one
      resetPoseLandmarker();
      setBusy(false);
      setMessage({ tone: 'error', text: 'The body tracker stopped partway through. Try again.' });
      return;
    }
    setBusy(false);
    const jump = detectJump(samples);
    if (!jump) {
      setMessage({
        tone: 'error',
        text: 'Could not find the jump. Pause just before you jump (standing still), keep your whole body and feet in view, then try again, or set takeoff and landing by hand.',
      });
      return;
    }
    setTakeoff(jump.takeoff);
    setLanding(jump.landing);
    await seekTo(video, jump.takeoff);
    setMessage({ tone: 'info', text: 'Found it. Check the takeoff and landing frames below and adjust if needed.' });
  }

  async function save() {
    if (heightCm == null || flight == null) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const unit = lengthUnit(units);
    const value = Math.round((units === 'imperial' ? heightCm / 2.54 : heightCm) * 10) / 10;
    // Earlier jumps count whichever unit they were logged in
    const { data: earlier } = await supabase
      .from('performance_tests')
      .select('value, unit')
      .eq('user_id', user.id)
      .eq('test_type', testType);
    const isPR = isPersonalBest({ value, unit }, earlier || [], false);
    const { error } = await supabase.from('performance_tests').insert({
      user_id: user.id,
      test_date: localDateString(),
      test_type: testType,
      value,
      unit,
      is_personal_record: isPR,
      notes: `Measured with Deadeye video jump test (flight time ${flight.toFixed(3)} s${slow > 1 ? `, ${slow}× slow-mo` : ''})`,
    });
    setSaving(false);
    setMessage(
      error
        ? { tone: 'error', text: `Could not save: ${error.message}` }
        : { tone: 'success', text: isPR ? `New personal record: ${shown}! 🔥` : `Saved ${shown} to your tests.` }
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.tone} title={message.tone === 'error' ? 'Check this' : message.tone === 'success' ? 'Saved' : 'Jump test'}>
          {message.text}{' '}
          {message.tone === 'success' && (
            <Link href="/workouts/tests" className="underline">
              See all tests
            </Link>
          )}
        </Alert>
      )}

      {!file ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Measures your vertical from <strong>how long you&apos;re in the air</strong>, the method used by pro jump-testing apps. No tape
            measure needed.
          </p>
          <ul className="text-sm text-zinc-400 list-disc pl-5 space-y-1">
            <li>Phone still, on the floor or a low tripod, filming from the side. Whole body and feet in view.</li>
            <li>Stand still for a second, jump as high as you can, land on the same spot with legs straight-ish.</li>
            <li>Slow-motion video (120 or 240 fps) gives the most accurate result.</li>
          </ul>
          <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
            <FileVideo className="h-6 w-6 text-orange-400" />
            <div>
              <div className="font-semibold text-white">Choose your jump video</div>
              <div className="text-xs text-zinc-500">Analysed on your phone, nothing uploaded</div>
            </div>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && open(e.target.files[0])} />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <video ref={videoRef} playsInline muted controls className="w-full rounded-2xl bg-black" />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-zinc-400">
              Video type
              <select
                value={slow}
                onChange={(e) => setSlow(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
              >
                {SLOW_MOTION.map((s) => (
                  <option key={s.factor} value={s.factor}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-400">
              Test
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as typeof testType)}
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
              >
                <option value="standing_vertical">Standing vertical</option>
                <option value="approach_vertical">Approach vertical</option>
              </select>
            </label>
          </div>

          <p className="text-xs text-zinc-500">Play or scrub to just before the jump (while standing still), then:</p>
          <Button variant="primary" className="w-full gap-2" isLoading={busy} onClick={() => void autoDetect()}>
            <ArrowUpFromLine className="h-4 w-4" /> Find my jump
          </Button>
          {busy && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button type="button" onClick={() => step(-1)} className="rounded-lg bg-zinc-800 p-2" aria-label="Back one frame">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-zinc-400">Step frame by frame</span>
              <button type="button" onClick={() => step(1)} className="rounded-lg bg-zinc-800 p-2" aria-label="Forward one frame">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTakeoff(videoRef.current?.currentTime ?? null)}
                className="rounded-lg bg-zinc-800 py-2 font-semibold text-zinc-200"
              >
                Set takeoff here{takeoff != null ? ` (${takeoff.toFixed(2)}s)` : ''}
              </button>
              <button
                type="button"
                onClick={() => setLanding(videoRef.current?.currentTime ?? null)}
                className="rounded-lg bg-zinc-800 py-2 font-semibold text-zinc-200"
              >
                Set landing here{landing != null ? ` (${landing.toFixed(2)}s)` : ''}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">Takeoff = last frame toes touch the floor. Landing = first frame toes touch again.</p>
          </div>

          {heightCm != null && flight != null && (
            <div className="rounded-2xl border border-orange-600/40 bg-orange-600/10 p-4 text-center">
              {plausibleFlight(flight) ? (
                <>
                  <div className="text-4xl font-black text-orange-400">{shown}</div>
                  <div className="text-xs text-zinc-400">
                    {flight.toFixed(3)} s in the air · {testType === 'standing_vertical' ? 'standing' : 'approach'} vertical
                  </div>
                  <Button variant="primary" className="mt-3 w-full" isLoading={saving} onClick={() => void save()}>
                    Save to my tests
                  </Button>
                </>
              ) : (
                <p className="text-sm text-amber-200">
                  {flight.toFixed(2)} s in the air doesn&apos;t look right. Check takeoff and landing
                  {slow === 1 ? ', and whether this is a slow-motion video' : ''}.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setFile(null);
              setTakeoff(null);
              setLanding(null);
            }}
            className="w-full text-center text-xs text-zinc-500"
          >
            Use a different video
          </button>
        </div>
      )}
    </div>
  );
}
