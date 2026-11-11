// src/app/(app)/workouts/import/page.tsx
// Bring routines in from another gym app: paste the routine, add a screenshot,
// or pick a CSV export (Strong, Hevy or a spreadsheet). The player checks and
// edits what was read before anything is saved.
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardPaste, FileSpreadsheet, ImageIcon, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { hasPro } from '@/lib/entitlements';
import {
  applyLibraryMatches,
  importMonthStartIso,
  matchExercise,
  MAX_CSV_BYTES,
  MAX_EXERCISES,
  MAX_IMPORT_TEXT,
  monthlyImportLimit,
  parseWorkoutCsv,
  saveImportedProgram,
  type ImportedProgram,
  type ImportSource,
  type LibraryName,
} from '@/lib/routineImport';

type Tab = 'text' | 'image' | 'csv';

const TABS: Array<{ id: Tab; label: string; icon: typeof ClipboardPaste }> = [
  { id: 'text', label: 'Paste', icon: ClipboardPaste },
  { id: 'image', label: 'Screenshot', icon: ImageIcon },
  { id: 'csv', label: 'CSV file', icon: FileSpreadsheet },
];

interface EditableRoutine {
  key: string;
  keep: boolean;
  name: string;
  exercises: Array<{ key: string; name: string; sets: string; reps: string; notes: string | null; exerciseId: string | null }>;
}

/** Said under the paste box and the screenshot picker. */
const SENT_NOTE =
  "Sent to our AI provider only to read the exercises. Your name and account are not sent. Deadeye doesn't keep it, and the provider deletes it within 30 days.";

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

function toEditable(program: ImportedProgram): EditableRoutine[] {
  return program.routines.map((r) => ({
    key: nextKey(),
    keep: true,
    name: r.name,
    exercises: r.exercises.map((e) => ({
      key: nextKey(),
      name: e.name,
      sets: String(e.sets),
      reps: e.reps ?? '',
      notes: e.notes,
      exerciseId: e.exerciseId,
    })),
  }));
}

/**
 * Shrinks a screenshot on the phone before it is sent: long side at most
 * 1600px, as a JPEG. A phone screenshot is often 3-6 MB; this makes it a few
 * hundred KB, which is quicker to send and still sharp enough to read.
 */
