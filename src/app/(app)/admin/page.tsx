// src/app/(app)/admin/page.tsx
// Owner-only index of the admin tools. The Navbar's "Owner Access" badge used
// to link straight at the error log, which left every other owner tool
// reachable only by typing its URL.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { checkIsOwner } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { ShieldAlert, Bug, Gauge, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner tools - Deadeye' };

const TOOLS = [
  {
    href: '/admin/detector-bench',
    icon: Gauge,
    title: 'Detector benchmark',
    desc: 'Measure shot detection on a real clip, and see what the model can detect at all',
    tile: 'bg-orange-600/20',
    iconColor: 'text-orange-400',
  },
  {
    href: '/admin/errors',
    icon: Bug,
    title: 'App errors',
    desc: 'Problems players report, and crash reports, newest first',
    tile: 'bg-red-600/20',
    iconColor: 'text-red-400',
  },
];

export default async function AdminPage() {
  if (!(await checkIsOwner())) notFound();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <PageHeader tone="hoops" icon={ShieldAlert} title="Owner tools" subtitle="Only you can see this" />

        <div className="space-y-3">
          {TOOLS.map((t) => {
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
                  <span className="block font-semibold text-white">{t.title}</span>
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
