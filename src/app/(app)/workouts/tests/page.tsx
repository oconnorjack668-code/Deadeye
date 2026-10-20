// src/app/(app)/workouts/tests/page.tsx
import React from 'react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Plus, TrendingUp, Award, Zap } from 'lucide-react';
import { asMeasurementSystem } from '@/lib/units';
import { LENGTH_TESTS, TIMED_TESTS, convertResult, lengthUnit } from '@/lib/performanceTests';

export const metadata = {
  title: 'Performance Tests - Deadeye',
};

const TEST_TYPES = [
  { id: 'standing_vertical', label: 'Standing Vertical', icon: '📈' },
  { id: 'approach_vertical', label: 'Approach Vertical', icon: '🚀' },
  { id: 'sprint_three_quarter', label: '3/4 Court Sprint', icon: '⚡' },
  { id: 'sprint_40yd', label: '40 Yard Dash', icon: '💨' },
  { id: 'lane_agility', label: 'Lane Agility', icon: '🔄' },
  { id: 'pro_agility_5_10_5', label: 'Pro Agility (5-10-5)', icon: '↔️' },
  { id: 'standing_broad_jump', label: 'Standing Broad Jump', icon: '🦘' },
];

export default async function PerformanceTestsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch all performance tests grouped by type
  const [{ data: tests }, { data: profile }] = await Promise.all([
    supabase
      .from('performance_tests')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false })
      .returns<Array<{
        id: string;
        test_type: string;
        test_date: string;
        value: number;
        unit: string;
        custom_test_name: string | null;
        is_personal_record: boolean;
        notes: string | null;
      }>>(),
    supabase.from('profiles').select('measurement_system').eq('id', user.id).maybeSingle(),
  ]);

  // Jumps are shown in the player's own unit, whatever unit each was logged in
  const system = asMeasurementSystem(profile?.measurement_system);
  const unitFor = (type: string) => (LENGTH_TESTS.includes(type) ? lengthUnit(system) : 'seconds');

  // Group tests by type and find PRs
  const testsByType = (tests || []).reduce(
    (acc, test) => {
      if (!acc[test.test_type]) {
        acc[test.test_type] = [];
      }
      acc[test.test_type].push(test);
      return acc;
    },
    {} as Record<string, Array<{
      id: string;
      test_type: string;
      test_date: string;
      value: number;
      unit: string;
      custom_test_name: string | null;
      is_personal_record: boolean;
      notes: string | null;
    }>>
  );

  // Calculate best (PR) and trend for each test type
  const getMetrics = (type: string) => {
    // Every result in the card's unit, so 60 cm is not taken as better than 30 inches
    const unit = unitFor(type);
    const typeTests = (testsByType[type] || []).flatMap((t) => {
      const value = convertResult(t, unit);
      return value === null ? [] : [{ ...t, value }];
    });
    if (typeTests.length === 0) return null;

    const testDef = TEST_TYPES.find((t) => t.id === type);
    if (!testDef) return null;

    // For time-based tests, lower is better; for distance, higher is better
    const isTime = TIMED_TESTS.includes(type);
    const best = isTime
      ? typeTests.reduce((min, t) => (t.value < min.value ? t : min))
      : typeTests.reduce((max, t) => (t.value > max.value ? t : max));

    // Improved = the latest result beats everything logged before it
    const recent = typeTests[0];
    const earlier = typeTests.slice(1);
    const improved =
      earlier.length > 0 &&
      (isTime
        ? earlier.every((t) => recent.value < t.value)
        : earlier.every((t) => recent.value > t.value));

    return { best, recent, improved, isTime, testDef, unit };
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center shadow-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">Performance Tests</h1>
              <p className="text-sm text-zinc-400 mt-1">Vertical, sprint, agility, and custom tests</p>
            </div>
          </div>
          <Link href="/workouts/tests/new">
            <Button variant="primary" size="lg" className="gap-2">
              <Plus className="h-4 w-4" /> Log Test
            </Button>
          </Link>
        </div>

        <Link
          href="/video"
          className="mb-6 flex items-center justify-between rounded-2xl border border-red-600/30 bg-red-600/10 px-4 py-3 hover:bg-red-600/15"
        >
          <span className="text-sm font-semibold text-red-200">📹 Measure your vertical with video: Video AI → Jump test</span>
        </Link>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {TEST_TYPES.map((testType) => {
            const metrics = getMetrics(testType.id);

            return (
              <Card key={testType.id} className="border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900/90 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white">{testType.label}</h3>
                      <p className="text-xs text-zinc-400">Measured in {unitFor(testType.id)}</p>
                    </div>
                    <span className="text-2xl">{testType.icon}</span>
                  </div>

                  {metrics ? (
                    <div className="space-y-2 pt-3 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Personal Best</span>
                        <span className="font-bold text-emerald-400">
                          {metrics.best.value} {metrics.unit}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Latest</span>
                        <span className={`font-bold ${metrics.improved ? 'text-orange-400' : 'text-zinc-300'}`}>
                          {metrics.recent.value} {metrics.unit}
                        </span>
                      </div>
                      {metrics.improved && (
                        <Badge variant="success" className="w-full justify-center text-center mt-2">
                          <Zap className="h-3 w-3 mr-1" /> Improved
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 italic">No tests logged yet</p>
                      <Link href="/workouts/tests/new" className="mt-2 block">
                        <Button variant="outline" size="sm" className="w-full">
                          Log First Test
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Tests Timeline */}
        {tests && tests.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                Recent Test Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tests.slice(0, 10).map((test) => {
                  const testDef = TEST_TYPES.find((t) => t.id === test.test_type);
                  const isPR = test.is_personal_record;
                  // Custom tests stay in the unit they were logged in
                  const converted = testDef ? convertResult(test, unitFor(test.test_type)) : null;
                  const shown = converted === null ? test : { value: converted, unit: unitFor(test.test_type) };

                  return (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/60 hover:border-orange-500/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">
                            {testDef?.label || test.custom_test_name || 'Custom test'}
                          </h4>
                          {isPR && (
                            <Badge variant="orange" className="text-xs">
                              <Award className="h-2.5 w-2.5 mr-1" />
                              PR
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          {new Date(`${test.test_date}T00:00:00`).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-orange-400">
                          {shown.value} {shown.unit}
                        </span>
                        {test.notes && (
                          <p className="text-xs text-zinc-500 mt-0.5">{test.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
