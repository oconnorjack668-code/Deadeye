// src/app/competition/EntryCards.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { FEEDBACK_MAX, FEEDBACK_MIN, type EntryRoute } from '@/lib/competition';
import type { EntryStatus } from '@/lib/supabase/types';

/** What the page tells the card about an existing entry. Never the parent link. */
export type EntryView = {
  feedback: string;
  status: EntryStatus;
  statusText: string;
  canResend: boolean;
  clubName?: string | null;
  teamName?: string | null;
};

const CARD = 'rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4';
const TEXTAREA =
  'mt-1 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';
const CHECKBOX = 'mt-0.5 h-5 w-5 flex-shrink-0 accent-orange-600';

async function send(method: 'POST' | 'PATCH', url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: res.ok, data: ((await res.json().catch(() => ({}))) as Record<string, unknown>) ?? {} };
  } catch {
    return { ok: false, data: { error: 'No connection. What you wrote is still here, so try again when you are back online.' } };
  }
}

function FeedbackBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const length = value.trim().length;
  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-100">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={FEEDBACK_MAX}
        rows={6}
        placeholder="What you liked and what you would change. Say where in the app, what happened and what you expected."
        className={TEXTAREA}
      />
      <span className={`block text-xs ${length > 0 && length < FEEDBACK_MIN ? 'text-amber-400' : 'text-zinc-500'}`}>
        {length < FEEDBACK_MIN ? `At least ${FEEDBACK_MIN} characters (${length} so far)` : `${length} of ${FEEDBACK_MAX}`}. Please
        leave out names, emails, phone numbers, schools and addresses.
      </span>
    </label>
  );
}

function AgreeRules({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={CHECKBOX} />
      <span>
        I agree to the{' '}
        <a href="#rules" className="text-orange-400 underline">
          rules
        </a>
        .
      </span>
    </label>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-zinc-300">
      {done ? (
        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-label="Done" />
      ) : (
        <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" aria-label="Not yet" />
      )}
      <span>{children}</span>
    </li>
  );
}

