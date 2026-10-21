// src/app/(app)/basketball/new/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { sessionSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CourtMap } from '@/components/basketball/CourtMap';
import { classifyZone, ZONE_LABELS, ZONE_SPOTS, type CourtZone } from '@/lib/court';
import { localDateString } from '@/lib/dates';
import { sessionCategoryForSkill } from '@/lib/drills';
import { announceShot, loadSound, preloadRecordings } from '@/lib/video/trackerSound';
import {
  enqueue,
  getUserIdForSave,
  isOffline,
  newId,
  saveBasketballSession,
  type BasketballSavePayload,
} from '@/lib/offline';
import { SavedOfflineCard } from '@/components/SavedOfflineCard';
import { FirstLogGuide, logGuideStep } from '@/components/basketball/FirstLogGuide';
import { LOG_GUIDE_HIDDEN_KEY, readFlag, writeFlag } from '@/lib/starter';
import { ArrowLeft, Plus, Timer, Undo2, X, Flame } from 'lucide-react';

interface TrackedShot {
  zone: CourtZone;
  made: boolean;
  x: number;
  y: number;
}

interface Drill {
  key: string;
  name: string;
  category: string;
  minutes: number | '';
  shots: TrackedShot[];
  /** Makes are tracked on the court, but it is not a shooting drill (a layup series). */
  tracked?: boolean;
}

interface Spot {
  x: number;
  y: number;
  zone: CourtZone;
}

interface Draft {
  startedAt: number;
  sessionDate: string;
  sessionType: string;
  drills: Drill[];
  activeKey: string;
  // Kept with the draft so a player who leaves mid-session comes back to MAKE
  // and MISS ready to tap, not disabled until they find their spot again
  spot?: Spot | null;
}

/** How this player likes to log, remembered on the device between sessions */
interface Prefs {
  mode: 'track' | 'totals';
  attempts: number;
}

const DRAFT_KEY = 'hoopiq-hoops-draft-v1';
const PREFS_KEY = 'hoopiq-hoops-prefs-v1';

// Shots per spot in "Enter totals". Up to TAP_MAKES_MAX, the makes are a row of
// numbers to tap, so a spot is two taps: the court, then how many went in.
const ATTEMPT_CHOICES = [5, 10, 20];
const TAP_MAKES_MAX = 20;

const SHOOTING_PRESETS = ['Spot shooting', '5-spot 3s', 'Free throws', 'Mid-range pull-ups', 'Catch & shoot', 'Game shots'];
const OTHER_CATEGORIES = [
  { value: 'ball-handling', label: 'Ball handling' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'footwork', label: 'Footwork' },
  { value: 'defense', label: 'Defense' },
  { value: 'passing', label: 'Passing' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'other', label: 'Other' },
];
const SESSION_TYPES = [
  { value: 'shooting', label: 'Shooting' },
  { value: 'skills', label: 'Skills' },
  { value: 'ball-handling', label: 'Ball handling' },
  { value: 'footwork', label: 'Footwork' },
  { value: 'scrimmage', label: 'Scrimmage' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'game', label: 'Game' },
  { value: 'mixed', label: 'Mixed' },
];
const CHALLENGE_MINUTES = [1, 3, 5, 10];

function newDrill(name: string, category = 'shooting'): Drill {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, category, minutes: '', shots: [] };
}

/** Drills logged shot by shot on the court, rather than in minutes. */
function tracksShots(d: Drill): boolean {
  return d.category === 'shooting' || !!d.tracked;
}

