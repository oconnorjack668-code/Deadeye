// src/app/(app)/workouts/[id]/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { asMeasurementSystem, displayWeight, weightUnitLabel } from '@/lib/units';
import { fromDateColumn } from '@/lib/dates';
import { formatAmount, setAmount, setModeOf } from '@/lib/exercises';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowLeft, Dumbbell, Award, TrendingUp } from 'lucide-react';
import { notFound } from 'next/navigation';
import { ShareCardButton } from '@/components/ShareCardButton';
import { EditWorkout } from './EditWorkout';

export const metadata = {
  title: 'Workout Details - Deadeye',
};

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const units = asMeasurementSystem((await getCurrentProfile())?.measurement_system);

  const { data: workout } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single() as unknown as {
      data: {
        id: string;
        workout_type: string;
        workout_date: string;
        duration_minutes: number;
        rpe: number;
        notes: string | null;
      } | null;
    };

  if (!workout) {
    notFound();
  }

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', id)
    .order('exercise_name', { ascending: true })
    .order('set_number', { ascending: true })
    .returns<Array<{
      id: string;
      exercise_name: string;
      set_number: number;
      reps: number | null;
      weight_kg: number | null;
      duration_seconds: number | null;
      distance_meters: number | null;
      rpe: number | null;
      is_personal_record: boolean;
      notes: string | null;
      created_at: string;
    }>>();

  const workoutTypeLabel = {
    strength: 'Strength',
    power_plyos: 'Power & Plyometrics',
    mobility: 'Mobility',
    recovery: 'Recovery',
    conditioning: 'Conditioning',
    testing: 'Testing',
    mixed: 'Mixed',
  }[workout.workout_type] || workout.workout_type;

  const prCount = sets?.filter((s) => s.is_personal_record).length || 0;

  // Group sets under their exercise
  const groups: Array<{ name: string; sets: NonNullable<typeof sets> }> = [];
  for (const set of sets || []) {
    const last = groups[groups.length - 1];
    if (last && last.name === set.exercise_name) last.sets.push(set);
    else groups.push({ name: set.exercise_name, sets: [set] });
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Dumbbell className="h-8 w-8 text-emerald-400" />
              {workoutTypeLabel}
            </h1>
            <p className="text-sm text-zinc-400">
              {fromDateColumn(workout.workout_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <div className="pt-2">
              <ShareCardButton path={`/api/share/workout?id=${id}`} text="Workout done on Deadeye 💪" />
            </div>
          </div>
          <Link href="/workouts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Duration</div>
              <div className="text-2xl font-bold text-white">{workout.duration_minutes}m</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">RPE</div>
              <div className="text-2xl font-bold text-orange-400">{workout.rpe}/10</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Exercises</div>
              <div className="text-2xl font-bold text-white">{groups.length}</div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-4">
              <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">PRs</div>
              <div className="flex items-center gap-1">
                <Award className="h-5 w-5 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{prCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sets Detail */}
        <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Exercises & Sets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length > 0 ? (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.name} className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-4">
                    <h3 className="font-bold text-white mb-2">{group.name}</h3>
                    <div className="space-y-1">
                      {group.sets.map((set) => (
                        <div key={set.id} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500 w-12">Set {set.set_number}</span>
                          <span className="flex-1 font-semibold text-white">
                            {set.weight_kg !== null ? `${displayWeight(set.weight_kg, units)} ${weightUnitLabel(units)} × ` : ''}
                            {setModeOf(set) === 'reps'
                              ? `${set.reps ?? '—'} reps`
                              : formatAmount(setAmount(set), setModeOf(set))}
                            {set.rpe !== null ? ` · RPE ${set.rpe}` : ''}
                          </span>
                          {set.is_personal_record && (
                            <Badge variant="orange" className="gap-1">
                              <Award className="h-3 w-3" />
                              PR
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-400">No sets logged for this workout</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-8">
          <EditWorkout userId={user.id} workout={workout} sets={sets || []} units={units} />
        </div>

        {/* Workout Notes */}
        {workout.notes && (
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="text-base">Workout Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-300 whitespace-pre-line">{workout.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
