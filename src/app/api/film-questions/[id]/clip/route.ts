// src/app/api/film-questions/[id]/clip/route.ts
// Hands back a short-lived URL for the one clip a film question points at.
//
// This is the only route in the app that lets one person see another person's
// video, and the people involved are usually a coach and a minor - so the
// rules are deliberately narrow and all of them are checked server-side:
//
//   - The caller is the player who asked, or a coach of the team the question
//     was asked of. Nobody else, ever.
//   - The asset is the one that question names. A caller cannot pass a storage
//     path, an asset id, or anything else that would let them reach a second
//     clip; the question is the only key.
//   - The URL expires in minutes. Long enough to watch a moment, short enough
//     that a copied link is not a standing grant.
//
// A player deleting their question therefore revokes access as a side effect,
// which is the behaviour the privacy note in migration 00035 promises.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Long enough to watch and re-watch a moment, short enough not to be a grant. */
const URL_TTL_SECONDS = 600;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const supabase = await createClient();

  // Row level security does the authorisation here rather than a hand-written
  // check: 00035 only exposes a question to the player who asked it or to a
  // coach of its team, so a row coming back at all means this caller is
  // entitled to it. A second check in TypeScript would be a second thing to
  // keep in step with the policies.
  const { data: question } = await supabase
    .from('film_questions')
    .select('id, player_id, team_id, video_asset_id, moment_ms')
    .eq('id', id)
    .maybeSingle();

  if (!question) {
    // Deliberately the same answer for "no such question" and "not yours", so
    // the route cannot be used to discover which ids exist.
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  // The asset is read with the caller's own permissions too. For the player
  // that is their own row; for a coach this would normally return nothing, so
  // the path is fetched separately below with the service role once the
  // question above has already proved entitlement.
  const { data: asset } = await supabase
    .from('video_assets')
    .select('storage_path')
    .eq('id', question.video_asset_id)
    .maybeSingle();

  let storagePath = asset?.storage_path ?? null;

  if (!storagePath) {
    // A coach cannot select the player's video_assets row, which is correct -
    // they have no business browsing it. The question has already established
    // that they may see THIS asset, so the lookup is repeated with the service
    // role, scoped to the exact id the question names and nothing else.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Video review is not configured on this server.' }, { status: 503 });
    }
    const { data: viaAdmin } = await createAdminClient()
      .from('video_assets')
      .select('storage_path')
      .eq('id', question.video_asset_id)
      .maybeSingle();
    storagePath = viaAdmin?.storage_path ?? null;
  }

  if (!storagePath) return Response.json({ error: 'That clip is no longer available.' }, { status: 404 });

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const { data: signed, error } = await createAdminClient()
    .storage.from('videos')
    .createSignedUrl(storagePath, URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return Response.json({ error: 'Could not open that clip.' }, { status: 502 });
  }

  return Response.json({ url: signed.signedUrl, momentMs: question.moment_ms, expiresIn: URL_TTL_SECONDS });
}
