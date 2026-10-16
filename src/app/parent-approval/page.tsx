// src/app/parent-approval/page.tsx
// Where an under-16 waits until a parent approves (00036). They send a parent
// the link; the parent approves on their own device. Outside (app) so the app
// layout gate cannot redirect it to itself.
import React from 'react';
import { redirect } from 'next/navigation';
import { requireUser, getCurrentAgeCheck, getAgeGate } from '@/lib/auth';
import { maskEmail, UNAPPROVED_ACCOUNT_DAYS } from '@/lib/parentApproval';
import { Logo } from '@/components/Logo';
import { WaitingForParent } from './WaitingForParent';

export const metadata = { title: 'Ask a parent - Deadeye' };
export const dynamic = 'force-dynamic';

export default async function ParentApprovalPage() {
  await requireUser();
  const [check, gate] = await Promise.all([getCurrentAgeCheck(), getAgeGate()]);
  if (gate === 'ok') redirect('/dashboard');
  if (gate === 'ask-age' || !check?.request_token) redirect('/age-check');

  // An email has gone to a parent and is waiting to be tapped
  const emailedTo = check.consent_status === 'pending' && check.confirm_sent_at && check.parent_email ? maskEmail(check.parent_email) : null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo size={48} className="mb-3" />
          <h1 className="text-xl font-black text-white">
            {check.consent_status === 'withdrawn' ? 'Your parent withdrew approval' : 'Ask a parent to approve your account'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {check.consent_status === 'withdrawn'
              ? `Your account is locked. It will be deleted after ${UNAPPROVED_ACCOUNT_DAYS} days unless a parent or guardian approves it again.`
              : 'Players under 16 need a parent or guardian to say yes before using Deadeye. Send them the link below. They approve on their own phone, and it takes a minute.'}
          </p>
        </div>
        <WaitingForParent token={check.request_token} emailedTo={emailedTo} />
        <p className="text-center text-xs text-zinc-500">
          If nobody approves within {UNAPPROVED_ACCOUNT_DAYS} days, your account and everything in it is deleted.
        </p>
      </div>
    </div>
  );
}
