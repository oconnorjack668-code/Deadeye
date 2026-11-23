// src/app/parents/competition/[token]/page.tsx
// The page a parent opens from the email to approve or decline their child's
// founding competition entry (00067). No login: the token is the access, so
// it shows only the child's first name, never their feedback or account.
import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { CONFIRM_LINK_DAYS, firstName, isToken } from '@/lib/parentApproval';
import { CLOSING_TEXT, parentLinkState } from '@/lib/competition';
import { Logo } from '@/components/Logo';
import { CompetitionDecision } from '../../CompetitionDecision';

export const metadata = { title: 'Approve a competition entry - Deadeye', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ParentCompetitionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: entry } = isToken(token)
    ? await admin
        .from('competition_entries')
        .select('user_id, status, parent_token_sent_at, parent_decided_at')
        .eq('parent_token', token)
        .eq('kind', 'player')
        .maybeSingle()
    : { data: null };
  const { data: profile } = entry
    ? await admin.from('profiles').select('display_name').eq('id', entry.user_id).maybeSingle()
    : { data: null };
  const child = firstName(profile?.display_name);
  const state = entry ? parentLinkState(entry) : null;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10">
      <main className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </div>

        {!entry || state === 'none' || state === 'not-sent' ? (
          <p className="text-sm text-zinc-300">
            This link is not valid, or a newer one has been sent. Please use the most recent email from Deadeye.
          </p>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-white">
                {entry.status === 'valid'
                  ? `You approved ${child}'s entry`
                  : entry.status === 'declined'
                    ? `You declined ${child}'s entry`
                    : `${child} would like to enter the Deadeye founding competition`}
              </h1>
              <p className="mt-2 text-sm text-zinc-300">
                Players under 18 need a parent or guardian&apos;s permission to enter. The entry only counts if you approve it.
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                If you are not {child}&apos;s parent or guardian, press Decline or close this page, and the entry will not count.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-sm text-zinc-300">
              <p>
                <span className="font-semibold text-white">What it is: </span>
                Ten players win Deadeye Pro for life, chosen by judging the most useful feedback about the app, not by a draw.
                Everyone else who enters gets 25% off their first year of Pro, which nobody has to buy.
              </p>
              <p>
                <span className="font-semibold text-white">It is free. </span>
                Nobody pays anything to enter, to win or to claim a prize.
              </p>
              <p>
                <span className="font-semibold text-white">What it uses: </span>
                {child}&apos;s Deadeye account, the training they log and the feedback they wrote. Nothing is sold or shared for
                advertising.
              </p>
              <p>
                <span className="font-semibold text-white">If {child} wins: </span>
                we contact you, not them. A winner&apos;s name is only published with permission, and never a child&apos;s full
                name or photo.
              </p>
              <p>
                Entries close at {CLOSING_TEXT}.{' '}
                <Link href="/competition#rules" className="text-orange-400 underline">
                  Read the full rules
                </Link>
                .
              </p>
            </div>

            {state === 'expired' ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-sm text-zinc-300">
                This link is more than {CONFIRM_LINK_DAYS} days old. {child} can send you a new one from the competition page.
              </p>
            ) : state === 'closed' ? (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-sm text-zinc-300">
                The competition has closed, so this entry can no longer change.
              </p>
            ) : (
              <CompetitionDecision token={token} child={child} status={entry.status} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
