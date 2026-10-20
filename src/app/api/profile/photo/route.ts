// src/app/api/profile/photo/route.ts
// The optional profile photo (00043): upload, change who sees it, remove.
//
// Everything is written with the service role, because the rules live here: a
// player 16 or over consents for themselves, and under 16 the photo waits for a
// parent. The photo was already shrunk to a small JPEG on the phone, which also
// drops its EXIF data (location included); the server only accepts a JPEG.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured, sendEmail } from '@/lib/email';
import { firstName } from '@/lib/parentApproval';
import { MAX_PHOTO_BYTES, isPhotoVisibility, looksLikeJpeg, widensVisibility, type PhotoVisibility } from '@/lib/avatars';

type Admin = ReturnType<typeof createAdminClient>;

const VISIBILITY_WORDS: Record<PhotoVisibility, string> = {
  me: 'only themselves',
  friends: 'their friends and teammates on Deadeye',
  everyone: 'anyone on Deadeye who can open their player card',
};

async function whoIs(admin: Admin, userId: string) {
  const { data } = await admin.from('age_checks').select('is_16_plus, consent_status, parent_email').eq('user_id', userId).maybeSingle();
  return data;
}

/**
 * Whether a parent can be asked at all: only by email, to the address they
 * gave when they approved the account. The approval link is never handed to
 * the player - with it, a player under 16 could open it and approve their own
 * photo - so with no email set up, under-16 photos stay off.
 */
function canAskParent(parentEmail: string | null | undefined): parentEmail is string {
  return emailConfigured() && !!parentEmail;
}

const NO_PARENT_EMAIL = 'Photos for players under 16 need a parent to approve them by email, which is not switched on yet. Your emoji avatar works in the meantime.';

/** Emails the parent the approval link. Throws if the email could not be sent. */
async function askParent(admin: Admin, origin: string, userId: string, token: string, visibility: PhotoVisibility, parentEmail: string) {
  const link = `${origin}/parents/photo/${token}`;
  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  const child = firstName(profile?.display_name);
  await sendEmail({
    to: parentEmail,
    subject: `${child} would like a profile photo on Deadeye`,
    text: [
      `${child} has chosen a profile photo on Deadeye, the basketball training app you approved.`,
      '',
      `They would like it to be seen by ${VISIBILITY_WORDS[visibility]}. Nobody else sees it until you approve it here:`,
      '',
      link,
      '',
      'If you do not approve, the photo is deleted and they keep their emoji avatar. You can remove an approved photo from the same link at any time.',
    ].join('\n'),
  });
}

const EMAIL_FAILED = 'We could not email your parent just now, so nobody else will see the photo yet. Please try again later.';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const photo = form?.get('photo');
  const visibility = form?.get('visibility');
  if (!(photo instanceof File)) return Response.json({ error: 'Choose a photo first.' }, { status: 400 });
  if (!isPhotoVisibility(visibility)) return Response.json({ error: 'Choose who can see your photo.' }, { status: 400 });
  if (form?.get('consent') !== 'yes') {
    return Response.json({ error: 'Tick the box to say this is a photo of you that you are happy to share.' }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) return Response.json({ error: 'That photo is too big. Try another.' }, { status: 413 });
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!looksLikeJpeg(bytes)) return Response.json({ error: 'That file is not a photo we can use.' }, { status: 415 });

  const admin = createAdminClient();
  const check = await whoIs(admin, user.id);
  if (!check) return Response.json({ error: 'Answer the age question in the app first.' }, { status: 403 });
  if (!check.is_16_plus && check.consent_status !== 'approved') {
    return Response.json({ error: 'A parent needs to approve your account first.' }, { status: 403 });
  }
  if (!check.is_16_plus && !canAskParent(check.parent_email)) return Response.json({ error: NO_PARENT_EMAIL }, { status: 403 });

  const { data: existing } = await admin.from('profile_photos').select('path, created_at, status').eq('user_id', user.id).maybeSingle();
  // A new photo emails a parent, so not more than one a minute
  if (existing && !check.is_16_plus && Date.now() - new Date(existing.created_at).getTime() < 60_000) {
    return Response.json({ error: 'Please wait a minute before choosing another photo.' }, { status: 429 });
  }

  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg' });
  if (uploadError) {
    console.error('Photo upload failed', uploadError);
    return Response.json({ error: 'Could not save your photo. Please try again.' }, { status: 500 });
  }

  const adult = check.is_16_plus;
  const token = adult ? null : crypto.randomUUID();
  const { error } = await admin.from('profile_photos').upsert({
    user_id: user.id,
    path,
    visibility,
    status: adult ? 'approved' : 'pending',
    consent_by: adult ? 'player' : 'parent',
    approval_token: token,
    created_at: new Date().toISOString(),
    approved_at: adult ? new Date().toISOString() : null,
  });
  if (error) {
    await admin.storage.from('avatars').remove([path]);
    console.error('Saving the photo row failed', error);
    return Response.json({ error: 'Could not save your photo. Please try again.' }, { status: 500 });
  }
  if (existing?.path) await admin.storage.from('avatars').remove([existing.path]);

  if (adult) return Response.json({ status: 'approved' });
  try {
    await askParent(admin, new URL(request.url).origin, user.id, token!, visibility, check.parent_email!);
  } catch (err) {
    // The photo stays pending, so nobody else sees it; choosing it again retries
    console.error('Photo approval email failed', err);
    return Response.json({ error: EMAIL_FAILED }, { status: 502 });
  }
  return Response.json({ status: 'pending', emailed: true });
}

/** Changes who can see the photo. Under 16, showing it to more people waits for a parent again. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { visibility?: unknown } | null;
  const visibility = body?.visibility;
  if (!isPhotoVisibility(visibility)) return Response.json({ error: 'Choose who can see your photo.' }, { status: 400 });

  const admin = createAdminClient();
  const [check, { data: row }] = await Promise.all([
    whoIs(admin, user.id),
    admin.from('profile_photos').select('visibility, status, approval_token').eq('user_id', user.id).maybeSingle(),
  ]);
  if (!row) return Response.json({ error: 'There is no photo to change.' }, { status: 404 });

  const needsParent = !check?.is_16_plus && row.status === 'approved' && widensVisibility(row.visibility, visibility);
  if (!needsParent) {
    await admin.from('profile_photos').update({ visibility }).eq('user_id', user.id);
    return Response.json({ status: row.status });
  }
  // Checked before anything changes, so a photo is never left hidden for nothing
  if (!canAskParent(check?.parent_email)) return Response.json({ error: NO_PARENT_EMAIL }, { status: 403 });
  const token = crypto.randomUUID();
  await admin.from('profile_photos').update({ visibility, status: 'pending', approval_token: token, approved_at: null }).eq('user_id', user.id);
  try {
    await askParent(admin, new URL(request.url).origin, user.id, token, visibility, check!.parent_email!);
  } catch (err) {
    console.error('Photo approval email failed', err);
    return Response.json({ error: EMAIL_FAILED }, { status: 502 });
  }
  return Response.json({ status: 'pending', emailed: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  const admin = createAdminClient();
  const { data: row } = await admin.from('profile_photos').select('path').eq('user_id', user.id).maybeSingle();
  if (row?.path) await admin.storage.from('avatars').remove([row.path]);
  await admin.from('profile_photos').delete().eq('user_id', user.id);
  return Response.json({ removed: true });
}
