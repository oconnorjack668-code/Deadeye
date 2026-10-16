// src/app/(app)/settings/SettingsClient.tsx
'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { IRISH_COUNTIES, cleanRegion, countryOptions, regionLabel } from '@/lib/regions';
import type { MeasurementSystem } from '@/lib/units';
import { SoundPicker } from '@/components/video/SoundPicker';
import { Check, ChevronRight, Crown, Globe, Lock, Ruler, User, Bell, Database, Info, Pencil, Sparkles, Volume2 } from 'lucide-react';

type Role = 'player' | 'coach' | 'both';

const noSubscribe = () => () => undefined;

interface Initial {
  display_name: string;
  account_role: Role;
  is_public: boolean;
  show_position: boolean;
  show_height: boolean;
  show_location: boolean;
  allow_friend_requests: boolean;
  share_with_coaches: boolean;
  ai_coaching_enabled: boolean;
  country: string | null;
  region: string | null;
  timezone: string | null;
  measurement_system: MeasurementSystem;
}

type Patch = Partial<Omit<Initial, 'measurement_system'>> & { measurement_system?: MeasurementSystem };

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
      <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-bold uppercase tracking-wide text-zinc-400">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <div className="divide-y divide-zinc-800">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer">
      <span>
        <span className="block text-sm text-zinc-100">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 flex-shrink-0 accent-red-500" />
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-3">{children}</div>;
}

function timeZoneList(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') || [];
  } catch {
    return [];
  }
}

