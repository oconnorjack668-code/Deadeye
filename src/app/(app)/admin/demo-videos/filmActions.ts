// src/app/(app)/admin/demo-videos/filmActions.ts
// Owner tool server actions for film: save a clip (after YouTube confirms
// the video may play inside other sites), and set a library pack's details
// and clips. Owner only, checked on every call; written with the admin
// client because film_clips and library packs are server-written (00062).
'use server';

import { revalidatePath } from 'next/cache';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';
import { parseClipDraft, type ClipDraft } from '@/lib/film/input';
import { checkEmbeddable } from '@/lib/film/oembed';
import { UUID_PATTERN } from '@/lib/plays/input';

export type SaveClipResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveFilmClip(draft: ClipDraft): Promise<SaveClipResult> {
  if (!(await checkIsOwner())) return { ok: false, error: 'Owner only.' };
  const parsed = parseClipDraft(draft);
  if (!parsed.ok) return parsed;
  const clip = parsed.value;

  // Refuse a video YouTube will not play here, before anything is stored
  const embed = await checkEmbeddable(clip.videoId);
  if (!embed.ok) return { ok: false, error: embed.reason };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const fields = {
    youtube_video_id: clip.videoId,
    start_s: clip.startS,
    end_s: clip.endS,
    title: clip.title,
    channel_name: clip.channel,
    theme: clip.theme,
    level: clip.level,
    questions: clip.questions as unknown as Json,
    is_free: true, // film is never part of Pro (see opensFor)
    updated_at: now,
  };

  if (clip.id) {
    const { data: existing } = await admin.from('film_clips').select('published_at').eq('id', clip.id).maybeSingle();
    if (!existing) return { ok: false, error: 'That clip could not be found.' };
    // Keep the first publish date; unpublishing clears it
    const published_at = clip.published ? (existing.published_at ?? now) : null;
    const { error } = await admin.from('film_clips').update({ ...fields, published_at }).eq('id', clip.id);
    if (error) return { ok: false, error: `Could not save: ${error.message}` };
    revalidatePath('/admin/demo-videos');
    revalidatePath(`/film/${clip.id}`);
    return { ok: true, id: clip.id };
  }

  const { data, error } = await admin
    .from('film_clips')
    .insert({ ...fields, published_at: clip.published ? now : null })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: `Could not save: ${error?.message ?? 'no row came back'}` };
  revalidatePath('/admin/demo-videos');
  return { ok: true, id: data.id };
}

/** A library pack: its words, whether it is free and published, and its clips in the order ticked. */
export async function saveLibraryPack(formData: FormData): Promise<void> {
  if (!(await checkIsOwner())) return;
  const id = String(formData.get('id') ?? '');
  if (!UUID_PATTERN.test(id)) return;
  const title = String(formData.get('title') ?? '').trim().slice(0, 80);
  const description = String(formData.get('description') ?? '').trim().slice(0, 400);
  const clipIds = formData
    .getAll('clip')
    .map(String)
    .filter((c) => UUID_PATTERN.test(c))
    .slice(0, 100);
  if (!title) return;

  const admin = createAdminClient();
  const { data: pack } = await admin.from('film_packs').select('id, published_at').eq('id', id).is('owner_id', null).maybeSingle();
  if (!pack) return;
  const published = formData.get('published') === 'on' && clipIds.length > 0;
  await admin
    .from('film_packs')
    .update({
      title,
      description,
      is_free: true, // film is never part of Pro (see opensFor)
      published_at: published ? (pack.published_at ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  await admin.from('film_pack_clips').delete().eq('pack_id', id);
  if (clipIds.length) {
    await admin.from('film_pack_clips').insert(clipIds.map((clip_id, position) => ({ pack_id: id, clip_id, position })));
  }
  revalidatePath('/admin/demo-videos');
  revalidatePath('/film');
}
