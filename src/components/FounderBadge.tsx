// src/components/FounderBadge.tsx
// Marks the Deadeye owner wherever their name shows to other players
// (src/lib/owners-server.ts decides who).
import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function FounderBadge({ className = '' }: { className?: string }) {
  return (
    <Badge variant="brand" className={`flex-shrink-0 gap-1 px-2 py-0 text-[10px] ${className}`}>
      <BadgeCheck className="h-3 w-3" aria-hidden />
      Founder
    </Badge>
  );
}
