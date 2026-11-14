// src/app/(app)/plays/[id]/edit/page.tsx
// Edit one of your own plays. Anyone else's play (or a library play) is not
// found here: they can be copied, not changed.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HUB_CONTAINER } from '@/components/layout/HubGrid';
import { PlayEditor } from '@/components/plays/PlayEditor';
import { draftFrom, UUID_PATTERN } from '@/lib/plays/input';
import { PLAY_COLUMNS, toPlay, type PlayRow } from '@/lib/plays/rows';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Edit play - Deadeye' };

export default async function EditPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const { data: row } = (await supabase.from('plays').select(PLAY_COLUMNS).eq('id', id).eq('owner_id', user.id).maybeSingle()) as unknown as {
    data: PlayRow | null;
  };
  if (!row) notFound();
  const play = toPlay(row);

  return (
    <div className="flex-1 overflow-auto">
      <div className={HUB_CONTAINER}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href={`/plays/${id}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" /> {row.title}
          </Link>
          <h1 className="text-xl font-black tracking-tight text-white md:text-3xl">Edit play</h1>
          {play ? (
            <PlayEditor playId={play.id} initialDiagram={play.diagram} initialDraft={draftFrom(play)} />
          ) : (
            <p role="alert" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
              This play could not be opened in the editor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
