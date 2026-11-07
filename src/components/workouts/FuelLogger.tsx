// src/components/workouts/FuelLogger.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { localDateString } from '@/lib/dates';
import { HYDRATION_LEVELS, isValidSleep, type FuelEntry, type Hydration } from '@/lib/fuel';
import { Check, X } from 'lucide-react';

const HYDRATION_LABELS: Record<Hydration, string> = { low: 'Not enough', ok: 'About right', good: 'Plenty' };
const ENERGY_LABELS = ['Flat', 'Low', 'Fine', 'Good', 'Flying'];

/** A yes / no / unanswered control. Unanswered stays a real option. */
function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-zinc-200 mb-1.5">{label}</div>
      <div className="flex gap-2">
        {[true, false].map((option) => (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(value === option ? null : option)}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${
              value === option
                ? option
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-700 text-white'
                : 'bg-zinc-900 text-zinc-400'
            }`}
          >
            {option ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {option ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FuelLogger({ existing }: { existing: FuelEntry | null }) {
  const router = useRouter();
  const [ateBefore, setAteBefore] = useState<boolean | null>(existing?.ate_before ?? null);
  const [ateAfter, setAteAfter] = useState<boolean | null>(existing?.ate_after ?? null);
  const [hydration, setHydration] = useState<Hydration | null>(existing?.hydration ?? null);
  const [sleep, setSleep] = useState(existing?.sleep_hours != null ? String(existing.sleep_hours) : '');
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const sleepHours = sleep.trim() === '' ? null : Number(sleep);
    if (sleepHours !== null && !isValidSleep(sleepHours)) {
      setError('Sleep should be a number of hours between 0 and 16.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setSaving(false);
      router.push('/login');
      return;
    }
    const { error: saveError } = await supabase.from('fuel_logs').upsert(
      {
        user_id: auth.user.id,
        log_date: localDateString(),
        ate_before: ateBefore,
        ate_after: ateAfter,
        hydration,
        sleep_hours: sleepHours,
        energy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,log_date' }
    );
    setSaving(false);
    if (saveError) {
      setError(`Could not save: ${saveError.message}`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}

      <YesNo label="Did you eat before training?" value={ateBefore} onChange={setAteBefore} />
      <YesNo label="Did you eat after?" value={ateAfter} onChange={setAteAfter} />

      <div>
        <div className="text-sm font-semibold text-zinc-200 mb-1.5">Water today</div>
        <div className="flex gap-2">
          {HYDRATION_LEVELS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHydration(hydration === h ? null : h)}
              className={`h-11 flex-1 rounded-xl text-sm font-semibold ${
                hydration === h ? 'bg-cyan-600 text-white' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {HYDRATION_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-zinc-200">Sleep last night</span>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            inputMode="decimal"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder="8"
            aria-label="Hours of sleep"
            className="w-24 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-white"
          />
          <span className="text-sm text-zinc-400">hours</span>
        </div>
      </label>

      <div>
        <div className="text-sm font-semibold text-zinc-200 mb-1.5">
          Energy today {energy ? <span className="text-zinc-400">· {ENERGY_LABELS[energy - 1]}</span> : ''}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEnergy(energy === n ? null : n)}
              aria-label={`${n} out of 5, ${ENERGY_LABELS[n - 1]}`}
              className={`h-11 flex-1 rounded-xl text-sm font-bold ${
                energy === n ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={() => void save()}>
        {saved ? 'Saved' : existing ? 'Update today' : 'Save today'}
      </Button>
      <p className="text-sm text-zinc-500">
        Anything you leave blank stays blank. There is no target here and nothing to hit.
      </p>
    </div>
  );
}
