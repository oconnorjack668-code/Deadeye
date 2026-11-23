// src/app/(app)/onboarding/page.tsx
// Setup after sign-up, and "Edit player info" from Profile (?edit=1).
// D4 (docs/agent-os/design/2026-11-23-setup.md): a slim header instead of the
// app's Navbar and tab bar, three steps in one card, and a footer that keeps
// Next or Finish on screen. Irish and UK words, centimetres first, and no
// second age question for a 13 to 15 sign-up.
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import {
  User,
  Activity,
  Target,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ClipboardCheck,
  Users,
  Settings,
  X,
  Crosshair,
  Zap,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import type { BasketballPosition, DominantHand, PlayingLevel } from '@/lib/supabase/types';
import { asMeasurementSystem, cmToFeetInches, feetInchesToCm, type MeasurementSystem } from '@/lib/units';
import { bracketFromSetup, setupAnswerFrom, type SetupAgeAnswer } from '@/lib/ageBracket';
import { nameBlocked, NAME_BLOCKED_MESSAGE } from '@/lib/nameFilter';
import { track } from '@/lib/events';
import {
  FOCUS_AREA_OPTIONS,
  GOAL_OPTIONS,
  STRENGTH_OPTIONS,
  chipLabel,
  currentFocusArea,
  type ChipOption,
} from '@/lib/focusAreas';

const STEP_NAMES = ['About you', 'Your level', 'Your focus'] as const;

const POSITIONS: { value: BasketballPosition; label: string }[] = [
  { value: 'PG', label: 'Point guard (PG)' },
  { value: 'SG', label: 'Shooting guard (SG)' },
  { value: 'SF', label: 'Small forward (SF)' },
  { value: 'PF', label: 'Power forward (PF)' },
  { value: 'C', label: 'Centre (C)' },
  { value: 'G', label: 'Guard (combo)' },
  { value: 'F', label: 'Forward (wing)' },
  { value: 'multi', label: 'Multi-position' },
];

const HANDS: { value: DominantHand; label: string }[] = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'ambidextrous', label: 'Both' },
];

const AGE_CHOICES: { value: SetupAgeAnswer; label: string }[] = [
  { value: '16-17', label: '16 or 17' },
  { value: '18+', label: '18 or older' },
];

// Stored values unchanged; the words are school, club and senior, not US ones
const LEVELS: { value: PlayingLevel; title: string; hint: string }[] = [
  { value: 'beginner', title: 'Just starting', hint: 'Learning the basics: footwork, shooting form and ball handling.' },
  { value: 'intermediate', title: 'School or club team', hint: 'Playing for a team or in a league and training most weeks.' },
  { value: 'advanced', title: 'Top club or academy', hint: 'Regional or national squads, or an academy with extra skills sessions.' },
  { value: 'elite', title: 'Senior or pro', hint: 'Senior team, university, semi-pro or professional.' },
];

const MAX_PICKS = 3;

