// src/app/(app)/ai-coach/page.tsx
import React from 'react';
import { requireUser, getCurrentSubscription, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CREDITS_PER_REPORT } from '@/lib/ai/service';
import { aiReportsLeft, FREE_MONTHLY_AI_REPORTS, hasPro } from '@/lib/entitlements';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link as LinkIcon, Zap, TrendingUp, Lightbulb, History, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { GenerateFeedbackButton } from './GenerateFeedbackButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Coach - Deadeye',
};

export default async function AICoachPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  // Checked here as well as hidden from the hub, because a bookmark or an old
  // link would otherwise walk straight past the setting - and spending a credit
  // on a report for someone who turned the coach off would be worse than a
  // broken link.
  if (profile?.ai_coaching_enabled === false) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
          <h1 className="text-3xl font-black tracking-tight text-white">AI Coach</h1>
          <Card className="mt-6 border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-6">
              <p className="text-zinc-300">
                You have AI coaching switched off, so nothing is being written about your sessions.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Your training, stats and video are unaffected and carry on as normal.
              </p>
              <Link href="/settings" className="mt-4 inline-block font-semibold text-red-400 underline hover:text-red-300">
                Turn it back on in Settings
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ data: reports }, { data: sessions }, { count: monthReportCount }, subscription] = await Promise.all([
    // Recent AI reports
    supabase
      .from('ai_reports')
      .select('id, created_at, output_content, source_session_ids, report_type')
      .eq('user_id', user.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(10),
    // Recent sessions that can get feedback
    supabase
      .from('training_sessions')
      .select('id, session_date, session_type, duration_minutes')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
    // Reports this month (each report costs CREDITS_PER_REPORT)
    supabase
      .from('ai_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('report_type', 'weekly_summary') // weekly reports do not use the allowance
      .gte('created_at', monthStart.toISOString()),
    // Owner entitlement (role or OWNER_EMAIL) is resolved here
    getCurrentSubscription(),
  ]);
  const isUnlimited = hasPro(subscription);
  const remainingCredits = aiReportsLeft(subscription);
  const outOfCredits = !isUnlimited && remainingCredits < CREDITS_PER_REPORT;
  const monthlyUsage = (monthReportCount || 0) * CREDITS_PER_REPORT;

  const reviewedSessionIds = new Set(reports?.flatMap((r) => r.source_session_ids || []) || []);

  // Every report links back to the session it was written from. An AI claim a
  // player cannot trace to their own logged numbers is indistinguishable from
  // one that was invented, and that is the complaint that sinks these features
  // elsewhere - advice that "won't tell me anything I don't already know",
  // with no way to check where it came from.
  const citedIds = [...new Set(reports?.flatMap((r) => r.source_session_ids || []) || [])];
  const { data: citedSessions } = citedIds.length
    ? await supabase
        .from('training_sessions')
        .select('id, session_date, session_type, duration_minutes')
        .eq('user_id', user.id)
        .in('id', citedIds)
    : { data: [] as Array<{ id: string; session_date: string; session_type: string; duration_minutes: number }> };
  const sessionById = new Map((citedSessions || []).map((s) => [s.id, s]));

  // How much there is to reason from. A coach with two sessions of history
  // cannot spot a trend, and saying so is more useful than a confident
  // paragraph built on nothing.
  const { count: totalSessions } = await supabase
    .from('training_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  const thinHistory = (totalSessions || 0) < 3;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-red-600 to-pink-500 flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">AI Coach</h1>
              <p className="text-sm text-zinc-400 mt-1">AI-powered feedback on your sessions and progress</p>
            </div>
          </div>
          <Link
            href="/ai-coach/chat"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500"
          >
            <MessageCircle className="h-4 w-4" /> Ask Coach anything
          </Link>
        </div>

        {/* Credit Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">This Month</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-red-400">{monthlyUsage}</span>
                <span className="text-xs text-zinc-500">reports written</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Remaining</div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-cyan-400">{isUnlimited ? '∞' : remainingCredits}</span>
                <span className="text-xs text-zinc-500">
                  {isUnlimited ? 'unlimited with Pro' : `of ${FREE_MONTHLY_AI_REPORTS} this month · refills on the 1st`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70">
            <CardContent className="p-5">
              <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">Plan</div>
              <div className="flex items-center gap-2">
                <Badge variant={isUnlimited ? 'success' : 'default'} className="text-xs">
                  {isUnlimited ? 'Pro' : 'Free'}
                </Badge>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {isUnlimited ? 'Unlimited AI coaching' : `${FREE_MONTHLY_AI_REPORTS} AI reports a month on Free`}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions to review */}
        {sessions && sessions.length > 0 && (
          <div className="space-y-3 mb-8">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-cyan-400" />
              Recent Sessions
            </h2>
            {outOfCredits && (
              <p className="text-sm text-amber-400">
                You&apos;ve used this month&apos;s {FREE_MONTHLY_AI_REPORTS} free AI reports. They refill on the 1st, or{' '}
                <Link href="/pro" className="underline">see Deadeye Pro</Link> for unlimited coaching.
              </p>
            )}
            {/* Said before they spend a credit, not after they read a thin
                report: with one session there is nothing to compare against,
                and a coach that admits that is worth more than one that writes
                a confident paragraph anyway. */}
            {thinHistory && (
              <p className="text-sm text-zinc-400">
                Feedback on a single session can only talk about that session. Log{' '}
                {3 - (totalSessions || 0)} more and Coach can start comparing them and spotting what is
                actually changing.
              </p>
            )}
            {sessions.map((session) => (
              <Card key={session.id} className="border-zinc-800 bg-zinc-900/70">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white capitalize">{session.session_type.replace(/-/g, ' ')}</h3>
                    <p className="text-xs text-zinc-400">
                      {new Date(`${session.session_date}T00:00:00`).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {session.duration_minutes} min
                    </p>
                  </div>
                  {reviewedSessionIds.has(session.id) ? (
                    <Badge variant="success" className="text-xs">Feedback ready</Badge>
                  ) : (
                    <GenerateFeedbackButton sessionId={session.id} disabled={outOfCredits} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Reports */}
        {reports && reports.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-400" />
              Coaching Reports
            </h2>

            {reports.map((report) => {
              // output_content is a jsonb column (Json in the schema types); the real
              // shape is always a CoachingOutput-like object written by ai/service.ts.
              const output = (report.output_content || {}) as {
                summary?: string;
                keyInsights?: string[];
                recommendations?: string[];
                comparisonToPrevious?: string;
              };
              const insights: string[] = output.keyInsights || [];
              const recommendations: string[] = output.recommendations || [];
              return (
                <Card key={report.id} className="border-zinc-800 bg-zinc-900/70">
                  <CardContent className="p-5">
                    <div className="mb-3 space-y-1">
                      {report.report_type === 'weekly_summary' && (
                        <Badge variant="success" className="text-xs">Weekly report</Badge>
                      )}
                      <p className="text-xs text-zinc-400">
                        {new Date(report.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="font-semibold text-white">{output.summary}</p>
                      {output.comparisonToPrevious && (
                        <p className="text-sm text-zinc-400">{output.comparisonToPrevious}</p>
                      )}
                      {/* The receipts: which of the player's own sessions this
                          was written from, tappable so the numbers behind any
                          claim are one touch away. */}
                      {(report.source_session_ids || []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                          <span className="text-xs text-zinc-500">Read from</span>
                          {(report.source_session_ids || []).map((sid: string) => {
                            const s = sessionById.get(sid);
                            return s ? (
                              <Link
                                key={sid}
                                href={`/basketball/${sid}`}
                                className="text-xs font-semibold text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
                              >
                                {new Date(`${s.session_date}T00:00:00`).toLocaleDateString('en-IE', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                })}{' '}
                                · {s.duration_minutes} min
                              </Link>
                            ) : (
                              <span key={sid} className="text-xs text-zinc-500">
                                a session you have since deleted
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Key Insights */}
                    {insights.length > 0 && (
                      <div className="mb-3 space-y-1">
                        <div className="text-xs font-semibold text-zinc-400 uppercase">Key Insights</div>
                        <ul className="text-sm text-zinc-300 space-y-1">
                          {insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-400 uppercase">Recommendations</div>
                        <ul className="text-sm text-zinc-300 space-y-1">
                          {recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <LinkIcon className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-zinc-300 mb-1">No coaching reports yet</h3>
              <p className="text-sm text-zinc-400 mb-6">
                {sessions && sessions.length > 0
                  ? 'Tap "Get AI feedback" on a session above.'
                  : 'Log a basketball session, then come back for AI coaching feedback.'}
              </p>
              {(!sessions || sessions.length === 0) && (
                <Link href="/basketball/new">
                  <Button variant="primary" size="lg">
                    Log First Session
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
