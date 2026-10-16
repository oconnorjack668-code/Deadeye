// src/app/age-check/page.tsx
// Asked once, of accounts made before parent approval existed (00036). New
// accounts answer on the sign-up form instead. Outside (app) so the app layout
// gate cannot redirect it to itself.
import React from 'react';
import { redirect } from 'next/navigation';
import { requireUser, getAgeGate } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { AgeCheckForm } from './AgeCheckForm';

export const metadata = { title: 'One quick question - Deadeye' };

export default async function AgeCheckPage() {
  await requireUser();
  const gate = await getAgeGate();
  if (gate === 'ok') redirect('/dashboard');
  if (gate === 'needs-parent') redirect('/parent-approval');

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo size={48} className="mb-3" />
          <h1 className="text-xl font-black text-white">One quick question</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Players under 16 need a parent or guardian to approve their account. You only answer this once.
          </p>
        </div>
        <AgeCheckForm />
      </div>
    </div>
  );
}
