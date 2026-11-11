// src/lib/routineImport.ts
// Bringing routines in from other gym apps: a pasted routine or a screenshot
// (read by the AI on the server, /api/workouts/import), or a CSV export from
// Strong, Hevy or a spreadsheet (read here, on the phone, so the file never
// leaves it). Everything ends up as an ImportedProgram the player checks and
// edits before saving. Safe to use on the server and in the browser.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { creditMonth } from '@/lib/entitlements';

export type ImportSource = 'text' | 'image' | 'csv';

export interface ImportedExercise {
  name: string;
  sets: number;
  /** "8", "8-10", "30s", "AMRAP": kept as written. null when not given. */
  reps: string | null;
  notes: string | null;
  /** The exercise library row it matched, so history and cues line up. */
  exerciseId: string | null;
}

export interface ImportedRoutine {
  name: string;
  exercises: ImportedExercise[];
}

export interface ImportedProgram {
  name: string;
  routines: ImportedRoutine[];
}

/** AI reads of a pasted routine or screenshot a free player gets each month. */
export const FREE_MONTHLY_ROUTINE_IMPORTS = 10;
/** Pro and owners: high enough never to notice, low enough to stop misuse. */
export const PRO_MONTHLY_ROUTINE_IMPORTS = 100;

export const MAX_IMPORT_TEXT = 8000;
/** A screenshot after the phone has shrunk it (see shrinkImage on the import page). */
export const MAX_IMAGE_BYTES = 3_000_000;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
/** A CSV export of years of workouts is a few MB; more than this is not a gym export. */
export const MAX_CSV_BYTES = 10_000_000;

export const MAX_ROUTINES = 14;
export const MAX_EXERCISES = 30;
export const MAX_SETS = 20;
const MAX_NAME = 60;
const MAX_REPS = 20;
const MAX_NOTES = 200;

/** The start of this month's allowance (UTC, the same as the AI report allowance). */
export function importMonthStartIso(now: Date = new Date()): string {
  return `${creditMonth(now)}T00:00:00.000Z`;
}

/**
 * Import-count rows older than this are no longer needed (they only count
 * toward this month) and are deleted: the start of last month, so a row is
 * kept for at most about two months.
 */
export function importRetentionCutoffIso(now: Date = new Date()): string {
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return lastMonth.toISOString();
}

/**
 * Deletes every player's import-count rows that no longer count (before last
 * month). Run by the daily housekeeping job, so the policy's "kept for up to
 * two months" holds for a player who never imports again.
 */
