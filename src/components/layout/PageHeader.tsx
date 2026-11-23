// src/components/layout/PageHeader.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Section identity for the five tabs. Every page previously rolled its own
 * gradient tile and heading, so the whole app read as one undifferentiated
 * surface and you navigated by reading headings rather than by recognising
 * where you were. Each tab now owns a colour.
 */
export const SECTION_TONES = {
  hoops: { tile: 'from-orange-600 to-amber-500', glow: 'bg-orange-600/10', accent: 'text-orange-400' },
  gym: { tile: 'from-emerald-600 to-teal-500', glow: 'bg-emerald-600/10', accent: 'text-emerald-400' },
  iq: { tile: 'from-blue-600 to-cyan-500', glow: 'bg-blue-600/10', accent: 'text-blue-400' },
  train: { tile: 'from-orange-600 to-red-500', glow: 'bg-orange-600/10', accent: 'text-orange-400' },
} as const;

export type SectionTone = keyof typeof SECTION_TONES;

export function PageHeader({
  tone,
  icon: Icon,
  title,
  subtitle,
}: {
  tone: SectionTone;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  const t = SECTION_TONES[tone];
  return (
    // overflow-x-clip: the wash is 140% wide, and without the clip it widened
    // each hub's scroller so the page slid sideways by about 52px on a phone
    // (screen review #8, backlog D8). `clip`, not `hidden`, so the wash can
    // still rise above the header and no new scroll container is made.
    <div className="relative mb-5 overflow-x-clip">
      {/* Soft wash behind the header so the section colour registers without
          tinting the content below it */}
      <div className={`pointer-events-none absolute -top-16 left-1/2 h-40 w-[140%] -translate-x-1/2 rounded-full blur-3xl ${t.glow}`} aria-hidden />
      <div className="relative flex items-center gap-3">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr shadow-lg ${t.tile}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{title}</h1>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
