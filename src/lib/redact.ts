// src/lib/redact.ts
// Problem and crash reports made safe to hand to the agents (support-triage):
// emails, phone numbers, links, @handles, ids and any player display name
// are replaced, so what a player typed about the bug survives and who they
// are does not. Free text can still hold something no rule catches, so the
// founder reads the copy before pasting it anywhere.

export interface ReportForAgents {
  created_at: string;
  message: string;
  context: string | null;
  page: string;
  device: string;
}

export interface CrashForAgents {
  message: string;
  count: number;
  players: number;
  pages: string[];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Takes out contact details and the names of players from free text */
export function redact(text: string, names: string[]): string {
  let out = text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '[link]')
    .replace(/(^|\s)@[\w.]{2,}/g, '$1[handle]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '[number]');
  // Longest first, so "Sam Murphy" goes before "Sam" could split it
  const unique = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 3 && n.toLowerCase() !== 'player'))];
  for (const name of unique.sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}(?=$|[^\\p{L}\\p{N}])`, 'giu'), '$1[name]');
  }
  return out;
}

/** The text the founder copies from Owner tools for support-triage */
export function reportsForAgents(date: string, reports: ReportForAgents[], crashes: CrashForAgents[], names: string[]): string {
  const lines = [`# Problem reports, copied ${date}`, '', 'Names, contact details, links and ids are taken out. Counts and pages are kept.', ''];
  lines.push(`## Player reports (${reports.length} open)`, '');
  if (reports.length === 0) lines.push('None open.', '');
  reports.forEach((r, i) => {
    lines.push(`### ${i + 1}. ${r.created_at.slice(0, 10)} · ${r.page} · ${r.device}`, '', redact(r.message, names));
    if (r.context) lines.push('', `Context: ${redact(r.context, names)}`);
    lines.push('');
  });
  lines.push(`## Crash reports (${crashes.length} open, grouped)`, '');
  if (crashes.length === 0) lines.push('None open.', '');
  for (const c of crashes) {
    lines.push(`- ${c.count}× from ${c.players} ${c.players === 1 ? 'player' : 'players'} on ${c.pages.join(', ') || 'unknown page'}: ${redact(c.message, names)}`);
  }
  lines.push('');
  return lines.join('\n');
}
