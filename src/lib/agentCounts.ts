// src/lib/agentCounts.ts
// The weekly counts file the Agent OS reads (docs/agent-os/data/), written by
// api/cron/agent-counts every Monday so the founder no longer pastes it.
// Counts only: no names, emails, ids or report text ever go in it.
import type { Funnel } from '@/lib/funnel';

export interface ReportCounts {
  /** Problem reports players sent in the last 7 days */
  reportsNew: number;
  /** Problem reports not marked resolved */
  reportsOpen: number;
  /** Crash reports not marked resolved */
  crashesOpen: number;
}

function pct(count: number, of: number): string {
  return of > 0 ? ` (${Math.round((count / of) * 100)}%)` : '';
}

export function countsFile(date: string, everyone: Funnel, week: Funnel, reports: ReportCounts): string {
  const lines = [
    `# Funnel, ${date}`,
    '',
    'Written by the weekly counts job (`api/cron/agent-counts`) from the same',
    'numbers as `/admin/funnel`, owner and test accounts left out. Percentages',
    'are of players who joined in the window. Counts only.',
  ];
  everyone.groups.forEach((group, g) => {
    lines.push('', `## ${group.title}`, '', '| Step | Everyone | Joined in 7 days |', '| --- | --- | --- |');
    group.steps.forEach((step, i) => {
      const w = week.groups[g]?.steps[i]?.count ?? 0;
      lines.push(`| ${step.label} | ${step.count}${pct(step.count, everyone.joined)} | ${w}${pct(w, week.joined)} |`);
    });
  });
  lines.push('');
  if (everyone.biggestDrop) {
    lines.push(`Biggest drop (everyone): ${everyone.biggestDrop.from} to ${everyone.biggestDrop.to}, ${everyone.biggestDrop.lost} lost.`, '');
  }
  lines.push(
    '## Problems',
    '',
    `- Problem reports in the last 7 days: ${reports.reportsNew}`,
    `- Problem reports open: ${reports.reportsOpen}`,
    `- Crash reports open: ${reports.crashesOpen}`,
    '',
    'Report text is not in this file. For support-triage, the founder copies',
    'it from Owner tools → Player reports → "Copy for the agents", which takes',
    'out names and contact details.',
    ''
  );
  return lines.join('\n');
}

/** The file's date and path: the Monday it runs, in Irish time */
export function countsPath(now: Date): { date: string; path: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(now);
  return { date, path: `docs/agent-os/data/${date}-funnel.md` };
}
