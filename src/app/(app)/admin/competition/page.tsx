// src/app/(app)/admin/competition/page.tsx
// Owner-only: the founding competition entries (00067), for judging. Names are
// hidden unless asked for, because the rules say entries are judged without
// them (section 7). Players and clubs are listed apart, as they are judged.
// Also sends parent emails that could not go when the entry was made (before
// the email domain was verified), and exports everything as CSV.
import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured } from '@/lib/email';
import { sendParentLink } from '@/lib/competition-server';
import { CLOSING_TEXT, competitionLive, parentLinkState } from '@/lib/competition';
import { PageHeader } from '@/components/layout/PageHeader';
import { Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Founding competition - Deadeye' };

type Row = {
  id: string;
  user_id: string;
  kind: 'player' | 'club';
  club_name: string | null;
  feedback: string;
  status: 'valid' | 'pending_parent' | 'declined';
  parent_email: string | null;
  parent_token_sent_at: string | null;
  parent_decided_at: string | null;
  winner: boolean;
  created_at: string;
};

async function toggleWinner(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const id = String(formData.get('id') || '');
  if (!id) return;
  const admin = createAdminClient();
  const { data } = await admin.from('competition_entries').select('winner').eq('id', id).maybeSingle();
  if (!data) return;
  await admin.from('competition_entries').update({ winner: !data.winner }).eq('id', id);
  revalidatePath('/admin/competition');
}

/** Emails every parent who has not had their link yet. The links are built on the address this page was opened on. */
async function sendPendingParentEmails() {
  'use server';
  if (!(await checkIsOwner()) || !emailConfigured()) return;
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const origin = h.get('origin') || (host ? `${h.get('x-forwarded-proto') || 'https'}://${host}` : null);
  if (!origin) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from('competition_entries')
    .select('id')
    .eq('status', 'pending_parent')
    .is('parent_token_sent_at', null)
    .order('created_at')
    .limit(50);
  for (const row of data ?? []) await sendParentLink(admin, row.id, origin);
  revalidatePath('/admin/competition');
}

const STATUS: Record<Row['status'], { label: string; style: string }> = {
  valid: { label: 'Valid', style: 'bg-emerald-600/20 text-emerald-300' },
  pending_parent: { label: 'Waiting for parent', style: 'bg-amber-600/20 text-amber-300' },
  declined: { label: 'Parent declined', style: 'bg-red-600/20 text-red-300' },
};

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' });
}

function EntryList({ rows, names, title }: { rows: Row[]; names: Map<string, string> | null; title: string }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">
        {title} ({rows.length})
      </h2>
      {rows.length === 0 && <p className="text-sm text-zinc-500">No entries yet.</p>}
      {rows.map((r) => {
        const link = parentLinkState(r);
        return (
          <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-zinc-400">#{r.id.slice(0, 8)}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[r.status].style}`}>{STATUS[r.status].label}</span>
              {r.winner && <span className="rounded-full bg-orange-600 px-2 py-0.5 font-semibold text-white">Winner</span>}
              {r.status === 'pending_parent' && link === 'not-sent' && <span className="text-amber-300">email not sent</span>}
              {r.status === 'pending_parent' && link === 'expired' && <span className="text-zinc-400">link ran out</span>}
              <span className="text-zinc-500">{day(r.created_at)}</span>
            </div>
            {names && (
              <p className="mt-2 text-sm font-semibold text-white">
                {r.kind === 'club' ? r.club_name : names.get(r.user_id) ?? 'Unknown player'}
                {r.parent_email && <span className="font-normal text-zinc-400"> · parent {r.parent_email}</span>}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-100">{r.feedback}</p>
            <form action={toggleWinner} className="mt-3">
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="h-11 rounded-lg bg-zinc-800 px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                {r.winner ? 'Remove winner mark' : 'Mark as winner'}
              </button>
            </form>
          </div>
        );
      })}
    </section>
  );
}

export default async function AdminCompetitionPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  if (!(await checkIsOwner())) notFound();
  const showNames = (await searchParams).names === '1';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('competition_entries')
    .select('id, user_id, kind, club_name, feedback, status, parent_email, parent_token_sent_at, parent_decided_at, winner, created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  const rows = (data ?? []) as Row[];

  let names: Map<string, string> | null = null;
  if (showNames && rows.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name')
      .in('id', [...new Set(rows.map((r) => r.user_id))]);
    names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? '']));
  }

  const unsent = rows.filter((r) => r.status === 'pending_parent' && !r.parent_token_sent_at).length;
  const emailOn = emailConfigured();

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <PageHeader tone="hoops" icon={Trophy} title="Founding competition" subtitle={`Closes ${CLOSING_TEXT}. Only you can see this.`} />

        <p
          className={`rounded-xl border p-3 text-sm ${competitionLive() ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
        >
          {competitionLive()
            ? 'Live: COMPETITION_LIVE=1 is set, so players can enter until the closing time.'
            : 'Not live: players see "Opening soon" and nothing is taken or emailed. Set COMPETITION_LIVE=1 in Vercel and redeploy to open it.'}
        </p>

        {error && (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3 text-sm text-amber-200">
            Could not load entries: {error.message}. Has migration 00067_feedback_and_competition.sql been run in Supabase?
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={showNames ? '/admin/competition' : '/admin/competition?names=1'}
            className="flex h-11 items-center rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            {showNames ? 'Hide names' : 'Show names (not while judging)'}
          </Link>
          <a
            href={`/api/admin/competition/export${showNames ? '?names=1' : ''}`}
            className="flex h-11 items-center rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            Download CSV{showNames ? ' with names' : ''}
          </a>
        </div>

        {unsent > 0 && (
          <div className="space-y-2 rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-100">
            <p>
              {unsent} {unsent === 1 ? 'entry is' : 'entries are'} waiting for a parent email that has not been sent.
              {emailOn ? '' : ' Email is not set up yet (RESEND_API_KEY and EMAIL_FROM), so they wait until it is.'}
            </p>
            {emailOn && (
              <form action={sendPendingParentEmails}>
                <button type="submit" className="h-11 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:brightness-110">
                  Send pending parent emails
                </button>
              </form>
            )}
          </div>
        )}

        <EntryList title="Players" rows={rows.filter((r) => r.kind === 'player')} names={names} />
        <EntryList title="Clubs" rows={rows.filter((r) => r.kind === 'club')} names={names} />
      </div>
    </div>
  );
}
