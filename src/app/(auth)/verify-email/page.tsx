// src/app/(auth)/verify-email/page.tsx
// Where a player lands after signing up, while the confirmation email is on
// its way. Two plain steps, a way to send it again (60 s apart, the Supabase
// limit; src/lib/resendEmail.ts) and a way back if the address was wrong.
// Design: docs/agent-os/design/2026-11-22-polish.md (auth), backlog D3.
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowUpRight, Mail, MailOpen, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { looksLikeEmail, resendOutcome } from '@/lib/resendEmail';
import { AuthBrand } from '@/components/AuthBrand';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FIELD_BORDER } from '@/components/ui/Input';

const LINK = 'inline-flex min-h-11 items-center text-sm text-zinc-300 underline hover:text-white';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const rawEmail = searchParams.get('email');
  const email = looksLikeEmail(rawEmail) ? rawEmail : null;

  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function sendAgain() {
    if (!email || sending || secondsLeft > 0) return;
    setSending(true);
    setStatus(null);
    let error: { code?: string; message?: string } | null;
    try {
      ({ error } = await createClient().auth.resend({
        type: 'signup',
        email,
        // Same landing as the first email (signup/page.tsx)
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      }));
    } catch {
      error = { code: 'network' };
    }
    const outcome = resendOutcome(error);
    setStatus({ ok: outcome.ok, message: outcome.message });
    setSecondsLeft(outcome.cooldown);
    setSending(false);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md">
        <AuthBrand slogan={false} />

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl text-center">
          <CardHeader className="flex flex-col items-center pb-2">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-500/60 bg-orange-600/15 shadow-[0_0_40px_rgba(234,88,12,0.35)]">
              <Mail className="h-8 w-8 text-orange-400" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-black">Check your email</CardTitle>
            <CardDescription className="mt-1 text-base text-zinc-300">
              We sent a link to{' '}
              {email ? <span className="font-semibold text-white break-all">{email}</span> : 'your email'}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <ol className="space-y-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left text-sm text-zinc-200">
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                  <MailOpen className="h-4 w-4 text-orange-400" aria-hidden />
                </span>
                <span>Open the email from Deadeye. Check spam or junk if it is not there.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900">
                  <ArrowUpRight className="h-4 w-4 text-orange-400" aria-hidden />
                </span>
                <span>Tap the link. It brings you back here to finish setting up.</span>
              </li>
            </ol>
            <p className="text-sm text-zinc-400">Can&apos;t find it? It can take a minute or two to arrive.</p>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            {email && (
              <>
                <Button
                  variant="outline"
                  className={`w-full ${FIELD_BORDER}`}
                  onClick={sendAgain}
                  isLoading={sending}
                  disabled={secondsLeft > 0}
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {secondsLeft > 0 ? `Send again in ${secondsLeft}s` : 'Send it again'}
                </Button>
                <p role="status" className={`min-h-5 text-sm ${status && !status.ok ? 'text-red-400' : 'text-zinc-400'}`}>
                  {status?.message ?? 'After a tap it waits 60 seconds before it works again.'}
                </p>
              </>
            )}
            <div className="flex w-full flex-wrap items-center justify-between gap-x-4">
              <Link href="/signup" className={LINK}>
                Wrong email? Start again
              </Link>
              <Link href="/login" className={LINK}>
                Sign in instead
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
