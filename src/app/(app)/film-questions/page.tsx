// src/app/(app)/film-questions/page.tsx
// "Was that the right read?" - the player side.
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/layout/PageHeader';
import { AskClient } from './AskClient';
import { Brain, ArrowLeft } from 'lucide-react';
import type { FilmQuestion } from '@/lib/filmQuestions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Film questions - Deadeye' };

export default async function FilmQuestionsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: clips }, { data: memberships }, { data: questions }] = await Promise.all([
    supabase
      .from('video_assets')
      .select('id, title, file_name, storage_path, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    // Only teams with someone to answer: a question asked of a team with no
    // coach would sit unanswered forever, which is worse than not offering it.
    supabase.from('team_members').select('team_id, role, teams(id, name)').eq('user_id', user.id),
    supabase
      .from('film_questions')
      .select('*')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const teams = ((memberships || []) as unknown as Array<{ role: string; teams: { id: string; name: string } | null }>)
    .filter((m) => m.role === 'player' && m.teams)
    .map((m) => m.teams!) as Array<{ id: string; name: string }>;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Link href="/study" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> IQ
        </Link>
        <PageHeader
          tone="iq"
          icon={Brain}
          title="Was that the right read?"
          subtitle="Ask a coach about one decision in your own game film"
        />
        <AskClient
          clips={
            (clips || []) as Array<{
              id: string;
              title: string | null;
              file_name: string | null;
              storage_path: string | null;
              created_at: string;
            }>
          }
          teams={teams}
          questions={(questions || []) as unknown as FilmQuestion[]}
        />
      </div>
    </div>
  );
}
