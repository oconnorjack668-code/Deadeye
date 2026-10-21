// src/app/parents/CoachPosts.tsx
// Safeguarding (plan: "Parents can see what coaches post"): on the approval
// link, once a parent has approved, everything the child's coaches have
// posted to them - team assignments and answers to the child's film
// questions. Coaches have no private channel to a player, so this is all of
// it. The link is the access, as on the rest of this page, so coaches appear
// by first name only.
import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { VERDICTS } from '@/lib/filmQuestions';

const DAYS = 60;

/** A server component renders once per request, so reading the clock here is safe. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export async function CoachPosts({ childId, child }: { childId: string; child: string }) {
  const admin = createAdminClient();
  const since = daysAgo(DAYS);

  const { data: memberships } = await admin.from('team_members').select('team_id, teams(name)').eq('user_id', childId).eq('role', 'player');
  const teams = ((memberships || []) as unknown as Array<{ team_id: string; teams: { name: string } | null }>).filter((m) => m.teams);
  const teamName = Object.fromEntries(teams.map((m) => [m.team_id, m.teams!.name]));

  const [{ data: assignments }, { data: answers }] = await Promise.all([
    teams.length
      ? admin
          .from('team_assignments')
          .select('id, team_id, title, details, due_date, created_at, created_by')
          .in('team_id', teams.map((m) => m.team_id))
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as Array<{ id: string; team_id: string; title: string; details: string | null; due_date: string | null; created_at: string; created_by: string | null }> }),
    admin
      .from('film_questions')
      .select('id, question, verdict, coach_note, answered_at, answered_by')
      .eq('player_id', childId)
      .not('answered_at', 'is', null)
      .gte('answered_at', since)
      .order('answered_at', { ascending: false })
      .limit(20),
  ]);

  const authorIds = [...new Set([...(assignments || []).map((a) => a.created_by), ...(answers || []).map((a) => a.answered_by)].filter(Boolean))] as string[];
  const { data: authors } = authorIds.length ? await admin.from('profiles').select('id, display_name').in('id', authorIds) : { data: [] };
  const coach = (id: string | null) => (authors || []).find((p) => p.id === id)?.display_name?.trim().split(/\s+/)[0] || 'A coach';
  // The same address the privacy policy gives
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' });

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div>
        <h2 className="text-lg font-black text-white">What {child}&apos;s coaches post</h2>
        <p className="text-sm text-zinc-400">
          Everything a coach has sent {child} in the last {DAYS} days. Coaches post to the whole team and cannot message players privately.
        </p>
      </div>

      {teams.length === 0 && (answers || []).length === 0 ? (
        <p className="text-sm text-zinc-400">{child} is not on a team yet.</p>
      ) : (
        <ul className="space-y-2">
          {(assignments || []).map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="font-semibold text-white">{a.title}</p>
              {a.details && <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-300">{a.details}</p>}
              <p className="mt-1 text-xs text-zinc-500">
                {coach(a.created_by)} to {teamName[a.team_id]} · {date(a.created_at)}
              </p>
            </li>
          ))}
          {(answers || []).map((q) => (
            <li key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-sm text-zinc-400">{child} asked about a clip: {q.question}</p>
              <p className="mt-1 font-semibold text-white">{VERDICTS.find((v) => v.id === q.verdict)?.label ?? 'Answered'}</p>
              {q.coach_note && <p className="mt-0.5 text-sm text-zinc-300">{q.coach_note}</p>}
              <p className="mt-1 text-xs text-zinc-500">
                {coach(q.answered_by)} · {date(q.answered_at!)}
              </p>
            </li>
          ))}
          {teams.length > 0 && (assignments || []).length === 0 && (answers || []).length === 0 && (
            <li className="text-sm text-zinc-400">Nothing posted yet on {teams.map((m) => m.teams!.name).join(', ')}.</li>
          )}
        </ul>
      )}
      {contactEmail && (
        <p className="text-xs text-zinc-500">
          Worried about something a coach posted? Email{' '}
          <a href={`mailto:${contactEmail}`} className="underline">
            {contactEmail}
          </a>
          , and tell the club&apos;s children&apos;s officer too.
        </p>
      )}
    </section>
  );
}
