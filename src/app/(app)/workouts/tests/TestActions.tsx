// src/app/(app)/workouts/tests/TestActions.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { TIMED_TESTS, testRecordFlags } from '@/lib/performanceTests';
import type { PerformanceTestType } from '@/lib/supabase/types';

interface Test {
  id: string;
  user_id: string;
  test_type: string;
  test_date: string;
  value: number;
  unit: string;
  custom_test_name: string | null;
  notes: string | null;
}

/**
 * The personal record flags for one test, worked out again from every result.
 * A deleted best leaves the one before it as the record, and a value fixed
 * downwards should not stay a PR.
 */
async function recheckRecords(supabase: ReturnType<typeof createClient>, test: Test) {
  let query = supabase
    .from('performance_tests')
    .select('id, value, unit, is_personal_record')
    .eq('user_id', test.user_id)
    .eq('test_type', test.test_type as PerformanceTestType)
    .order('test_date')
    .order('created_at');
  if (test.custom_test_name) query = query.eq('custom_test_name', test.custom_test_name);
  const { data } = await query;
  const rows = data || [];
  const lowerIsBetter = TIMED_TESTS.includes(test.test_type) || test.unit === 'seconds';
  const flags = testRecordFlags(rows, lowerIsBetter);
  await Promise.all(
    rows
      .map((r, i) => ({ r, pr: flags[i] }))
      .filter(({ r, pr }) => r.is_personal_record !== pr)
      .map(({ r, pr }) => supabase.from('performance_tests').update({ is_personal_record: pr }).eq('id', r.id))
  );
}

/** Edit and delete for one row of the test log. */
export function TestActions({ test }: { test: Test }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(String(test.value));
  const [date, setDate] = useState(test.test_date);
  const [notes, setNotes] = useState(test.notes || '');

  async function remove() {
    if (!window.confirm('Delete this result?')) return;
    setBusy(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('performance_tests').delete().eq('id', test.id);
    if (deleteError) {
      setBusy(false);
      setError(deleteError.message);
      return;
    }
    await recheckRecords(supabase, test);
    router.refresh();
  }

  async function save() {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      setError('Enter a value greater than zero.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Pick a date.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: saveError } = await supabase
      .from('performance_tests')
      .update({ value: number, test_date: date, notes: notes.trim().slice(0, 500) || null })
      .eq('id', test.id);
    if (saveError) {
      setBusy(false);
      setError(saveError.message);
      return;
    }
    await recheckRecords(supabase, test);
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  const field = 'w-full rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-white';

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit result"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          aria-label="Delete result"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 w-full space-y-2 border-t border-zinc-800 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-400">
          Value ({test.unit})
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={`mt-1 ${field}`} />
        </label>
        <label className="text-xs text-zinc-400">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${field}`} />
        </label>
      </div>
      <label className="block text-xs text-zinc-400">
        Notes
        <input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${field}`} />
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={() => void save()} isLoading={busy}>
          Save
        </Button>
      </div>
    </div>
  );
}
