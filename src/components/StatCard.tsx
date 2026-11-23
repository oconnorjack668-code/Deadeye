// src/components/StatCard.tsx
// One of the four stat tiles on Today. Extracted from the dashboard page
// because the four were hand-written copies that had already drifted apart.
//
// Polish round (D6, design/2026-11-22-polish.md): the number is white, with
// its unit pill right beside it rather than pushed to the far edge (where
// "60.0%" and "career" crowded each other), and the hint is 14px straight
// under it. The pill keeps a colour only where it means something.
import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function StatCard({
  label,
  value,
  badge,
  badgeVariant = 'default',
  hint,
  href,
  children,
}: {
  label: string;
  value: React.ReactNode;
  badge: string;
  badgeVariant?: React.ComponentProps<typeof Badge>['variant'];
  hint: string;
  /** Makes the whole card a link. */
  href?: string;
  /** Shown between the number and the hint (the weekly goal bar). */
  children?: React.ReactNode;
}) {
  const card = (
    <Card className={`border-zinc-800 bg-zinc-900/70 ${href ? 'h-full transition-colors hover:border-zinc-700' : ''}`}>
      <CardContent className="p-4 md:p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
        {/* Wraps the pill under the number when a 360px card has no room */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-black leading-none text-white sm:text-3xl">{value}</span>
          <Badge variant={badgeVariant} className="flex-shrink-0">
            {badge}
          </Badge>
        </div>
        {children}
        <div className="mt-1.5 text-sm leading-snug text-zinc-400">{hint}</div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
