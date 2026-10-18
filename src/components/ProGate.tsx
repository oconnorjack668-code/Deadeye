// src/components/ProGate.tsx
// How a Pro feature looks to a player on Free: shown, tagged, and explained,
// never hidden. A feature a player cannot see is one they never learn exists,
// so locked things stay in their lists with a Pro tag, and a locked page says
// what is behind it and why.
//
// The wording informs rather than pushes ("See what Pro includes", not "Buy
// now"). Many players are under 18, and EU consumer law bans adverts that
// directly urge children to buy; the decision belongs with whoever pays.
import React from 'react';
import Link from 'next/link';
import { Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The small tag on a locked item in a list. */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30',
        className
      )}
    >
      <Crown className="h-3 w-3" /> Pro
    </span>
  );
}

/** One line under something Free shows part of, saying what the rest is. */
export function ProNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-xs text-zinc-400', className)}>
      <Crown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
      <span>
        {children}{' '}
        <Link href="/pro" className="font-semibold text-amber-300 underline-offset-2 hover:underline">
          See what Pro includes
        </Link>
      </span>
    </p>
  );
}

/** In place of something locked: what it is, that it is Pro, and where to read more. */
export function ProLock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5', className)}>
      <p className="flex items-center gap-2 font-bold text-white">
        <Lock className="h-4 w-4 text-amber-400" /> {title}
      </p>
      <div className="mt-1.5 space-y-2 text-sm text-zinc-300">{children}</div>
      <Link
        href="/pro"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-400"
      >
        <Crown className="h-4 w-4" /> See what Pro includes
      </Link>
    </div>
  );
}