/** An entry already made: its status, a new parent link when the old one ran out, and changing the feedback. */
function ExistingEntry({ entry, kind, open }: { entry: EntryView; kind: 'player' | 'club'; open: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState(entry.feedback);
  const [busy, setBusy] = useState<'save' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function save() {
    setBusy('save');
    setError(null);
    const { ok, data } = await send('PATCH', '/api/competition', { kind, feedback });
    setBusy(null);
    if (!ok) return setError(String(data.error || 'Your feedback could not be saved. Please try again.'));
    setEditing(false);
    setNotice('Saved.');
    router.refresh();
  }

  async function resend() {
    setBusy('resend');
    setError(null);
    const { ok, data } = await send('POST', '/api/competition/resend', {});
    setBusy(null);
    if (!ok) return setError(String(data.error || 'We could not send the email. Please try again later.'));
    setNotice('We emailed your parent or guardian a new link.');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p
        role="status"
        className={`text-sm font-semibold ${entry.status === 'valid' ? 'text-emerald-400' : entry.status === 'declined' ? 'text-red-400' : 'text-amber-400'}`}
      >
        {entry.statusText}
      </p>
      {entry.clubName && (
        <p className="text-sm text-zinc-400">
          {entry.clubName}
          {entry.teamName ? ` · ${entry.teamName}` : ''}
        </p>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {notice && !error && <p className="text-sm text-emerald-400">{notice}</p>}
      {entry.canResend && (
        <Button variant="secondary" onClick={() => void resend()} isLoading={busy === 'resend'}>
          Send my parent the link again
        </Button>
      )}
      {editing ? (
        <div className="space-y-3">
          <FeedbackBox value={feedback} onChange={setFeedback} label="Your feedback" />
          <div className="flex gap-2">
            <Button onClick={() => void save()} isLoading={busy === 'save'}>
              Save feedback
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false);
                setFeedback(entry.feedback);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your feedback</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{entry.feedback}</p>
          </div>
          {open && entry.status !== 'declined' && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Change my feedback
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** The player's entry: what is still to do, the form, then the entry's status. */
export function PlayerEntryCard({
  route,
  blockedText = null,
  hasSession,
  entry,
  open,
  parentEmailMasked,
  noAgeRange,
}: {
  route: EntryRoute;
  /** Why an under-16 with an approved account cannot enter (no parent email on file) */
  blockedText?: string | null;
  hasSession: boolean;
  entry: EntryView | null;
  open: boolean;
  /** Under 16: where the email goes, masked */
  parentEmailMasked: string | null;
  /** 16 or over with no age range: might be 16 or 17, so a parent is asked */
  noAgeRange: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentConfirm, setParentConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, data } = await send('POST', '/api/competition', { kind: 'player', feedback, agree, parentName, parentEmail, parentConfirm });
    setBusy(false);
    if (!ok) return setError(String(data.error || 'Your entry could not be saved. Please try again.'));
    router.refresh();
  }

  return (
    <section aria-labelledby="enter-heading" className={CARD}>
      <h2 id="enter-heading" className="text-xl font-black text-white">
        {entry ? 'Your entry' : 'Enter as a player'}
      </h2>
      {entry ? (
        <ExistingEntry entry={entry} kind="player" open={open} />
      ) : route === 'answer-age' || route === 'needs-account-approval' ? (
        <p className="text-sm text-zinc-300">
          {route === 'answer-age'
            ? 'Open the app and answer the age question first, then come back here.'
            : blockedText ?? 'A parent or guardian needs to approve your Deadeye account before you can enter.'}
        </p>
      ) : (
        <form onSubmit={enter} className="space-y-4">
          <ul className="space-y-2">
            <ChecklistItem done>A Deadeye account</ChecklistItem>
            <ChecklistItem done={hasSession}>
              At least one training session logged
              {!hasSession && (
                <>
                  {' · '}
                  <Link href="/basketball/new" className="font-semibold text-orange-400 underline">
                    Log a session
                  </Link>
                </>
              )}
            </ChecklistItem>
          </ul>

          <FeedbackBox value={feedback} onChange={setFeedback} label="One thing you liked and one thing you would change" />

          {route === 'under16' && (
            <p className="text-sm text-zinc-400">
              Because you are under 18, we will email the parent or guardian who approved your account
              {parentEmailMasked ? ` (${parentEmailMasked})` : ''} to approve your entry. It counts once they say yes.
            </p>
          )}
          {route === 'ask-parent' && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Players under 18 need a parent or guardian&apos;s permission. We will email them a link to approve your entry; it
                counts once they say yes. Use their email, not your own.
                {noAgeRange && (
                  <>
                    {' '}
                    18 or over?{' '}
                    <Link href="/profile" className="text-orange-400 underline">
                      Add your age range to your profile
                    </Link>{' '}
                    first.
                  </>
                )}
              </p>
              <Input label="Parent or guardian's name" value={parentName} onChange={(e) => setParentName(e.target.value)} autoComplete="off" />
              <Input
                label="Parent or guardian's email"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                autoComplete="off"
              />
              <label className="flex items-start gap-3 text-sm text-zinc-300">
                <input type="checkbox" checked={parentConfirm} onChange={(e) => setParentConfirm(e.target.checked)} className={CHECKBOX} />
                <span>This is my parent or guardian&apos;s email, not mine.</span>
              </label>
            </div>
          )}

          <AgreeRules checked={agree} onChange={setAgree} />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" isLoading={busy} disabled={!hasSession}>
            Enter
          </Button>
        </form>
      )}
    </section>
  );
}

export type TeamChoice = { id: string; name: string; ready: boolean };

/** "Enter my club", for an adult head coach. */
export function ClubEntryCard({
  teams,
  entry,
  open,
  defaultClubName,
}: {
  teams: TeamChoice[];
  entry: EntryView | null;
  open: boolean;
  defaultClubName: string;
}) {
  const router = useRouter();
  const ready = teams.filter((t) => t.ready);
  const [clubName, setClubName] = useState(defaultClubName);
  const [teamId, setTeamId] = useState(ready[0]?.id ?? '');
  const [feedback, setFeedback] = useState('');
  const [clubKnows, setClubKnows] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, data } = await send('POST', '/api/competition', { kind: 'club', clubName, teamId, feedback, clubKnows, agree });
    setBusy(false);
    if (!ok) return setError(String(data.error || 'Your entry could not be saved. Please try again.'));
    router.refresh();
  }

  return (
    <section aria-labelledby="club-heading" className={CARD}>
      <h2 id="club-heading" className="text-xl font-black text-white">
        {entry ? 'Your club entry' : 'Enter my club'}
      </h2>
      {entry ? (
        <ExistingEntry entry={entry} kind="club" open={open} />
      ) : !ready.length ? (
        <p className="text-sm text-zinc-300">
          {teams.length
            ? 'Once at least one player on your team logs a training session, you can enter your club here.'
            : 'Clubs are entered by a head coach with at least one team. Set up a team in the app first.'}
        </p>
      ) : (
        <form onSubmit={enter} className="space-y-4">
          <Input label="Club name" value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={80} />
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">Team</span>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 text-sm text-zinc-100"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id} disabled={!t.ready}>
                  {t.ready ? t.name : `${t.name} (no player has logged a session yet)`}
                </option>
              ))}
            </select>
          </label>
          <FeedbackBox value={feedback} onChange={setFeedback} label="The club's feedback: one thing you liked and one you would change" />
          <label className="flex items-start gap-3 text-sm text-zinc-300">
            <input type="checkbox" checked={clubKnows} onChange={(e) => setClubKnows(e.target.checked)} className={CHECKBOX} />
            <span>The club (its committee or Children&apos;s Officer) knows about this entry.</span>
          </label>
          <AgreeRules checked={agree} onChange={setAgree} />
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="w-full" isLoading={busy}>
            Enter my club
          </Button>
        </form>
      )}
    </section>
  );
}
