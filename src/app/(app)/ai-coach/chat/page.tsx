// src/app/(app)/ai-coach/chat/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FREE_CHAT_PER_DAY, todayStartIso } from '@/lib/ai/chat';
import { getUserTimeZone } from '@/lib/userTime';
import { CoachChat, type ChatEntry } from './CoachChat';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { hasPro } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ask Coach - Deadeye' };

export default async function CoachChatPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [history, today, subscription] = await Promise.all([
    supabase.from('coach_messages').select('id, role, content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60),
    supabase
      .from('coach_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', todayStartIso(await getUserTimeZone())),
    getCurrentSubscription(),
  ]);
  const unlimited = hasPro(subscription);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3 max-w-3xl w-full mx-auto">
        <Link href="/ai-coach" aria-label="Back to AI Coach" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-red-600 to-pink-500 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-black text-white leading-tight">Ask Coach</h1>
          <p className="text-xs text-zinc-400">Answers use your own training data</p>
        </div>
      </div>
      {history.error ? (
        <p className="m-4 rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
          Coach chat isn&apos;t switched on yet. Run migration <code>00021_friends_and_coach_chat.sql</code> in Supabase.
        </p>
      ) : (
        <CoachChat
          initial={((history.data || []) as ChatEntry[]).reverse()}
          remaining={unlimited ? null : Math.max(0, FREE_CHAT_PER_DAY - (today.count || 0))}
        />
      )}
    </div>
  );
}