type FieldKey = 'name' | 'age' | 'height' | 'goals' | 'focus';
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Chosen = orange outline and tint (the solid orange is only the next action). */
const CHOSEN = 'border-orange-500 bg-orange-600/10 text-white';
const UNCHOSEN = 'border-zinc-500/70 bg-zinc-900/60 text-zinc-200 hover:border-zinc-400';
const FOCUS_RING = 'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-zinc-950';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepChanged = useRef(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  // Sign-up's "16 or older" answer: a 13 to 15 sign-up is never asked again,
  // and a 16-or-older one picks between two choices, neither chosen for them
  const [is16Plus, setIs16Plus] = useState<boolean | null>(null);
  const [ageAnswer, setAgeAnswer] = useState<SetupAgeAnswer | ''>('');
  // Height is kept in cm (what's stored); feet and inches are a link away
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [units, setUnits] = useState<MeasurementSystem>('metric');
  const [feet, setFeet] = useState<number | ''>('');
  const [inches, setInches] = useState<number | ''>('');
  const [position, setPosition] = useState<BasketballPosition>('G');
  const [dominantHand, setDominantHand] = useState<DominantHand>('right');
  const [playingLevel, setPlayingLevel] = useState<PlayingLevel>('intermediate');
  const [goals, setGoals] = useState<string[]>(['Consistent Training Habit', '3-Point Shooting Consistency']);
  const [strengths, setStrengths] = useState<string[]>(['Catch & Shoot Accuracy']);
  const [focusAreas, setFocusAreas] = useState<string[]>(['Shooting Arc & Dip']);
  const [strengthsOpen, setStrengthsOpen] = useState(false);
  // /onboarding?edit=1 (from Profile) edits an existing player record
  const [isEditing, setIsEditing] = useState(false);
  // New accounts first say whether they play, coach or both. Coaching has its
  // own, shorter setup (/coach/setup); "both" does that first and comes back
  // here for the player part, with the question already answered.
  const [askRole, setAskRole] = useState(false);
  const [accountRole, setAccountRole] = useState<string>('player');

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

      const [{ data: profile }, { data: ageCheck }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('age_checks').select('is_16_plus').eq('user_id', user.id).maybeSingle(),
      ]);

      if (ageCheck) setIs16Plus(ageCheck.is_16_plus);

      if (!editing && profile?.account_role !== 'both') setAskRole(true);
      if (profile?.account_role) setAccountRole(profile.account_role);

      if (profile) {
        if (profile.onboarding_completed && !editing) {
          router.push('/dashboard');
          return;
        }
        if (!profile.onboarding_completed) track('setup_started');
        if (profile.display_name) setDisplayName(profile.display_name);
        if (ageCheck?.is_16_plus) setAgeAnswer(setupAnswerFrom(profile.age_bracket));
        // measurement_system defaults to imperial in the table (00010), so only
        // a finished setup's value is a choice the player made
        if (profile.onboarding_completed && profile.measurement_system) {
          setUnits(asMeasurementSystem(profile.measurement_system));
        }
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
        if (profile.focus_areas && profile.focus_areas.length > 0) {
          setFocusAreas([...new Set(profile.focus_areas.map(currentFocusArea))]);
        }
      }

      setIsFetchingProfile(false);
    }

    loadCurrent();
  }, [router]);

  // A new step starts at the top, with focus on its title for screen readers
  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    window.scrollTo(0, 0);
    headingRef.current?.focus();
  }, [step]);

  function goTo(next: number) {
    stepChanged.current = true;
    setStep(next);
  }

  function updateImperialHeight(nextFeet: number | '', nextInches: number | '') {
    setFeet(nextFeet);
    setInches(nextInches);
    setHeightCm(nextFeet === '' ? '' : feetInchesToCm(Number(nextFeet), Number(nextInches || 0)));
  }

  function switchUnits() {
    const next: MeasurementSystem = units === 'metric' ? 'imperial' : 'metric';
    setUnits(next);
    if (next === 'imperial' && heightCm !== '') {
      const imperial = cmToFeetInches(Number(heightCm));
      setFeet(imperial.feet);
      setInches(imperial.inches);
    }
  }

  // Past the cap the rest are disabled in the render, so the limit the hint
  // promises is one a player can see
  function toggleItem(list: string[], item: string, setter: (items: string[]) => void, max?: number) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else if (max === undefined || list.length < max) {
      setter([...list, item]);
    }
  }

  /** Shows the errors beside their fields and brings the first one into view. */
  function showErrors(found: FieldErrors) {
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) requestAnimationFrame(() => document.getElementById(`field-${first}`)?.scrollIntoView({ block: 'center' }));
  }

  /** Step 1: a name, the age answer from a 16-or-older sign-up, and a height in range if given. */
  function profileErrors(): FieldErrors {
    const found: FieldErrors = {};
    const name = displayName.trim();
    // Shown on the leaderboard to players as young as 13 (src/lib/nameFilter.ts)
    if (name.length < 2) found.name = 'Enter your name or a nickname, 2 or more letters.';
    else if (nameBlocked(name)) found.name = NAME_BLOCKED_MESSAGE;
    if (is16Plus === true && !ageAnswer) found.age = 'Choose 16 or 17, or 18 or older.';
    // Matches the profiles.height_cm CHECK (between 100 and 250 cm)
    if (heightCm !== '' && (Number(heightCm) <= 100 || Number(heightCm) >= 250)) {
      found.height = units === 'metric' ? 'Height must be between 101 and 249 cm.' : 'Height must be between 3\' 4" and 8\' 2".';
    } else if (units === 'imperial' && inches !== '' && (Number(inches) < 0 || Number(inches) > 11)) {
      found.height = 'Inches must be between 0 and 11.';
    }
    return found;
  }

  function nextFromProfile() {
    const found = profileErrors();
    if (Object.keys(found).length > 0) return showErrors(found);
    setErrors({});
    goTo(2);
  }

  async function handleFinish() {
    setSaveError(null);
    const found = profileErrors();
    if (Object.keys(found).length > 0) {
      // Plain setStep: the error, not the top of the step, is what to show
      setStep(1);
      return showErrors(found);
    }
    // recommend.ts maps goals to a program and the AI coach reads both, so an
    // empty answer would quietly degrade them
    const focusErrors: FieldErrors = {};
    if (goals.length === 0) focusErrors.goals = 'Pick at least one goal, so your plan and coaching fit what you are working on.';
    if (focusAreas.length === 0) focusErrors.focus = 'Pick at least one focus area, so your plan and coaching fit what you are working on.';
    if (Object.keys(focusErrors).length > 0) return showErrors(focusErrors);
    setErrors({});

    // The app layout sends a player with no sign-up age answer to /age-check
    // first; if one gets here anyway, they answer there rather than here
    const ageBracket = bracketFromSetup(is16Plus, ageAnswer);
    if (!ageBracket) {
      router.push('/age-check');
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
          display_name: displayName.trim(),
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

      if (updateResponse.error) {
        setSaveError('Failed to save profile. Please try again.');
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

      // A player-coach finishing the player part carries on as a player. Its own
      // call, so a missing app_mode column (before 00047) cannot stop setup.
      if (accountRole === 'both' && !isEditing) {
        await supabase.from('profiles').update({ app_mode: 'playing' }).eq('id', user.id);
      }

      // A new player lands on the welcome screen's "are you at a court?" rather
      // than the dashboard: see src/app/(app)/welcome/page.tsx
      router.push(isEditing ? '/profile' : '/welcome');
      router.refresh();
    } catch {
      setSaveError('Failed to save profile. Please try again.');
      setIsLoading(false);
    }
  }

  if (isFetchingProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-sm text-zinc-400 font-medium">Setting up your player record...</p>
        </div>
      </div>
    );
  }

  if (askRole) {
    const choices = [
      { key: 'player', title: "I'm a player", text: 'Track your shots, train and get better.', icon: User },
      { key: 'coach', title: 'I coach', text: 'Set up your team and see who is training.', icon: ClipboardCheck },
      { key: 'both', title: 'I play and coach', text: 'Switch between your own training and your team.', icon: Users },
    ] as const;
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <SetupHeader editing={false} />
        <div className="mx-auto w-full max-w-lg space-y-5 px-4 pb-10 pt-6">
          <div>
            <h1 className="text-2xl font-black text-white">How will you use Deadeye?</h1>
            <p className="mt-1 text-sm text-zinc-400">You can change this later in Settings.</p>
          </div>
          <div className="space-y-3">
            {choices.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    if (c.key === 'player') setAskRole(false);
                    else router.push(`/coach/setup?role=${c.key}`);
                  }}
                  className="flex min-h-[72px] w-full items-center gap-4 rounded-2xl border border-zinc-500/70 bg-zinc-900/70 p-4 text-left transition-colors duration-150 hover:border-zinc-400 motion-reduce:transition-none active:scale-[0.98]"
                >
                  <IconTile icon={Icon} />
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-white">{c.title}</span>
                    <span className="block text-sm text-zinc-400">{c.text}</span>
                  </span>
                  <ArrowRight className="ml-auto h-5 w-5 flex-shrink-0 text-zinc-400" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const stepIcon = [User, Activity, Target][step - 1];
  const stepTitle = ['Tell us about your game', 'What level do you play at?', 'What are you working on?'][step - 1];
  const stepText = [
    'So your plans, drills and coaching fit you.',
    'So your plans start at the right level.',
    'You can change these later in your profile.',
  ][step - 1];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SetupHeader editing={isEditing} />

      <div className="mx-auto w-full max-w-lg px-4 pb-36 pt-4">
        {/* Progress */}
        <div className="mb-4">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-bold text-white">
              Step {step} of 3
            </span>
            <span className="text-zinc-400">{STEP_NAMES[step - 1]}</span>
          </div>
          <div className="grid grid-cols-3 gap-2" aria-hidden>
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full ${s <= step ? 'bg-orange-500' : 'bg-zinc-800'}`} />
            ))}
          </div>
        </div>

        {saveError && (
          <Alert variant="error" title="Could not save" className="mb-4">
            {saveError}
          </Alert>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" aria-labelledby="setup-step-title">
          <div className="mb-5 flex items-start gap-3">
            <IconTile icon={stepIcon} />
            <div className="min-w-0">
              <h1
                id="setup-step-title"
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-black leading-tight text-white focus:outline-none"
              >
                {stepTitle}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">{stepText}</p>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div id="field-name">
                <Input
                  id="setup-name"
                  label="Your name or a nickname"
                  icon={User}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sam"
                  hint="Shown on leaderboards. A first name or a nickname is fine."
                  error={errors.name}
                  autoComplete="nickname"
                  required
                />
              </div>

              {is16Plus === true && (
                <fieldset id="field-age" aria-describedby="age-why" className="space-y-2">
                  <legend className="text-sm font-medium text-zinc-200">How old are you?</legend>
                  <p className="text-sm text-zinc-400">You said you are 16 or older when you signed up.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {AGE_CHOICES.map((c) => (
                      <RadioCard
                        key={c.value}
                        name="age"
                        checked={ageAnswer === c.value}
                        onChange={() => {
                          setAgeAnswer(c.value);
                          setErrors((e) => ({ ...e, age: undefined }));
                        }}
                        label={c.label}
                        marker="dot"
                      />
                    ))}
                  </div>
                  <p id="age-why" className="text-sm text-zinc-400">
                    Why we ask: players under 18 get extra protections, like a parent saying yes to competition entries.
                  </p>
                  {errors.age && <p className="text-sm font-medium text-red-400">{errors.age}</p>}
                </fieldset>
              )}

              <Select
                id="setup-position"
                label="Position"
                value={position}
                onChange={(e) => setPosition(e.target.value as BasketballPosition)}
                options={POSITIONS}
              />

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-zinc-200">Dominant hand</legend>
                <div className="grid grid-cols-3 gap-2">
                  {HANDS.map((h) => (
                    <RadioCard
                      key={h.value}
                      name="hand"
                      checked={dominantHand === h.value}
                      onChange={() => setDominantHand(h.value)}
                      label={h.label}
                      marker="check"
                      centred
                    />
                  ))}
                </div>
              </fieldset>

              <div id="field-height" className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={units === 'metric' ? 'setup-height-cm' : 'setup-height-ft'} className="text-sm font-medium text-zinc-200">
                    Height <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={switchUnits}
                    className="min-h-8 text-sm text-zinc-200 underline underline-offset-4 hover:text-white"
                  >
                    {units === 'metric' ? 'Use feet and inches' : 'Use centimetres'}
                  </button>
                </div>
                {units === 'metric' ? (
                  <SuffixField suffix="cm">
                    <Input
                      id="setup-height-cm"
                      type="number"
                      inputMode="numeric"
                      placeholder="188"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : '')}
                      className="pr-12"
                      aria-invalid={errors.height ? true : undefined}
                    />
                  </SuffixField>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <SuffixField suffix="ft">
                      <Input
                        id="setup-height-ft"
                        type="number"
                        inputMode="numeric"
                        placeholder="6"
                        aria-label="Height, feet"
                        value={feet}
                        onChange={(e) => updateImperialHeight(e.target.value ? Number(e.target.value) : '', inches)}
                        className="pr-10"
                      />
                    </SuffixField>
                    <SuffixField suffix="in">
                      <Input
                        id="setup-height-in"
                        type="number"
                        inputMode="numeric"
                        placeholder="2"
                        aria-label="Height, inches"
                        value={inches}
                        onChange={(e) => updateImperialHeight(feet, e.target.value ? Number(e.target.value) : '')}
                        className="pr-10"
                      />
                    </SuffixField>
                  </div>
                )}
                {errors.height && <p className="text-sm font-medium text-red-400">{errors.height}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <fieldset className="space-y-3">
              <legend className="sr-only">Your level</legend>
              {LEVELS.map((lvl, i) => (
                <RadioCard
                  key={lvl.value}
                  name="level"
                  checked={playingLevel === lvl.value}
                  onChange={() => setPlayingLevel(lvl.value)}
                  label={lvl.title}
                  hint={lvl.hint}
                  marker="dot"
                  trailing={<LevelMark level={i + 1} />}
                />
              ))}
            </fieldset>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <ChipGroup
                id="field-goals"
                icon={Target}
                title="Goals"
                options={GOAL_OPTIONS}
                chosen={goals}
                tone="orange"
                max={MAX_PICKS}
                error={errors.goals}
                onToggle={(v) => toggleItem(goals, v, setGoals, MAX_PICKS)}
              />
              <ChipGroup
                id="field-focus"
                icon={Crosshair}
                title="Focus areas"
                options={FOCUS_AREA_OPTIONS}
                chosen={focusAreas}
                tone="amber"
                max={MAX_PICKS}
                error={errors.focus}
                onToggle={(v) => toggleItem(focusAreas, v, setFocusAreas, MAX_PICKS)}
              />

              <div className="rounded-xl border border-zinc-500/70">
                <button
                  type="button"
                  aria-expanded={strengthsOpen}
                  aria-controls="setup-strengths"
                  onClick={() => setStrengthsOpen((o) => !o)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Zap className="h-5 w-5 flex-shrink-0 text-zinc-400" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">
                      Your strengths <span className="font-normal text-zinc-400">(optional)</span>
                    </span>
                    <span className="block truncate text-sm text-zinc-300">
                      {strengths.length ? strengths.map(chipLabel).join(', ') : 'None picked'}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform duration-150 motion-reduce:transition-none ${strengthsOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>
                {strengthsOpen && (
                  <div id="setup-strengths" className="border-t border-zinc-800 p-3">
                    <Chips
                      label="Your strengths"
                      options={STRENGTH_OPTIONS}
                      chosen={strengths}
                      tone="emerald"
                      onToggle={(v) => toggleItem(strengths, v, setStrengths)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Fixed, not sticky: the app layout's <main> clips overflow, which would pin a sticky footer to it */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-5 pt-3 backdrop-blur-md safe-bottom">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" size="lg" onClick={() => goTo(step - 1)} className="motion-reduce:transition-none">
              <ArrowLeft className="h-5 w-5" aria-hidden /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 motion-reduce:transition-none"
              onClick={step === 1 ? nextFromProfile : () => goTo(3)}
            >
              Next <ArrowRight className="h-5 w-5" aria-hidden />
            </Button>
          ) : (
            <Button type="button" size="lg" className="flex-1 motion-reduce:transition-none" onClick={handleFinish} isLoading={isLoading}>
              <Sparkles className="h-5 w-5" aria-hidden /> {isEditing ? 'Save changes' : 'Finish setup'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Logo, name, slogan and Settings; a close button when editing from Profile. */
function SetupHeader({ editing }: { editing: boolean }) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950">
      <div className="mx-auto flex h-16 w-full max-w-lg items-center gap-3 px-4">
        <Logo size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black uppercase leading-none tracking-tight text-white">
            {editing ? 'Edit player info' : 'Deadeye setup'}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase leading-none tracking-wider text-red-400">Aim is earned</p>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-500/70 text-zinc-200 hover:text-white"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
        {editing && (
          <Link
            href="/profile"
            aria-label="Close without saving"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-500/70 text-zinc-200 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </Link>
        )}
      </div>
    </header>
  );
}

function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-orange-300 ring-1 ring-inset ring-white/10">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

/** A native radio dressed as a card: arrow keys and screen readers work as for any radio group. */
function RadioCard({
  name,
  checked,
  onChange,
  label,
  hint,
  marker,
  centred = false,
  trailing,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
  marker: 'dot' | 'check';
  centred?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-150 motion-reduce:transition-none ${
        centred ? 'justify-center' : ''
      } ${checked ? CHOSEN : UNCHOSEN} ${FOCUS_RING}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {marker === 'dot' ? (
        <span
          aria-hidden
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${checked ? 'border-orange-500' : 'border-zinc-400'}`}
        >
          {checked && <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
        </span>
      ) : (
        checked && <Check className="h-4 w-4 flex-shrink-0 text-orange-400" aria-hidden />
      )}
      <span className={centred ? 'min-w-0' : 'min-w-0 flex-1'}>
        <span className={`block text-sm ${checked ? 'font-bold' : 'font-medium'}`}>{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-zinc-400">{hint}</span>}
      </span>
      {trailing}
    </label>
  );
}

