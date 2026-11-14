// src/app/(app)/plays/actions.ts
// Server actions for plays: save a coach's play (new, edited or copied),
// delete one, and save a role quiz attempt. Each checks who is asking and
// what they sent, then writes with the user's own Supabase client, so
// row-level security and the 00061 triggers (only coaches, the Free limit)
// apply as well.
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { awaitingParentApproval, getCurrentUser, getHasPro, PARENT_APPROVAL_NEEDED } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';
import { coachAccess, fromCoach } from '@/lib/plays/access';
import { PlayInputSchema, UUID_PATTERN, type PlayInput } from '@/lib/plays/input';
import { limitMessage } from '@/lib/plays/limits';
import { buildQuiz, gradeQuiz, knowsIt } from '@/lib/plays/quiz';
import { opensFor, PLAY_COLUMNS, toPlay, type PlayRow } from '@/lib/plays/rows';

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function savePlay(input: PlayInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  if (await awaitingParentApproval()) return { ok: false, error: PARENT_APPROVAL_NEEDED };

  const parsed = PlayInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Something in the play needs fixing.' };
  const play = parsed.data;

  const supabase = await createClient();
  const { isCoach } = await coachAccess(supabase, user.id);
  if (!isCoach) return { ok: false, error: limitMessage('not_coach', '') };

  const fields = {
    title: play.title,
    category: play.category,
    min_age: play.minAge,
    description: play.description,
    coaching_points: play.coachingPoints,
    diagram: play.diagram,
  };

  if (play.id) {
    const { data, error } = await supabase
      .from('plays')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', play.id)
      .eq('owner_id', user.id)
      .select('id')
      .maybeSingle();
    if (error) return { ok: false, error: limitMessage(error.hint, 'Could not save the play. Try again.') };
    if (!data) return { ok: false, error: 'That play could not be found. It may have been deleted.' };
    revalidatePath(`/plays/${play.id}`);
    revalidatePath('/coach/playbook');
    return { ok: true, id: play.id };
  }

  // Only keep the link to a play this coach can read
  let copiedFrom: string | null = null;
  if (play.copiedFrom) {
    const { data: source } = await supabase.from('plays').select('id').eq('id', play.copiedFrom).maybeSingle();
    copiedFrom = source ? play.copiedFrom : null;
  }

  const { data, error } = await supabase
    .from('plays')
    .insert({ ...fields, owner_id: user.id, copied_from: copiedFrom })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: limitMessage(error?.hint, 'Could not save the play. Try again.') };
  revalidatePath('/coach/playbook');
  return { ok: true, id: data.id };
}

export async function deletePlay(playId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  if (typeof playId !== 'string' || !UUID_PATTERN.test(playId)) return { ok: false, error: 'That play could not be found.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('plays').delete().eq('id', playId).eq('owner_id', user.id).select('id');
  if (error) return { ok: false, error: 'Could not delete the play. Try again.' };
  if (!data?.length) return { ok: false, error: 'That play could not be found.' };
  revalidatePath('/coach/playbook');
  return { ok: true };
}

const PicksSchema = z
  .array(z.object({ key: z.string().max(20), pick: z.string().max(40) }))
  .max(10);

export type QuizResult = { ok: true; score: number; of: number; knowsIt: boolean } | { ok: false; error: string };

/** Marks the picks on the server, from the play as it is now, and keeps the attempt. */
export async function submitQuizAttempt(playId: string, picks: Array<{ key: string; pick: string }>): Promise<QuizResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Please log in again.' };
  if (await awaitingParentApproval()) return { ok: false, error: PARENT_APPROVAL_NEEDED };
  if (typeof playId !== 'string' || !UUID_PATTERN.test(playId)) return { ok: false, error: 'That play could not be found.' };
  const parsedPicks = PicksSchema.safeParse(picks);
  if (!parsedPicks.success) return { ok: false, error: 'Those answers could not be read. Try the quiz again.' };

  const supabase = await createClient();
  const [{ data: row }, isPro, coach] = await Promise.all([
    supabase.from('plays').select(PLAY_COLUMNS).eq('id', playId).maybeSingle() as unknown as Promise<{ data: PlayRow | null }>,
    getHasPro(),
    fromCoach(supabase, playId),
  ]);
  const play = row ? toPlay(row) : null;
  if (!play) return { ok: false, error: 'That play could not be found.' };
  if (!opensFor(play, isPro, coach.assigned || coach.playbookTeams.length > 0)) return { ok: false, error: 'This play is part of Pro.' };

  const questions = buildQuiz(play.diagram);
  if (!questions.length) return { ok: false, error: 'This play has no quiz yet.' };
  const { answers, score } = gradeQuiz(questions, parsedPicks.data);
  if (answers.length !== questions.length) return { ok: false, error: 'Answer every question first.' };

  const { error } = await supabase.from('play_quiz_attempts').insert({ user_id: user.id, play_id: play.id, score, answers: answers as unknown as Json });
  if (error) return { ok: false, error: 'Could not save your answers. Try again.' };
  return { ok: true, score, of: questions.length, knowsIt: knowsIt(score, questions.length) };
}
