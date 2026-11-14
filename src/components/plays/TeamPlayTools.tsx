// src/components/plays/TeamPlayTools.tsx
// On a play page, for head and assistant coaches: add the play to a team
// playbook (or take it out), and set it for the team as an assignment.
// The playbook write goes straight to the database; row-level security and
// the 00061 trigger decide (staff only, a play they can read, the Free
// limit), and their answer is turned into words here.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookmarkPlus, BookmarkMinus, ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { limitMessage } from '@/lib/plays/limits';
import type { StaffTeam } from '@/lib/plays/access';

const toolButton =
  'inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';

export function TeamPlayTools({ playId, userId, teams, inPlaybook }: { playId: string; userId: string; teams: StaffTeam[]; inPlaybook: string[] }) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [added, setAdded] = useState(() => new Set(inPlaybook));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const team = teams.find((t) => t.id === teamId);
  const isIn = added.has(teamId);

  async function toggle() {
    if (!team) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = isIn
      ? await supabase.from('team_playbook').delete().eq('team_id', teamId).eq('play_id', playId)
      : await supabase.from('team_playbook').insert({ team_id: teamId, play_id: playId, added_by: userId });
    setBusy(false);
    if (error) {
      setMessage({ tone: 'error', text: limitMessage(error.hint, 'Could not change the playbook. Try again.') });
      return;
    }
    const next = new Set(added);
    if (isIn) next.delete(teamId);
    else next.add(teamId);
    setAdded(next);
    setMessage({ tone: 'ok', text: isIn ? `Taken out of the ${team.name} playbook.` : `Added to the ${team.name} playbook. Its players can open it now.` });
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {teams.length > 1 && (
        <label className="block">
          <span className="text-sm text-zinc-300">Team</span>
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setMessage(null);
            }}
            className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-white"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void toggle()} disabled={busy || !team} className={toolButton} aria-pressed={isIn}>
          {isIn ? <BookmarkMinus className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
          {isIn ? 'Remove from team playbook' : 'Add to team playbook'}
        </button>
        <Link href={`/coach/assignments?team=${teamId}&play=${playId}`} className={toolButton}>
          <ClipboardList className="h-4 w-4" /> Assign to team
        </Link>
      </div>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
