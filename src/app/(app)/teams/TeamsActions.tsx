// src/app/(app)/teams/TeamsActions.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normaliseCode } from '@/lib/friends';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const JOIN_MESSAGES: Record<string, string> = {
  joined: 'You joined the team!',
  already: "You're already on this team.",
  not_found: 'No team has that code. Team codes start with T and have 6 characters.',
  full: 'That team is full (60 members).',
};

export function TeamsActions({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'join' | 'create' | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const clean = normaliseCode(code);
    if (clean.length !== 6) {
      setMessage({ tone: 'error', text: 'Team codes have 6 characters, e.g. T4KX9P.' });
      return;
    }
    setBusy('join');
    setMessage(null);
    const { data, error } = await createClient().rpc('join_team', { p_code: clean });
    setBusy(null);
    if (error) return setMessage({ tone: 'error', text: error.message });
    setMessage({ tone: data === 'joined' ? 'success' : 'error', text: JOIN_MESSAGES[data] || 'Done.' });
    if (data === 'joined') {
      setCode('');
      router.refresh();
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setMessage({ tone: 'error', text: 'Give your team a name (at least 2 characters).' });
      return;
    }
    setBusy('create');
    setMessage(null);
    const { data, error } = await createClient().rpc('create_team', { p_name: name.trim().slice(0, 60) });
    setBusy(null);
    if (error) return setMessage({ tone: 'error', text: error.message });
    router.push(`/teams/${data}`);
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.tone} title={message.tone === 'success' ? 'Done' : 'Check this'}>
          {message.text}
        </Alert>
      )}
      <form onSubmit={join} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
        <h2 className="font-bold text-white">Join a team</h2>
        <div className="flex gap-2">
          <input
            value={code}
            // normaliseCode is the same rule join() validates against: upper
            // case, alphanumeric, 6 long. Accepting 8 characters here let a
            // player type two past a code that could never be valid, and a
            // pasted "T4KX-9P" kept its hyphen.
            onChange={(e) => setCode(normaliseCode(e.target.value))}
            maxLength={6}
            placeholder="Team code"
            aria-label="Team code"
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 min-w-0 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm font-semibold tracking-widest text-zinc-100 focus:border-cyan-500 focus:outline-none"
          />
          <Button type="submit" variant="primary" isLoading={busy === 'join'}>
            Join
          </Button>
        </div>
      </form>

      <form onSubmit={create} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
        <h2 className="font-bold text-white">Coach a team</h2>
        {canCreate ? (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name, e.g. U16 Dublin Lions"
              aria-label="Team name"
              maxLength={60}
              className="flex-1 min-w-0 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 focus:border-cyan-500 focus:outline-none"
            />
            <Button type="submit" variant="primary" isLoading={busy === 'create'}>
              Create
            </Button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            Creating a team is part of{' '}
            <Link href="/pro" className="underline text-cyan-300">
              Deadeye Pro
            </Link>
            . Players join for free.
          </p>
        )}
      </form>
    </div>
  );
}
