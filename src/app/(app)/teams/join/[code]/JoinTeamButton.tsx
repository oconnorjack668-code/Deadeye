// src/app/(app)/teams/join/[code]/JoinTeamButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clearTeamInvite } from '@/lib/coachSide';
import { Button } from '@/components/ui/Button';

const MESSAGES: Record<string, string> = {
  not_found: 'No team has that code any more. Ask your coach for a new one.',
  full: 'That team is full (60 members).',
};

export function JoinTeamButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: joinError } = await supabase.rpc('join_team', { p_code: code });
    if (joinError || (data !== 'joined' && data !== 'already')) {
      setBusy(false);
      setError(joinError?.message || MESSAGES[data ?? ''] || 'Could not join the team.');
      return;
    }
    clearTeamInvite();
    const { data: team } = await supabase.from('teams').select('id').eq('join_code', code).maybeSingle();
    router.push(team ? `/teams/${team.id}` : '/teams');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button variant="primary" className="w-full" isLoading={busy} onClick={() => void join()}>
        Join the team
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
