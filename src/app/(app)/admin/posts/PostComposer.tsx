// src/app/(app)/admin/posts/PostComposer.tsx
// The founder writes a post through /api/founder/posts and can remove one.
// Followers include players aged 13 and up, so the guidance sits by the box.
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FounderPostItem } from '@/components/FounderPostList';
import { FOUNDER_POST_KINDS, FOUNDER_POST_MAX, checkFounderPost, type FounderPost, type FounderPostKind } from '@/lib/founderPosts';

const choice = (on: boolean) =>
  `rounded-xl border px-3 py-2 text-sm font-semibold ${on ? 'border-orange-500 bg-orange-500/10 text-white' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`;

export function PostComposer({ initialPosts, followers }: { initialPosts: FounderPost[]; followers: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const [kind, setKind] = useState<FounderPostKind>('challenge');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    const checked = checkFounderPost({ kind, body });
    if ('error' in checked) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/founder/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checked),
      });
      const data = (await res.json().catch(() => ({}))) as { post?: FounderPost; error?: string };
      if (!res.ok || !data.post) {
        setError(data.error || 'The post could not be saved. Try again.');
        return;
      }
      setPosts([data.post, ...posts]);
      setBody('');
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this post? Followers will stop seeing it.')) return;
    setError(null);
    const res = await fetch(`/api/founder/posts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setError('The post could not be removed. Try again.');
      return;
    }
    setPosts(posts.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        <span className="font-bold text-white">{followers}</span> {followers === 1 ? 'player follows' : 'players follow'} you. You
        see the number only, never who.
      </p>

      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        {error && (
          <Alert variant="error" title="Not posted">
            {error}
          </Alert>
        )}
        <div role="radiogroup" aria-label="Kind of post" className="flex flex-wrap gap-2">
          {FOUNDER_POST_KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className={choice(kind === k.id)} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <label htmlFor="founder-post" className="sr-only">
          Post
        </label>
        <textarea
          id="founder-post"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={FOUNDER_POST_MAX}
          rows={4}
          placeholder="This week: 50 free throws a day. Log them and see who is top on Sunday."
          className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        />
        <div className="flex items-start justify-between gap-3 text-xs text-zinc-500">
          <p>
            Players from 13 up read this. Keep it encouraging, with no pressure or deadlines that guilt anyone, and
            no links, contact details or names of players.
          </p>
          <span className="flex-shrink-0 tabular-nums">
            {body.length}/{FOUNDER_POST_MAX}
          </span>
        </div>
        <Button className="w-full" onClick={post} disabled={busy || !body.trim()} isLoading={busy}>
          Post to followers
        </Button>
      </div>

      {posts.length > 0 && (
        <ul className="space-y-2">
          {posts.map((p) => (
            <FounderPostItem key={p.id} post={p}>
              <button type="button" onClick={() => remove(p.id)} className="mt-2 text-xs font-semibold text-zinc-500 underline hover:text-zinc-300">
                Remove
              </button>
            </FounderPostItem>
          ))}
        </ul>
      )}
    </div>
  );
}