async function shrinkImage(file: File): Promise<{ mediaType: 'image/jpeg'; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file is not a picture we can open.'));
      el.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the picture.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { mediaType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ImportRoutinesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('text');
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryName[]>([]);
  const [remaining, setRemaining] = useState<{ left: number; limit: number } | null>(null);
  // AI coaching switched off in Settings: only CSV import, which never leaves the phone
  const [aiOff, setAiOff] = useState(false);

  // The preview
  const [source, setSource] = useState<ImportSource | null>(null);
  const [programName, setProgramName] = useState('');
  const [routines, setRoutines] = useState<EditableRoutine[]>([]);
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      const [{ data: lib }, { data: sub }, { count }, { data: profile }] = await Promise.all([
        supabase.from('exercise_library').select('id, name'),
        supabase.from('subscriptions').select('plan_type, founding_pro_until').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('routine_imports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', importMonthStartIso()),
        supabase.from('profiles').select('ai_coaching_enabled').eq('id', user.id).maybeSingle(),
      ]);
      setLibrary((lib || []) as LibraryName[]);
      if (profile?.ai_coaching_enabled === false) {
        setAiOff(true);
        setTab('csv');
      }
      // The server has the last word (owners count as unlimited there too) and
      // sends the real figure back with each read
      const limit = monthlyImportLimit(hasPro(sub));
      if (typeof count === 'number') setRemaining({ left: Math.max(0, limit - count), limit });
    })();
  }, [router]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);

  function showPreview(program: ImportedProgram, from: ImportSource) {
    setSource(from);
    setProgramName(program.name);
    setRoutines(toEditable(program));
    setError(null);
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function readWithAI(body: Record<string, unknown>, from: 'text' | 'image') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/workouts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { program?: ImportedProgram; remaining?: number; limit?: number; error?: string; aiOff?: boolean }
        | null;
      if (json?.aiOff) {
        setAiOff(true);
        setTab('csv');
      }
      if (!res.ok || !json?.program) {
        setError(json?.error || 'The routine could not be read. Please try again.');
        if (res.status === 402) setRemaining((r) => (r ? { ...r, left: 0 } : r));
        return;
      }
      if (typeof json.remaining === 'number' && typeof json.limit === 'number') {
        setRemaining({ left: json.remaining, limit: json.limit });
      }
      showPreview(json.program, from);
    } catch {
      setError('Could not reach Deadeye. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function readText() {
    if (!text.trim()) {
      setError('Paste a routine first.');
      return;
    }
    await readWithAI({ kind: 'text', text }, 'text');
  }

  async function readImage() {
    if (!imageFile) {
      setError('Choose a screenshot first.');
      return;
    }
    let image: { mediaType: string; data: string };
    try {
      setBusy(true);
      image = await shrinkImage(imageFile);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'That picture could not be opened.');
      return;
    }
    await readWithAI({ kind: 'image', ...image }, 'image');
  }

  function pickImage(file: File | null) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    setError(null);
  }

  async function readCsv(file: File | null) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_CSV_BYTES) {
      setError('That file is too big to be a workout export.');
      return;
    }
    const name = file.name.replace(/\.(csv|txt|tsv)$/i, '').replace(/[_-]+/g, ' ').trim();
    const result = parseWorkoutCsv(await file.text(), name ? `From ${name}`.slice(0, 60) : 'Imported program');
    if (result.error || result.program.routines.length === 0) {
      setError(result.error || 'No routines found in that file.');
      return;
    }
    setCsvNote(
      result.format === 'history'
        ? 'Read from your workout history: one routine per workout name, as you last did it. Warm-up sets are left out.'
        : null
    );
    showPreview(applyLibraryMatches(result.program, library), 'csv');
  }

  // ---------------------------------------------------------------------------
  // Editing the preview
  // ---------------------------------------------------------------------------
  function updateRoutine(key: string, patch: Partial<EditableRoutine>) {
    setRoutines((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function updateExercise(routineKey: string, exerciseKey: string, patch: Partial<EditableRoutine['exercises'][number]>) {
    setRoutines((rs) =>
      rs.map((r) =>
        r.key === routineKey
          ? { ...r, exercises: r.exercises.map((e) => (e.key === exerciseKey ? { ...e, ...patch } : e)) }
          : r
      )
    );
  }
  function removeExercise(routineKey: string, exerciseKey: string) {
    setRoutines((rs) => rs.map((r) => (r.key === routineKey ? { ...r, exercises: r.exercises.filter((e) => e.key !== exerciseKey) } : r)));
  }
  function addExercise(routineKey: string) {
    setRoutines((rs) =>
      rs.map((r) =>
        r.key === routineKey && r.exercises.length < MAX_EXERCISES
          ? { ...r, exercises: [...r.exercises, { key: nextKey(), name: '', sets: '3', reps: '', notes: null, exerciseId: null }] }
          : r
      )
    );
  }

  const kept = routines.filter((r) => r.keep && r.exercises.some((e) => e.name.trim()));
  const matchedNames = useMemo(() => {
    const out = new Map<string, boolean>();
    for (const r of routines) for (const e of r.exercises) out.set(e.key, !!matchExercise(e.name, library));
    return out;
  }, [routines, library]);

  async function save() {
    if (!userId || !source) return;
    if (kept.length === 0) {
      setError('Keep at least one routine with an exercise in it.');
      return;
    }
    setBusy(true);
    setError(null);
    // Matched again here: a name the player corrected may now be in the library
    const program = applyLibraryMatches(
      {
        name: programName,
        routines: kept.map((r) => ({
          name: r.name,
          exercises: r.exercises
            .filter((e) => e.name.trim())
            .map((e) => ({ name: e.name, sets: Number(e.sets) || 3, reps: e.reps || null, notes: e.notes?.trim() || null, exerciseId: null })),
        })),
      },
      library
    );
    const result = await saveImportedProgram(createClient(), userId, program, source);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push('/workouts');
    router.refresh();
  }

  function chooseTab(id: Tab) {
    if (aiOff && id !== 'csv') return;
    setTab(id);
    setError(null);
  }

  /** Arrow keys move between the tabs, as a tab list should (WAI-ARIA tabs pattern). */
  function moveTab(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const usable = TABS.filter((t) => !(aiOff && t.id !== 'csv')).map((t) => t.id);
    const at = usable.indexOf(tab);
    const next = usable[(at + (e.key === 'ArrowRight' ? 1 : -1) + usable.length) % usable.length];
    e.preventDefault();
    chooseTab(next);
    document.getElementById(`import-tab-${next}`)?.focus();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 overflow-auto pb-28">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/workouts"
            aria-label="Back to workouts"
            className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white">Import routines</h1>
            <p className="text-sm text-zinc-400">Bring your routines from another gym app, a coach or your notes.</p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Where the routine comes from"
          onKeyDown={moveTab}
          className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-900 p-1"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const off = aiOff && t.id !== 'csv';
            return (
              <button
                key={t.id}
                id={`import-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="import-panel"
                tabIndex={tab === t.id ? 0 : -1}
                disabled={off}
                onClick={() => chooseTab(t.id)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                  tab === t.id ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div
          id="import-panel"
          role="tabpanel"
          aria-labelledby={`import-tab-${tab}`}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3"
        >
          {aiOff && (
            <p className="text-sm text-zinc-400">
              AI coaching is switched off in{' '}
              <Link href="/settings#ai-coaching" className="font-semibold text-zinc-200 underline">
                Settings
              </Link>
              , so routines can only be imported from a CSV file. Pasting and screenshots use AI to read the routine.
            </p>
          )}
          {tab === 'text' && (
            <>
              <label htmlFor="routine-text" className="block text-sm text-zinc-300">
                In your other app, share or copy the routine as text, then paste it here. A coach&apos;s message or a note works
                too.
              </label>
              <textarea
                id="routine-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_IMPORT_TEXT))}
                rows={9}
                placeholder={'Push day\nBench Press 4 x 6-8\nIncline DB Press 3 x 10\nCable Fly 3 x 12-15'}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <p className="text-sm text-zinc-500">
                {text.length.toLocaleString('en-IE')} / {MAX_IMPORT_TEXT.toLocaleString('en-IE')} characters. Leave out names and phone
                numbers. {SENT_NOTE}
              </p>
              <Button className="w-full" onClick={readText} isLoading={busy} disabled={remaining?.left === 0}>
                Read routine
              </Button>
            </>
          )}

          {tab === 'image' && (
            <>
              <p className="text-sm text-zinc-300">
                Take a screenshot of the routine in your other app, then choose it here. One routine per screenshot reads best.
              </p>
              <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 text-sm font-semibold text-zinc-200 hover:bg-zinc-800/60">
                <ImageIcon className="h-4 w-4" /> {imageFile ? 'Choose a different screenshot' : 'Choose a screenshot'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
                />
              </label>
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element -- a local picture before upload
                <img src={imagePreview} alt="The screenshot you chose" className="max-h-72 w-full rounded-xl object-contain bg-zinc-950/60" />
              )}
              <p className="text-sm text-zinc-500">
                Crop out your name, photo and anyone else&apos;s details before you choose it. {SENT_NOTE}
              </p>
              <Button className="w-full" onClick={readImage} isLoading={busy} disabled={!imageFile || remaining?.left === 0}>
                Read screenshot
              </Button>
            </>
          )}

          {tab === 'csv' && (
            <>
              <p className="text-sm text-zinc-300">
                Export your data as a CSV from Strong or Hevy (in their settings), or use a spreadsheet with routine, exercise, sets and reps
                columns. Each workout becomes a routine, as you last did it.
              </p>
              <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 text-sm font-semibold text-zinc-200 hover:bg-zinc-800/60">
                <FileSpreadsheet className="h-4 w-4" /> Choose a CSV file
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    void readCsv(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="text-sm text-zinc-500">The file is read on your phone and is not uploaded. It does not use an import.</p>
            </>
          )}

          {tab !== 'csv' && remaining && (
            <p className={`text-sm ${remaining.left === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {remaining.left === 0
                ? `You have used your ${remaining.limit} imports this month. They refill on the 1st. A CSV file still works.`
                : `${remaining.left} of ${remaining.limit} imports left this month.`}
            </p>
          )}
        </div>

        {error && (
          <div ref={errorRef}>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {routines.length > 0 && (
          <div ref={previewRef} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Check before saving</h2>
              <p className="text-sm text-zinc-400">
                {source === 'csv' ? 'Read from your file.' : 'Read by AI.'} Check it and fix anything it got wrong. Exercises marked &ldquo;new&rdquo; are not in the Deadeye list yet and are kept by name.
              </p>
              {csvNote && <p className="mt-1 text-sm text-zinc-400">{csvNote}</p>}
            </div>

            {routines.length > 1 && (
              <div className="space-y-1.5">
                <label htmlFor="program-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Program name
                </label>
                <input
                  id="program-name"
                  value={programName}
                  maxLength={60}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <p className="text-sm text-zinc-500">The routines you keep are saved together under this name, in this order.</p>
              </div>
            )}

            {routines.map((r, ri) => (
              <div key={r.key} className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3 ${r.keep ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3">
                  {routines.length > 1 && (
                    <input
                      type="checkbox"
                      checked={r.keep}
                      onChange={(e) => updateRoutine(r.key, { keep: e.target.checked })}
                      aria-label={`Keep ${r.name || `routine ${ri + 1}`}`}
                      className="h-5 w-5 flex-shrink-0 accent-orange-600"
                    />
                  )}
                  <input
                    value={r.name}
                    maxLength={60}
                    onChange={(e) => updateRoutine(r.key, { name: e.target.value })}
                    aria-label={`Name of routine ${ri + 1}`}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3 text-base font-semibold text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                {r.keep && (
                  <>
                    <div className="space-y-2">
                      {r.exercises.map((e, ei) => (
                        <div key={e.key} className="rounded-xl bg-zinc-950/60 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={e.name}
                              maxLength={60}
                              placeholder="Exercise name"
                              onChange={(ev) => updateExercise(r.key, e.key, { name: ev.target.value, exerciseId: null })}
                              aria-label={`Exercise ${ei + 1} name`}
                              className="h-10 min-w-0 flex-1 rounded-lg bg-zinc-800 px-3 text-sm text-white placeholder:text-zinc-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeExercise(r.key, e.key)}
                              aria-label={`Remove ${e.name || `exercise ${ei + 1}`}`}
                              className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                            <label className="flex items-center gap-1.5">
                              Sets
                              <input
                                inputMode="numeric"
                                value={e.sets}
                                onChange={(ev) => updateExercise(r.key, e.key, { sets: ev.target.value.replace(/[^0-9]/g, '').slice(0, 2) })}
                                className="h-10 w-12 rounded-lg bg-zinc-800 text-center text-white"
                              />
                            </label>
                            <label className="flex items-center gap-1.5">
                              Reps
                              <input
                                value={e.reps}
                                maxLength={20}
                                placeholder="8-10"
                                onChange={(ev) => updateExercise(r.key, e.key, { reps: ev.target.value })}
                                className="h-10 w-20 rounded-lg bg-zinc-800 text-center text-white placeholder:text-zinc-500"
                              />
                            </label>
                            {e.name.trim() && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  matchedNames.get(e.key) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {matchedNames.get(e.key) ? 'In Deadeye' : 'New'}
                              </span>
                            )}
                          </div>
                          {e.notes !== null && (
                            <div className="flex items-center gap-2">
                              <input
                                value={e.notes}
                                maxLength={200}
                                onChange={(ev) => updateExercise(r.key, e.key, { notes: ev.target.value })}
                                aria-label={`Note for ${e.name || `exercise ${ei + 1}`}`}
                                className="h-10 min-w-0 flex-1 rounded-lg bg-zinc-800 px-3 text-sm text-zinc-300"
                              />
                              <button
                                type="button"
                                onClick={() => updateExercise(r.key, e.key, { notes: null })}
                                aria-label={`Remove the note for ${e.name || `exercise ${ei + 1}`}`}
                                className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {r.exercises.length < MAX_EXERCISES && (
                      <button
                        type="button"
                        onClick={() => addExercise(r.key)}
                        className="flex h-11 items-center gap-1.5 text-sm font-semibold text-zinc-300 hover:text-white"
                      >
                        <Plus className="h-4 w-4" /> Add an exercise
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            <Button className="w-full" size="lg" onClick={save} isLoading={busy} disabled={kept.length === 0}>
              {kept.length > 1 ? `Save ${kept.length} routines` : 'Save routine'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
