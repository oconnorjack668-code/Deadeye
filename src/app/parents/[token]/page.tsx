// src/app/parents/[token]/page.tsx
// The page a player's link opens for their parent (00036). No login: the token
// is the access, so it shows only the player's first name.
import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured } from '@/lib/email';
import { firstName, isToken } from '@/lib/parentApproval';
import { Logo } from '@/components/Logo';
import { WhatParentsAgreeTo } from '../WhatParentsAgreeTo';
import { ParentApprovalForm } from '../ParentApprovalForm';
import { WithdrawApproval } from '../WithdrawApproval';
import { CoachPosts } from '../CoachPosts';

export const metadata = { title: 'Approve an account - Deadeye', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: check } = isToken(token)
    ? await admin.from('age_checks').select('user_id, consent_status').eq('request_token', token).maybeSingle()
    : { data: null };
  const { data: profile } = check
    ? await admin.from('profiles').select('display_name').eq('id', check.user_id).maybeSingle()
    : { data: null };
  const child = firstName(profile?.display_name);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <main className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </div>

        {!check ? (
          <p className="text-sm text-zinc-300">
            This approval link is not valid, or the account no longer exists. Ask for the link again from the Deadeye app.
          </p>
        ) : check.consent_status === 'approved' ? (
          <>
            <h1 className="text-2xl font-black text-white">You approved {child}&apos;s account</h1>
            <p className="text-sm text-zinc-300">Thanks. {child} can use Deadeye. You can withdraw your approval here at any time.</p>
            <CoachPosts childId={check.user_id} child={child} />
            <WithdrawApproval token={token} child={child} />
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-white">{child} would like to use Deadeye</h1>
              <p className="mt-2 text-sm text-zinc-300">
                Players under 16 need a parent or guardian to approve their account. Here is what you are agreeing to.
              </p>
            </div>
            <WhatParentsAgreeTo child={child} />
            <ParentApprovalForm token={token} child={child} emailStep={emailConfigured()} />
          </>
        )}
      </main>
    </div>
  );
}
