// src/app/(app)/coach/assignments/PostAssignment.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ASSIGNMENT_LINKS } from '@/lib/coachSide';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/** Post an assignment to one of your teams. It goes to the whole team: there is no way to post to one player. */
export function PostAssignment({ teams, defaultTeam, myId }: { teams: Array<{ id: string; name: string }>; defaultTeam: string | null; myId: string }) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(defaultTeam && teams.some((t) => t.id === defaultTeam) ? defaultTeam : (teams[0]?.id ?? ''));
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [link, setLink] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setMessage({ tone: 'error', text: 'Give the assignment a title.' });
    setBusy(true);
    setMessage(null);
    const { error } = await createClient()
      .from('team_assignments')
      .insert({
        team_id: teamId,
        created_by: myId,
        title: title.trim().slice(0, 120),
        details: details.trim().slice(0, 2000) || null,
        link: link || null,
        due_date: due || null,
      });
    setBusy(false);
    if (error) return setMessage({ tone: 'error', text: error.message });
    setMessage({ tone: 'success', text: `Posted to ${teams.find((t) => t.id === teamId)?.name ?? 'the team'}.` });
    setTitle('');
    setDetails('');
    setLink('');
    setDue('');
    router.refresh();
  }

  return (
    <form onSubmit={post} className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-4 space-y-2">
      <h2 className="font-bold text-white">Post an assignment</h2>
      {message && (
        <Alert variant={message.tone} title={message.tone === 'success' ? 'Done' : 'Check this'}>
          {message.text}
        </Alert>
      )}
      {teams.length > 1 && (
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Team" className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white">
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. 200 made shots before Friday"
        aria-label="Assignment title"
        maxLength={120}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Details (optional)"
        aria-label="Assignment details"
        rows={2}
        maxLength={2000}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link" className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white">
          {ASSIGNMENT_LINKS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white" />
      </div>
      <Button type="submit" variant="primary" size="sm" isLoading={busy}>
        Post to the whole team
      </Button>
    </form>
  );
}