function pct(makes: number, attempts: number): string {
  return attempts > 0 ? `${Math.round((makes / attempts) * 100)}%` : '–';
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function freshDraft(): Draft {
  const first = newDrill('Spot shooting');
  return { startedAt: Date.now(), sessionDate: localDateString(), sessionType: 'shooting', drills: [first], activeKey: first.key, spot: null };
}

function validAttempts(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 1000;
}

export default function NewBasketballSessionPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Prefs['mode']>('track');
  const [error, setError] = useState<string | null>(null);

  // Manual totals entry. The spot is the same one the court map sets for
  // tracking; the shots per spot stay put, because a player usually takes the
  // same number from every spot.
  const [attemptsChoice, setAttemptsChoice] = useState(10);
  const [attemptsOther, setAttemptsOther] = useState('');
  const [totalsMakes, setTotalsMakes] = useState('');
  const [lastAdded, setLastAdded] = useState<{ drillKey: string; count: number; text: string } | null>(null);

  // Timed challenge
  const [challengeEndsAt, setChallengeEndsAt] = useState<number | null>(null);
  const [challengeStartShots, setChallengeStartShots] = useState(0);
  const [challengeResult, setChallengeResult] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Finish
  const [finishOpen, setFinishOpen] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [intensityRpe, setIntensityRpe] = useState(6);
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  // Other (non-shooting) drill form
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [otherCategory, setOtherCategory] = useState('ball-handling');
  const [otherMinutes, setOtherMinutes] = useState('10');

  const shotsRef = useRef(0);
  const shotListRef = useRef<TrackedShot[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Restore an unfinished session, then add a drill started from the drill library
  useEffect(() => {
    (async () => {
      try {
        const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null') as Partial<Prefs> | null;
        if (prefs?.mode === 'track' || prefs?.mode === 'totals') setMode(prefs.mode);
        if (validAttempts(prefs?.attempts)) {
          if (ATTEMPT_CHOICES.includes(prefs.attempts)) setAttemptsChoice(prefs.attempts);
          else setAttemptsOther(String(prefs.attempts));
        }
      } catch {
        // storage unavailable or unreadable: the defaults are fine
      }

      let base: Draft | null = null;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Draft;
          if (saved?.drills?.length) base = saved;
        }
      } catch {
        // ignore unreadable draft
      }

      // ?drill=<slug> (drill library) or ?drills=<slug>,<slug> (program day / generator)
      const params = new URLSearchParams(window.location.search);
      const slugs = [params.get('drill'), ...(params.get('drills') || '').split(',')]
        .map((s) => (s || '').trim())
        .filter(Boolean)
        .slice(0, 20);
      if (slugs.length) {
        const { data: libraryDrills } = await createClient()
          .from('drills')
          .select('slug, name, skill, duration_minutes, tracks_makes')
          .in('slug', slugs);
        const bySlug = new Map(
          ((libraryDrills || []) as Array<{ slug: string; name: string; skill: string; duration_minutes: number; tracks_makes: boolean }>).map(
            (d) => [d.slug, d]
          )
        );
        const added: Drill[] = slugs
          .map((s) => bySlug.get(s))
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map((d) =>
            // A layup or post series still tracks makes, but is saved as the
            // finishing drill it is rather than as shooting
            d.tracks_makes
              ? { ...newDrill(d.name, sessionCategoryForSkill(d.skill)), tracked: true }
              : { ...newDrill(d.name, sessionCategoryForSkill(d.skill)), minutes: d.duration_minutes }
          );
        if (added.length) {
          const start = base || freshDraft();
          // A brand-new session replaces its empty default drill with the chosen ones
          const keep = base ? start.drills : start.drills.filter((d) => d.shots.length > 0);
          const drills = [...keep, ...added];
          const firstShooting = added.find(tracksShots);
          base = { ...start, drills, activeKey: firstShooting?.key || keep[0]?.key || drills[0].key };
          if (!drills.some(tracksShots)) {
            const shooting = newDrill('Spot shooting');
            base = { ...base, drills: [shooting, ...base.drills], activeKey: shooting.key };
          }
        }
      }

      if (base) setDraft(base);
      setReady(true);
    })();
  }, []);

  // Autosave on this device
  useEffect(() => {
    if (!ready) return;
    try {
      const hasContent = draft.drills.some((d) => d.shots.length > 0 || !tracksShots(d));
      if (hasContent) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // storage unavailable
    }
  }, [draft, ready]);

  // Keep the screen awake while tracking
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);
    return () => {
      lock?.release().catch(() => undefined);
    };
  }, []);

  // Fetch the make and miss recordings now, so the first shot is not silent
  useEffect(() => {
    preloadRecordings(loadSound());
  }, []);

  // First-time tips, only for a player with no session saved yet. Asked of the
  // database rather than remembered on the phone, so a player who logged on
  // another device is not walked through it again. Offline, no tips.
  const [guideOn, setGuideOn] = useState(false);
  useEffect(() => {
    if (readFlag(LOG_GUIDE_HIDDEN_KEY)) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const userId = await getUserIdForSave(supabase);
        if (!userId || isOffline()) return;
        const { count, error } = await supabase
          .from('training_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (!cancelled && !error && count === 0) setGuideOn(true);
      } catch {
        // Tips are a nicety: without an answer, the page works as it always did
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function hideGuide() {
    writeFlag(LOG_GUIDE_HIDDEN_KEY);
    setGuideOn(false);
  }

  const active = draft.drills.find((d) => d.key === draft.activeKey) || draft.drills[0];
  const spot = draft.spot ?? null;
  const attempts = attemptsOther ? Number(attemptsOther) : attemptsChoice;
  const attemptsValid = validAttempts(attempts);
  const allShots = useMemo(() => draft.drills.flatMap((d) => d.shots), [draft.drills]);
  // Refs are read inside the challenge-countdown interval (an event-driven callback,
  // not render), so they're synced here, after render, rather than written during it.
  useEffect(() => {
    shotsRef.current = allShots.length;
    shotListRef.current = allShots;
  }, [allShots]);

  // Challenge countdown
  useEffect(() => {
    if (!challengeEndsAt) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= challengeEndsAt) {
        setChallengeEndsAt(null);
        navigator.vibrate?.([300, 100, 300]);
        const shots = shotListRef.current.slice(challengeStartShots);
        const makes = shots.filter((s) => s.made).length;
        setChallengeResult(`Time! ${makes}/${shots.length} (${pct(makes, shots.length)})`);
      }
    }, 200);
    return () => clearInterval(id);
  }, [challengeEndsAt, challengeStartShots]);

  function updateActive(change: (d: Drill) => Drill) {
    setDraft((d) => ({ ...d, drills: d.drills.map((x) => (x.key === d.activeKey ? change(x) : x)) }));
  }

  function setSpot(next: Spot) {
    setDraft((d) => ({ ...d, spot: next }));
  }

  function handleTap(x: number, y: number) {
    setSpot({ x, y, zone: classifyZone(x, y) });
    // After the render that enables the buttons; does nothing if already in view
    requestAnimationFrame(() => controlsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }));
  }

  // The list is there for when a tap lands in the wrong zone: the corner 3 is a
  // strip about 20px wide on a phone
  function pickZone(zone: CourtZone) {
    setSpot({ ...ZONE_SPOTS[zone], zone });
  }

  function savePrefs(next: Partial<Prefs>) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ mode, attempts: attemptsValid ? attempts : 10, ...next }));
    } catch {
      // storage unavailable
    }
  }

  function changeMode(next: Prefs['mode']) {
    setMode(next);
    setLastAdded(null);
    savePrefs({ mode: next });
  }

  function chooseAttempts(n: number) {
    setAttemptsChoice(n);
    setAttemptsOther('');
    savePrefs({ attempts: n });
  }

  function typeAttempts(value: string) {
    setAttemptsOther(value);
    const n = Number(value);
    // Clearing the box goes back to the highlighted choice
    if (!value) savePrefs({ attempts: attemptsChoice });
    else if (validAttempts(n)) savePrefs({ attempts: n });
  }

  /**
   * Shows a validation message and scrolls it into view.
   *
   * Every error on this page renders in one slot near the top. The drill and
   * totals sub-forms are far below it on a phone, so a player who got something
   * wrong down there tapped the button, saw nothing move, and had no way to know
   * why. The slot below is always mounted so this can scroll to it before the
   * message itself has rendered. When the finish panel is open the error renders
   * inside the panel, so leave the page behind it where it is.
   */
  function fail(message: string) {
    setError(message);
    if (!finishOpen) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function record(made: boolean) {
    if (!spot) {
      fail('Tap the court where you are shooting from first.');
      return;
    }
    setError(null);
    setLastAdded(null);
    // Small jitter so repeated shots from one spot stay visible on the chart
    const jitter = () => (Math.random() - 0.5) * 0.8;
    updateActive((d) => ({
      ...d,
      shots: [...d.shots, { zone: spot.zone, made, x: spot.x + jitter(), y: spot.y + jitter() }],
    }));
    navigator.vibrate?.(made ? 25 : [15, 40, 15]);
    // The same sounds (and voice, if chosen) as the video tracker, set once in
    // Settings. Played inside the tap, the only moment iOS lets audio start.
    announceShot(loadSound(), made, active.shots.filter((s) => s.made).length + (made ? 1 : 0), active.shots.length + 1);
  }

  function undo() {
    setLastAdded(null);
    updateActive((d) => ({ ...d, shots: d.shots.slice(0, -1) }));
  }

  function addShootingDrill(name: string) {
    const drill = newDrill(name);
    setDraft((d) => ({ ...d, drills: [...d.drills, drill], activeKey: drill.key }));
  }

  function addTotals(makes: number) {
    if (!spot) {
      fail('Tap the court where you are shooting from first.');
      return;
    }
    if (!attemptsValid || !Number.isInteger(makes) || makes < 0 || makes > attempts) {
      fail('Enter whole numbers, with makes no more than shots.');
      return;
    }
    setError(null);
    const added: TrackedShot[] = Array.from({ length: attempts }, (_, i) => ({
      zone: spot.zone,
      made: i < makes,
      x: spot.x + (Math.random() - 0.5) * 2,
      y: spot.y + (Math.random() - 0.5) * 2,
    }));
    updateActive((d) => ({ ...d, shots: [...d.shots, ...added] }));
    // One tap logs a whole spot, so a wrong tap needs a one-tap way back
    setLastAdded({ drillKey: active.key, count: attempts, text: `${makes}/${attempts} from ${ZONE_LABELS[spot.zone]}` });
    setTotalsMakes('');
    navigator.vibrate?.(25);
  }

  function undoTotals() {
    if (!lastAdded) return;
    const { drillKey, count } = lastAdded;
    setDraft((d) => ({
      ...d,
      drills: d.drills.map((x) => (x.key === drillKey ? { ...x, shots: x.shots.slice(0, Math.max(0, x.shots.length - count)) } : x)),
    }));
    setLastAdded(null);
  }

  function addOtherDrill() {
    const minutes = Number(otherMinutes);
    if (!otherName.trim()) {
      fail('Give the drill a name.');
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
      fail('Minutes must be a whole number between 1 and 600.');
      return;
    }
    setError(null);
    const drill: Drill = { ...newDrill(otherName.trim(), otherCategory), minutes };
    setDraft((d) => ({ ...d, drills: [...d.drills, drill] }));
    setOtherOpen(false);
    setOtherName('');
  }

  const startChallenge = useCallback((minutes: number) => {
    setChallengeResult(null);
    setChallengeStartShots(shotsRef.current);
    setChallengeEndsAt(Date.now() + minutes * 60_000);
    setNow(Date.now());
  }, []);

  function discard() {
    if (!window.confirm('Discard this session? Tracked shots will be lost.')) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    router.push('/basketball');
  }

  function openFinish() {
    const hasContent = draft.drills.some((d) => d.shots.length > 0 || (!tracksShots(d) && d.minutes !== ''));
    if (!hasContent) {
      setError('Track at least one shot or add a drill before finishing.');
      return;
    }
    setError(null);
    const elapsed = Math.round((Date.now() - draft.startedAt) / 60000);
    setDurationMinutes(Math.min(360, Math.max(5, elapsed)));
    setFinishOpen(true);
  }

  async function save() {
    const parsed = sessionSchema.safeParse({
      sessionDate: draft.sessionDate,
      sessionType: draft.sessionType,
      durationMinutes: Number(durationMinutes),
      intensityRpe: Number(intensityRpe),
      perceivedQuality: Number(quality),
      notes: notes || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const userId = await getUserIdForSave(supabase);
    if (!userId) {
      if (isOffline()) {
        setError('You are offline and not logged in on this phone. Your session is kept here; save it once you are back online.');
        setSaving(false);
      } else {
        router.push('/login');
      }
      return;
    }

    const payload: BasketballSavePayload = {
      id: newId(),
      session: {
        session_date: draft.sessionDate,
        // draft.sessionType/drill.category come from the fixed SESSION_TYPES
        // dropdown and sessionCategoryForSkill()/newDrill(), both of which only
        // ever produce the DB's enum values - this isn't a free-text field.
        session_type: draft.sessionType as BasketballSavePayload['session']['session_type'],
        duration_minutes: Number(durationMinutes),
        intensity_rpe: Number(intensityRpe),
        perceived_quality: Number(quality),
        notes: notes || null,
      },
      drills: draft.drills
        .filter((d) => d.shots.length > 0 || !tracksShots(d))
        .map((drill) => {
          // One row per zone with the drill's makes and attempts
          const byZone = new Map<CourtZone, { makes: number; attempts: number }>();
          for (const s of drill.shots) {
            const z = byZone.get(s.zone) || { makes: 0, attempts: 0 };
            z.attempts += 1;
            if (s.made) z.makes += 1;
            byZone.set(s.zone, z);
          }
          return {
            name: drill.name,
            category: drill.category as BasketballSavePayload['drills'][number]['category'],
            minutes: drill.minutes === '' ? null : Number(drill.minutes),
            zones: [...byZone.entries()].map(([zone, t]) => ({ zone, ...t })),
          };
        }),
    };

    const result = isOffline() ? { network: true, error: 'offline' } : await saveBasketballSession(supabase, userId, payload);
    if (result.error && !result.network) {
      setError(`${result.error}. Nothing was saved, please try again.`);
      setSaving(false);
      return;
    }

    if (result.network) {
      const shots = draft.drills.reduce((n, d) => n + d.shots.length, 0);
      enqueue({
        id: payload.id,
        kind: 'basketball',
        userId,
        label: `${draft.sessionType} session${shots ? ` · ${shots} shots` : ''}`,
        createdAt: Date.now(),
        payload,
      });
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    if (result.network) {
      setSaving(false);
      setFinishOpen(false);
      setSavedOffline(true);
      return;
    }
    // ?saved=1 lets the Hoops page celebrate a first session (FirstSessionCelebration)
    router.push('/basketball?saved=1');
    router.refresh();
  }

  function startAnother() {
    setDraft(freshDraft());
    setNotes('');
    setSavedOffline(false);
  }

  if (savedOffline) {
    return <SavedOfflineCard what="session" backHref="/basketball" onAnother={startAnother} />;
  }

  // ---------------------------------------------------------------------------
  const activeMakes = active.shots.filter((s) => s.made).length;
  const totalMakes = allShots.filter((s) => s.made).length;
  let streak = 0;
  for (let i = active.shots.length - 1; i >= 0 && active.shots[i].made; i--) streak++;

  const zoneTotals = new Map<CourtZone, { makes: number; attempts: number }>();
  for (const s of allShots) {
    const z = zoneTotals.get(s.zone) || { makes: 0, attempts: 0 };
    z.attempts += 1;
    if (s.made) z.makes += 1;
    zoneTotals.set(s.zone, z);
  }

  const guideStep = logGuideStep(!!spot, allShots.length);
  const challengeRemaining = challengeEndsAt ? (challengeEndsAt - now) / 1000 : 0;
  const shootingDrills = draft.drills.filter(tracksShots);

  return (
    <div className="flex-1 overflow-auto pb-24">
      <div className="p-4 md:p-8 max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/basketball" aria-label="Back" className="h-10 w-10 flex items-center justify-center rounded-xl border border-zinc-800 text-zinc-400">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black text-white">Hoops Session</h1>
            <p className="text-xs text-zinc-500">
              {totalMakes}/{allShots.length} · {pct(totalMakes, allShots.length)}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={openFinish}
            className={guideOn && guideStep === 3 ? 'ring-2 ring-orange-300 ring-offset-2 ring-offset-zinc-950 animate-pulse' : undefined}
          >
            Finish
          </Button>
        </div>

        {/* Always mounted so fail() can scroll here before the Alert renders */}
        <div ref={errorRef}>
          {error && (
            <Alert variant="error" title="Check this" className="mb-3">
              {error}
            </Alert>
          )}
        </div>

        {/* Drill tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 [scrollbar-width:none]">
          {shootingDrills.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDraft((x) => ({ ...x, activeKey: d.key }))}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                d.key === active.key ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {d.name} {d.shots.length > 0 && `· ${d.shots.filter((s) => s.made).length}/${d.shots.length}`}
            </button>
          ))}
          <select
            value=""
            onChange={(e) => e.target.value && addShootingDrill(e.target.value)}
            aria-label="Add a shooting drill"
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-orange-400"
          >
            <option value="">+ Drill</option>
            {SHOOTING_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-900 p-1 mb-3">
          {(['track', 'totals'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMode(m)}
              aria-pressed={mode === m}
              className={`rounded-lg py-2 text-xs font-semibold ${mode === m ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              {m === 'track' ? 'Track every shot' : 'Enter totals'}
            </button>
          ))}
        </div>

        {guideOn && <FirstLogGuide step={guideStep} mode={mode} onHide={hideGuide} />}

        <CourtMap shots={active.shots} selected={spot} onTap={handleTap} />

        {spot ? (
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mt-2 mb-3">
            <label className="flex min-w-0 items-center gap-1">
              Spot:
              <select
                value={spot.zone}
                onChange={(e) => pickZone(e.target.value as CourtZone)}
                className="min-w-0 rounded-md bg-transparent py-1 font-semibold text-zinc-200 underline decoration-zinc-600 underline-offset-4"
              >
                {(Object.keys(ZONE_SPOTS) as CourtZone[]).map((z) => (
                  <option key={z} value={z} className="bg-zinc-900">
                    {ZONE_LABELS[z]}
                  </option>
                ))}
              </select>
            </label>
            <span className="flex flex-shrink-0 items-center gap-1">
              {streak >= 3 && <Flame className="h-3.5 w-3.5 text-orange-400" />}
              {active.name}: {activeMakes}/{active.shots.length} ({pct(activeMakes, active.shots.length)})
            </span>
          </div>
        ) : guideOn ? (
          // The first-time tip above the court already says this
          <div className="mb-3" />
        ) : (
          // Sits directly above the logging buttons because those are disabled
          // until a spot is picked - the page-level error Alert is off-screen here.
          <p className="mt-2 mb-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-center text-xs font-semibold text-orange-300">
            Tap the court above to set where you are shooting from
          </p>
        )}

        {/* Scrolled into view when a spot is tapped: on a phone the court fills
            the screen and MAKE and MISS start below the bottom nav, so a first
            tap on the court looked like it did nothing. scroll-mb clears the nav. */}
        <div ref={controlsRef} className="scroll-mb-24">
        {mode === 'track' ? (
          <>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => record(true)}
                disabled={!spot}
                className="h-24 rounded-2xl bg-emerald-600 text-2xl font-black text-white transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                MAKE
              </button>
              <button
                type="button"
                onClick={() => record(false)}
                disabled={!spot}
                className="h-24 rounded-2xl bg-red-600/90 text-2xl font-black text-white transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                MISS
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={active.shots.length === 0}
                aria-label="Undo last shot"
                className="h-24 w-14 flex items-center justify-center rounded-2xl bg-zinc-800 text-zinc-300 disabled:opacity-40"
              >
                <Undo2 className="h-5 w-5" />
              </button>
            </div>

            {/* Timed challenge */}
            <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              {challengeEndsAt && challengeRemaining > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-orange-400 font-black text-2xl tabular-nums">
                    <Timer className="h-5 w-5" /> {formatClock(challengeRemaining)}
                  </span>
                  <span className="text-sm text-zinc-300">
                    {allShots.slice(challengeStartShots).filter((s) => s.made).length}/{allShots.length - challengeStartShots} made
                  </span>
                  <button type="button" onClick={() => setChallengeEndsAt(null)} className="text-xs text-zinc-500">
                    Stop
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-400">Timed challenge</span>
                  <div className="flex gap-1.5">
                    {CHALLENGE_MINUTES.map((m) => (
                      <button key={m} type="button" onClick={() => startChallenge(m)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200">
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {challengeResult && <p className="mt-2 text-sm font-bold text-emerald-400">{challengeResult}</p>}
            </div>
          </>
        ) : (
          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="flex items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-zinc-400">Shots per spot</span>
              {ATTEMPT_CHOICES.map((n) => {
                const on = !attemptsOther && attemptsChoice === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => chooseAttempts(n)}
                    aria-pressed={on}
                    className={`h-9 min-w-10 rounded-lg px-2.5 text-sm font-bold tabular-nums ${on ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    {n}
                  </button>
                );
              })}
              <input
                inputMode="numeric"
                value={attemptsOther}
                onChange={(e) => typeAttempts(e.target.value)}
                placeholder="Other"
                aria-label="Other number of shots per spot"
                className={`h-9 w-16 rounded-lg px-2 text-center text-sm text-white placeholder:text-zinc-500 ${
                  attemptsOther ? 'bg-orange-600/20 ring-1 ring-orange-500' : 'bg-zinc-800'
                }`}
              />
            </div>

            {!attemptsValid ? (
              <p className="text-xs text-zinc-500">Shots per spot is a whole number from 1 to 1000.</p>
            ) : attempts <= TAP_MAKES_MAX ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-zinc-400">How many went in?</p>
                <div className={`grid gap-1.5 ${attempts <= 10 ? 'grid-cols-6' : 'grid-cols-7'}`}>
                  {Array.from({ length: attempts + 1 }, (_, n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => addTotals(n)}
                      disabled={!spot}
                      aria-label={`${n} of ${attempts} made`}
                      className="h-11 rounded-lg bg-zinc-800 text-base font-bold text-white tabular-nums transition-transform active:scale-95 active:bg-emerald-600 disabled:opacity-40 disabled:active:scale-100"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  inputMode="numeric"
                  value={totalsMakes}
                  onChange={(e) => setTotalsMakes(e.target.value)}
                  placeholder={`Made, out of ${attempts}`}
                  aria-label="Makes"
                  className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!spot}
                  onClick={() => addTotals(totalsMakes.trim() ? Number(totalsMakes) : NaN)}
                >
                  Add
                </Button>
              </div>
            )}

            {lastAdded && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold text-emerald-400">Added {lastAdded.text}</span>
                <button
                  type="button"
                  onClick={undoTotals}
                  className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-zinc-300 hover:text-white"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </button>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Zone breakdown */}
        {zoneTotals.size > 0 && (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <h2 className="text-xs font-semibold uppercase text-zinc-400 mb-2">By zone (whole session)</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {[...zoneTotals.entries()].map(([zone, t]) => (
                <div key={zone} className="flex justify-between">
                  <span className="text-zinc-300">{ZONE_LABELS[zone]}</span>
                  <span className="font-semibold text-white">
                    {t.makes}/{t.attempts} <span className="text-zinc-500">{pct(t.makes, t.attempts)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other drills */}
        <div className="mt-4 space-y-2">
          {draft.drills
            .filter((d) => !tracksShots(d))
            .map((d) => (
              <div key={d.key} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm">
                <span className="text-white">
                  {d.name} <span className="text-zinc-500">· {OTHER_CATEGORIES.find((c) => c.value === d.category)?.label} · {d.minutes} min</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDraft((x) => ({ ...x, drills: x.drills.filter((y) => y.key !== d.key) }))}
                  aria-label={`Remove ${d.name}`}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          {otherOpen ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-2">
              <input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="Drill name, e.g. Two-ball dribbling" aria-label="Drill name" className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white" />
              <div className="grid grid-cols-[1fr_6rem_auto] gap-2">
                <select value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)} aria-label="Drill type" className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white">
                  {OTHER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input inputMode="numeric" value={otherMinutes} onChange={(e) => setOtherMinutes(e.target.value)} aria-label="Minutes" placeholder="Min" className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white" />
                <Button variant="primary" size="sm" onClick={addOtherDrill}>
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setOtherOpen(true)} className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 py-3 text-sm font-semibold text-zinc-400">
              <Plus className="h-4 w-4" /> Add a non-shooting drill (handles, finishing, defense…)
            </button>
          )}
        </div>

        <button type="button" onClick={discard} className="mt-6 w-full text-center text-xs text-zinc-500 hover:text-red-400">
          Discard session
        </button>
      </div>

      {/* Finish panel */}
      {finishOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-2xl md:rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Finish session</h2>
              <button type="button" onClick={() => setFinishOpen(false)} aria-label="Close" className="text-zinc-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <Alert variant="error" title="Check this">{error}</Alert>}
            <p className="text-sm text-zinc-300">
              {totalMakes}/{allShots.length} shots ({pct(totalMakes, allShots.length)}) across {draft.drills.length} drill
              {draft.drills.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={draft.sessionDate} onChange={(e) => setDraft((d) => ({ ...d, sessionDate: e.target.value }))} aria-label="Session date" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white" />
              <select value={draft.sessionType} onChange={(e) => setDraft((d) => ({ ...d, sessionType: e.target.value }))} aria-label="Session type" className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white">
                {SESSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-400">Duration (minutes)</span>
              <input inputMode="numeric" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)} className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-400">Intensity RPE {intensityRpe}/10</span>
              <input type="range" min={1} max={10} value={intensityRpe} onChange={(e) => setIntensityRpe(Number(e.target.value))} className="mt-2 w-full accent-orange-500" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase text-zinc-400">How good was the session? {quality}/5</span>
              <input type="range" min={1} max={5} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-2 w-full accent-orange-500" />
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full h-16 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white" />
            <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={save}>
              Save session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
