// src/app/(app)/film/actions.ts
// Server actions for film: keep a player's answers on a clip, their private
// note, and a coach's packs. Each checks who is asking and what they sent,
// then writes with the user's own Supabase client, so row-level security and
// the 00062 triggers (only coaches build packs, Pro clips need Pro) apply as
// well.
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { awaitingParentApproval, getCurrentUser, getHasPro, PARENT_APPROVAL_NEEDED } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';
import { clipAccess } from '@/lib/film/access';
import { filmLimitMessage, MAX_NOTE } from '@/lib/film/limits';
import { gradeFilm } from '@/lib/film/questions';
import { FILM_CLIP_COLUMNS, opensFor, toClip, type FilmClipRow } from '@/lib/film/rows';
import { coachAccess } from '@/lib/plays/access';
import { UUID_PATTERN } from '@/lib/plays/input';

type Done = { ok: true } | { ok: false; error: string };

const PicksSchema = z.array(z.object({ key: z.string().max(12), pick: z.number().int().min(0).max(9) })).max(10);

export type FilmAttemptResult = { ok: true; score: number; total: number } | { ok: false; error: string };

/** Marks the picks on the server, from the clip as it is now, and keeps the attempt. */
export async function submitFilmAttempt(clipId: string, picks: Array<{ key: string; pick: number }>): Promise<FilmAttemptResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  if (await awaitingParentApproval()) return { ok: false, error: PARENT_APPROVAL_NEEDED };
  if (typeof clipId !== 'string' || !UUID_PATTERN.test(clipId)) return { ok: false, error: 'That clip could not be found.' };
  const parsed = PicksSchema.safeParse(picks);
  if (!parsed.success) return { ok: false, error: 'Those answers could not be read. Try the clip again.' };

  const supabase = await createClient();
  const [{ data: row }, isPro, access] = await Promise.all([
    supabase.from('film_clips').select(FILM_CLIP_COLUMNS).eq('id', clipId).maybeSingle() as unknown as Promise<{ data: FilmClipRow | null }>,
    getHasPro(),
    clipAccess(supabase, clipId),
  ]);
  const clip = row ? toClip(row) : null;
  if (!clip) return { ok: false, error: 'That clip could not be found.' };
  if (!opensFor(clip, isPro, access.assigned, access.inFreePack)) return { ok: false, error: 'This clip is part of Pro.' };
  if (!clip.questions.length) return { ok: false, error: 'This clip has no questions yet.' };

  const { answers, score, total } = gradeFilm(clip.questions, parsed.data);
  if (answers.length !== total) return { ok: false, error: 'Answer every question first.' };
  const { error } = await supabase
    .from('film_attempts')
    .insert({ user_id: user.id, clip_id: clip.id, score, total, answers: answers as unknown as Json });
  if (error) return { ok: false, error: 'Could not save your answers. Try again.' };
  revalidatePath('/film');
  return { ok: true, score, total };
}

