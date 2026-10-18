// src/app/(app)/study/[id]/layout.tsx
// A Basketball IQ section that is part of Pro, opened by a player on Free.
// A layout rather than a check in each page, because the section has two (the
// lessons, and a quiz that renders in the browser) and both need the same rule.
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getHasPro, requireUser } from '@/lib/auth';
import { getActiveProgram, studySlugsIn } from '@/lib/programs';
import { createClient } from '@/lib/supabase/server';
import { ProLock } from '@/components/ProGate';

export default async function StudySectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: topic }, isPro, active] = await Promise.all([
    supabase.from('study_topics').select('slug, title, is_free').eq('id', id).maybeSingle(),
    getHasPro(),
    getActiveProgram(supabase, user.id),
  ]);

  // An unknown id falls through, so the page's own notFound() handles it.
  // A section the player's programme sends them to opens too: a free
  // programme must never stop halfway at a lock.
  if (!topic || topic.is_free || isPro || (active && studySlugsIn(active.days).has(topic.slug))) return <>{children}</>;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <Link href="/study" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Basketball IQ
        </Link>
        <ProLock title={`${topic.title} is part of Deadeye Pro`}>
          <p>
            Pro includes every Basketball IQ section, with all of its lessons and quizzes. The question of the day and
            the first sections stay free, and any section that is part of the programme you are following opens with it.
          </p>
        </ProLock>
      </div>
    </div>
  );
}
