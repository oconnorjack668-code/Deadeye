// src/app/(app)/onboarding/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Logo } from '@/components/Logo';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import {
  User,
  Activity,
  Target,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import type { AgeBracket, BasketballPosition, DominantHand, PlayingLevel } from '@/lib/supabase/types';
import { asMeasurementSystem, cmToFeetInches, feetInchesToCm, type MeasurementSystem } from '@/lib/units';

const GOAL_OPTIONS = [
  'Consistent Training Habit',
  '3-Point Shooting Consistency',
  'Vertical Jump & Explosiveness',
  'Finishing Through Contact',
  'Pick & Roll Decision Making',
  'Lockdown On-Ball Defense',
  'Mid-Range Pull-Up Mastery',
  'Off-Hand Ball Handling & Flow',
];

const FOCUS_AREA_OPTIONS = [
  'Shooting Arc & Kinetic Dip',
  'Floater Range & Touch',
  'First Step Acceleration',
  'Defensive Lateral Slide Speed',
  'Ankle & Knee Deceleration Durability',
  'Free Throw Routine',
  'Off-Ball Spacing & Cuts',
];

const STRENGTH_OPTIONS = [
  'Catch & Shoot Accuracy',
  'Court Vision & Passing',
  'High Motor / Hustle',
  'Rebounding & Positioning',
  'Open Court Speed',
  'On-Ball Perimeter Defense',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [ageBracket, setAgeBracket] = useState<AgeBracket>('18-22');
  // Height is kept in cm (what's stored); imperial players type feet + inches
  const [heightCm, setHeightCm] = useState<number | ''>(185);
  const [units, setUnits] = useState<MeasurementSystem>('imperial');
  const [feet, setFeet] = useState<number | ''>(6);
  const [inches, setInches] = useState<number | ''>(1);
  const [position, setPosition] = useState<BasketballPosition>('G');
  const [dominantHand, setDominantHand] = useState<DominantHand>('right');
  const [playingLevel, setPlayingLevel] = useState<PlayingLevel>('intermediate');
  const [goals, setGoals] = useState<string[]>(['Consistent Training Habit', '3-Point Shooting Consistency']);
  const [strengths, setStrengths] = useState<string[]>(['Catch & Shoot Accuracy']);
  const [focusAreas, setFocusAreas] = useState<string[]>(['Shooting Arc & Kinetic Dip']);
  // /onboarding?edit=1 (from Profile) edits an existing player record
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function loadCurrent() {
      const editing = new URLSearchParams(window.location.search).get('edit') === '1';
      setIsEditing(editing);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (profile) {
        if (profile.onboarding_completed && !editing) {
          router.push('/dashboard');
          return;
        }
        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.age_bracket) setAgeBracket(profile.age_bracket as AgeBracket);
        if (profile.measurement_system) setUnits(asMeasurementSystem(profile.measurement_system));
        if (profile.height_cm) {
          setHeightCm(profile.height_cm);
          const imperial = cmToFeetInches(profile.height_cm);
          setFeet(imperial.feet);
          setInches(imperial.inches);
        }
        if (profile.position) setPosition(profile.position as BasketballPosition);
        if (profile.dominant_hand) setDominantHand(profile.dominant_hand as DominantHand);
        if (profile.playing_level) setPlayingLevel(profile.playing_level as PlayingLevel);
        if (profile.goals && profile.goals.length > 0) setGoals(profile.goals);
        if (profile.strengths && profile.strengths.length > 0) setStrengths(profile.strengths);
        if (profile.focus_areas && profile.focus_areas.length > 0) setFocusAreas(profile.focus_areas);
      }

      setIsFetchingProfile(false);
    }

    loadCurrent();
  }, [router]);

  function updateImperialHeight(nextFeet: number | '', nextInches: number | '') {
    setFeet(nextFeet);
    setInches(nextInches);
    setHeightCm(nextFeet === '' ? '' : feetInchesToCm(Number(nextFeet), Number(nextInches || 0)));
  }

  function switchUnits(next: MeasurementSystem) {
    setUnits(next);
    if (next === 'imperial' && heightCm !== '') {
      const imperial = cmToFeetInches(Number(heightCm));
      setFeet(imperial.feet);
      setInches(imperial.inches);
    }
  }

  // `max` caps a group that says "select up to N". The chips past the cap are
  // disabled in the render rather than silently swallowing the tap, so the
  // limit the label promises is one a player can actually see.
  function toggleItem(list: string[], item: string, setter: (items: string[]) => void, max?: number) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else if (max === undefined || list.length < max) {
      setter([...list, item]);
    }
  }

  /**
   * Shows a setup message and scrolls it into view.
   *
   * The error slot sits above the step content, and step 3 runs long enough on a
   * phone that the Finish button is well below it. Without this, a player who
   * cleared their goals tapped Finish and watched nothing happen.
   */
  function fail(message: string) {
    setError(message);
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleFinish() {
    setError(null);

    // Matches the profiles.height_cm CHECK (between 100 and 250 cm)
    if (heightCm !== '' && (Number(heightCm) <= 100 || Number(heightCm) >= 250)) {
      fail(
        units === 'metric'
          ? 'Height must be between 101 and 249 cm.'
          : 'Height must be between 3\' 4" and 8\' 2".'
      );
      return;
    }
    if (units === 'imperial' && inches !== '' && (Number(inches) < 0 || Number(inches) > 11)) {
      fail('Inches must be between 0 and 11.');
      return;
    }
    // The minimum onboardingSchema has always specified, and the one the labels
    // promise. It was never enforced here, so a player could finish with no
    // goals at all - which is what recommend.ts maps to a program and what the
    // AI coach reads as context, so an empty answer degrades both quietly.
    if (goals.length === 0) {
      fail('Pick at least one primary goal so your programme and coaching match what you are working on.');
      return;
    }
    if (focusAreas.length === 0) {
      fail('Pick at least one focus area so your programme and coaching match what you are working on.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Upsert so a player whose profile row was never created (signed up before
      // the signup trigger existed) still gets one
      const updateResponse = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim() || 'Player',
          age_bracket: ageBracket,
          height_cm: heightCm === '' ? null : Number(heightCm),
          measurement_system: units,
          position,
          dominant_hand: dominantHand,
          playing_level: playingLevel,
          goals,
          strengths,
          focus_areas: focusAreas,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      const updateError = updateResponse.error;

      if (updateError) {
        fail(updateError.message);
        setIsLoading(false);
        return;
      }

      // Create a default weekly training goal of 4 days, unless the player already has one
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('goal_type', 'weekly_training_days')
        .eq('is_active', true)
        .limit(1);

      if (!existingGoals || existingGoals.length === 0) {
        const goalsResponse = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            goal_type: 'weekly_training_days',
            title: 'Weekly Training Consistency',
            target_value: 4,
            period: 'weekly',
          });

        if (goalsResponse.error) {
          console.warn('Could not create default goal:', goalsResponse.error);
        }
      }

      router.push(isEditing ? '/profile' : '/dashboard');
      router.refresh();
    } catch {
      fail('Failed to save profile. Please try again.');
      setIsLoading(false);
    }
  }

  if (isFetchingProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Setting up your player record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                {isEditing ? 'Edit Player Info' : 'Deadeye Setup'}
              </h2>
              <p className="text-[11px] text-zinc-400">Step {step} of 3</p>
            </div>
          </div>
          {/* Step Progress Bar */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-all ${
                  s <= step ? 'bg-orange-500' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Always mounted so fail() can scroll here before the Alert renders */}
        <div ref={errorRef}>
          {error && (
            <Alert variant="error" title="Setup Error">
              {error}
            </Alert>
          )}
        </div>

        {/* STEP 1: Athlete Bio */}
        {step === 1 && (
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                <User className="h-4 w-4" /> Athlete Profile
              </div>
              <CardTitle className="text-xl">Tell us about your game</CardTitle>
              <CardDescription>
                Basic measurements and positioning to anchor your training recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Display Name / Jersey Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Marcus Smart"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as BasketballPosition)}
                  options={[
                    { value: 'PG', label: 'Point Guard (PG)' },
                    { value: 'SG', label: 'Shooting Guard (SG)' },
                    { value: 'SF', label: 'Small Forward (SF)' },
                    { value: 'PF', label: 'Power Forward (PF)' },
                    { value: 'C', label: 'Center (C)' },
                    { value: 'G', label: 'Guard (Combo)' },
                    { value: 'F', label: 'Forward (Wing)' },
                    { value: 'multi', label: 'Multi-Position' },
                  ]}
                />

                <Select
                  label="Dominant Hand"
                  value={dominantHand}
                  onChange={(e) => setDominantHand(e.target.value as DominantHand)}
                  options={[
                    { value: 'right', label: 'Right Hand' },
                    { value: 'left', label: 'Left Hand' },
                    { value: 'ambidextrous', label: 'Ambidextrous' },
                  ]}
                />
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">Units</span>
                <div className="inline-flex rounded-xl border border-zinc-700/80 bg-zinc-900/90 p-1" role="radiogroup" aria-label="Units">
                  {(['imperial', 'metric'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={units === option}
                      onClick={() => switchUnits(option)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        units === option ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {option === 'imperial' ? 'Imperial (ft, lbs)' : 'Metric (cm, kg)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {units === 'metric' ? (
                  <Input
                    label="Height (cm)"
                    type="number"
                    inputMode="numeric"
                    placeholder="188"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : '')}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Height (ft)"
                      type="number"
                      inputMode="numeric"
                      placeholder="6"
                      value={feet}
                      onChange={(e) => updateImperialHeight(e.target.value ? Number(e.target.value) : '', inches)}
                    />
                    <Input
                      label="(in)"
                      type="number"
                      inputMode="numeric"
                      placeholder="1"
                      value={inches}
                      onChange={(e) => updateImperialHeight(feet, e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                )}

                <Select
                  label="Age Bracket"
                  value={ageBracket}
                  onChange={(e) => setAgeBracket(e.target.value as AgeBracket)}
                  options={[
                    { value: '13', label: '13' },
                    { value: '14-17', label: '14 - 17 (High School)' },
                    { value: '18-22', label: '18 - 22 (College / Academy)' },
                    { value: '23-30', label: '23 - 30 (Amateur / Adult)' },
                    { value: '30+', label: '30+ (Masters / Rec)' },
                  ]}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)}>
                Next: Experience & Level <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: Experience & Level */}
        {step === 2 && (
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                <Activity className="h-4 w-4" /> Playing Level
              </div>
              <CardTitle className="text-xl">What is your current competitive tier?</CardTitle>
              <CardDescription>
                We calibrate intensity expectations and testing baselines to your tier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { id: 'beginner', title: 'Beginner', desc: 'Developing fundamentals, basic footwork, and shooting mechanics' },
                { id: 'intermediate', title: 'Intermediate / High School', desc: 'Active team or competitive rec league player training regularly' },
                { id: 'advanced', title: 'Advanced / Academy', desc: 'Varsity, prep school, or regional club player with dedicated skill training' },
                { id: 'elite', title: 'College / Pro Pipeline', desc: 'University, NCAA, semi-pro, or professional contract player' },
              ].map((lvl) => {
                const isSelected = playingLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setPlayingLevel(lvl.id as PlayingLevel)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-600/10 text-white ring-1 ring-orange-500/30'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-zinc-100">{lvl.title}</div>
                      {isSelected && <Check className="h-4 w-4 text-orange-400" />}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">{lvl.desc}</div>
                  </button>
                );
              })}
            </CardContent>
            <CardFooter className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Goals & Focus <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: Goals & Development Focus */}
        {step === 3 && (
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
                <Target className="h-4 w-4" /> Focus Areas
              </div>
              <CardTitle className="text-xl">What are you working on right now?</CardTitle>
              <CardDescription>
                Select your current training targets and specific development cues.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Primary Goals */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Primary Goals (Select 1-3) <span className="text-zinc-500">· {goals.length}/3</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((g) => {
                    const active = goals.includes(g);
                    const atCap = !active && goals.length >= 3;
                    return (
                      <button
                        key={g}
                        type="button"
                        disabled={atCap}
                        onClick={() => toggleItem(goals, g, setGoals, 3)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'border-orange-500 bg-orange-500/20 text-orange-300 font-semibold'
                            : atCap
                              ? 'border-zinc-800/60 bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Focus Areas */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Immediate Focus Areas (Select 1-3) <span className="text-zinc-500">· {focusAreas.length}/3</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREA_OPTIONS.map((fa) => {
                    const active = focusAreas.includes(fa);
                    const atCap = !active && focusAreas.length >= 3;
                    return (
                      <button
                        key={fa}
                        type="button"
                        disabled={atCap}
                        onClick={() => toggleItem(focusAreas, fa, setFocusAreas, 3)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-semibold'
                            : atCap
                              ? 'border-zinc-800/60 bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {fa}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Existing Strengths
                </label>
                <div className="flex flex-wrap gap-2">
                  {STRENGTH_OPTIONS.map((str) => {
                    const active = strengths.includes(str);
                    return (
                      <button
                        key={str}
                        type="button"
                        onClick={() => toggleItem(strengths, str, setStrengths)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {str}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={handleFinish}
                isLoading={isLoading}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" /> {isEditing ? 'Save changes' : 'Enter Deadeye OS'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