export function SettingsClient({
  email,
  plan,
  initial,
  notifications,
  dataControls,
  supportEmail,
  version,
}: {
  email: string | null;
  plan: string;
  initial: Initial;
  notifications: React.ReactNode;
  dataControls: React.ReactNode;
  supportEmail: string | null;
  version: string;
}) {
  const router = useRouter();
  const [s, setS] = useState<Initial>(initial);
  const [name, setName] = useState(initial.display_name);
  const [regionText, setRegionText] = useState(initial.region || '');
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  // Country names and time zones come from the phone's own lists, so they're filled in after
  // the page loads (the server's lists and time zone differ from the phone's)
  const onPhone = useSyncExternalStore(noSubscribe, () => true, () => false);
  const countries = useMemo(() => (onPhone ? countryOptions() : []), [onPhone]);
  const zones = useMemo(() => (onPhone ? timeZoneList() : []), [onPhone]);
  const phoneZone = useMemo(() => {
    if (!onPhone) return null;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, [onPhone]);

  async function save(patch: Patch, okText = 'Saved') {
    const before = s;
    setS((cur) => ({ ...cur, ...patch }));
    setStatus(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      setS(before);
      setStatus({ tone: 'error', text: `Could not save: ${error.message}` });
      return false;
    }
    // Reminders are scheduled from the notification settings' time zone
    if ('timezone' in patch && patch.timezone) {
      await supabase.from('notification_preferences').update({ timezone: patch.timezone }).eq('user_id', user.id);
    }
    setStatus({ tone: 'ok', text: okText });
    setTimeout(() => setStatus(null), 1800);
    router.refresh();
    return true;
  }

  async function saveName() {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (clean.length < 2) {
      setStatus({ tone: 'error', text: 'Your name needs at least 2 characters.' });
      return;
    }
    if (clean !== s.display_name) await save({ display_name: clean }, 'Name saved');
  }

  async function sendPasswordReset() {
    if (!email) return;
    // /reset-password is the form that ASKS for a reset email, so pointing the
    // emailed link back at it just showed that form again - an unbreakable loop
    // for anyone trying to change a password from here.
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    if (error) setStatus({ tone: 'error', text: error.message });
    else setResetSent(true);
  }

  const zoneValue = s.timezone || '';

  return (
    <div className="space-y-5">
      {status && (
        <div
          role="status"
          className={`sticky top-2 z-10 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
            status.tone === 'ok' ? 'bg-emerald-600/20 text-emerald-200' : 'bg-red-600/20 text-red-200'
          }`}
        >
          {status.tone === 'ok' && <Check className="h-4 w-4" />} {status.text}
        </div>
      )}

      <Section icon={User} title="Account">
        <Row>
          <label className="block text-xs text-zinc-400 mb-1" htmlFor="display-name">
            Display name (shown to friends, teammates and on the leaderboard)
          </label>
          <div className="flex gap-2">
            <input
              id="display-name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void saveName()}
              className="flex-1 min-w-0 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
            />
          </div>
        </Row>
        <Row>
          <div className="text-xs text-zinc-400 mb-2">I use Deadeye as a…</div>
          <div className="grid grid-cols-3 gap-2">
            {(['player', 'coach', 'both'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={s.account_role === r}
                onClick={() => void save({ account_role: r })}
                className={`rounded-lg py-2 text-sm font-semibold capitalize ${s.account_role === r ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
              >
                {r === 'both' ? 'Player & coach' : r}
              </button>
            ))}
          </div>
          {s.account_role !== 'player' && (
            <Link href="/coach" className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 underline">
              Open the Coach dashboard <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </Row>
        <Link href="/onboarding?edit=1" className="flex items-center justify-between px-4 py-3 text-sm text-zinc-100 hover:bg-zinc-900">
          <span className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-zinc-500" /> Player info (height, position, hand, level, goals)
          </span>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
        <Row>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-100">Password</span>
            {resetSent ? (
              <span className="text-xs text-emerald-300">Check your email for a reset link</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void sendPasswordReset()}>
                Email me a reset link
              </Button>
            )}
          </div>
        </Row>
      </Section>

      <Section icon={Lock} title="Privacy">
        <Toggle
          label="Show me on the public leaderboard"
          hint="Everyone, country and county rankings. Friends and teammates can always see you."
          checked={s.is_public}
          onChange={(v) => void save({ is_public: v })}
        />
        <Toggle label="Show my position" checked={s.show_position} onChange={(v) => void save({ show_position: v })} />
        <Toggle label="Show my height" checked={s.show_height} onChange={(v) => void save({ show_height: v })} />
        <Toggle label="Show my county and country" checked={s.show_location} onChange={(v) => void save({ show_location: v })} />
        <Toggle
          label="Allow friend requests"
          hint="When off, nobody can add you with your code."
          checked={s.allow_friend_requests}
          onChange={(v) => void save({ allow_friend_requests: v })}
        />
        <Toggle
          label="Share my training details with coaches"
          hint="Default for teams you join. Coaches then see your sessions, shooting zones, workouts, tests and games (never notes or videos). Change it per team on the team page."
          checked={s.share_with_coaches}
          onChange={(v) => void save({ share_with_coaches: v })}
        />
        <Row>
          <p className="text-xs text-zinc-500">
            Your age is never shown to other players. It&apos;s only used to put you in the right age group on the leaderboard.
          </p>
        </Row>
      </Section>

      <Section icon={Sparkles} title="AI coaching">
        <Toggle
          label="AI coaching"
          hint="Off hides Coach everywhere and stops your weekly report being written. Your sessions, stats and video all keep working exactly as they do now - this only turns off the commentary on top of them."
          checked={s.ai_coaching_enabled}
          onChange={(v) => void save({ ai_coaching_enabled: v })}
        />
      </Section>

      {/* The only section on this page that does not save to the account.
          A sound is judged through whichever speaker is in the gym, so it
          belongs to the device - and it is set here rather than in the tracker
          because it is chosen once and then wanted on every session. */}
      <Section icon={Volume2} title="Shot sounds">
        <SoundPicker />
      </Section>

      <Section icon={Globe} title="Region">
        <Row>
          <label className="block text-xs text-zinc-400 mb-1" htmlFor="country">
            Country
          </label>
          <select
            id="country"
            value={s.country || ''}
            onChange={(e) => {
              const country = e.target.value || null;
              setRegionText('');
              void save({ country, region: null });
            }}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            <option value="">Choose your country</option>
            {countries.map((c, i) => (
              <option key={`${c.code}-${i}`} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>
        {s.country && (
          <Row>
            <label className="block text-xs text-zinc-400 mb-1" htmlFor="region">
              {regionLabel(s.country)}
            </label>
            {s.country === 'IE' ? (
              <select
                id="region"
                value={s.region || ''}
                onChange={(e) => void save({ region: e.target.value || null })}
                className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
              >
                <option value="">Choose your county</option>
                {IRISH_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="region"
                value={regionText}
                maxLength={60}
                onChange={(e) => setRegionText(e.target.value)}
                onBlur={() => {
                  const v = cleanRegion(regionText);
                  if (v !== s.region) void save({ region: v });
                }}
                placeholder={regionLabel(s.country)}
                className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
              />
            )}
            <p className="mt-1 text-xs text-zinc-500">Used for the country and county leaderboards.</p>
          </Row>
        )}
        <Row>
          <label className="block text-xs text-zinc-400 mb-1" htmlFor="timezone">
            Time zone
          </label>
          <select
            id="timezone"
            value={zoneValue}
            onChange={(e) => void save({ timezone: e.target.value || null })}
            className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
          >
            <option value="">Ireland (Europe/Dublin), the default</option>
            {phoneZone && !zones.includes(phoneZone) && <option value={phoneZone}>{phoneZone}</option>}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {phoneZone && phoneZone !== s.timezone && (
            <button type="button" onClick={() => void save({ timezone: phoneZone })} className="mt-1 text-xs text-cyan-400 underline">
              Use my phone&apos;s time zone ({phoneZone.replace(/_/g, ' ')})
            </button>
          )}
          <p className="mt-1 text-xs text-zinc-500">Decides when your day starts for streaks, reminders, weekly reports and the leaderboard.</p>
        </Row>
      </Section>

      <Section icon={Ruler} title="Units">
        <Row>
          <div className="grid grid-cols-2 gap-2">
            {(['metric', 'imperial'] as MeasurementSystem[]).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={s.measurement_system === u}
                onClick={() => void save({ measurement_system: u })}
                className={`rounded-lg py-2 text-sm font-semibold ${s.measurement_system === u ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
              >
                {u === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft, lbs)'}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section icon={Bell} title="Notifications">
        <div className="p-2">{notifications}</div>
      </Section>

      <Section icon={Crown} title="Subscription">
        <Link href="/pro" className="flex items-center justify-between px-4 py-3 text-sm text-zinc-100 hover:bg-zinc-900">
          <span>
            Plan: <span className="font-semibold capitalize">{plan === 'owner' ? 'Owner (everything unlimited)' : plan}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
      </Section>

      <Section icon={Database} title="Your data">
        <div className="px-2 pb-2 -mt-4">{dataControls}</div>
      </Section>

      <Section icon={Info} title="About">
        <Link href="/terms" className="flex items-center justify-between px-4 py-3 text-sm text-zinc-100 hover:bg-zinc-900">
          Terms of Use <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
        <Link href="/privacy" className="flex items-center justify-between px-4 py-3 text-sm text-zinc-100 hover:bg-zinc-900">
          Privacy Policy <ChevronRight className="h-4 w-4 text-zinc-600" />
        </Link>
        {supportEmail && (
          <a href={`mailto:${supportEmail}?subject=Deadeye%20support`} className="flex items-center justify-between px-4 py-3 text-sm text-zinc-100 hover:bg-zinc-900">
            Contact support <ChevronRight className="h-4 w-4 text-zinc-600" />
          </a>
        )}
        <Row>
          <p className="text-xs text-zinc-500">Deadeye Basketball Training · version {version}</p>
        </Row>
      </Section>
    </div>
  );
}
