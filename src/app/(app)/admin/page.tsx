// src/app/(app)/admin/page.tsx
// Owner-only index of the admin tools. The Navbar's "Owner Access" badge used
// to link straight at the error log, which left every other owner tool
// reachable only by typing its URL.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShieldAlert, Bug, Gauge, ChevronRight, MessageSquareWarning } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner tools - Deadeye' };

/**
 * How many unread rows a table has, or a note saying why that is unknown.
 * Each tool is counted on its own, so a table that does not exist yet - a
 * migration not run - shows up on its own tile instead of breaking the page.
 */
async function unread(table: 'player_reports' | 'app_errors'): Promise<{ count: number } | { problem: string }> {
  try {
    const { count, error } = await createAdminClient()
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false);
    if (error) return { problem: error.message };
    return { count: count ?? 0 };
  } catch (e) {
    return { problem: e instanceof Error ? e.message : 'could not count' };
  }
}

export default async function AdminPage() {
  if (!(await checkIsOwner())) notFound();

  const [reports, crashes] = await Promise.all([unread('player_reports'), unread('app_errors')]);

  // Player reports have their own tile, first. They sat at the top of the
  // errors page, under a tile called "App errors", and could not be found.
  const tools = [
    {
      href: '/admin/errors#reports',
      icon: MessageSquareWarning,
      title: 'Player reports',
      desc:
        'problem' in reports
          ? 'Run 00038_player_reports.sql in the Supabase SQL editor to turn these on'
          : 'Problems players tell you about from Settings or the crash screen',
      badge: 'count' in reports && reports.count > 0 ? `${reports.count} new` : null,
      tile: 'bg-amber-600/20',
      iconColor: 'text-amber-400',
    },
    {
      href: '/admin/errors#crashes',
      icon: Bug,
      title: 'Crash reports',
      desc: 'Errors players hit, grouped by message, newest first',
      badge: 'count' in crashes && crashes.count > 0 ? `${crashes.count} open` : null,
      tile: 'bg-red-600/20',
      iconColor: 'text-red-400',
    },
    {
      href: '/admin/detector-bench',
      icon: Gauge,
      title: 'Detector benchmark',
      desc: 'Measure shot detection on a real clip, and see what the model can detect at all',
      badge: null,
      tile: 'bg-orange-600/20',
      iconColor: 'text-orange-400',
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <PageHeader tone="hoops" icon={ShieldAlert} title="Owner tools" subtitle="Only you can see this" />

        <div className="space-y-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
              >
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${t.tile}`}>
                  <Icon className={`h-5 w-5 ${t.iconColor}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-white">{t.title}</span>
                    {t.badge && (
                      <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-bold text-white">{t.badge}</span>
                    )}
                  </span>
                  <span className="block text-xs text-zinc-500">{t.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
