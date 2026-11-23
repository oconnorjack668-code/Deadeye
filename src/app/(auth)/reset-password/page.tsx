// src/app/(auth)/reset-password/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ArrowLeft, Mail } from 'lucide-react';
import { AuthBrand } from '@/components/AuthBrand';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      // Through the callback, so the recovery code becomes a session, and on to
      // the page that sets the password. Sending players straight to /profile
      // signed them in without ever asking for a new password, which left the
      // forgotten one in place and made every future login need another email.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch {
      setError('Failed to send reset link. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md">
        <AuthBrand />

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription>
              Enter the email you signed up with and we will send you a link to set a new one.
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <Alert variant="success" title="Reset email sent">
                Check <span className="font-semibold">{email}</span> for instructions to reset your password.
              </Alert>
              <Link href="/login" className="block w-full">
                <Button variant="secondary" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleReset}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="error" title="Reset failed">
                    {error}
                  </Alert>
                )}

                <Input
                  label="Email"
                  type="email"
                  icon={Mail}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Send reset link
                </Button>

                <Link
                  href="/login"
                  className="min-h-11 text-sm text-center text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