/** Keeps the player's private note on a clip; an empty note is deleted. */
export async function saveFilmNote(clipId: string, body: string): Promise<Done> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  if (await awaitingParentApproval()) return { ok: false, error: PARENT_APPROVAL_NEEDED };
  if (typeof clipId !== 'string' || !UUID_PATTERN.test(clipId) || typeof body !== 'string') return { ok: false, error: 'That note could not be saved.' };
  const text = body.trim();
  if (text.length > MAX_NOTE) return { ok: false, error: `Keep a note to ${MAX_NOTE} characters.` };

  const supabase = await createClient();
  const { error } = text
    ? await supabase
        .from('film_notes')
        .upsert({ user_id: user.id, clip_id: clipId, body: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,clip_id' })
    : await supabase.from('film_notes').delete().eq('user_id', user.id).eq('clip_id', clipId);
  if (error) return { ok: false, error: 'Could not save your note. Try again.' };
  return { ok: true };
}

const TitleSchema = z.string().trim().min(1, 'Give the pack a name.').max(80, 'Keep the name to 80 characters.');

async function coachOnly(): Promise<{ ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  const supabase = await createClient();
  const { isCoach } = await coachAccess(supabase, user.id);
  if (!isCoach) return { ok: false, error: filmLimitMessage('not_coach', '') };
  return { ok: true, userId: user.id, supabase };
}

/** A new pack of the coach's own, starting with a clip when one is given. */
export async function createPack(title: string, clipId?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsedTitle = TitleSchema.safeParse(title);
  if (!parsedTitle.success) return { ok: false, error: parsedTitle.error.issues[0]?.message ?? 'Give the pack a name.' };
  if (clipId !== undefined && (typeof clipId !== 'string' || !UUID_PATTERN.test(clipId))) return { ok: false, error: 'That clip could not be found.' };
  const who = await coachOnly();
  if (!who.ok) return who;
  const { data, error } = await who.supabase.from('film_packs').insert({ owner_id: who.userId, title: parsedTitle.data }).select('id').single();
  if (error || !data) return { ok: false, error: filmLimitMessage(error?.hint, 'Could not make the pack. Try again.') };
  if (clipId) {
    const { error: addError } = await who.supabase.from('film_pack_clips').insert({ pack_id: data.id, clip_id: clipId, position: 0 });
    if (addError) return { ok: false, error: filmLimitMessage(addError.hint, 'The pack was made, but the clip could not go in. Try adding it again.') };
  }
  revalidatePath('/coach/playbook');
  return { ok: true, id: data.id };
}

/** Puts a clip at the end of one of the coach's packs. */
export async function addClipToPack(packId: string, clipId: string): Promise<Done> {
  if (typeof packId !== 'string' || !UUID_PATTERN.test(packId) || typeof clipId !== 'string' || !UUID_PATTERN.test(clipId)) {
    return { ok: false, error: 'That pack could not be found.' };
  }
  const who = await coachOnly();
  if (!who.ok) return who;
  const { data: pack } = await who.supabase.from('film_packs').select('id').eq('id', packId).eq('owner_id', who.userId).maybeSingle();
  if (!pack) return { ok: false, error: 'That pack could not be found.' };
  const { data: inPack } = await who.supabase.from('film_pack_clips').select('clip_id, position').eq('pack_id', packId);
  if ((inPack ?? []).some((r) => r.clip_id === clipId)) return { ok: true };
  const position = Math.min(99, Math.max(-1, ...(inPack ?? []).map((r) => r.position)) + 1);
  const { error } = await who.supabase.from('film_pack_clips').insert({ pack_id: packId, clip_id: clipId, position });
  if (error) return { ok: false, error: filmLimitMessage(error.hint, 'Could not add the clip. Try again.') };
  revalidatePath(`/film/packs/${packId}`);
  return { ok: true };
}

export async function removeClipFromPack(packId: string, clipId: string): Promise<Done> {
  if (typeof packId !== 'string' || !UUID_PATTERN.test(packId) || typeof clipId !== 'string' || !UUID_PATTERN.test(clipId)) {
    return { ok: false, error: 'That pack could not be found.' };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  const supabase = await createClient();
  // Row-level security only lets the pack owner remove clips
  const { error } = await supabase.from('film_pack_clips').delete().eq('pack_id', packId).eq('clip_id', clipId);
  if (error) return { ok: false, error: 'Could not take the clip out. Try again.' };
  revalidatePath(`/film/packs/${packId}`);
  return { ok: true };
}

export async function deletePack(packId: string): Promise<Done> {
  if (typeof packId !== 'string' || !UUID_PATTERN.test(packId)) return { ok: false, error: 'That pack could not be found.' };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('film_packs').delete().eq('id', packId).eq('owner_id', user.id).select('id');
  if (error) return { ok: false, error: 'Could not delete the pack. Try again.' };
  if (!data?.length) return { ok: false, error: 'That pack could not be found.' };
  revalidatePath('/coach/playbook');
  return { ok: true };
}
