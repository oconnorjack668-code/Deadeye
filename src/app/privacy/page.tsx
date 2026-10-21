// src/app/privacy/page.tsx
import React from 'react';
import Link from 'next/link';
import { aiProviderCompany } from '@/lib/ai/config';
import { emailConfigured } from '@/lib/email';
import { operator } from '@/lib/legal';
import { UNAPPROVED_ACCOUNT_DAYS } from '@/lib/parentApproval';

export const metadata = { title: 'Privacy Policy - Deadeye' };

const LAST_UPDATED = 'October 20, 2026';

export default function PrivacyPage() {
  const contactEmail = process.env.SUPPORT_EMAIL || process.env.OWNER_EMAIL;
  const runBy = operator();
  // Named from the settings that route the requests, so this cannot drift from where data actually goes
  const ai = aiProviderCompany() || 'Our AI provider';

  return (
    <div className="flex-1 bg-zinc-950 px-6 py-12">
      <main className="mx-auto max-w-2xl space-y-6 text-sm leading-6 text-zinc-300">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">← Deadeye</Link>
        <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
        <p className="text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>
        <p>This policy covers Deadeye Basketball Training (&ldquo;Deadeye&rdquo;), the app and website.</p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who runs Deadeye</h2>
          <p>
            {runBy ? (
              <>
                Deadeye is run by {runBy.name}
                {runBy.address ? `, ${runBy.address}` : ''}, who is responsible for your data (the &ldquo;controller&rdquo;
                under the GDPR).
              </>
            ) : (
              <>Deadeye is run from Ireland.</>
            )}
            {contactEmail && (
              <>
                {' '}
                Contact us about your data at{' '}
                <a className="text-orange-400 underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                .
              </>
            )}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who Deadeye is for</h2>
          <p>
            Deadeye is for players aged 13 and over. We do not knowingly collect information from children under 13.
            If you believe a child under 13 has created an account, contact us and we will delete it.
          </p>
          <p>
            Players aged 13 to 15 need a parent or guardian to approve their account before they can use it. Until a
            parent approves, the account holds only the email address, display name and age answer, and is deleted after{' '}
            {UNAPPROVED_ACCOUNT_DAYS} days if nobody approves. A parent can withdraw their approval at any time from the
            link they approved with; the account is then locked, and deleted after {UNAPPROVED_ACCOUNT_DAYS} days unless
            they approve it again.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account details: your email address and display name.</li>
            <li>Whether you are 16 or over, which you tell us when you sign up.</li>
            <li>
              If you are under 16: your parent or guardian&apos;s name and email address, and when they approved or
              withdrew approval.
            </li>
            <li>Player profile: age bracket, height, position, dominant hand, playing level, goals and focus areas.</li>
            <li>
              Your avatar: the emoji and colour you pick and, only if you choose to add one, a profile photo with who you
              chose to show it to. The photo is shrunk on your phone before it is sent, which removes its location and
              other hidden data. If you are under 16, we also keep when your parent or guardian approved it.
            </li>
            <li>Your level and XP, worked out from your training, so friends can see your level.</li>
            <li>Training data you log: basketball sessions, drills, shots by zone, workouts, sets and performance tests.</li>
            <li>Study activity: quiz scores and lesson progress.</li>
            <li>Videos you choose to upload, with the camera angle and drill type you select.</li>
            <li>
              Video analysis results: shot counts, form measurements (angles and timings) and film tags. The analysis
              itself runs on your phone, so videos you analyse without uploading never leave your device.
            </li>
            <li>AI coaching reports generated from your session data.</li>
            <li>Programs, goals, challenges, badges and NBA style match results.</li>
            <li>Game stats you log (box scores, opponent name, score) and teams you create or join.</li>
            <li>Settings you choose: country, county/region, time zone, whether you use Deadeye as a player or coach, and your privacy choices.</li>
            <li>Reminder settings (time, days, time zone) and, if you turn reminders on, your browser&apos;s push address.</li>
            <li>
              Your plan: Free or Pro, how many AI reports you have used this month, and if you claim the founding member
              offer, when you claimed it and when it ends. If you buy Pro, your billing status. Card details are handled by
              Stripe and never reach us.
            </li>
            <li>
              Crash reports when something breaks: the error, the page, your device type and your account id, kept for
              90 days and used only to fix bugs.
            </li>
            <li>
              Problem reports, if you send one from Settings or the crash screen: what you write, the page, your device
              type and your account id, kept for 90 days and used only to fix problems. Deleting your account deletes
              them straight away.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">How we use it, and why we are allowed to</h2>
          <p>
            To run the app: show your progress, calculate streaks and leaderboard points, and generate coaching
            feedback when you ask for it. We do not sell your data or show ads.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Running your account and the features you use is needed to provide the service you signed up for (the
              GDPR calls this &ldquo;contract&rdquo;).
            </li>
            <li>
              For players under 16, we also rely on their parent or guardian&apos;s consent, given on the approval page.
            </li>
            <li>
              Things you switch on yourself, such as the public leaderboard, sharing training details with a coach and
              reminders, rely on your choice, and you can switch them off at any time in Settings.
            </li>
            <li>
              Crash reports, problem reports you send, and keeping the service secure rely on our legitimate interest in
              Deadeye working properly.
            </li>
            <li>Payment records are kept because tax law requires it.</li>
          </ul>
          <p>
            We keep your data for as long as you have an account. When you delete your account, everything is deleted
            straight away, apart from crash reports (deleted within 90 days) and the payment records Stripe must keep.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who processes it</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase stores your account, training data, videos and profile photo.</li>
            <li>Vercel hosts the app.</li>
            <li>
              {ai} receives the details of a session (type, duration, intensity, shooting numbers, drills and your
              notes), the video numbers you choose to share, or your style match results, only when you ask for AI
              feedback, to write the report. Videos are never sent to {ai === 'Our AI provider' ? 'them' : ai}.
            </li>
            <li>Stripe processes Pro payments.</li>
            {emailConfigured() && (
              <li>Resend sends our emails to parents and payment receipts, so it receives the address and the message.</li>
            )}
            <li>Your browser&apos;s push service (for example Google or Apple) delivers training reminders you turn on.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Who can see it</h2>
          <p>
            Your data is private to your account, and your profile is private by default. If you turn on &ldquo;Show me
            on the public leaderboard&rdquo; in Settings, other players can see your display name, avatar, level,
            season points, training days, streak and badges. Your position, height and county/country are only shown if you switch
            them on in Settings → Privacy. Your age is never shown to anyone; it only puts you in the right age group
            on the leaderboard.
          </p>
          <p>
            Friends you accept (by friend code) can see your display name, your last 7 days of training totals
            (sessions, minutes, shots made), your streak, and your sessions, workouts and badges from the last 14 days
            as totals. They never see your notes, videos, profile details or AI reports. You can remove a friend at any
            time. Share cards are only created when you tap Share, and you choose where to post them.
          </p>
          <p>
            If you join a team, its members (including coaches) can see your display name, last 7 days of training
            totals, streak and your game averages (points, rebounds, assists, FG%). Coaches can post assignments and
            see who completed them. Only if you choose &ldquo;Share my training details with coaches&rdquo; (per team,
            off by default) can that team&apos;s coaches also see your sessions, shooting zones, workouts, tests and
            game box scores from recent weeks. Coaches never see your notes, videos or AI reports. Leave a team at any
            time from its page.
          </p>
          <p>
            A profile photo is optional, and you choose who sees it: only you, your friends and teammates, or anyone who
            can open your player card. Everyone else sees your emoji. If you are under 16, nobody else sees your photo
            until a parent or guardian approves it and who can see it, and showing it to more people later needs their
            approval again. They can remove it at any time from the link they were sent. Photos are never shown on the
            website, in search engines or to anyone not signed in, and are only sent through links that expire within
            an hour.
          </p>
          <p>
            AI Coach chat messages are stored in your account so the conversation continues; you can clear them at any
            time. Weekly AI reports are created from your own training data and can be turned off in Settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">Your rights</h2>
          <p>
            You can download a copy of your data at any time from Profile → Download my data, and permanently delete
            your account and all of its data, including uploaded videos, from Profile → Delete account. Under the GDPR
            you can also ask us to correct your data or restrict how we use it, object to how we use it, and withdraw
            any choice or consent at any time (this does not undo what was done before). You can complain to the Irish
            Data Protection Commission (dataprotection.ie).
          </p>
          <p>
            Deadeye only uses the cookies needed to keep you logged in. Data is stored on servers that may be outside the
            EU; our providers use the EU&apos;s standard contractual clauses to protect it.
          </p>
        </section>

        {contactEmail && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Contact</h2>
            <p>
              Questions about your data: <a className="text-orange-400 underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
