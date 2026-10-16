// src/app/parents/confirm/[token]/page.tsx
// The page the emailed link opens. Approving takes a tap (see the confirm
// route for why the link alone does not approve). The same link is how a
// parent withdraws later, so it stays useful after approval.
import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { CONFIRM_LINK_DAYS, firstName, isToken, olderThanDays } from '@/lib/parentApproval';
import { Logo } from '@/components/Logo';
import { ConfirmApproval } from '../../ConfirmApproval';
import { WithdrawApproval } from '../../WithdrawApproval';

export const metadata = { title: 'Confirm approval - Deadeye', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: check } = isToken(token)
    ? await admin
        .from('age_checks')
        .select('user_id, consent_status, confirm_sent_at, request_token')
        .eq('confirm_token', token)
        .maybeSingle()
    : { data: null };
  const { data: profile } = check
    ? await admin.from('profiles').select('display_name').eq('id', check.user_id).maybeSingle()
    : { data: null };
  const child = firstName(profile?.display_name);
  const expired = !!check && check.consent_status !== 'approved' && olderThanDays(check.confirm_sent_at, CONFIRM_LINK_DAYS);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <main className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </div>

        {!check ? (
          <p className="text-sm text-zinc-300">This link is not valid, or the account no longer exists.</p>
        ) : check.consent_status === 'approved' ? (
          <>
            <h1 className="text-2xl font-black text-white">{child}&apos;s account is approved</h1>
            <p className="text-sm text-zinc-300">Keep this email. You can come back to this link to withdraw your approval at any time.</p>
            <WithdrawApproval token={token} child={child} />
          </>
        ) : expired ? (
          <p className="text-sm text-zinc-300">
            This link has expired. Open the approval link {child} sent you again, and we will email you a new one.
          </p>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white">Approve {child}&apos;s account</h1>
            <p className="text-sm text-zinc-300">
              Tap Approve to let {child} use Deadeye.{' '}
              {check.request_token && (
                <>
                  To read what you are agreeing to again,{' '}
                  <a href={`/parents/${check.request_token}`} className="text-red-400 underline">
                    open the approval page
                  </a>
                  .
                </>
              )}
            </p>
            <ConfirmApproval token={token} />
          </>
        )}
      </main>
    </div>
  );
}
