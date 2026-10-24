// src/app/api/founder/posts/route.ts
// The founder writes and removes posts for the players who follow them
// (00050), or for every player as a dashboard notice (00054). Only the account
// with the owner role, the one players can follow, may post; players read
// posts straight from the table and cannot write.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ownersAmong } from '@/lib/owners-server';
import { checkFounderPost } from '@/lib/founderPosts';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The founder, or the response that refuses everyone else */
async function founder(): Promise<{ id: string } | Response> {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!(await ownersAmong([user.id])).has(user.id)) {
    return Response.json({ error: 'Only the founder account can post.' }, { status: 403 });
  }
  return user;
}

export async function POST(request: Request) {
  const me = await founder();
  if (me instanceof Response) return me;

  const post = checkFounderPost((await request.json().catch(() => null)) ?? {});
  if ('error' in post) return Response.json({ error: post.error }, { status: 400 });

  // The everyone column exists from 00054; a post to followers never touches it,
  // so followers can still be posted to before that has been run
  const everyone = post.everyone === true;
  const { data, error } = await createAdminClient()
    .from('founder_posts')
    .insert({ author_id: me.id, kind: post.kind, body: post.body, ...(everyone ? { everyone: true } : {}) })
    .select(everyone ? 'id, kind, body, created_at, everyone' : 'id, kind, body, created_at')
    .single();
  if (error) return Response.json({ error: 'The post could not be saved. Try again.' }, { status: 500 });
  return Response.json({ post: data });
}

export async function DELETE(request: Request) {
  const me = await founder();
  if (me instanceof Response) return me;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID.test(id)) return Response.json({ error: 'No post given.' }, { status: 400 });

  const { error } = await createAdminClient().from('founder_posts').delete().eq('id', id).eq('author_id', me.id);
  if (error) return Response.json({ error: 'The post could not be removed. Try again.' }, { status: 500 });
  return Response.json({ removed: true });
}
