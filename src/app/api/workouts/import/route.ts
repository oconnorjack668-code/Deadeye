// src/app/api/workouts/import/route.ts
// Reads a routine out of pasted text or a screenshot with the AI, for the
// player to check and save on /workouts/import. Nothing is saved here: the
// routine goes back to the phone, and the text or picture is not kept. The
// only record is one routine_imports row (who, when, text or picture) to count
// the monthly allowance. CSV files never come here; the phone reads them.
import { getCurrentUser, awaitingParentApproval, PARENT_APPROVAL_NEEDED } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getConfiguredAI, AINotConfiguredError } from '@/lib/ai/config';
import { hasUnlimitedCredits } from '@/lib/ai/service';
import type { AIImage } from '@/lib/ai/provider';
import { ROUTINE_IMPORT_SYSTEM_PROMPT, routineImportUserPrompt } from '@/lib/ai/routineImport';
import {
  applyLibraryMatches,
  exerciseCount,
  IMAGE_TYPES,
  importMonthStartIso,
  MAX_IMAGE_BYTES,
  MAX_IMPORT_TEXT,
  monthlyImportLimit,
  normalizeProgram,
  type ImageType,
} from '@/lib/routineImport';

export const dynamic = 'force-dynamic';
// A screenshot of a long program can take the model a while to read
export const maxDuration = 60;

type Input = { kind: 'text'; text: string } | { kind: 'image'; image: AIImage };

function readInput(body: unknown): Input | { error: string } {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  if (b.kind === 'text') {
    const text = typeof b.text === 'string' ? b.text.trim() : '';
    if (!text) return { error: 'Paste a routine first.' };
    if (text.length > MAX_IMPORT_TEXT) {
      return { error: `That is too long to read in one go. Paste up to ${MAX_IMPORT_TEXT.toLocaleString('en-IE')} characters, a few days at a time.` };
    }
    return { kind: 'text', text };
  }
  if (b.kind === 'image') {
    const mediaType = typeof b.mediaType === 'string' ? b.mediaType : '';
    const data = typeof b.data === 'string' ? b.data : '';
    if (!(IMAGE_TYPES as readonly string[]).includes(mediaType)) return { error: 'Use a JPG, PNG or WebP screenshot.' };
    if (!data || !/^[A-Za-z0-9+/]+=*$/.test(data)) return { error: 'That picture could not be read. Try another screenshot.' };
    // base64 is 4 characters for every 3 bytes
    if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) return { error: 'That picture is too big. Try a smaller screenshot.' };
    return { kind: 'image', image: { mediaType: mediaType as ImageType, data } };
  }
  return { error: 'Send a pasted routine or a screenshot.' };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await awaitingParentApproval()) return Response.json({ error: PARENT_APPROVAL_NEEDED }, { status: 403 });

  let ai: ReturnType<typeof getConfiguredAI>;
  try {
    // The cheap, quick model: this is copying, not coaching
    ai = getConfiguredAI(4000, 'chat');
  } catch (err) {
    if (err instanceof AINotConfiguredError) {
      return Response.json({ error: 'Reading routines is not switched on yet. You can still import a CSV file.' }, { status: err.status });
    }
    throw err;
  }
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: 'Reading routines is not switched on yet (SUPABASE_SERVICE_ROLE_KEY is missing).' }, { status: 503 });
  }

  const input = readInput(await request.json().catch(() => null));
  if ('error' in input) return Response.json({ error: input.error }, { status: 400 });

  // The allowance: rows this calendar month (UTC), read with the player's own access
  const supabase = await createClient();
  const [{ data: sub }, { count, error: countError }] = await Promise.all([
    supabase.from('subscriptions').select('plan_type, founding_pro_until').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('routine_imports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', importMonthStartIso()),
  ]);
  if (countError) {
    return Response.json({ error: 'Importing routines isn’t switched on yet (run migration 00058 in Supabase).' }, { status: 503 });
  }
  const limit = monthlyImportLimit(await hasUnlimitedCredits(sub));
  const used = count || 0;
  if (used >= limit) {
    return Response.json(
      { error: `You have used your ${limit} routine imports this month. They refill on the 1st. A CSV file still works any time.`, limit: true },
      { status: 402 }
    );
  }

  // Counted before the AI call so two quick taps cannot both slip under the
  // limit unseen; given back if the read fails or finds nothing
  const { data: usage, error: usageError } = await admin
    .from('routine_imports')
    .insert({ user_id: user.id, source: input.kind })
    .select('id')
    .single();
  if (usageError || !usage) return Response.json({ error: 'Could not start the import. Please try again.' }, { status: 500 });
  const refund = () => admin.from('routine_imports').delete().eq('id', usage.id);

  let raw: Record<string, unknown>;
  try {
    raw =
      input.kind === 'text'
        ? await ai.provider.generateJson(ROUTINE_IMPORT_SYSTEM_PROMPT, routineImportUserPrompt('text', input.text), ai.config)
        : await ai.provider.generateJsonFromImage(ROUTINE_IMPORT_SYSTEM_PROMPT, routineImportUserPrompt('image'), input.image, ai.config);
  } catch {
    await refund();
    return Response.json({ error: 'The routine could not be read just now. Please try again.' }, { status: 502 });
  }

  const program = normalizeProgram(raw);
  if (exerciseCount(program) === 0) {
    await refund();
    return Response.json(
      { error: input.kind === 'image' ? 'No exercises found in that picture. Try a clearer screenshot of the routine.' : 'No exercises found in that text. Paste the routine itself, with the exercise names.' },
      { status: 422 }
    );
  }

  // System exercises and the player's own (row level security returns both)
  const { data: library } = await supabase.from('exercise_library').select('id, name');
  return Response.json({
    program: applyLibraryMatches(program, (library || []) as Array<{ id: string; name: string }>),
    remaining: Math.max(0, limit - used - 1),
    limit,
  });
}
