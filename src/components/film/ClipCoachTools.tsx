// src/components/film/ClipCoachTools.tsx
// On a clip page, for coaches: put the clip in one of their packs (or start a
// new pack with it), and set it for a team. The pack writes go through the
// film server actions; the database decides (only coaches, a Pro clip needs
// Pro, 20 clips a pack) and its answer comes back in words.
'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, FolderPlus } from 'lucide-react';
import { addClipToPack, createPack } from '@/app/(app)/film/actions';
import type { StaffTeam } from '@/lib/plays/access';

const toolButton =
  'inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';
const field = 'mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-white';

const NEW_PACK = 'new';

export function ClipCoachTools({
  clipId,
  teams,
  packs,
}: {
  clipId: string;
  teams: StaffTeam[];
  /** The coach's own packs, and whether this clip is in each. */
  packs: Array<{ id: string; title: string; hasClip: boolean }>;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '');
  const [packId, setPackId] = useState(packs.find((p) => !p.hasClip)?.id ?? NEW_PACK);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const teamField = useId();
  const packField = useId();
  const titleField = useId();

  async function addToPack(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = packId === NEW_PACK ? await createPack(newTitle, clipId) : await addClipToPack(packId, clipId);
    setBusy(false);
    if (!res.ok) return setMessage({ tone: 'error', text: res.error });
    const name = packId === NEW_PACK ? newTitle.trim() : (packs.find((p) => p.id === packId)?.title ?? 'your pack');
    setMessage({ tone: 'ok', text: `Added to ${name}.` });
    setNewTitle('');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {teams.length > 0 ? (
        <div className="space-y-2">
          {teams.length > 1 && (
            <div>
              <label htmlFor={teamField} className="text-sm text-zinc-300">
                Team
              </label>
              <select id={teamField} value={teamId} onChange={(e) => setTeamId(e.target.value)} className={field}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Link href={`/coach/assignments?team=${teamId}&clip=${clipId}`} className={toolButton}>
            <ClipboardList className="h-4 w-4" /> Assign to team
          </Link>
        </div>
      ) : (
        <p className="text-sm text-zinc-400">
          <Link href="/coach/setup?step=team" className="font-semibold text-orange-400 hover:underline">
            Set up a team
          </Link>{' '}
          to set clips for your players.
        </p>
      )}

      <form onSubmit={addToPack} className="space-y-2">
        <div>
          <label htmlFor={packField} className="text-sm text-zinc-300">
            Add to a pack
          </label>
          <select id={packField} value={packId} onChange={(e) => setPackId(e.target.value)} className={field}>
            {packs.map((p) => (
              <option key={p.id} value={p.id} disabled={p.hasClip}>
                {p.hasClip ? `${p.title} (already in it)` : p.title}
              </option>
            ))}
            <option value={NEW_PACK}>A new pack</option>
          </select>
        </div>
        {packId === NEW_PACK && (
          <div>
            <label htmlFor={titleField} className="text-sm text-zinc-300">
              Name of the new pack
            </label>
            <input
              id={titleField}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Help defence before Saturday"
              className={`${field} placeholder:text-zinc-500`}
            />
          </div>
        )}
        <button type="submit" disabled={busy || (packId === NEW_PACK && !newTitle.trim())} className={toolButton}>
          <FolderPlus className="h-4 w-4" /> {busy ? 'Adding...' : 'Add to pack'}
        </button>
      </form>

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
