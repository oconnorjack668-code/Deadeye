// src/app/(app)/programs/[slug]/day/[dayId]/CompleteDayButton.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export function CompleteDayButton({
  enrollmentId,
  dayId,
  done,
  totalDays,
  completedCount,
}: {
  enrollmentId: string;
  dayId: string;
  done: boolean;
  totalDays: number;
  completedCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
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

    if (done) {
      await supabase.from('program_day_completions').delete().eq('enrollment_id', enrollmentId).eq('program_day_id', dayId);
    } else {
      const { error: insertError } = await supabase
        .from('program_day_completions')
        .insert({ user_id: user.id, enrollment_id: enrollmentId, program_day_id: dayId });
      if (insertError) {
        setError(`Could not save: ${insertError.message}`);
        setBusy(false);
        return;
      }
      // Last session done: the program is complete
      if (completedCount + 1 >= totalDays) {
        await supabase
          .from('program_enrollments')
          .update({ status: 'completed', finished_at: new Date().toISOString() })
          .eq('id', enrollmentId);
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <Button variant={done ? 'outline' : 'secondary'} size="lg" className="w-full gap-2" isLoading={busy} onClick={toggle}>
        <CheckCircle2 className={`h-4 w-4 ${done ? 'text-emerald-400' : ''}`} />
        {done ? 'Completed (tap to undo)' : 'Mark session complete'}
      </Button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
