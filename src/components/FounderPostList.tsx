// src/components/FounderPostList.tsx
// Founder posts (00050), newest first: on the founder card, the dashboard and
// the posting screen. Plain text only, so a post cannot carry a link or markup.
import React from 'react';
import { postKindLabel, type FounderPost } from '@/lib/founderPosts';

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export function FounderPostItem({ post, children }: { post: FounderPost; children?: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
        <span className="text-orange-300">{postKindLabel(post.kind)}</span>
        <span className="font-semibold normal-case tracking-normal text-zinc-500">{when(post.created_at)}</span>
      </div>
      <p className="whitespace-pre-line break-words text-sm text-zinc-100">{post.body}</p>
      {children}
    </li>
  );
}

export function FounderPostList({ posts }: { posts: FounderPost[] }) {
  return (
    <ul className="space-y-2">
      {posts.map((p) => (
        <FounderPostItem key={p.id} post={p} />
      ))}
    </ul>
  );
}
