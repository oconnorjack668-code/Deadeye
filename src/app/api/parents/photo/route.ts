// src/app/api/parents/photo/route.ts
// A parent approves, declines or later removes their child's profile photo
// (00043). No login: the approval token in the link is the access, as with the
// account approval.
import { createAdminClient } from '@/lib/supabase/admin';
import { isToken } from '@/lib/parentApproval';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; decision?: unknown } | null;
  const token = body?.token;
  const decision = body?.decision;
  if (!isToken(token) || (decision !== 'approve' && decision !== 'remove')) {
    return Response.json({ error: 'This link is not valid.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin.from('profile_photos').select('user_id, path').eq('approval_token', token).maybeSingle();
  if (!row) return Response.json({ error: 'This photo has been changed or removed. Ask for a new link.' }, { status: 404 });

  if (decision === 'approve') {
    const { error } = await admin
      .from('profile_photos')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('user_id', row.user_id);
    if (error) return Response.json({ error: 'Could not save your answer. Please try again.' }, { status: 500 });
    return Response.json({ status: 'approved' });
  }

  // Declined, or removed later: the photo goes, and the emoji avatar stays
  await admin.storage.from('avatars').remove([row.path]);
  await admin.from('profile_photos').delete().eq('user_id', row.user_id);
  return Response.json({ status: 'removed' });
}