/** Four bars, filled to the level: decoration beside the words. */
function LevelMark({ level }: { level: number }) {
  return (
    <span aria-hidden className="flex flex-shrink-0 items-end gap-0.5">
      {[1, 2, 3, 4].map((b) => (
        <span key={b} className={`w-1 rounded-sm ${b <= level ? 'bg-orange-400' : 'bg-zinc-700'}`} style={{ height: 4 + b * 3 }} />
      ))}
    </span>
  );
}

function SuffixField({ suffix, children }: { suffix: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
        {suffix}
      </span>
    </div>
  );
}

type Tone = 'orange' | 'amber' | 'emerald';
const TONES: Record<Tone, string> = {
  orange: 'border-orange-500 bg-orange-500/15 text-orange-200',
  amber: 'border-amber-500 bg-amber-500/15 text-amber-200',
  emerald: 'border-emerald-500 bg-emerald-500/15 text-emerald-200',
};
const CHECK_TONES: Record<Tone, string> = { orange: 'text-orange-300', amber: 'text-amber-300', emerald: 'text-emerald-300' };

function ChipGroup({
  id,
  icon: Icon,
  title,
  options,
  chosen,
  tone,
  max,
  error,
  onToggle,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  options: readonly ChipOption[];
  chosen: string[];
  tone: Tone;
  max: number;
  error?: string;
  onToggle: (value: string) => void;
}) {
  return (
    <div id={id} className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-zinc-400" aria-hidden />
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <span className="text-sm text-zinc-400">Pick 1 to {max}</span>
        <span className="ml-auto rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-200" aria-label={`${chosen.length} of ${max} picked`}>
          {chosen.length}/{max}
        </span>
      </div>
      <Chips label={title} options={options} chosen={chosen} tone={tone} max={max} onToggle={onToggle} />
      {error && <p className="text-sm font-medium text-red-400">{error}</p>}
    </div>
  );
}

function Chips({
  label,
  options,
  chosen,
  tone,
  max,
  onToggle,
}: {
  label: string;
  options: readonly ChipOption[];
  chosen: string[];
  tone: Tone;
  max?: number;
  onToggle: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = chosen.includes(o.value);
        const atCap = !active && max !== undefined && chosen.length >= max;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={atCap}
            onClick={() => onToggle(o.value)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none ${
              active ? `${TONES[tone]} font-semibold` : atCap ? 'cursor-not-allowed border-zinc-700 text-zinc-500 opacity-60' : UNCHOSEN
            }`}
          >
            {active && <Check className={`h-4 w-4 flex-shrink-0 ${CHECK_TONES[tone]}`} aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