export async function pruneOldRoutineImports(
  admin: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<void> {
  await admin.from('routine_imports').delete().lt('created_at', importRetentionCutoffIso(now));
}

export function monthlyImportLimit(unlimited: boolean): number {
  return unlimited ? PRO_MONTHLY_ROUTINE_IMPORTS : FREE_MONTHLY_ROUTINE_IMPORTS;
}

// =============================================================================
// Cleaning up what comes in
// =============================================================================

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

function clampSets(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.min(MAX_SETS, Math.round(n));
}

/** Keeps a reps target as written ("8-10", "30s", "AMRAP"), tidied and capped. */
export function normalizeReps(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? String(Math.round(value)) : null;
  const text = cleanText(value, 40)
    .replace(/\s*[–—]\s*/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*reps?$/i, '');
  if (!text || text === '0') return null;
  return text.slice(0, MAX_REPS);
}

/**
 * Turns whatever the AI (or a file) gave back into a program the app can save:
 * names trimmed and capped, sets 1-20, empty exercises and routines dropped.
 * Anything not in the expected shape is ignored rather than trusted.
 */
export function normalizeProgram(raw: unknown, fallbackName = 'Imported program'): ImportedProgram {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawRoutines = Array.isArray(obj.routines) ? obj.routines : [];
  const routines: ImportedRoutine[] = [];
  for (const r of rawRoutines) {
    if (routines.length >= MAX_ROUTINES) break;
    const ro = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
    const rawExercises = Array.isArray(ro.exercises) ? ro.exercises : [];
    const exercises: ImportedExercise[] = [];
    for (const e of rawExercises) {
      if (exercises.length >= MAX_EXERCISES) break;
      const eo = e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
      const name = cleanText(eo.name, MAX_NAME);
      if (!name) continue;
      exercises.push({
        name,
        sets: clampSets(eo.sets),
        reps: normalizeReps(eo.reps),
        notes: cleanText(eo.notes, MAX_NOTES) || null,
        exerciseId: null,
      });
    }
    if (exercises.length === 0) continue;
    routines.push({ name: cleanText(ro.name, MAX_NAME) || `Day ${routines.length + 1}`, exercises });
  }
  return { name: cleanText(obj.name, MAX_NAME) || fallbackName, routines };
}

export function exerciseCount(program: ImportedProgram): number {
  return program.routines.reduce((sum, r) => sum + r.exercises.length, 0);
}

// =============================================================================
// Matching names to the exercise library
// =============================================================================

const WORD_SWAPS: Record<string, string> = {
  db: 'dumbbell',
  dbs: 'dumbbell',
  dumbbells: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  ohp: 'overhead press',
  rdl: 'romanian deadlift',
  rdls: 'romanian deadlift',
  pullup: 'pull up',
  pullups: 'pull up',
  chinup: 'chin up',
  chinups: 'chin up',
  pushup: 'push up',
  pushups: 'push up',
};

/** Lower case, punctuation gone, common shorthand spelled out, plurals dropped. */
export function exerciseKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .flatMap((w) => (WORD_SWAPS[w] ?? w).split(' '))
    .map((w) => (w.length >= 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

/** The same words in any order: "Bench Press (Barbell)" and "Barbell Bench Press". */
function wordSetKey(name: string): string {
  return [...new Set(exerciseKey(name).split(' ').filter(Boolean))].sort().join(' ');
}

export interface LibraryName {
  id: string;
  name: string;
}

/**
 * Finds the library exercise a name means, or null. Exact (after tidying)
 * first, then the same words in another order, which covers how Strong and
 * Hevy name things ("Squat (Barbell)"). No fuzzy guessing beyond that: a wrong
 * match would merge two exercises' history, which is worse than none.
 */
export function matchExercise(name: string, library: LibraryName[]): LibraryName | null {
  const key = exerciseKey(name);
  if (!key) return null;
  const exact = library.find((l) => exerciseKey(l.name) === key);
  if (exact) return exact;
  const words = wordSetKey(name);
  return library.find((l) => wordSetKey(l.name) === words) ?? null;
}

/** Puts library ids (and the library's spelling) on every exercise that matches. */
export function applyLibraryMatches(program: ImportedProgram, library: LibraryName[]): ImportedProgram {
  return {
    ...program,
    routines: program.routines.map((r) => ({
      ...r,
      exercises: r.exercises.map((e) => {
        const match = matchExercise(e.name, library);
        return match ? { ...e, name: match.name, exerciseId: match.id } : { ...e, exerciseId: null };
      }),
    })),
  };
}

// =============================================================================
// CSV files (Strong, Hevy, or a spreadsheet)
// =============================================================================

/** Splits CSV text into rows, with quoted fields, "" escapes and ; or tab files. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const counts = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>;
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch]++;
  }
  const [best, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const delimiter = bestCount > 0 ? best : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const COLUMN_NAMES = {
  // Strong: "Workout Name"; Hevy: "title"; a spreadsheet: "routine", "day"
  routine: ['workout name', 'title', 'routine', 'routine name', 'workout', 'day'],
  // Strong: "Exercise Name"; Hevy: "exercise_title"
  exercise: ['exercise name', 'exercise_title', 'exercise title', 'exercise', 'name'],
  // Strong: "Date"; Hevy: "start_time"
  date: ['date', 'start_time', 'start time', 'workout date'],
  // Strong: "Set Order" ("W" for a warm-up); Hevy: "set_index"
  setOrder: ['set order', 'set_index', 'set index', 'set'],
  setType: ['set_type', 'set type'],
  sets: ['sets', 'target sets'],
  reps: ['reps', 'target reps', 'rep range'],
  seconds: ['seconds', 'duration_seconds', 'duration seconds'],
  notes: ['notes', 'exercise_notes', 'exercise notes'],
} as const;

type Column = keyof typeof COLUMN_NAMES;

function findColumns(header: string[]): Partial<Record<Column, number>> {
  const lower = header.map((h) => h.trim().toLowerCase());
  const found: Partial<Record<Column, number>> = {};
  for (const [column, names] of Object.entries(COLUMN_NAMES) as Array<[Column, readonly string[]]>) {
    const index = names.map((n) => lower.indexOf(n)).find((i) => i >= 0);
    if (index !== undefined) found[column] = index;
  }
  return found;
}

/** "8", "8-10" or "" from the reps of a session's working sets. */
function repsRange(values: number[]): string | null {
  const reps = values.filter((v) => Number.isFinite(v) && v > 0);
  if (reps.length === 0) return null;
  const min = Math.min(...reps);
  const max = Math.max(...reps);
  return min === max ? String(min) : `${min}-${max}`;
}

function sessionTime(value: string, fallback: number): number {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : fallback;
}

export interface CsvImportResult {
  program: ImportedProgram;
  /** Which kind of file it was read as, for the preview's heading. */
  format: 'history' | 'plan';
  error?: string;
}

/**
 * Reads a CSV into routines.
 *
 * A workout log (Strong, Hevy: one row per set, with a date) becomes one
 * routine per workout name, taken from the most recent time it was done: the
 * exercises in that order, the working sets counted (warm-ups left out) and
 * the reps as the range done. A plan (a spreadsheet with routine, exercise,
 * sets and reps columns) is taken row by row as written.
 */
export function parseWorkoutCsv(text: string, programName = 'Imported program'): CsvImportResult {
  const empty = (error: string): CsvImportResult => ({ program: { name: programName, routines: [] }, format: 'plan', error });
  const rows = parseCsv(text);
  if (rows.length < 2) return empty('That file has no rows to read.');
  const header = rows[0];
  const col = findColumns(header);
  if (col.exercise === undefined) {
    return empty('Could not find an exercise column. The file needs a column called "Exercise Name", "exercise_title" or "exercise".');
  }
  const get = (row: string[], c: Column) => (col[c] === undefined ? '' : (row[col[c] as number] ?? '').trim());
  const data = rows.slice(1);

  // A plan: says how many sets to do, and has no dates or set numbers
  const isPlan = col.sets !== undefined && col.date === undefined && col.setOrder === undefined;
  if (isPlan) {
    const byRoutine = new Map<string, ImportedRoutine>();
    for (const row of data) {
      const exercise = get(row, 'exercise');
      if (!exercise) continue;
      const routineName = get(row, 'routine') || programName;
      const routine = byRoutine.get(routineName) ?? { name: routineName, exercises: [] };
      routine.exercises.push({
        name: exercise,
        sets: clampSets(get(row, 'sets')),
        reps: normalizeReps(get(row, 'reps')),
        notes: get(row, 'notes') || null,
        exerciseId: null,
      });
      byRoutine.set(routineName, routine);
    }
    return { program: normalizeProgram({ name: programName, routines: [...byRoutine.values()] }, programName), format: 'plan' };
  }

  // A log: group sets into sessions (routine name + date), keep the latest per routine
  interface Session {
    routine: string;
    time: number;
    order: string[];
    sets: Map<string, { reps: number[]; seconds: number[]; count: number; notes: string }>;
  }
  const sessions = new Map<string, Session>();
  data.forEach((row, index) => {
    const exercise = get(row, 'exercise');
    if (!exercise) return;
    const setType = get(row, 'setType').toLowerCase();
    const setOrder = get(row, 'setOrder').toUpperCase();
    // Warm-ups are not part of the routine (Hevy "warmup", Strong "W")
    if (setType === 'warmup' || setOrder === 'W') return;
    const routine = get(row, 'routine') || programName;
    const date = get(row, 'date');
    const key = `${routine}\u0000${date}`;
    // A file without dates reads top to bottom: later rows count as later
    const session: Session = sessions.get(key) ?? { routine, time: sessionTime(date, index), order: [], sets: new Map() };
    const exerciseKeyName = exercise.trim();
    let entry = session.sets.get(exerciseKeyName);
    if (!entry) {
      entry = { reps: [], seconds: [], count: 0, notes: '' };
      session.sets.set(exerciseKeyName, entry);
      session.order.push(exerciseKeyName);
    }
    entry.count++;
    entry.reps.push(parseFloat(get(row, 'reps')));
    entry.seconds.push(parseFloat(get(row, 'seconds')));
    entry.notes ||= get(row, 'notes');
    sessions.set(key, session);
  });

  const latest = new Map<string, Session>();
  for (const s of sessions.values()) {
    const current = latest.get(s.routine);
    if (!current || s.time >= current.time) latest.set(s.routine, s);
  }
  if (latest.size === 0) return empty('No sets found in that file.');

  // Most recently done first, so the routines a player uses now come top
  const routines = [...latest.values()]
    .sort((a, b) => b.time - a.time)
    .map((s) => ({
      name: s.routine,
      exercises: s.order.map((name) => {
        const entry = s.sets.get(name)!;
        const reps = repsRange(entry.reps);
        const seconds = repsRange(entry.seconds);
        return {
          name,
          sets: entry.count,
          reps: reps ?? (seconds ? `${seconds}s` : null),
          notes: entry.notes || null,
        };
      }),
    }));
  return { program: normalizeProgram({ name: programName, routines }, programName), format: 'history' };
}

// =============================================================================
// Saving
// =============================================================================

function newUuid(): string {
  return crypto.randomUUID();
}

/**
 * Saves the routines the player kept. One routine is saved on its own; two
 * or more are kept together as a program, in the order shown. If anything
 * fails, what was already written is removed so no half program is left.
 */
export async function saveImportedProgram(
  supabase: SupabaseClient<Database>,
  userId: string,
  program: ImportedProgram,
  source: ImportSource
): Promise<{ error?: string }> {
  const routines = program.routines
    .map((r) => ({ ...r, exercises: r.exercises.filter((e) => e.name.trim()) }))
    .filter((r) => r.exercises.length > 0)
    .slice(0, MAX_ROUTINES);
  if (routines.length === 0) return { error: 'There is nothing to save yet.' };

  let programId: string | null = null;
  if (routines.length > 1) {
    programId = newUuid();
    const { error } = await supabase
      .from('user_programs')
      .insert({ id: programId, user_id: userId, name: cleanText(program.name, MAX_NAME) || 'Imported program', source });
    if (error) return { error: `Could not save the program: ${error.message}` };
  }

  const routineRows = routines.map((r, i) => ({
    id: newUuid(),
    user_id: userId,
    name: cleanText(r.name, MAX_NAME) || `Day ${i + 1}`,
    program_id: programId,
    day_order: i,
  }));
  const undo = async () => {
    if (programId) await supabase.from('user_programs').delete().eq('id', programId);
    else await supabase.from('workout_routines').delete().in('id', routineRows.map((r) => r.id));
  };

  const { error: routineError } = await supabase.from('workout_routines').insert(routineRows);
  if (routineError) {
    await undo();
    return { error: `Could not save the routines: ${routineError.message}` };
  }

  const exerciseRows = routines.flatMap((r, i) =>
    r.exercises.slice(0, MAX_EXERCISES).map((e, order) => ({
      routine_id: routineRows[i].id,
      user_id: userId,
      exercise_id: e.exerciseId,
      exercise_name: cleanText(e.name, MAX_NAME),
      target_sets: clampSets(e.sets),
      target_reps: normalizeReps(e.reps),
      notes: cleanText(e.notes, MAX_NOTES) || null,
      display_order: order,
    }))
  );
  const { error: exerciseError } = await supabase.from('routine_exercises').insert(exerciseRows);
  if (exerciseError) {
    await undo();
    return { error: `Could not save the exercises: ${exerciseError.message}` };
  }
  return {};
}
