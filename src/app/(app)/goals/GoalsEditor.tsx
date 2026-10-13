// src/app/(app)/goals/GoalsEditor.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Trash2, Minus, Plus } from 'lucide-react';
import type { GoalType } from '@/lib/supabase/types';

export interface GoalRow {
  id: string;
  goal_type: GoalType;
  title: string;
  target_value: number;
  period: string;
  progress: number;
}

const GOAL_TYPES: Array<{ id: GoalType; label: string; unit: string; defaultTarget: number; max: number }> = [
  { id: 'weekly_training_days', label: 'Training days per week', unit: 'days', defaultTarget: 4, max: 7 },
  { id: 'weekly_makes', label: 'Made shots per week', unit: 'makes', defaultTarget: 300, max: 10000 },
  { id: 'shooting_pct', label: 'Shooting % this week', unit: '%', defaultTarget: 45, max: 100 },
  { id: 'strength_days', label: 'Gym workouts per week', unit: 'workouts', defaultTarget: 2, max: 7 },
  { id: 'iq_study_items', label: 'IQ lessons per week', unit: 'lessons', defaultTarget: 2, max: 20 },
  { id: 'custom', label: 'Custom goal (update it yourself)', unit: '', defaultTarget: 10, max: 100000 },
];

export function GoalsEditor({ goals }: { goals: GoalRow[] }) {
  const router = useRouter();
  const [type, setType] = useState(GOAL_TYPES[0].id);
  const [target, setTarget] = useState(String(GOAL_TYPES[0].defaultTarget));
  const [customTitle, setCustomTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = GOAL_TYPES.find((g) => g.id === type)!;

  async function addGoal() {
    const value = Number(target);
    if (!Number.isInteger(value) || value < 1 || value > def.max) {
      setError(`Target must be a whole number from 1 to ${def.max}.`);
      return;
    }
    if (type === 'custom' && customTitle.trim().length < 3) {
      setError('Give your custom goal a name.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Please log in again.');
      return;
    }
    const { error: insertError } = await supabase.from('goals').insert({
      user_id: user.id,
      goal_type: type,
      title: type === 'custom' ? customTitle.trim().slice(0, 80) : def.label,
      target_value: value,
      period: 'weekly',
    });
    setBusy(false);
    if (insertError) {
      setError(`Could not add the goal: ${insertError.message}`);
      return;
    }
    setCustomTitle('');
    router.refresh();
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const { error: updateError } = await createClient().from('goals').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) setError(`Could not update the goal: ${updateError.message}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {goals.map((g) => {
          const unit = GOAL_TYPES.find((t) => t.id === g.goal_type)?.unit || '';
          const pct = Math.min(100, Math.round((g.progress / g.target_value) * 100));
          return (
            <div key={g.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-white">{g.title}</div>
                <button type="button" onClick={() => update(g.id, { is_active: false })} aria-label={`Remove goal ${g.title}`} className="text-zinc-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
                <span>
                  {g.progress} / {g.target_value} {unit} {pct >= 100 && '· done!'}
                </span>
                {g.goal_type === 'custom' && (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => update(g.id, { current_value: Math.max(0, g.progress - 1) })} aria-label="Decrease" className="rounded bg-zinc-800 p-1">
                      <Minus className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => update(g.id, { current_value: g.progress + 1 })} aria-label="Increase" className="rounded bg-zinc-800 p-1">
                      <Plus className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <p className="text-sm text-zinc-500">No goals yet. Add one below.</p>}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <h2 className="font-bold text-white">Add a goal</h2>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as GoalType);
            setTarget(String(GOAL_TYPES.find((g) => g.id === e.target.value)!.defaultTarget));
          }}
          aria-label="Goal type"
          className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white"
        >
          {GOAL_TYPES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        {type === 'custom' && (
          <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} maxLength={80} aria-label="Custom goal name" placeholder="e.g. Left-hand layups made" className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white" />
        )}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Target
          <input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="w-28 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white" />
          <span className="text-zinc-500">{def.unit}</span>
        </label>
        <Button variant="primary" isLoading={busy} onClick={addGoal}>
          Add goal
        </Button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
