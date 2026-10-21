// src/app/(app)/welcome/sample/page.tsx
// The real shot tracker running on a sample clip, for a player who is not at a
// court. Linked from the welcome screen and the dashboard's starting steps.
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { SampleClient } from './SampleClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Try the tracker - Deadeye' };

export default async function SamplePage() {
  await requireUser();
  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-xl space-y-4 p-4 md:p-8">
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Watch it call a session</h1>
          <p className="mt-2 text-zinc-400">
            Six shots from a real session. Watch the count in the corner: the tracker is calling each one live, on your
            phone, as the clip plays.
          </p>
        </div>
        <SampleClient />
      </div>
    </div>
  );
}
