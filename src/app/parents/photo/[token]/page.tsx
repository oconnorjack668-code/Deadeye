// src/app/parents/photo/[token]/page.tsx
// The page a parent opens to approve their child's profile photo (00043). No
// login: the token is the access, so it shows only the child's first name and
// the photo itself.
import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { firstName, isToken } from '@/lib/parentApproval';
import { signedPhotoUrl } from '@/lib/photos-server';
import { PHOTO_VISIBILITY } from '@/lib/avatars';
import { Logo } from '@/components/Logo';
import { PhotoDecision } from '../../PhotoDecision';

export const metadata = { title: 'Approve a photo - Deadeye', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ParentPhotoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: row } = isToken(token)
    ? await admin.from('profile_photos').select('user_id, path, status, visibility').eq('approval_token', token).maybeSingle()
    : { data: null };
  const [{ data: profile }, photoUrl] = row
    ? await Promise.all([admin.from('profiles').select('display_name').eq('id', row.user_id).maybeSingle(), signedPhotoUrl(row.path)])
    : [{ data: null }, null];
  const child = firstName(profile?.display_name);
  const seenBy = PHOTO_VISIBILITY.find((v) => v.id === row?.visibility);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <main className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </div>

        {!row ? (
          <p className="text-sm text-zinc-300">
            This link is not valid, or the photo has been changed or removed. If your child chose a new photo, they can
            send you a new link from Settings in the app.
          </p>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-white">
                {row.status === 'approved' ? `You approved ${child}'s photo` : `${child} would like a profile photo`}
              </h1>
              <p className="mt-2 text-sm text-zinc-300">
                Players under 16 need a parent or guardian to approve a profile photo before anyone else can see it. Until
                then, and if you say no, they keep an emoji avatar.
              </p>
            </div>

            {photoUrl && (
              // A short-lived signed link, so next/image would only add a cache that outlives it
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={`${child}'s photo`} className="mx-auto h-48 w-48 rounded-full object-cover ring-4 ring-zinc-800" />
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-sm text-zinc-300 space-y-2">
              <p>
                <span className="font-semibold text-white">Who would see it: </span>
                {seenBy ? `${seenBy.label}. ${seenBy.hint}` : 'Friends and teammates.'}
              </p>
              <p>It is never shown on the website, in search engines or to anyone not signed in to Deadeye.</p>
              <p>The photo was shrunk on {child}&apos;s phone before it was sent, which also removed any location data from it.</p>
              <p>If {child} later asks for more people to see it, you will be asked again. You can remove it here at any time.</p>
            </div>

            <PhotoDecision token={token} child={child} approved={row.status === 'approved'} />
          </>
        )}
      </main>
    </div>
  );
}
