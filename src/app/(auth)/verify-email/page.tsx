// src/app/(auth)/verify-email/page.tsx
'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'your email';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md">
        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl text-center">
          <CardHeader className="flex flex-col items-center pb-2">
            <div className="h-16 w-16 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-red-500 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-sm mt-1">
              We sent a verification link to <span className="font-semibold text-zinc-200">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="rounded-xl bg-zinc-950/60 p-4 border border-zinc-800/80 text-left space-y-2">
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Click the link in the email to verify your address.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>You will be redirected straight into your player onboarding.</span>
              </div>
            </div>

            <p className="text-sm text-zinc-500">
              Did not receive the email? Check your spam folder or verify with SMTP in production.
            </p>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <Link href="/login" className="w-full">
              <Button variant="secondary" className="w-full">
                Back to Sign In <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
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
          <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
