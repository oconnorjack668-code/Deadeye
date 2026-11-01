// src/app/(app)/programs/[slug]/EnrollButton.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Play } from 'lucide-react';

export function EnrollButton({
  programId,
  programName,
  isActive,
  hasOtherActive,
  otherName,
  nextHref,
}: {
  programId: string;
  programName: string;
  isActive: boolean;
  hasOtherActive: boolean;
  otherName?: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    if (hasOtherActive && !window.confirm(`Switch from "${otherName}" to "${programName}"? Your progress there is kept in history.`)) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    // Only one program can be active at a time
    await supabase
      .from('program_enrollments')
      .update({ status: 'stopped', finished_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active');
    const { error: insertError } = await supabase.from('program_enrollments').insert({ user_id: user.id, program_id: programId });
    setBusy(false);
    if (insertError) {
      setError(`Could not start the program: ${insertError.message}`);
      return;
    }
    router.refresh();
  }

  async function stop() {
    if (!window.confirm(`Stop "${programName}"?`)) return;
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from('program_enrollments')
      .update({ status: 'stopped', finished_at: new Date().toISOString() })
      .eq('program_id', programId)
      .eq('status', 'active');
    setBusy(false);
    router.refresh();
  }

  if (isActive) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {nextHref ? (
          <Link href={nextHref}>
            <Button variant="primary" size="lg" className="gap-2">
              <Play className="h-4 w-4" /> Continue program
            </Button>
          </Link>
        ) : (
          <span className="text-sm font-semibold text-emerald-400">Program complete!</span>
        )}
        <button type="button" onClick={stop} disabled={busy} className="text-xs text-zinc-500 hover:text-red-400">
          Stop program
        </button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="primary" size="lg" className="w-full gap-2" isLoading={busy} onClick={enroll}>
        <Play className="h-4 w-4" /> Start this program
      </Button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
