// src/app/(app)/coach/setup/page.tsx
'use client';

// Coach setup: about you (with the safeguarding step), the first team, and a
// share screen with the code, a QR code and a message for parents. A coach
// under 18 joins a team instead, where a head coach can make them an
// assistant. The rules are enforced by the database (00047_coach_side.sql);
// this page only explains them first.
//
//   /coach/setup?role=coach|both   new coach, from the first setup question
//   /coach/setup?step=team         a set-up coach adding another team
//   /coach/setup?edit=1            change the answers, from Settings

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { TeamShare } from '@/components/coach/TeamShare';
import { AGE_GROUPS, TEAM_LEVELS, clearTeamInvite, pendingTeamInvite } from '@/lib/coachSide';
import { normaliseCode } from '@/lib/friends';
import { nameBlocked, NAME_BLOCKED_MESSAGE } from '@/lib/nameFilter';
import { ClipboardCheck, ShieldCheck } from 'lucide-react';

type Step = 'loading' | 'about' | 'team' | 'join' | 'share';
type Role = 'coach' | 'both';

const JOIN_MESSAGES: Record<string, string> = {
  already: "You're already on this team.",
  not_found: 'No team has that code. Team codes start with T and have 6 characters.',
  full: 'That team is full (60 members).',
};

export default function CoachSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<Role>('coach');
  const [editing, setEditing] = useState(false);
  const [playerSetupDone, setPlayerSetupDone] = useState(false);
  // What the account already says about age; a known under-18 cannot answer yes
  const [knownMinor, setKnownMinor] = useState(false);

  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [vetted, setVetted] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [level, setLevel] = useState('club');
  const [joinCode, setJoinCode] = useState('');
  const [team, setTeam] = useState<{ name: string; code: string } | null>(null);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const [{ data: profile }, { data: coach }, { data: age }] = await Promise.all([
        supabase.from('profiles').select('display_name, account_role, age_bracket, onboarding_completed').eq('id', user.id).maybeSingle(),
        supabase.from('coach_profiles').select('club_name, is_adult').eq('user_id', user.id).maybeSingle(),
        supabase.from('age_checks').select('is_16_plus').eq('user_id', user.id).maybeSingle(),
      ]);

      const minor = age?.is_16_plus === false || ['13', '14-17'].includes(profile?.age_bracket ?? '');
      setKnownMinor(minor);
      setName(profile?.display_name ?? '');
      setPlayerSetupDone(!!profile?.onboarding_completed);
      const asked = params.get('role');
      setRole(asked === 'coach' || asked === 'both' ? asked : profile?.account_role === 'both' || profile?.onboarding_completed ? 'both' : 'coach');
      if (coach) {
        setClub(coach.club_name ?? '');
        setIsAdult(coach.is_adult);
        setVetted(coach.is_adult);
      } else if (minor) {
        setIsAdult(false);
      }
      const invite = pendingTeamInvite();
      if (invite) setJoinCode(invite);

      if (params.get('edit') === '1') {
        setEditing(true);
        setStep('about');
      } else if (coach && params.get('step') === 'team') {
        setStep(coach.is_adult ? 'team' : 'join');
      } else {
        setStep('about');
      }
    }
    void load();
  }, [router]);

  function fail(message: string) {
    setError(message);
    setBusy(false);
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function saveAbout() {
    setError(null);
    if (nameBlocked(name) || !name.trim()) return fail(name.trim() ? NAME_BLOCKED_MESSAGE : 'Enter your name.');
    if (isAdult === null) return fail('Say whether you are 18 or over.');
    if (isAdult && !vetted) return fail('Please confirm that your club has Garda vetted you, or will before you coach.');
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { error: nameError } = await supabase.from('profiles').update({ display_name: name.trim().slice(0, 40) }).eq('id', user.id);
    if (nameError) return fail(nameError.message);
    const { error: saveError } = await supabase.rpc('save_coach_profile', { p_club: club.trim() || null, p_is_adult: isAdult, p_vetted: vetted, p_role: role });
    if (saveError) return fail(saveError.message);

    setBusy(false);
    if (editing) {
      router.push('/settings');
      router.refresh();
      return;
    }
    if (isAdult && !teamName && club) setTeamName(club);
    setStep(isAdult ? 'team' : 'join');
  }

  async function createTeam() {
    setError(null);
    if (teamName.trim().length < 2) return fail('Give your team a name (at least 2 characters).');
    if (nameBlocked(teamName)) return fail(NAME_BLOCKED_MESSAGE);
    if (!ageGroup) return fail('Choose the age group.');
    setBusy(true);
    const supabase = createClient();
    const { data: id, error: createError } = await supabase.rpc('create_team_with_details', {
      p_name: teamName.trim().slice(0, 60),
      p_club: club.trim() || null,
      p_age_group: ageGroup,
      p_level: level,
    });
    if (createError || !id) return fail(createError?.message || 'Could not create the team. Please try again.');
    const { data: created } = await supabase.from('teams').select('name, join_code').eq('id', id).maybeSingle();
    setBusy(false);
    if (!created) {
      router.push(`/teams/${id}`);
      return;
    }
    setTeam({ name: created.name, code: created.join_code });
    setStep('share');
  }

  async function join() {
    setError(null);
    const clean = normaliseCode(joinCode);
    if (clean.length !== 6) return fail('Team codes have 6 characters, e.g. T4KX9P.');
    setBusy(true);
    const { data, error: joinError } = await createClient().rpc('join_team', { p_code: clean });
    if (joinError) return fail(joinError.message);
    if (data !== 'joined' && data !== 'already') return fail(JOIN_MESSAGES[data] || 'Could not join that team.');
    clearTeamInvite();
    router.push(role === 'both' && !playerSetupDone ? '/onboarding' : '/coach');
    router.refresh();
  }

  function finish() {
    router.push(role === 'both' && !playerSetupDone ? '/onboarding' : '/coach');
    router.refresh();
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-lg space-y-6 p-4 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">{editing ? 'Coach details' : 'Coach setup'}</h1>
            <p className="text-sm text-zinc-400">
              {step === 'about' && 'About you'}
              {step === 'team' && 'Your team'}
              {step === 'join' && 'Join your team'}
              {step === 'share' && 'Get your players in'}
            </p>
          </div>
        </div>

        <div ref={errorRef}>
          {error && (
            <Alert variant="error" title="Check this">
              {error}
            </Alert>
          )}
        </div>

        {step === 'about' && (
          <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <Input label="Your name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="What players call you" />
            <Input label="Club or school" value={club} maxLength={80} onChange={(e) => setClub(e.target.value)} placeholder="e.g. Wexford Blazers" />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Are you 18 or over?</p>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={isAdult === v}
                    disabled={v && knownMinor}
                    onClick={() => setIsAdult(v)}
                    className={`rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 ${isAdult === v ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
              {knownMinor && <p className="text-xs text-zinc-500">Your account says you are under 18.</p>}
              {isAdult === false && (
                <p className="text-sm text-zinc-300">
                  Coaches under 18 help as an assistant coach, on a team with an adult head coach. You can post assignments and share the team
                  code; the head coach runs the team.
                </p>
              )}
            </div>

            {isAdult && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <input type="checkbox" checked={vetted} onChange={(e) => setVetted(e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-indigo-500" />
                <span className="text-sm text-zinc-200">
                  My club has Garda vetted me, or will before I coach its players.
                  <span className="mt-1 block text-xs text-zinc-500">
                    Basketball Ireland requires vetting for everyone who works with young players. Deadeye can&apos;t check it, so it never
                    shows a &quot;vetted&quot; badge.
                  </span>
                </span>
              </label>
            )}

            <div className="space-y-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-zinc-200">
              <p className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-indigo-300" /> How coaching works on Deadeye
              </p>
              <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                <li>You post to the whole team. There are no private messages between coaches and players.</li>
                <li>You see each player&apos;s weekly totals, and more only if they choose to share it. Never their notes or videos.</li>
                <li>Coaches and players under 18 can&apos;t be friends on Deadeye.</li>
              </ul>
            </div>

            <Button variant="primary" className="w-full" isLoading={busy} onClick={() => void saveAbout()}>
              {editing ? 'Save' : 'Continue'}
            </Button>
          </section>
        )}

        {step === 'team' && (
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <Input label="Team name" value={teamName} maxLength={60} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Blazers U16 Boys" />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Age group"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                options={[{ value: '', label: 'Choose' }, ...AGE_GROUPS.map((a) => ({ value: a, label: a }))]}
              />
              <Select label="Level" value={level} onChange={(e) => setLevel(e.target.value)} options={TEAM_LEVELS.map((l) => ({ value: l.value, label: l.label }))} />
            </div>
            <Button variant="primary" className="w-full" isLoading={busy} onClick={() => void createTeam()}>
              Create team
            </Button>
            <button type="button" onClick={() => setStep('join')} className="w-full text-center text-sm text-zinc-400 underline">
              Another coach already made the team? Join it instead
            </button>
          </section>
        )}

        {step === 'join' && (
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-sm text-zinc-300">
              Ask your head coach for the team code. Once you&apos;re on the team, they can make you {isAdult ? 'a coach' : 'an assistant coach'}{' '}
              from the team page.
            </p>
            <Input
              label="Team code"
              value={joinCode}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(e) => setJoinCode(normaliseCode(e.target.value))}
              placeholder="T4KX9P"
            />
            <Button variant="primary" className="w-full" isLoading={busy} onClick={() => void join()}>
              Join team
            </Button>
            {isAdult && (
              <button type="button" onClick={() => setStep('team')} className="w-full text-center text-sm text-zinc-400 underline">
                Create a team instead
              </button>
            )}
            <button type="button" onClick={finish} className="w-full text-center text-sm text-zinc-500 underline">
              I&apos;ll do this later
            </button>
          </section>
        )}

        {step === 'share' && team && (
          <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="text-sm text-zinc-300">
              <span className="font-bold text-white">{team.name}</span> is ready. Players join for free with the code or link.
            </p>
            <TeamShare teamName={team.name} code={team.code} coachName={name.trim() || 'Coach'} />
            <Button variant="primary" className="w-full" onClick={finish}>
              {role === 'both' && !playerSetupDone ? 'Next: your own player setup' : 'Go to coach home'}
            </Button>
          </section>
        )}

        {step !== 'share' && !editing && (
          <p className="text-center text-xs text-zinc-500">
            Only playing? <Link href="/onboarding" className="underline">Set up as a player</Link>
          </p>
        )}
      </div>
    </div>
  );
}
