// src/app/(app)/admin/posts/page.tsx
// Owner only: write and remove founder posts (00050), for followers or for every
// player (00054), and see how many players follow. Never who: follower_count
// returns a number and nothing else. Reads every column, so the page still loads
// before 00054 has been run.
import React from 'react';
import { notFound } from 'next/navigation';
import { checkIsOwner, requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ownersAmong } from '@/lib/owners-server';
import { PageHeader } from '@/components/layout/PageHeader';
import type { FounderPost } from '@/lib/founderPosts';
import { Megaphone } from 'lucide-react';
import { PostComposer } from './PostComposer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Founder posts - Deadeye' };

export default async function FounderPostsPage() {
  const user = await requireUser();
  if (!(await checkIsOwner())) notFound();

  const supabase = await createClient();
  const [owners, posts, followers] = await Promise.all([
    ownersAmong([user.id]),
    supabase.from('founder_posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.rpc('follower_count'),
  ]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <PageHeader tone="hoops" icon={Megaphone} title="Founder posts" subtitle="For the players who follow you" />
        {posts.error ? (
          <p className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-300">
            Run 00050_follow_founder.sql in the Supabase SQL editor to turn posts on.
          </p>
        ) : !owners.has(user.id) ? (
          <p className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-300">
            Players can only follow an account with the owner role. Add it to this account in the Supabase SQL editor
            (user_roles, role owner), then come back.
          </p>
        ) : (
          <PostComposer initialPosts={(posts.data ?? []) as FounderPost[]} followers={followers.data ?? 0} />
        )}
      </div>
    </div>
  );
}
