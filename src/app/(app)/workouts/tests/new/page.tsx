// src/app/(app)/workouts/tests/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { performanceTestSchema } from '@/lib/validation';
import { localDateString } from '@/lib/dates';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ArrowLeft, Award } from 'lucide-react';
import Link from 'next/link';
import type { PerformanceTestType } from '@/lib/supabase/types';
import { asMeasurementSystem, type MeasurementSystem } from '@/lib/units';
import { LENGTH_TESTS, TIMED_TESTS, isPersonalBest, lengthUnit } from '@/lib/performanceTests';

const TESTS: Array<{ value: PerformanceTestType; label: string }> = [
  { value: 'standing_vertical', label: 'Standing Vertical' },
  { value: 'approach_vertical', label: 'Approach Vertical' },
  { value: 'sprint_three_quarter', label: '3/4 Court Sprint' },
  { value: 'sprint_40yd', label: '40 Yard Dash' },
  { value: 'lane_agility', label: 'Lane Agility' },
  { value: 'pro_agility_5_10_5', label: 'Pro Agility 5-10-5' },
  { value: 'standing_broad_jump', label: 'Standing Broad Jump' },
  { value: 'custom', label: 'Custom Test' },
];

export default function NewPerformanceTestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The phone's own date (toISOString() is UTC, which is still yesterday just after midnight in Ireland)
  const [testDate, setTestDate] = useState(() => localDateString());
  // ?type=<test_type> preselects the test (e.g. from a program day). Read straight
  // from the URL in the initializer instead of an effect, so there's no extra
  // render and no setState-in-effect.
  const [testType, setTestType] = useState<PerformanceTestType>(() => {
    if (typeof window === 'undefined') return 'standing_vertical';
    const type = new URLSearchParams(window.location.search).get('type');
    const match = TESTS.find((t) => t.value === type);
    return match ? match.value : 'standing_vertical';
  });
  const [customTestName, setCustomTestName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('inches');
  const [notes, setNotes] = useState('');
  const [system, setSystem] = useState<MeasurementSystem>('imperial');

  // Jumps are logged in the player's own unit: metric players measure in cm
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('measurement_system').eq('id', user.id).maybeSingle();
      if (!cancelled) setSystem(asMeasurementSystem(profile?.measurement_system));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine unit based on test type
  const getUnit = () => {
    if (TIMED_TESTS.includes(testType)) return 'seconds';
    if (LENGTH_TESTS.includes(testType)) return lengthUnit(system);
    return unit;
  };

  async function handleSave() {
    setError(null);
    setIsLoading(true);

    try {
      const result = performanceTestSchema.safeParse({
        testDate,
        testType: testType === 'custom' ? testType : testType,
        customTestName: testType === 'custom' ? customTestName : null,
        value: Number(value),
        unit: getUnit(),
        notes: notes || null,
      });

      if (!result.success) {
        setError(result.error.issues[0].message);
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // PR = best result so far for this test (lower is better for timed tests),
      // counting earlier jumps logged in the other unit
      const unitValue = getUnit();
      const lowerIsBetter = unitValue === 'seconds';
      let previousQuery = supabase
        .from('performance_tests')
        .select('value, unit')
        .eq('user_id', user.id)
        .eq('test_type', testType);
      if (testType === 'custom') previousQuery = previousQuery.eq('custom_test_name', customTestName.trim());
      const { data: previous } = await previousQuery;
      const isPersonalRecord = isPersonalBest({ value: Number(value), unit: unitValue }, previous || [], lowerIsBetter);

      const insertResponse = await supabase
        .from('performance_tests')
        .insert({
          user_id: user.id,
          test_date: testDate,
          test_type: testType,
          custom_test_name: testType === 'custom' ? customTestName.trim() : null,
          value: Number(value),
          unit: unitValue,
          is_personal_record: isPersonalRecord,
          notes: notes || null,
        });

      const insertError = insertResponse.error;

      if (insertError) {
        setError('Failed to save test.');
        setIsLoading(false);
        return;
      }

      router.push('/workouts/tests');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        {/* Back on the left, as on every other page */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/workouts/tests" aria-label="Back to tests">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Log a test</h1>
        </div>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        <Card className="border-zinc-800 bg-zinc-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-400" />
              Test Details
            </CardTitle>
            <CardDescription>Log your athletic performance measurement</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Test Date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
              />
              <Select
                label="Test Type"
                value={testType}
                onChange={(e) => setTestType(e.target.value as PerformanceTestType)}
                options={TESTS}
              />
            </div>

            {testType === 'custom' && (
              <Input
                label="Custom Test Name"
                placeholder="e.g., Vertical with 2-step approach"
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                required
              />
            )}

            {/* The unit is only a choice for a custom test; otherwise it is in
                the label, where a second box saying "inches" again used to sit */}
            <div className={testType === 'custom' ? 'grid grid-cols-2 gap-4' : ''}>
              <Input
                label={`Value (${getUnit()})`}
                type="number"
                placeholder="0.0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                step="0.1"
                required
              />
              {testType === 'custom' ? (
                <Select
                  label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={[
                    { value: 'inches', label: 'Inches' },
                    { value: 'cm', label: 'Centimeters' },
                    { value: 'seconds', label: 'Seconds' },
                    { value: 'meters', label: 'Meters' },
                    { value: 'reps', label: 'Reps' },
                  ]}
                />
              ) : null}
            </div>

            <div>
              <label htmlFor="test-notes" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                id="test-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="How did the test feel? Any conditions to note?"
                className="w-full h-16 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between pt-4">
            <Link href="/workouts/tests">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              disabled={!testDate || !value || (testType === 'custom' && !customTestName.trim())}
            >
              Save Test Result
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
