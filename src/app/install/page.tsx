// src/app/install/page.tsx
// A link to send a friend: how to put Deadeye on their home screen. Public, and
// shown to signed-in players too, since they are the ones sending it.
import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { InstallGuide } from '@/components/InstallGuide';

export const metadata = {
  title: 'Get the Deadeye app',
  description: 'Add Deadeye to your home screen on iPhone or Android in three taps.',
};

export default function InstallPage() {
  return (
    <div className="flex-1 bg-zinc-950 px-4 py-10">
      <main className="mx-auto max-w-xl space-y-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Get the Deadeye app</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Deadeye runs in your phone&apos;s browser, so there is nothing to download from an app store. Add it to your
            home screen once and it opens full screen, like any other app.
          </p>
        </div>
        <InstallGuide />
        <p className="text-sm text-zinc-400">
          No account yet?{' '}
          <Link href="/signup" className="font-semibold text-orange-400 underline">
            Create one free
          </Link>{' '}
          · Already have one?{' '}
          <Link href="/login" className="font-semibold text-orange-400 underline">
            Log in
          </Link>
        </p>
      </main>
    </div>
  );
}
