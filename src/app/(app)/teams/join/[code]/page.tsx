// src/app/(app)/teams/join/[code]/page.tsx
// Team join links (deadeye…/teams/join/T4KX9P, also in the coach's QR code)
// land here after login. Someone without an account goes through sign-up
// first, and the welcome screen brings them back (src/lib/coachSide.ts).
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { normaliseCode } from '@/lib/friends';
import { JoinTeamButton } from './JoinTeamButton';
import { Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Join a team - Deadeye' };

export default async function JoinTeamPage({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const code = normaliseCode((await params).code);
  const supabase = await createClient();
  // Missing before 00047, which reads as not found; the code still works in Teams
  const { data } = await supabase.rpc('team_preview', { p_code: code });
  const team = data?.[0];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20">
          <Shield className="h-7 w-7 text-blue-400" />
        </div>
        {!team ? (
          <>
            <h1 className="text-xl font-black text-white">Team not found</h1>
            <p className="text-sm text-zinc-400">This link doesn&apos;t match a team. Ask your coach for the 6-character team code.</p>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-black text-white">Join {team.name}?</h1>
              <p className="text-sm text-zinc-400">
                {[team.club_name, team.age_group, `${team.members} ${team.members === 1 ? 'member' : 'members'}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              Your coaches will see your weekly training totals. They see more only if you choose to share it, and never your notes or videos.
            </p>
            <JoinTeamButton code={code} />
          </>
        )}
        <Link href="/teams" className="block text-sm text-zinc-400 underline">
          Go to Teams
        </Link>
      </div>
    </div>
  );
}
