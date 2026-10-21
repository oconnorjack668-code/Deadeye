// src/app/account-deletion/page.tsx
// Public page Google Play asks for: how to delete a Deadeye account and its data (reachable without the app).
import React from 'react';
import Link from 'next/link';

export const metadata = { title: 'Delete your account - Deadeye' };

export default function AccountDeletionPage() {
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;

  return (
    <div className="flex-1 bg-zinc-950 px-6 py-12">
      <main className="mx-auto max-w-2xl space-y-6 text-sm leading-6 text-zinc-300">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← Deadeye</Link>
        <h1 className="text-3xl font-black text-white">Delete your Deadeye account</h1>
        <p>Deadeye Basketball Training lets you delete your account and all of its data at any time.</p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">In the app</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Log in to Deadeye (the app or <Link href="/login" className="text-orange-400 underline">the website</Link>).</li>
            <li>Open <strong>Profile</strong>.</li>
            <li>Scroll to <strong>Delete account</strong>, type DELETE and tap <strong>Delete my account</strong>.</li>
          </ol>
          <p>Deletion is immediate. Tip: use <strong>Download my data</strong> on the same page first if you want a copy.</p>
        </section>

        {contactEmail && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Can&apos;t log in?</h2>
            <p>
              Email <a className="text-orange-400 underline" href={`mailto:${contactEmail}?subject=Delete%20my%20Deadeye%20account`}>{contactEmail}</a>{' '}
              from the address you signed up with, and we will delete your account within 30 days.
            </p>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">What gets deleted</h2>
          <p>
            Everything: your profile, training sessions, shots, workouts, tests, study progress, programs, goals,
            badges, AI reports, video analysis results, uploaded videos and reminder settings. Nothing is kept, except
            that anonymous crash reports (with your account link removed) may remain for up to 90 days, and payment
            records that Stripe must keep by law if you bought Pro.
          </p>
        </section>

        <p className="text-xs text-zinc-500">
          See also our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
