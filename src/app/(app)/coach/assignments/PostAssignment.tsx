// src/app/(app)/coach/assignments/PostAssignment.tsx
// Post an assignment to one of your teams, optionally pointing at a page in
// the app or at a play to learn. A play sets play_id, and the link always
// opens it (the 00061 trigger fills the link in as well).
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ASSIGNMENT_LINKS } from '@/lib/coachSide';
import { limitMessage } from '@/lib/plays/limits';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/** A play the coach can set: their own, one in a team playbook, or from the library. */
export interface PlayChoice {
  id: string;
  title: string;
  group: 'Your plays' | 'Team playbooks' | 'Library';
  /** A Pro library play, for a coach on Free: listed, but cannot be set. */
  locked?: boolean;
}

const PLAY_GROUPS: PlayChoice['group'][] = ['Your plays', 'Team playbooks', 'Library'];

export function playAssignmentTitle(title: string): string {
  return `Learn the play: ${title}`.slice(0, 120);
}

/** Post an assignment to one of your teams. It goes to the whole team: there is no way to post to one player. */
export function PostAssignment({
  teams,
  defaultTeam,
  myId,
  plays = [],
  defaultPlay = null,
}: {
  teams: Array<{ id: string; name: string }>;
  defaultTeam: string | null;
  myId: string;
  plays?: PlayChoice[];
  defaultPlay?: string | null;
}) {
  const router = useRouter();
  const startPlay = plays.find((p) => p.id === defaultPlay && !p.locked) ?? null;
  const [teamId, setTeamId] = useState(defaultTeam && teams.some((t) => t.id === defaultTeam) ? defaultTeam : (teams[0]?.id ?? ''));
  const [title, setTitle] = useState(startPlay ? playAssignmentTitle(startPlay.title) : '');
  const [details, setDetails] = useState('');
  const [link, setLink] = useState('');
  const [playId, setPlayId] = useState(startPlay?.id ?? '');
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
        link: playId ? `/plays/${playId}` : link || null,
        // Only sent with a play, so posting works before 00061 has run
        ...(playId ? { play_id: playId } : {}),
        due_date: due || null,
      });
    setBusy(false);
    if (error) return setMessage({ tone: 'error', text: limitMessage(error.hint, error.message) });
    setMessage({ tone: 'success', text: `Posted to ${teams.find((t) => t.id === teamId)?.name ?? 'the team'}.` });
    setTitle('');
    setDetails('');
    setLink('');
    setPlayId('');
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
      {plays.length > 0 && (
        <select
          value={playId}
          onChange={(e) => {
            const chosen = plays.find((p) => p.id === e.target.value);
            setPlayId(e.target.value);
            // A title that still says which play, or none yet, follows the pick
            if (chosen && (!title.trim() || title.startsWith('Learn the play: '))) setTitle(playAssignmentTitle(chosen.title));
          }}
          aria-label="Play to learn"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white"
        >
          <option value="">No play</option>
          {PLAY_GROUPS.filter((g) => plays.some((p) => p.group === g)).map((g) => (
            <optgroup key={g} label={g}>
              {plays
                .filter((p) => p.group === g)
                .map((p) => (
                  <option key={p.id} value={p.id} disabled={p.locked}>
                    {p.locked ? `${p.title} (Pro)` : p.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      )}
      <div className="grid grid-cols-2 gap-2">
        {playId ? (
          <p className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-400">Opens the play</p>
        ) : (
          <select value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link" className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white">
            {ASSIGNMENT_LINKS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-white" />
      </div>
      <Button type="submit" variant="primary" size="sm" isLoading={busy}>
        Post to the whole team
      </Button>
    </form>
  );
}
