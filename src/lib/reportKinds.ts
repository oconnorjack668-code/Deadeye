// src/lib/reportKinds.ts
// What a player picks when they write to us from Settings (00067): feedback,
// an idea, or a problem. The crash screen sends none, which means problem.
import type { ReportKind } from './supabase/types';

export const REPORT_KINDS: { id: ReportKind; label: string; question: string; placeholder: string }[] = [
  {
    id: 'feedback',
    label: 'Feedback',
    question: 'What do you think of Deadeye?',
    placeholder: 'What you like, what you do not, what feels slow or confusing.',
  },
  {
    id: 'idea',
    label: 'Idea',
    question: 'What should Deadeye do next?',
    placeholder: 'A drill, a stat, a feature you wish it had, and why it would help.',
  },
  {
    id: 'problem',
    label: 'Problem',
    question: 'What went wrong?',
    placeholder: 'What happened, and what were you trying to do?',
  },
];

/** The kind sent to /api/reports: missing means problem (the crash screen), anything unknown is refused. */
export function parseReportKind(value: unknown): ReportKind | null {
  if (value === undefined || value === null) return 'problem';
  return REPORT_KINDS.some((k) => k.id === value) ? (value as ReportKind) : null;
}
