// src/components/FounderPostCard.tsx
// The newest founder post, on the dashboard of a player who follows the
// founder (00050). Nothing shows until they follow and there is a post.
import React from 'react';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { FounderPostItem } from '@/components/FounderPostList';
import type { FounderPost } from '@/lib/founderPosts';

export function FounderPostCard({ post, founderId }: { post: FounderPost; founderId: string }) {
  return (
    <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <Megaphone className="h-4 w-4 text-red-400" /> From the founder
        </h2>
        <Link href={`/players/${founderId}`} className="text-xs font-semibold text-orange-300 underline">
          All posts
        </Link>
      </div>
      <ul>
        <FounderPostItem post={post} />
      </ul>
    </section>
  );
}
